/* ------------------------------------------------------------------ */
/*  HESAP MOTORU                                                       */
/*                                                                     */
/*  Tasarım kararı: KV cache artık model başına sabit bir "KB/token"   */
/*  değil, config.json'dan çıkarılmış GEOMETRİDEN bağlam uzunluğuna    */
/*  göre hesaplanıyor. Bu, sliding window kullanan (Gemma, gpt-oss, Command A) */
/*  ve hybrid linear dikkatli (Qwen3.5+, GLM-5.3-Flash, Nemotron)      */
/*  modellerin uzun bağlamdaki gerçek davranışını doğru yansıtır.      */
/* ------------------------------------------------------------------ */

import { QUANT_HARITA, KVQUANT_HARITA } from "./data/quants.js";
import { ANA_SISTEM } from "./data/devices.js";

/** Kartları çalıştıracak ana sistemin maliyeti ve gücü.
 *  Tek karta 8500$'lık sunucu şasisi yazmak gerçeği çarpıtıyordu:
 *  1-2 kart normal bir masaüstüne, 3-4 kart çok yuvalı bir iş
 *  istasyonuna, 5+ kart gerçek sunucu şasisine ihtiyaç duyar. */
export function anaSistem(kartSayisi) {
  if (kartSayisi <= 0) return { ad: "", usd: 0, w: 0, adet: 0 };
  for (const k of ANA_SISTEM) {
    if (kartSayisi <= k.maxKart) return { ...k, adet: 1 };
  }
  const son = ANA_SISTEM[ANA_SISTEM.length - 1];
  const adet = Math.ceil(kartSayisi / son.maxKart);
  return { ...son, usd: son.usd * adet, w: son.w * adet, adet };
}

/* Tensor parallelism (TP) verimi: tek modeli N cihaza bölünce elde kalan oran. */
export const TP_ETKI = { tek: 1.0, nvlink: 0.86, pcie: 0.6, net: 0.33 };
export const TP_ETIKET = {
  tek: "Tek cihaz",
  nvlink: "NVLink",
  pcie: "PCIe (aynı kasa)",
  net: "Ağ / USB4 (ayrı kutular)",
};

/* ------------------------------------------------------------------ */
/*  SEYREK MoE CEZASI                                                  */
/*                                                                     */
/*  Dense bir modelde her adımda ağırlıklar baştan sona sırayla        */
/*  okunur — bellek denetleyicisi bunu iyi ardışıklar. Seyrek bir      */
/*  MoE'de ise her token FARKLI uzmanları uyandırır; erişim dağınık    */
/*  olur ve gerçekleşen bant genişliği teorik değerin altına düşer.    */
/*                                                                     */
/*  Bu etkinin şiddeti bellek tipine bağlıdır: LPDDR tabanlı birleşik  */
/*  bellekte (DGX Spark, Strix Halo, Jetson) ağırdır; HBM'de yüksek    */
/*  paralellik sayesinde hafiftir.                                     */
/*                                                                     */
/*  Kalibrasyon — OpenZeka'nın yayımladığı tek-Spark ölçümleri:        */
/*    Qwen3.6-27B NVFP4 (dense)     : 12,63 tok/s                      */
/*    Qwen3.8-Flash-Next NVFP4 (%3) : 16,8 tok/s (MTP'siz)             */
/*  Dense ölçüm cihazın MBU'sunu, seyrek ölçüm de bu cezayı belirledi. */
/* ------------------------------------------------------------------ */

/* 0 = ceza yok, 1 = tam ceza. BELLEK TİPİNE göre — mimari adına değil.
   Apple birleşik belleği LPDDR'dir ama veri yolu çok geniş olduğu için
   dağınık erişimi diğer LPDDR kutulardan iyi tolere eder. */
export const MOE_CEZA = { lpddr: 1.0, gddr: 0.35, hbm: 0.15 };
const APPLE_CEZA = 0.55;

/** Seyrek MoE'nin gerçekleşen bant genişliğine etkisi (0-1 çarpan). */
export function moeVerimi(model, cihaz) {
  const seyreklik = Math.max(0.005, Math.min(1, model.ap / model.tp));
  if (seyreklik >= 0.999) return 1; // dense: ceza yok
  // Üs, DGX Spark + Qwen3.8-Flash-Next ölçümünden kalibre edildi.
  const tamCeza = Math.pow(seyreklik, 0.358);
  const ceza = cihaz.mim === "apple" ? APPLE_CEZA : MOE_CEZA[cihaz.bellekTipi] ?? 0.35;
  return 1 - ceza * (1 - tamCeza);
}

