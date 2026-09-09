/* ------------------------------------------------------------------ */
/*  VERİ BÜTÜNLÜĞÜ DOĞRULAMASI                                         */
/*  `npm run dogrula` — veri dosyalarında tutarsızlık var mı bakar.    */
/*  --canli bayrağıyla her HuggingFace deposunun hâlâ var olduğunu ve  */
/*  parametre sayısının tuttuğunu da kontrol eder (ağ gerektirir).     */
/* ------------------------------------------------------------------ */

import { MODELS, AILE_SIRA, MODEL_HARITA } from "../src/data/models.js";
import { DEVICES, GRUP_SIRA, MIM_AD, YIGIN, TR_DURUM, TR_NOT, CIHAZ_HARITA } from "../src/data/devices.js";
import { QUANTS, KVQUANTS, DUSUK_QUANT_ONER } from "../src/data/quants.js";
import { SENARYOLAR } from "../src/data/concepts.js";
import { IS_YUKLERI, eslesenProfil } from "../src/data/isYukleri.js";
import { BANTLAR, FIYAT_TEMELI } from "../src/data/bantlar.js";
import { hesapla, kapasite, hedefDurumu, kvKBperToken, kvTipi, anaSistem, VARSAYILAN_HEDEF, HEDEF_SINIR } from "../src/engine.js";

const hatalar = [];
const uyarilar = [];
const hata = (m) => hatalar.push(m);
const uyar = (m) => uyarilar.push(m);

/* ---------------- Modeller ---------------- */
const modelId = new Set();
for (const m of MODELS) {
  const et = `model ${m.id}`;
  if (modelId.has(m.id)) hata(`${et}: id tekrar ediyor`);
  modelId.add(m.id);
  for (const alan of ["ad", "aile", "tp", "ap", "ctx", "lis", "hf", "kv"])
    if (m[alan] === undefined || m[alan] === null) hata(`${et}: "${alan}" eksik`);
  if (!AILE_SIRA.includes(m.aile)) hata(`${et}: aile "${m.aile}" AILE_SIRA'da yok`);
  if (m.ap > m.tp) hata(`${et}: aktif (${m.ap}B) toplamdan (${m.tp}B) büyük`);
  if (m.tp <= 0) hata(`${et}: toplam parametre pozitif değil`);
  if (m.ext && m.ext < m.ctx) hata(`${et}: uzatılmış bağlam (${m.ext}K) doğuştan olandan (${m.ctx}K) küçük`);
  if (!/^[\w.\-]+\/[\w.\-]+$/.test(m.hf)) hata(`${et}: geçersiz repo yolu "${m.hf}"`);

  const kv = m.kv;
  for (const alan of ["e", "L", "Lt"])
    if (typeof kv[alan] !== "number") hata(`${et}: kv.${alan} sayı değil`);
  if (kv.L > kv.Lt + 0.01) hata(`${et}: KV tutan katman (${kv.L}) toplamdan (${kv.Lt}) fazla`);
  if ((kv.sw || 0) > kv.L + 0.01) hata(`${et}: kayan pencereli katman (${kv.sw}) KV katmanından (${kv.L}) fazla`);
  if (kv.sw && !kv.w) hata(`${et}: kayan pencereli katman var ama pencere genişliği (w) yok`);

  // KV büyüklüğü akla yatkın mı? (32K bağlamda 4 KB - 1 MB arası beklenir)
  const kb = kvKBperToken(kv, 32768);
  if (kb < 1) uyar(`${et}: KV çok küçük görünüyor (${kb.toFixed(1)} KB/token @32K)`);
  if (kb > 1024) uyar(`${et}: KV çok büyük görünüyor (${kb.toFixed(0)} KB/token @32K)`);
}