/* Elektrik: Türkiye mesken + ticarethane ortalaması (2026, TL/kWh, dağıtım dahil) */
export const ELEKTRIK_TL_KWH = 3.4;

/* Kur ve ithalat katsayısı — TL karşılıklarını üretmek için (4 Eylül 2026) */
export const USD_TRY = 48.4;
export const ITHALAT = 1.35; // nakliye + gümrük + %20 KDV kabaca

/* ------------------------------------------------------------------ */
/*  KV CACHE                                                           */
/* ------------------------------------------------------------------ */

/** Bir dizinin TAMAMI için KV cache boyutu (bayt).
 *  kv.e  : katman başına token başına eleman
 *  kv.L  : KV tutan katman sayısı (kesirli olabilir — DeepSeek V4'te
 *          katman başına sıkıştırma oranlarının toplamı)
 *  kv.sw : bunların kaçı sliding window katmanı
 *  kv.w  : pencere genişliği (token)
 *  kvBayt: eleman başına bayt (FP16 = 2, FP8 = 1, Q4 ≈ 0,56)  */
export function kvBaytToplam(kv, tokenSayisi, kvBayt) {
  const tamKatman = Math.max(0, kv.L - (kv.sw || 0));
  const pencereli = kv.sw || 0;
  const pencere = kv.w || tokenSayisi;
  const etkinToken = tamKatman * tokenSayisi + pencereli * Math.min(tokenSayisi, pencere);
  return kv.e * etkinToken * kvBayt;
}

/** Gösterim için: bu bağlamda token başına ortalama KV (KB). */
export function kvKBperToken(kv, tokenSayisi, kvBayt = 2) {
  if (tokenSayisi <= 0) return 0;
  return kvBaytToplam(kv, tokenSayisi, kvBayt) / tokenSayisi / 1024;
}

/** Modelin uzun bağlam davranışı için kısa etiket.
 *  Lt = toplam katman, L = KV tutan katman. L belirgin olarak küçükse
 *  katmanların çoğu linear/Mamba attention kullanıyor demektir. */
export function kvTipi(kv) {
  const hibrit = kv.Lt && kv.L < kv.Lt * 0.75;
  const mla = kv.e <= 640;
  if (hibrit && mla) return "hybrid linear + MLA";
  if (hibrit) return "hybrid linear";
  if (kv.sw && kv.sw >= kv.L * 0.4) return "sliding window";
  if (mla) return "MLA (sıkıştırılmış)";
  return "full attention (GQA)";
}

/* ------------------------------------------------------------------ */
/*  ANA HESAP                                                          */
/* ------------------------------------------------------------------ */

/**
 * @param model    MODELS kaydı
 * @param quant    ağırlık kuantizasyon id'si
 * @param kvq      KV cache kuantizasyon id'si
 * @param ctxK     kullanılacak bağlam penceresi (K token)
 * @param girdiK   ortalama İSTEM uzunluğu (K token) — ilk token gecikmesini bu belirler
 * @param kullanici eşzamanlı kullanıcı
 * @param cikti    ortalama yanıt uzunluğu (token)
 * @param cihaz    DEVICES kaydı
 * @param adet     cihaz adedi
 * @param kvOran   KV cache için ayrılan bağlamın oranı (0-1); 1 = her kullanıcı
 *                 pencereyi tamamen doldurmuş kabul edilir (kötü senaryo)
 */
export function hesapla({
  model, quant, kvq, ctxK, girdiK, kullanici, cikti, cihaz, adet, kvOran = 1,
}) {
  const q = QUANT_HARITA[quant] || QUANT_HARITA.bf16;
  const kvqe = KVQUANT_HARITA[kvq] || KVQUANT_HARITA.fp16;
  const bpp = q.bpp;
  const kvBayt = 2 * kvqe.f;

  const agirlikGB = (model.tp * 1e9 * bpp) / 1024 ** 3;
  const aktifGB = (model.ap * 1e9 * bpp) / 1024 ** 3;

  const ctx = Math.round(ctxK * 1024);
  const ayrilanCtx = Math.max(1, Math.round(ctx * kvOran));
  const girdiTok = Math.max(1, Math.round((girdiK ?? ctxK / 2) * 1024));

  /* ---- Küme topolojisi: tüm cihazlar tek modeli paylaşır ---- */
  const kartMi = cihaz.tur === "kart";
  // Hazır kutular (Mac Studio, Spark, mini PC) kendi başına bir bilgisayardır;
  // ayrık kartlar ise onları takacak bir ana sisteme ihtiyaç duyar.
  const host = kartMi ? anaSistem(adet) : { ad: "", usd: 0, w: 0, adet: 0 };
  const maliyet = cihaz.fiyat * adet + host.usd;
  const maliyetTL = cihaz.try * adet + host.usd * USD_TRY * ITHALAT;
  const guc = cihaz.w * adet + host.w;

  /* Kullanılabilir bellek: işletim sistemi + sürücü payı düşülmüş. */
  const rezerv = cihaz.tur === "kutu" ? 0.12 : 0.06;
  const cihazKullanilabilir = cihaz.mem * (1 - rezerv);
  const toplamBellek = cihazKullanilabilir * adet;

  /* Interconnect verimi */
  const link = adet > 1 ? cihaz.link : "tek";
  const tpEtki = TP_ETKI[link];
  const kumeBW = cihaz.bw * adet * tpEtki;
  const kumeTF = cihaz.tf * adet * (adet > 1 ? 0.9 : 1);

  /* ---- Bellek bütçesi ---- */
  const kvKullaniciGB = kvBaytToplam(model.kv, ayrilanCtx, kvBayt) / 1024 ** 3;
  const kvGB = kullanici * kvKullaniciGB;
  // Çalışma zamanı: CUDA bağlamı, aktivasyonlar, parçalanma payı.
  const ekGB = 1.2 + 0.05 * agirlikGB + 0.35 * adet;
  const gerekliGB = agirlikGB + kvGB + ekGB;
  const sigar = gerekliGB <= toplamBellek;
  const doluluk = toplamBellek > 0 ? gerekliGB / toplamBellek : Infinity;

  /* ---- Decode hızı ----
     Bellek bant genişliği sınırlı. Her adımda okunan bayt = aktif ağırlıklar
     + batch'teki KV cache. KV okuması attention kernel'inde tam olarak
     taranmaz (sayfalama, flash-attention); ~0,55 katsayısı bunu yansıtır. */
  const adimBaytGB = aktifGB + kvGB * 0.55;
  const moeVerim = moeVerimi(model, cihaz);
  const adimHiz = adimBaytGB > 0 ? (kumeBW * cihaz.mbu * moeVerim) / adimBaytGB : 0;
  const kullaniciTokS = adimHiz;
  const toplamTokS = adimHiz * kullanici;

  /* ---- İlk token gecikmesi (prefill) ----
     Hesap sınırlı. Prompt uzunluğu × 2 × aktif parametre FLOP.
     Batchingde prefill'ler sıraya girer, bu yüzden kullanıcı sayısıyla
     doğrusala yakın büyür (kuyrukta bekleme). */
  const flops = 2 * model.ap * 1e9 * girdiTok;
  const prefillVerim = kumeTF * 1e12 * 0.42;
  const ttftTek = prefillVerim > 0 ? flops / prefillVerim : Infinity;
  const ttftYogun = ttftTek * (1 + (kullanici - 1) * 0.62);

  /* ---- Kapasite sınırları ---- */
  const kalanGB = toplamBellek - agirlikGB - ekGB;
  const maxKullanici = kvKullaniciGB > 0 ? Math.max(0, Math.floor(kalanGB / kvKullaniciGB)) : 0;

  // Bu kullanıcı sayısıyla sığan en uzun bağlam — KV geometrisi doğrusal
  // olmayabildiği için (sliding window) ikili arama ile bulunur.
  let maxCtxK = 0;
  if (kalanGB > 0 && kullanici > 0) {
    let lo = 0, hi = 4096; // K token
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const need =
        (kullanici * kvBaytToplam(model.kv, Math.max(1, mid * 1024 * kvOran), kvBayt)) / 1024 ** 3;
      if (need <= kalanGB) lo = mid; else hi = mid;
    }
    maxCtxK = lo;
  }
  // Bellek izin verse bile model kendi bağlam sınırının ötesine çıkamaz.
  const modelTavani = model.ext || model.ctx;
  const maxCtxBellek = maxCtxK;
  maxCtxK = Math.min(maxCtxK, modelTavani);

  /* ---- Bu iş yükü için gereken minimum adet ---- */
  let minAdet = null;
  for (let n = 1; n <= 128; n++) {
    const bellek = cihazKullanilabilir * n;
    const ek = 1.2 + 0.05 * agirlikGB + 0.35 * n;
    if (agirlikGB + kvGB + ek <= bellek) { minAdet = n; break; }
  }

  const ciktiSure = cikti / Math.max(kullaniciTokS, 0.01);
  const yanitSure = ttftYogun + ciktiSure;

  /* ---- İşletme maliyeti ---- */
  const yillikKWh = (guc / 1000) * 24 * 365;
  const yillikElektrikTL = yillikKWh * ELEKTRIK_TL_KWH;
  // Sürekli %100 yükte yıllık üretilebilecek token (gerçekte doluluk düşer)
  const yillikToken = toplamTokS * 3600 * 24 * 365;
  const milyonTokenTL = yillikToken > 0 ? (yillikElektrikTL / yillikToken) * 1e6 : 0;

  return {
    agirlikGB, aktifGB, kvGB, kvKullaniciGB, ekGB, gerekliGB, toplamBellek, sigar, doluluk,
    kullaniciTokS, toplamTokS, ttftTek, ttftYogun, ciktiSure, yanitSure,
    maxKullanici, maxCtxK, maxCtxBellek, maxCtxModelSinirli: maxCtxBellek > modelTavani,
    minAdet, maliyet, maliyetTL, guc, host,
    link, tpEtki, kumeBW, kumeTF, ctx, ayrilanCtx, girdiTok, moeVerim,
    kvKBtok: kvKBperToken(model.kv, ayrilanCtx, kvBayt),
    yillikElektrikTL, milyonTokenTL,
    ctxAsimi: ctxK > (model.ext || model.ctx),
    ctxYarn: ctxK > model.ctx && ctxK <= (model.ext || model.ctx),
  };
}