/* ---------------- Cihazlar ---------------- */
const cihazId = new Set();
for (const d of DEVICES) {
  const et = `cihaz ${d.id}`;
  if (cihazId.has(d.id)) hata(`${et}: id tekrar ediyor`);
  cihazId.add(d.id);
  for (const alan of ["ad", "grup", "mem", "bw", "tf", "w", "usd", "try", "tur", "link", "mbu", "tr", "mim"])
    if (d[alan] === undefined || d[alan] === null) hata(`${et}: "${alan}" eksik`);
  if (!GRUP_SIRA.includes(d.grup)) hata(`${et}: grup "${d.grup}" GRUP_SIRA'da yok`);
  if (!MIM_AD[d.mim]) hata(`${et}: bilinmeyen mimari "${d.mim}"`);
  if (!YIGIN[d.mim]) hata(`${et}: "${d.mim}" için yazılım yığını tanımlı değil`);
  if (!TR_DURUM[d.tr] || !TR_NOT[d.tr]) hata(`${et}: bilinmeyen tedarik durumu "${d.tr}"`);
  if (!["kart", "kutu"].includes(d.tur)) hata(`${et}: geçersiz tür "${d.tur}"`);
  if (!["nvlink", "pcie", "net"].includes(d.link)) hata(`${et}: geçersiz bağlantı "${d.link}"`);
  if (d.mbu <= 0 || d.mbu > 1) hata(`${et}: mbu aralık dışı (${d.mbu})`);
  if (d.fiyat !== d.usd) hata(`${et}: fiyat/usd tutarsız`);
  // TL fiyat USD ile kabaca tutarlı mı? (0,8x - 3,5x aralığı)
  const oran = d.try / (d.usd * 48.4);
  if (oran < 0.8 || oran > 3.5) uyar(`${et}: TL fiyatı USD'nin ${oran.toFixed(2)} katı — gözden geçir`);
}

/* ---------------- Kuantizasyon ---------------- */
for (const q of QUANTS) {
  for (const alan of ["ad", "bpp", "bit", "kalite", "ne", "arti", "eksi", "nezaman"])
    if (!q[alan]) hata(`kuantizasyon ${q.id}: "${alan}" eksik`);
  if (!DUSUK_QUANT_ONER[q.id]) hata(`kuantizasyon ${q.id}: düşürme önerisi yok`);
  if (q.bpp <= 0 || q.bpp > 2.5) hata(`kuantizasyon ${q.id}: bpp aralık dışı`);
}
for (const k of KVQUANTS) if (!k.f || !k.not) hata(`KV kuantizasyon ${k.id}: alan eksik`);

/* ---------------- Senaryolar ---------------- */
for (const s of SENARYOLAR) {
  const a = s.ayar;
  if (!MODEL_HARITA[a.modelId]) hata(`senaryo "${s.ad}": model "${a.modelId}" yok`);
  if (!CIHAZ_HARITA[a.cihazId]) hata(`senaryo "${s.ad}": cihaz "${a.cihazId}" yok`);
  if (!QUANTS.some((q) => q.id === a.quant)) hata(`senaryo "${s.ad}": kuantizasyon "${a.quant}" yok`);
  if (!KVQUANTS.some((q) => q.id === a.kvq)) hata(`senaryo "${s.ad}": KV kuant "${a.kvq}" yok`);
  if (a.girdiK > a.ctxK) hata(`senaryo "${s.ad}": istem (${a.girdiK}K) bağlamdan (${a.ctxK}K) uzun`);
  // Senaryolar çalışır durumda olmalı — kullanıcıya bozuk bir başlangıç sunmayalım
  const m = MODEL_HARITA[a.modelId], d = CIHAZ_HARITA[a.cihazId];
  if (m && d) {
    const r = hesapla({ ...a, model: m, cihaz: d, kvOran: 0.6 });
    if (!r.sigar) hata(`senaryo "${s.ad}": belleğe sığmıyor (${r.gerekliGB.toFixed(0)}/${r.toplamBellek.toFixed(0)} GB)`);
    else if (r.kullaniciTokS < 5) uyar(`senaryo "${s.ad}": çok yavaş (${r.kullaniciTokS.toFixed(1)} tok/s)`);
  }
}

/* ---------------- Motor akıl sağlığı ---------------- */
{
  const m = MODEL_HARITA["qwen38_27b"], d = CIHAZ_HARITA["5090"];
  const taban = { model: m, quant: "q4km", kvq: "fp8", ctxK: 32, girdiK: 8, kullanici: 4, cikti: 800, cihaz: d, adet: 1, kvOran: 0.6 };
  const r1 = hesapla(taban);
  const r2 = hesapla({ ...taban, kullanici: 8 });
  const r3 = hesapla({ ...taban, ctxK: 64 });
  const r4 = hesapla({ ...taban, adet: 2 });
  if (r2.kvGB <= r1.kvGB) hata("motor: kullanıcı artınca KV cache büyümedi");
  if (r3.kvGB <= r1.kvGB) hata("motor: bağlam artınca KV cache büyümedi");
  if (r2.kullaniciTokS >= r1.kullaniciTokS) hata("motor: kullanıcı artınca kişi başına hız düşmedi");
  if (r2.toplamTokS <= r1.toplamTokS) hata("motor: kullanıcı artınca toplam verim artmadı");
  if (r4.toplamBellek <= r1.toplamBellek) hata("motor: cihaz artınca bellek artmadı");
  if (r4.maliyet <= r1.maliyet) hata("motor: cihaz artınca maliyet artmadı");
  if (r1.maxCtxK > (m.ext || m.ctx)) hata("motor: bağlam tavanı modelin sınırını aşıyor");
  const rBf = hesapla({ ...taban, quant: "bf16" });
  if (rBf.agirlikGB <= r1.agirlikGB) hata("motor: BF16 ağırlığı Q4'ten büyük değil");
}

/* ---------------- İş yükü profilleri ---------------- */
{
  const gorulen = new Set();
  for (const p of IS_YUKLERI) {
    const et = `iş yükü "${p.id}"`;
    if (gorulen.has(p.id)) hata(`${et}: id tekrar ediyor`);
    gorulen.add(p.id);
    for (const alan of ["ad", "ozet", "neden", "is", "hedef"])
      if (!p[alan]) hata(`${et}: "${alan}" eksik`);
    const i = p.is;
    for (const alan of ["ctxK", "girdiK", "kullanici", "cikti", "kvOran"])
      if (typeof i[alan] !== "number") hata(`${et}: is.${alan} sayı değil`);
    if (i.girdiK > i.ctxK) hata(`${et}: istem (${i.girdiK}K) bağlamdan (${i.ctxK}K) uzun`);
    if (i.kvOran < 10 || i.kvOran > 100) hata(`${et}: kvOran aralık dışı (${i.kvOran})`);
    for (const [k, v] of Object.entries(p.hedef)) {
      const lim = HEDEF_SINIR[k];
      if (!lim) { hata(`${et}: bilinmeyen hedef alanı "${k}"`); continue; }
      if (v < lim.min || v > lim.max) hata(`${et}: hedef.${k} sınır dışı (${v})`);
    }
    // Profil kendi kendini tanıyabilmeli, yoksa arayüzde hep "özel" görünür
    if (eslesenProfil(p.is, p.hedef) !== p.id) hata(`${et}: eslesenProfil kendi profilini bulamıyor`);
    // Profil en az bir modelle ulaşılabilir olmalı — yoksa hedef gerçek dışıdır
    const ulasilir = MODELS.some((m) =>
      DEVICES.some((d) => {
        const a = { model: m, quant: "q4km", kvq: "fp8", cihaz: d, adet: 1,
          ctxK: i.ctxK, girdiK: i.girdiK, cikti: i.cikti, kvOran: i.kvOran / 100 };
        return kapasite(a, p.hedef, 64).maxC > 0;
      })
    );
    if (!ulasilir) hata(`${et}: hiçbir model/donanım eşleşmesi bu hedefleri tutturamıyor — hedef gerçek dışı`);
  }
  // Değiştirilmiş bir ayar profile eşleşmemeli
  const ilk = IS_YUKLERI[0];
  if (eslesenProfil({ ...ilk.is, kullanici: ilk.is.kullanici + 7 }, ilk.hedef) !== null)
    hata("eslesenProfil: değiştirilmiş iş yükünü hâlâ profille eşleştiriyor");
}