/* ------------------------------------------------------------------ */
/*  PERFORMANS HEDEFLERİ VE KULLANICI KAPASİTESİ                       */
/*                                                                     */
/*  "Kaç kullanıcı kaldırır?" sorusunun tek bir doğru cevabı yok —     */
/*  neyin KABUL EDİLEBİLİR sayıldığına bağlı. Bu yüzden hedefleri      */
/*  kullanıcı belirler, biz de her kurulumu bu hedeflere göre yeniden  */
/*  ölçeriz. Hedefler hiçbir satırı gizlemez; sayıların ANLAMINI       */
/*  değiştirir.                                                        */
/*                                                                     */
/*  Eşzamanlılık (C) ≠ kullanıcı sayısı. Bir sohbet kullanıcısı        */
/*  zamanının çoğunu okuyarak ve yazarak geçirir; modeli gerçekten     */
/*  meşgul ettiği an azdır. Bu yüzden bir eşzamanlı yuva birden çok    */
/*  gerçek kullanıcıya yeter. Ajanlar ise arka arkaya istek attığı     */
/*  için yuvayı çok daha yoğun kullanır — çarpanı düşüktür.            */
/* ------------------------------------------------------------------ */

export const VARSAYILAN_HEDEF = {
  ttftMs: 1000,   // kabul edilebilir en uzun ilk-token gecikmesi
  tps: 20,        // kullanıcı başına kabul edilebilir en düşük token hızı
  sohbetKat: 4,   // bir eşzamanlı yuva kaç sohbet kullanıcısına yeter
  ajanKat: 1.5,   // bir eşzamanlı yuva kaç ajan kullanıcısına yeter
};

export const HEDEF_SINIR = {
  ttftMs: { min: 100, max: 60000 },
  tps: { min: 1, max: 200 },
  sohbetKat: { min: 1, max: 20 },
  ajanKat: { min: 0.5, max: 10 },
};

/** Bir kurulum verilen hedefleri karşılıyor mu? */
export function hedefiKarsilar(r, hedef) {
  return r.sigar && r.kullaniciTokS >= hedef.tps && r.ttftYogun * 1000 <= hedef.ttftMs;
}