/* ---------------- Kapasite modeli ---------------- */
{
  const m = MODEL_HARITA["qwen38_27b"], d = CIHAZ_HARITA["5090"];
  const args = { model: m, quant: "q4km", kvq: "fp8", ctxK: 32, girdiK: 2, cikti: 800, cihaz: d, adet: 1, kvOran: 0.6 };
  const h = { ...VARSAYILAN_HEDEF };

  const k = kapasite(args, h);
  if (k.maxC < 1) hata(`kapasite: varsayılan hedeflerle referans kurulum C=1'i bile geçemiyor (sebep: ${k.sebep})`);
  if (k.sohbet !== Math.floor(k.maxC * h.sohbetKat)) hata("kapasite: sohbet kapasitesi çarpanla tutmuyor");
  if (k.ajan !== Math.floor(k.maxC * h.ajanKat)) hata("kapasite: ajan kapasitesi çarpanla tutmuyor");

  // Maks. C gerçekten sınır mı? C'de karşılamalı, C+1'de karşılamamalı.
  const sinirda = hesapla({ ...args, kullanici: k.maxC });
  const bir_fazla = hesapla({ ...args, kullanici: k.maxC + 1 });
  const karsilar = (r) => r.sigar && r.kullaniciTokS >= h.tps && r.ttftYogun * 1000 <= h.ttftMs;
  if (!karsilar(sinirda)) hata("kapasite: Maks. C hedefleri karşılamıyor");
  if (karsilar(bir_fazla)) hata("kapasite: Maks. C + 1 de hedefleri karşılıyor — sınır yanlış bulunmuş");

  // Hedefi sıkılaştırmak kapasiteyi ARTIRMAMALI (tek yönlülük)
  const siki = kapasite(args, { ...h, tps: h.tps * 2 });
  if (siki.maxC > k.maxC) hata("kapasite: hız hedefi sıkılaşınca kapasite arttı");
  const sikiT = kapasite(args, { ...h, ttftMs: Math.max(HEDEF_SINIR.ttftMs.min, h.ttftMs / 4) });
  if (sikiT.maxC > k.maxC) hata("kapasite: ilk token hedefi sıkılaşınca kapasite arttı");
  // Gevşetmek azaltmamalı
  const gevsek = kapasite(args, { ...h, tps: 1, ttftMs: 60000 });
  if (gevsek.maxC < k.maxC) hata("kapasite: hedefler gevşeyince kapasite azaldı");

  // Karşılanamayan hedefte sebep doğru raporlanıyor mu?
  const imkansiz = kapasite(args, { ...h, tps: 100000 });
  if (imkansiz.maxC !== 0 || imkansiz.sebep !== "hiz") hata("kapasite: ulaşılamaz hız hedefinde sebep 'hiz' değil");
  const imkansizT = kapasite(args, { ...h, ttftMs: HEDEF_SINIR.ttftMs.min });
  if (imkansizT.maxC !== 0 || imkansizT.sebep !== "ttft") hata("kapasite: ulaşılamaz ilk token hedefinde sebep 'ttft' değil");
  // Offload kapalıyken bellek yolunu sına: açıkken motor zaten sığdırır.
  const sigmaz = kapasite({ ...args, quant: "bf16", offloadModu: "kapali" }, { ...h, tps: 1, ttftMs: 60000 });
  if (sigmaz.maxC !== 0 || sigmaz.sebep !== "bellek") hata("kapasite: belleğe sığmayan kurulumda sebep 'bellek' değil");
  // Offload açıkken aynı kurulum sığmalı — otomatik offload'ın asıl faydası bu.
  const offloadIle = kapasite({ ...args, quant: "bf16", sistemRam: 128 }, { ...h, tps: 1, ttftMs: 60000 });
  if (offloadIle.maxC === 0) hata("kapasite: offload açıkken de sığdıramadı");

  // Renklendirme kararları
  if (hedefDurumu(30, 20, true) !== "iyi") hata("hedefDurumu: hedefin üstündeki hız 'iyi' değil");
  if (hedefDurumu(18, 20, true) !== "sinir") hata("hedefDurumu: hedefe yakın hız 'sinir' değil");
  if (hedefDurumu(5, 20, true) !== "kotu") hata("hedefDurumu: hedefin çok altındaki hız 'kotu' değil");
  if (hedefDurumu(800, 1000, false) !== "iyi") hata("hedefDurumu: hedefin altındaki gecikme 'iyi' değil");
  if (hedefDurumu(5000, 1000, false) !== "kotu") hata("hedefDurumu: hedefin çok üstündeki gecikme 'kotu' değil");
}