/**
 * Bu kurulumun hedefleri hâlâ karşıladığı EN YÜKSEK eşzamanlılık (Max C)
 * ve bundan türeyen kullanıcı kapasiteleri.
 *
 * Hız eşzamanlılıkla düşer, ilk token yükselir — ikisi de tek yönlü.
 * Bu yüzden ikili arama doğru sonucu verir.
 *
 * @param args   hesapla()'ya giden argümanlar (kullanici hariç, o taranır)
 * @param hedef  { ttftMs, tps, sohbetKat, ajanKat }
 * @param tavan  taranacak en yüksek eşzamanlılık
 */
export function kapasite(args, hedef, tavan = 256) {
  const dene = (c) => hedefiKarsilar(hesapla({ ...args, kullanici: c }), hedef);

  // C=1 bile karşılamıyorsa kapasite sıfırdır: bu kurulum bu hedeflere uygun değil.
  if (!dene(1)) {
    const r1 = hesapla({ ...args, kullanici: 1 });
    return {
      maxC: 0, sohbet: 0, ajan: 0, r1,
      sebep: !r1.sigar
        ? "bellek"
        : r1.kullaniciTokS < hedef.tps
        ? "hiz"
        : "ttft",
    };
  }
  if (dene(tavan)) {
    const rT = hesapla({ ...args, kullanici: tavan });
    return { maxC: tavan, sohbet: Math.floor(tavan * hedef.sohbetKat), ajan: Math.floor(tavan * hedef.ajanKat), r1: rT, tavanda: true };
  }

  let alt = 1, ust = tavan; // alt karşılıyor, üst karşılamıyor
  while (ust - alt > 1) {
    const orta = Math.floor((alt + ust) / 2);
    if (dene(orta)) alt = orta; else ust = orta;
  }
  return {
    maxC: alt,
    sohbet: Math.floor(alt * hedef.sohbetKat),
    ajan: Math.floor(alt * hedef.ajanKat),
    r1: hesapla({ ...args, kullanici: alt }),
  };
}

/** TPS/TTFT hücrelerini hedefe göre renklendirmek için ortak karar. */
export function hedefDurumu(deger, hedef, buyukIyi) {
  // "sınırda" bandı: hedefin %25 uzağına kadar sarı
  if (buyukIyi) {
    if (deger >= hedef) return "iyi";
    if (deger >= hedef * 0.75) return "sinir";
    return "kotu";
  }
  if (deger <= hedef) return "iyi";
  if (deger <= hedef * 1.33) return "sinir";
  return "kotu";
}

/* ------------------------------------------------------------------ */
/*  YARDIMCI BİÇİMLEYİCİLER                                            */
/* ------------------------------------------------------------------ */

export const ctxYazi = (k) =>
  k >= 1000
    ? `${(k / 1000) % 1 === 0 ? k / 1000 : (k / 1000).toFixed(1)}M`
    : `${Math.round(k)}K`;

export const harfYazi = (tok) => {
  const h = tok * 4;
  return h >= 1000 ? `~${(h / 1000).toFixed(h < 10000 ? 1 : 0)}b harf` : `~${h} harf`;
};

export const para = (x) =>
  x >= 1000 ? `$${(x / 1000).toFixed(x >= 10000 ? 0 : 1)}k` : `$${Math.round(x)}`;

export const paraTL = (x) => {
  if (x >= 1e6) return `${(x / 1e6).toFixed(x >= 1e7 ? 1 : 2)} mn ₺`;
  if (x >= 1000) return `${Math.round(x / 1000)}b ₺`;
  return `${Math.round(x)} ₺`;
};

export const gb = (x) => (x >= 100 ? x.toFixed(0) : x.toFixed(1));

/* Süreyi insan gibi yaz: 0.4 sn / 12 sn / 3 dk 20 sn */
export function sureYazi(sn) {
  if (!isFinite(sn)) return "—";
  if (sn < 1) return `${(sn * 1000).toFixed(0)} ms`;
  if (sn < 90) return `${sn.toFixed(sn < 10 ? 1 : 0)} sn`;
  const d = Math.floor(sn / 60);
  return `${d} dk ${Math.round(sn % 60)} sn`;
}