/* ---------------- Satın alma bantları ---------------- */
{
  const noSet = new Set();
  let oncekiFiyat = -1;
  for (const b of BANTLAR) {
    const et = `bant ${b.no} "${b.ad}"`;
    if (noSet.has(b.no)) hata(`${et}: numara tekrar ediyor`);
    noSet.add(b.no);
    for (const alan of ["ad", "fiyat", "fiyatTemeli", "ozet", "ne", "tekKullanici", "ekip", "kime", "tikanma", "ayar"])
      if (!b[alan]) hata(`${et}: "${alan}" eksik`);

    if (b.fiyatTemeli && !FIYAT_TEMELI[b.fiyatTemeli]) hata(`${et}: bilinmeyen fiyat temeli "${b.fiyatTemeli}"`);

    const a = b.ayar;
    const m = MODEL_HARITA[a.modelId], d = CIHAZ_HARITA[a.cihazId];
    if (!m) { hata(`${et}: model "${a.modelId}" yok`); continue; }
    if (!d) { hata(`${et}: cihaz "${a.cihazId}" yok`); continue; }
    if (!QUANTS.some((q) => q.id === a.quant)) hata(`${et}: kuantizasyon "${a.quant}" yok`);
    if (a.girdiK > a.ctxK) hata(`${et}: prompt bağlamdan uzun`);
    if (a.ctxK > (m.ext || m.ctx)) hata(`${et}: bağlam modelin sınırını aşıyor`);
    if (a.mtp && !m.mtp) hata(`${et}: MTP açık ama modelde head yok`);


    // Bant, kendi ayarıyla çalışabilmeli — kullanıcıya bozuk bir kurulum sunmayalım
    const r = hesapla({ ...a, model: m, cihaz: d, kvOran: 0.6 });
    if (!r.sigar) hata(`${et}: belleğe sığmıyor (${r.gerekliGB.toFixed(0)}/${r.toplamBellek.toFixed(0)} GB)`);
    if (r.kullaniciTokS < 3) hata(`${et}: kullanılamayacak kadar yavaş (${r.kullaniciTokS.toFixed(1)} tok/s)`);
    /* fiyatTL yönetici özetinde gösterilen ve amorti hesabına giren sayı;
       fiyat metni ise detay sekmesinde görünen. İkisi ayrışırsa sunumda
       aynı sistem için iki farklı rakam çıkar. */
    if (!(b.fiyatTL > 0)) hata(`${et}: sayısal fiyatTL yok`);
    else if (b.fiyatTL < r.maliyetTL * 0.9)
      hata(`${et}: fiyatTL (${b.fiyatTL}) bileşen toplamının altında (${Math.round(r.maliyetTL)})`);
    else if (b.fiyatTL > r.maliyetTL * 3)
      hata(`${et}: fiyatTL (${b.fiyatTL}) bileşen toplamının 3 katından fazla (${Math.round(r.maliyetTL)})`);

    // Bantlar ucuzdan pahalıya sıralı olmalı — kart bunu varsayarak okunuyor
    if (r.maliyetTL < oncekiFiyat * 0.9)
      hata(`${et}: fiyat sırası bozuk (${(r.maliyetTL / 1000).toFixed(0)}b ₺, önceki ${(oncekiFiyat / 1000).toFixed(0)}b ₺)`);
    oncekiFiyat = Math.max(oncekiFiyat, r.maliyetTL);
  }
}

/* ---------------- Offload (otomatik) ve speculative decoding ---------------- */
{
  const m = MODEL_HARITA["qwen38_27b"], moe = MODEL_HARITA["gpt_oss_120b"];
  // 5090 (32 GB): 27B Q4 rahat sığar, BF16 sığmaz — offload'ın iki yolunu da sınar.
  const kart = CIHAZ_HARITA["5090"], kutu = CIHAZ_HARITA["m3u"];
  const taban = { quant: "bf16", kvq: "fp8", ctxK: 32, girdiK: 2, kullanici: 1, cikti: 800, kvOran: 0.6, adet: 1 };

  // Zaten sığan bir kurulumda offload devreye GİRMEMELİ (her bayt yavaşlatır)
  const bol = hesapla({ ...taban, model: m, quant: "q4km", cihaz: kart, sistemRam: 64 });
  if (bol.offload > 0) hata("offload: VRAM'e sığan kurulumda gereksiz yere devreye girdi");

  // Sığmayan kurulumda otomatik devreye girmeli ve sığdırmalı
  const dar = hesapla({ ...taban, model: m, cihaz: kart, sistemRam: 64 });
  if (dar.offload <= 0) hata("offload: sığmayan kurulumda devreye girmedi");
  if (!dar.sigar) hata("offload: yeterli RAM olmasına rağmen sığdıramadı");
  if (dar.kullaniciTokS >= bol.kullaniciTokS) hata("offload: hız düşmedi — PCIe cezası uygulanmıyor");

  // Taşınan miktar GEREKTİĞİ KADAR olmalı: bir tık azı sığdırmamalı
  const azOffload = dar.offload - 1.5;
  const azıyla = dar.vramAgirlikGB + 1.5 + dar.kvGB + dar.ekGB;
  if (azOffload > 0 && azıyla <= dar.toplamBellek * 0.96)
    hata(`offload: gereğinden fazla taşındı (${dar.offload.toFixed(1)} GB)`);

  // Kapalı modda offload olmamalı ve sığmamalı
  const kapali = hesapla({ ...taban, model: m, cihaz: kart, sistemRam: 64, offloadModu: "kapali" });
  if (kapali.offload !== 0) hata("offload: kapalı modda yine de taşındı");
  if (kapali.sigar) hata("offload: kapalı modda sığmaması gerekirdi");

  // MoE'de offload cezası dense'ten hafif olmalı
  const dOran = dar.kullaniciTokS / hesapla({ ...taban, model: m, cihaz: CIHAZ_HARITA.pro6000 }).kullaniciTokS;
  const mVar = hesapla({ ...taban, model: moe, quant: "nvfp4", cihaz: kart, sistemRam: 64 });
  const mOran = mVar.kullaniciTokS / hesapla({ ...taban, model: moe, quant: "nvfp4", cihaz: CIHAZ_HARITA.pro6000 }).kullaniciTokS;
  if (mOran <= dOran) hata(`offload: MoE cezası dense'ten hafif olmalı (MoE ${mOran.toFixed(2)} vs dense ${dOran.toFixed(2)})`);

  // Birleşik bellekli kutuda offload etkisiz
  const kVar = hesapla({ ...taban, model: m, cihaz: kutu, sistemRam: 128 });
  if (kVar.offload !== 0) hata("offload: birleşik bellekli kutuda devreye girmemeliydi");

  // RAM yetmezse açıkça raporlanmalı
  const azRam = hesapla({ ...taban, model: MODEL_HARITA["glm_53"], quant: "fp8", cihaz: kart, sistemRam: 32 });
  if (!azRam.offloadYetersiz) hata("offload: RAM yetersizliği raporlanmadı");
  if (azRam.sigar) hata("offload: RAM yetmezken sığar göründü");

  // Platform sınıfı hem kart sayısına hem istenen RAM'e bağlı olmalı
  if (anaSistem(2, 64).ad === anaSistem(2, 384).ad)
    hata("anaSistem: 384 GB RAM istendiğinde daha büyük platform seçilmedi");
  if (anaSistem(2, 384).usd <= anaSistem(2, 64).usd)
    hata("anaSistem: büyük RAM platformu maliyetsiz göründü");
  // Büyük platform daha geniş PCIe/RAM yolu → offload daha hızlı
  const kucukP = hesapla({ ...taban, model: m, cihaz: kart, adet: 2, sistemRam: 64 });
  const buyukP = hesapla({ ...taban, model: m, cihaz: kart, adet: 2, sistemRam: 384 });
  if (buyukP.pcieBW <= kucukP.pcieBW) hata("platform: büyük platformda offload yolu genişlemedi");

  // MTP yalnızca head'i olan modelde çalışır
  const mtpsiz = MODELS.find((x) => !x.mtp);
  const a = hesapla({ ...taban, model: mtpsiz, cihaz: CIHAZ_HARITA.b200, adet: 8, mtp: false });
  const b = hesapla({ ...taban, model: mtpsiz, cihaz: CIHAZ_HARITA.b200, adet: 8, mtp: true });
  if (a.kullaniciTokS !== b.kullaniciTokS) hata("MTP: head'i olmayan modelde hız değişti");
  if (b.mtpAktif) hata("MTP: head'i olmayan modelde aktif göründü");

  const mtpli = MODELS.find((x) => x.mtp);
  const c = hesapla({ ...taban, model: mtpli, cihaz: CIHAZ_HARITA.b200, adet: 8, mtp: false });
  const d = hesapla({ ...taban, model: mtpli, cihaz: CIHAZ_HARITA.b200, adet: 8, mtp: true });
  if (!(d.kullaniciTokS > c.kullaniciTokS)) hata("MTP: head'i olan modelde hız artmadı");
  // MTP bedava değil: ölçümlerde prefill 0,75×'e düşüyor (dolayısıyla TTFT artar)
  // ve ek VRAM istediği için maksimum bağlam daralıyor.
  if (!(d.ttftYogun > c.ttftYogun)) hata("MTP: ilk token gecikmesi artmadı");
  if (!(d.ekGB > c.ekGB)) hata("MTP: ek VRAM maliyeti işlenmedi");
  // Bağlam daralmasını bellekle SINIRLI bir kurulumda ölç: 8× B200'de tavan
  // modelin kendi bağlam sınırı olur, bellek değil — orada fark görünmez.
  const mtpDar = { ...taban, model: mtpli, cihaz: CIHAZ_HARITA["5090"], adet: 1 };
  const darsiz = hesapla({ ...mtpDar, mtp: false }), darli = hesapla({ ...mtpDar, mtp: true });
  if (darsiz.maxCtxBellek > 0 && !(darli.maxCtxBellek < darsiz.maxCtxBellek))
    hata("MTP: belleğe sığan maksimum bağlam daralmadı");

  // Kalibrasyon: DGX Spark + Qwen3.8-Flash-Next, ölçülen 16,8 → 24,6 tok/s
  const fn = MODEL_HARITA["qwen38_flash_next"], spark = CIHAZ_HARITA["spark"];
  const ok = { ...taban, quant: "nvfp4", model: fn, cihaz: spark };
  const olcumsuz = hesapla({ ...ok, mtp: false }).kullaniciTokS;
  const olcumlu = hesapla({ ...ok, mtp: true }).kullaniciTokS;
  if (Math.abs(olcumsuz - 16.8) / 16.8 > 0.1)
    hata(`kalibrasyon: Spark + Flash-Next MTP'siz ${olcumsuz.toFixed(1)} tok/s, ölçüm 16,8`);
  if (Math.abs(olcumlu - 24.6) / 24.6 > 0.1)
    hata(`kalibrasyon: Spark + Flash-Next MTP'li ${olcumlu.toFixed(1)} tok/s, ölçüm 24,6`);
}

/* ---------------- Canlı HuggingFace doğrulaması (isteğe bağlı) ---------------- */
if (process.argv.includes("--canli")) {
  console.log(`\nCanlı doğrulama: ${MODELS.length} depo kontrol ediliyor…`);
  let sayac = 0;
  for (const m of MODELS) {
    sayac++;
    try {
      const res = await fetch(`https://huggingface.co/api/models/${m.hf}?expand[]=safetensors`);
      if (!res.ok) { hata(`${m.id}: depo okunamadı (HTTP ${res.status}) — ${m.hf}`); continue; }
      const j = await res.json();
      const st = j.safetensors || {};
      // HF'nin "total" alanı bazı depolarda hatalıdır (ör. allenai/tmax-27b'de
      // 26,9B yerine 2,6M yazar). dtype dökümünün toplamı daha güvenilir;
      // ikisinin büyüğünü alıyoruz.
      const dokum = Object.values(st.parameters || {}).reduce((a, b) => a + b, 0);
      const tot = Math.max(st.total || 0, dokum);
      if (tot) {
        const gercek = tot / 1e9;
        // Küçük modellerde 0,1B'lik yuvarlama %5'i aşar; mutlak bir pay da tanı.
        const sapma = Math.abs(gercek - m.tp);
        if (sapma > 0.15 && sapma / m.tp > 0.05)
          uyar(`${m.id}: parametre sapması — kayıtlı ${m.tp}B, HF ${gercek.toFixed(1)}B`);
      }
    } catch (e) {
      uyar(`${m.id}: ağ hatası — ${e.message}`);
    }
    if (sayac % 25 === 0) process.stdout.write(`  ${sayac}/${MODELS.length}\n`);
  }
}

/* ---------------- Rapor ---------------- */
console.log(`\n${MODELS.length} model · ${DEVICES.length} cihaz · ${QUANTS.length} kuantizasyon · ${SENARYOLAR.length} senaryo · ${IS_YUKLERI.length} iş yükü profili · ${BANTLAR.length} satın alma bandı kontrol edildi.`);
if (uyarilar.length) {
  console.log(`\n${uyarilar.length} uyarı:`);
  uyarilar.forEach((u) => console.log("  ⚠ " + u));
}
if (hatalar.length) {
  console.log(`\n${hatalar.length} HATA:`);
  hatalar.forEach((h) => console.log("  ✗ " + h));
  process.exit(1);
}
console.log("\n✓ Tüm kontroller geçti.");
