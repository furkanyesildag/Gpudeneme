import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";

import { C, SANS, S, T, RADIUS, GOLGE, RAKAMLAR } from "./theme.js";
import { MODELS, MODEL_HARITA, AILE_SIRA } from "./data/models.js";
import {
  DEVICES, CIHAZ_HARITA, GRUP_SIRA, TR_DURUM, TR_NOT, MIM_AD,
  FP4_NATIVE, FP8_NATIVE, YIGIN, RAM_SECENEK, RAM_ISLETIM_PAYI, PCIE_BW, ANA_SISTEM,
} from "./data/devices.js";
import { QUANTS, QUANT_HARITA, QUANT_GRUP, KVQUANTS, KVQUANT_HARITA, DUSUK_QUANT_ONER, kvBayragi } from "./data/quants.js";
import { SENARYOLAR } from "./data/concepts.js";
import { BANTLAR } from "./data/bantlar.js";
import { IS_YUKLERI, IS_YUKU_HARITA, eslesenProfil } from "./data/isYukleri.js";
import {
  hesapla, kapasite, hedefDurumu, kvTipi, ctxYazi, harfYazi,
  para, paraTL, gb, sureYazi, TP_ETIKET, VARSAYILAN_HEDEF, anaSistem, MTP_KABUL_VARSAYILAN,
} from "./engine.js";
import {
  Panel, Secim, Kaydirac, Anahtar, Rozet, Ipucu, Kod,
} from "./components/ui.jsx";
import Hedefler from "./components/Hedefler.jsx";
import Sonuc from "./sections/Sonuc.jsx";
import Bantlar from "./sections/Bantlar.jsx";
import Grafik from "./sections/Grafik.jsx";
import { DonanimTablosu, ModelTablosu } from "./sections/Tablolar.jsx";
import Bilgi from "./sections/Bilgi.jsx";
import SistemOzellik from "./components/SistemOzellik.jsx";
import ChatBot from "./chat/ChatBot.jsx";
import { durumuOku, durumuYaz, durumuDinle } from "./urlDurum.js";
import Kalibrasyon from "./components/Kalibrasyon.jsx";
import { kalibrasyonlariOku, kalibrasyonKaydet, kalibrasyonSil, kalibreCihaz } from "./kalibrasyon.js";
import { ggufEtiketleriniBul, quantDurumu } from "./quantBul.js";

/* ------------------------------------------------------------------ */
/*  Kuantizasyon ↔ donanım uyumu                                       */
/* ------------------------------------------------------------------ */

function quantUyum(cihaz, quantId) {
  const m = cihaz.mim;
  const ad = MIM_AD[m];
  if (quantId === "nvfp4") {
    if (FP4_NATIVE.has(m))
      return { tip: "olumlu", mesaj: `${ad} FP4'ü donanımda hızlandırır — bu donanım için ideal seçim.` };
    return { tip: "uyari", mesaj: `${ad} üzerinde FP4 donanım desteği yok. Yer kazancı kalır ama hız kazancı gitmez; pratikte Q4_K_M daha oturmuş bir yol.` };
  }
  if (quantId === "fp8") {
    if (FP8_NATIVE.has(m))
      return { tip: "olumlu", mesaj: `${ad} FP8'i donanımda destekler — bellek ve hız için verimli. Birçok model zaten doğrudan FP8 yayımlanıyor.` };
    if (m === "apple")
      return { tip: "uyari", mesaj: "Apple Silicon'da FP8 donanım hızlandırması yok. MLX veya GGUF (Q4-Q8) kullanılır; Q8_0 daha dürüst bir seçim." };
    return { tip: "uyari", mesaj: `${ad} üzerinde yerel FP8 yok. INT8 veya GGUF Q8_0 daha uygun; buradaki sayılar iyimser kalır.` };
  }
  if (quantId === "awq")
    return m === "apple" || m === "intel"
      ? { tip: "uyari", mesaj: `AWQ/GPTQ çekirdekleri CUDA/ROCm içindir. ${ad} üzerinde çalışmaz — GGUF (Q4/Q6/Q8) kullan.` }
      : { tip: "bilgi", mesaj: "AWQ/GPTQ, vLLM ve SGLang'de yüksek verimle çalışır. Çok kullanıcılı servis için GGUF'tan hızlıdır, ama CPU'ya taşınmaz." };
  if (quantId === "bf16")
    return { tip: "bilgi", mesaj: "Tam hassasiyet: her donanımda çalışır ama en çok belleği ve bant genişliğini kullanır. Sığıyorsa kalite açısından en güvenli seçim." };
  if (quantId === "q3km" || quantId === "q2k")
    return { tip: "tehlike", mesaj: "Agresif 3-bit: her yerde çalışır ama kalite gözle görülür düşer. Genelde bir küçük modelin Q6'sı, büyük modelin Q3'ünden iyidir." };
  if (quantId === "q4qat")
    return { tip: "olumlu", mesaj: "QAT sürümü varsa daima düz Q4 yerine bunu seç — aynı boyut, çok daha az kalite kaybı." };
  return { tip: "bilgi", mesaj: "GGUF/llama.cpp tabanlı: CPU dahil her donanımda çalışır. Güvenli ve taşınabilir yerel format." };
}

/* İş yükü kısmı "Kısa sohbet / soru-cevap" profiliyle birebir aynı;
   uygulama böylece adı ve gerekçesi olan tutarlı bir durumla açılıyor. */
const VARSAYILAN = {
  modelId: "qwen38_27b", cihazId: "5090", adet: 1, quant: "q4km", kvq: "fp8",
  ctxK: 16, girdiK: 1, kullanici: 8, cikti: 400, kvOran: 40, indirGibi: false,
};

/* Simgeler SVG: ◐ ☾ gibi karakterler yazı tipine göre kayıyor ya da hiç
   çizilmiyordu. Hepsi 16'lık ızgarada, çizgi kalınlığı aynı. */
const simge = (d, boy = 14) => (
  <svg width={boy} height={boy} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const SIMGE = {
  acik: simge(<><circle cx="8" cy="8" r="3" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" /></>, 13),
  sistem: simge(<><rect x="1.8" y="2.5" width="12.4" height="8.5" rx="1.3" /><path d="M5.5 13.8h5M8 11v2.8" /></>, 13),
  koyu: simge(<path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z" />, 13),
  model: simge(<><path d="M8 1.8 13.5 5v6L8 14.2 2.5 11V5z" /><path d="M2.5 5 8 8.2 13.5 5M8 8.2v6" /></>, 15),
  is: simge(<path d="M1.5 8.5h2.8l1.8-4.5 3.6 8.5 1.8-4h3" />, 15),
  donanim: simge(<><rect x="2" y="2.5" width="12" height="4.5" rx="1" /><rect x="2" y="9" width="12" height="4.5" rx="1" /><path d="M4.5 4.75h.01M4.5 11.25h.01" /></>, 15),
  ayar: simge(<><path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" /><circle cx="10" cy="4.5" r="1.5" /><circle cx="6" cy="11.5" r="1.5" /></>, 15),
  dis: simge(<path d="M6 3.5H3.5v9h9V10M9 2.5h4.5V7M13.5 2.5 7.5 8.5" />, 12),
  ok: simge(<path d="M3 8h10M9 4l4 4-4 4" />, 13),
};

/* Üst menüdeki sayfalar. Eskiden hepsi tek uzun sayfanın en altında
   sekme olarak duruyordu; simülatörün altına gömülü oldukları için
   bulunmaları zordu. Artık her biri ayrı bir sayfa. */
const SAYFALAR = [
  { k: "simulator", ad: "Simülatör" },
  { k: "bantlar", ad: "Satın alma", rozet: BANTLAR.length },
  { k: "donanim", ad: "Donanımlar" },
  { k: "modeller", ad: "Modeller" },
  { k: "grafik", ad: "Duyarlılık" },
  { k: "bilgi", ad: "Kavramlar" },
];

const SAYFA_BASLIK = {
  bantlar: ["Satın alma bantları", "Yaklaşık 200 bin ₺'den veri merkezi kabinine kadar hazır kurulumlar: ne alınır, kime yeter, nerede tıkanır."],
  donanim: ["Donanım karşılaştırması", "Seçili model ve iş yükü, listedeki her donanımda nasıl çalışır? Bir satıra tıklayınca simülatöre o donanım yüklenir."],
  modeller: ["Model uyumu", "Seçili donanıma hangi modeller sığar ve hangi hızda çalışır?"],
  grafik: ["Duyarlılık", "Bir değişkeni gezdir, hızın, ilk token süresinin ve belleğin nasıl tepki verdiğini gör."],
  bilgi: ["Kavramlar ve varsayımlar", "Hesabın arkasındaki terimler, kabuller ve verinin ne kadar güvenilir olduğu."],
};

/* ------------------------------------------------------------------ */

export default function Simulator() {
  const ilk = useMemo(() => durumuOku(VARSAYILAN), []);

  const [modelId, setModelId] = useState(ilk.modelId);
  const [cihazId, setCihazId] = useState(ilk.cihazId);
  const [adet, setAdet] = useState(ilk.adet);
  const [quant, setQuant] = useState(ilk.quant);
  const [kvq, setKvq] = useState(ilk.kvq);
  const [ctxK, setCtxK] = useState(ilk.ctxK);
  const [girdiK, setGirdiK] = useState(ilk.girdiK);
  const [kullanici, setKullanici] = useState(ilk.kullanici);
  const [cikti, setCikti] = useState(ilk.cikti);
  const [kvOran, setKvOran] = useState(ilk.kvOran);
  const [indirGibi, setIndirGibi] = useState(ilk.indirGibi);
  const [hedef, setHedef] = useState(() => ({
    ...VARSAYILAN_HEDEF, ...IS_YUKU_HARITA.sohbet_kisa.hedef, ...ilk.hedef,
  }));

  const [offloadModu, setOffloadModu] = useState(ilk.offloadModu ?? "otomatik");
  const [sistemRam, setSistemRam] = useState(ilk.sistemRam ?? 0); // 0 = ana sisteme göre
  const [mtpAcik, setMtpAcik] = useState(ilk.mtpAcik ?? false);
  const [kalibrasyonlar, setKalibrasyonlar] = useState(() => kalibrasyonlariOku());
  const [quantBilgi, setQuantBilgi] = useState(null);   // { durum, bilinmiyor, depolar }
  const [quantAraniyor, setQuantAraniyor] = useState(false);
  const [tumQuantlar, setTumQuantlar] = useState(false); // bulunmayanları da göster
  /* Düşünme seviyesi: modern modeller bunu "reasoning effort" olarak sunuyor
     (kapalı / düşük / orta / yüksek), açık-kapalı bir anahtar olarak değil. */
  const [dusunmeSeviye, setDusunmeSeviye] = useState("kapali");
  const [sekme, setSekme] = useState("simulator");
  const [sohbetAcik, setSohbetAcik] = useState(false);
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem("tema") || "sistem"; } catch { return "sistem"; }
  });

  /* Tema — form kontrolleri color-scheme'i izlediği için onu da ayarla. */
  useEffect(() => {
    try {
      const kok = document.documentElement;
      if (tema === "sistem") { kok.removeAttribute("data-theme"); kok.style.colorScheme = "light dark"; }
      else { kok.setAttribute("data-theme", tema); kok.style.colorScheme = tema; }
      localStorage.setItem("tema", tema);
    } catch { /* yoksay */ }
  }, [tema]);

  const model = MODEL_HARITA[modelId] || MODELS[0];
  const hamCihaz = CIHAZ_HARITA[cihazId] || DEVICES[0];
  /* Kullanıcı bu kart için kendi ölçümünü girdiyse MBU onunkiyle değişir. */
  const cihaz = useMemo(() => kalibreCihaz(hamCihaz, kalibrasyonlar), [hamCihaz, kalibrasyonlar]);
  const qAktif = QUANT_HARITA[quant] || QUANTS[0];
  const kvAktif = KVQUANT_HARITA[kvq] || KVQUANTS[0];

  useEffect(() => {
    if (indirGibi && (quant !== "bf16" || kvq !== "fp16")) { setQuant("bf16"); setKvq("fp16"); }
  }, [indirGibi, quant, kvq]);

  useEffect(() => { if (girdiK > ctxK) setGirdiK(Math.max(1, Math.round(ctxK / 2))); }, [ctxK, girdiK]);

  useEffect(() => {
    durumuYaz({ modelId, cihazId, adet, quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran, indirGibi, hedef, offloadModu, sistemRam, mtpAcik });
  }, [modelId, cihazId, adet, quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran, indirGibi, hedef, offloadModu, sistemRam, mtpAcik]);

  /* Sistem RAM'i seçilmediyse ana sistemin varsayılanı kullanılır. */
  const etkinRam = sistemRam || anaSistem(cihaz.tur === "kart" ? adet : 0, 0).ram || 0;

  const ortak = useMemo(
    () => ({
      quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran: kvOran / 100,
      offloadModu, mtp: mtpAcik, sistemRam: etkinRam,
    }),
    [quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran, offloadModu, mtpAcik, etkinRam]
  );

  const r = useMemo(() => hesapla({ ...ortak, model, cihaz, adet }), [ortak, model, cihaz, adet]);

  const kap = useMemo(() => {
    const { kullanici: _y, ...taban } = ortak;
    return kapasite({ ...taban, model, cihaz, adet }, hedef);
  }, [ortak, model, cihaz, adet, hedef]);

  const tpsDurum = r.sigar ? hedefDurumu(r.kullaniciTokS, hedef.tps, true) : "kotu";
  const ttftDurum = r.sigar ? hedefDurumu(r.ttftYogun * 1000, hedef.ttftMs, false) : "kotu";

  /* Şu anki iş yükü + hedef ikilisi hangi profile denk geliyor? */
  const aktifProfil = useMemo(
    () => eslesenProfil({ ctxK, girdiK, kullanici, cikti, kvOran }, hedef),
    [ctxK, girdiK, kullanici, cikti, kvOran, hedef]
  );

  /* Bir iş yükü profili uygula: beş kaydırak + dört performans hedefi.
     İkisi tek karardır — ne inşa ettiğin hem sayıları hem de neyin
     kabul edilebilir olduğunu belirler. Model ve donanıma dokunmaz. */
  const profilUygula = useCallback((id) => {
    const p = IS_YUKU_HARITA[id];
    if (!p) return;
    setCtxK(p.is.ctxK); setGirdiK(p.is.girdiK); setKullanici(p.is.kullanici);
    setCikti(p.is.cikti); setKvOran(p.is.kvOran);
    setHedef((h) => ({ ...h, ...p.hedef }));
  }, []);

  /* Seçili model için HuggingFace'te hangi GGUF kuantizasyonlarının gerçekten
     yayımlandığını ara. Var olmayan bir şemayı seçtirip kullanıcıyı sonradan
     "indirilecek dosya yok" ile karşılaştırmak kötü bir deneyim. */
  useEffect(() => {
    const kontrol = new AbortController();
    setQuantBilgi(null);
    setQuantAraniyor(true);
    ggufEtiketleriniBul(model.hf, kontrol.signal)
      .then((b) => setQuantBilgi({ ...quantDurumu(b), depolar: b.depolar }))
      .catch(() => setQuantBilgi(null))
      .finally(() => setQuantAraniyor(false));
    return () => kontrol.abort();
  }, [model.hf]);

  /* Adres çubuğuna dışarıdan başka bir kurulum linki yapıştırılırsa uygula.
     Aynı belgede hash değişimi sayfayı yeniden yüklemediği için, bu olmadan
     paylaşılan link açık sekmede hiçbir şey yapmıyordu. */
  useEffect(
    () =>
      durumuDinle((d) => {
        if (d.modelId) setModelId(d.modelId);
        if (d.cihazId) setCihazId(d.cihazId);
        if (d.quant) setQuant(d.quant);
        if (d.kvq) setKvq(d.kvq);
        for (const [ad, ayarla] of [
          ["adet", setAdet], ["ctxK", setCtxK], ["girdiK", setGirdiK],
          ["kullanici", setKullanici], ["cikti", setCikti], ["kvOran", setKvOran],
          ["sistemRam", setSistemRam],
        ]) if (typeof d[ad] === "number") ayarla(d[ad]);
        if (typeof d.indirGibi === "boolean") setIndirGibi(d.indirGibi);
        if (typeof d.mtpAcik === "boolean") setMtpAcik(d.mtpAcik);
        if (d.offloadModu) setOffloadModu(d.offloadModu);
        if (d.hedef) setHedef((h) => ({ ...h, ...d.hedef }));
      }),
    []
  );

  /* Bir hazır ayarı (senaryo veya bant) yükle. */
  const ayarYukle = useCallback((a) => {
    setIndirGibi(!!a.indirGibi);
    setModelId(a.modelId); setCihazId(a.cihazId); setAdet(a.adet);
    setQuant(a.quant); setKvq(a.kvq); setCtxK(a.ctxK); setGirdiK(a.girdiK);
    setKullanici(a.kullanici); setCikti(a.cikti);
    setOffloadModu(a.offloadModu ?? "otomatik");
    if (a.sistemRam) setSistemRam(a.sistemRam);
    if (a.mtp !== undefined) setMtpAcik(!!a.mtp);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ---------------- Bildirimler ---------------- */
  const bildirimler = useMemo(() => {
    const out = [];
    const uyum = quantUyum(cihaz, quant);
    out.push({ tip: uyum.tip, baslik: `${qAktif.ad} · ${cihaz.ad}`, metin: uyum.mesaj });

    if (!r.sigar) {
      // Offload gerçek bir çıkış yolu — "sığmıyor" deyip bırakmak yanlış tavsiye.
      const kalanAgirlik = Math.max(0, r.vramAgirlikGB + r.kvGB + r.ekGB - r.toplamBellek);
      const offloadYeter = cihaz.tur === "kart" && kalanAgirlik > 0 && kalanAgirlik <= r.offloadMumkun - r.offload;
      out.push({
        tip: "tehlike", baslik: "Belleğe sığmıyor",
        metin:
          `${adet} × ${cihaz.ad} (${gb(r.toplamBellek)} GB) bu ayarlara yetmiyor: ${gb(r.gerekliGB)} GB gerekiyor. ` +
          (r.agirlikGB > r.toplamBellek
            ? `Ağırlıklar tek başına ${gb(r.agirlikGB)} GB — ${DUSUK_QUANT_ONER[quant]} veya en az ${r.minAdet ? `${r.minAdet} adet` : "çok daha fazla"} cihaz gerekir.`
            : `Taşıran şey KV cache (${gb(r.kvGB)} GB). Kullanıcıyı ${r.maxKullanici}'e ya da bağlamı ${ctxYazi(Math.floor(r.maxCtxK))}'e düşür, ya da KV'yi ${kvq === "fp16" ? "FP8" : "Q4"} yap.`) +
          (offloadYeter
            ? ` Alternatif: ${Math.ceil(kalanAgirlik + 1)} GB ağırlığı sistem RAM'ine taşırsan (offload) çalışır — ama PCIe üzerinden okunacağı için yavaşlar.`
            : ""),
      });
    } else if (r.doluluk > 0.9) {
      out.push({
        tip: "uyari", baslik: "Bellek sınırında",
        metin: `Bellek %${Math.round(r.doluluk * 100)} dolu. Üretimde %80'in altını hedefle — ani uzun prompt veya ek kullanıcı taşırır.`,
      });
    }

    if (r.ctxAsimi)
      out.push({
        tip: "tehlike", baslik: "Modelin bağlam sınırı aşıldı",
        metin: `${model.ad} en fazla ${ctxYazi(model.ext || model.ctx)} destekliyor; sen ${ctxYazi(ctxK)} seçtin.`,
      });
    else if (r.ctxYarn)
      out.push({
        tip: "uyari", baslik: "YaRN/RoPE uzatması gerekiyor",
        metin: `${model.ad} doğuştan ${ctxYazi(model.ctx)} destekliyor. ${ctxYazi(ctxK)} için RoPE ölçeklendirmesi açman gerekir; kısa prompt'larda kalite bir miktar düşebilir.`,
      });

    if (indirGibi)
      out.push({
        tip: "olumlu", baslik: "Kuantizasyon yok — indirdiğin gibi",
        metin: "Modeli HuggingFace'ten indirip olduğu gibi çalıştırmak (BF16 + FP16 KV). Belleğe sığıyorsa kuantizasyona hiç gerek yok.",
      });
    else if (kvq !== "fp16")
      out.push({ tip: "bilgi", baslik: `KV cache: ${kvAktif.ad}`, metin: kvAktif.not });

    if (r.offloadYetersiz)
      out.push({
        tip: "tehlike", baslik: "Sistem RAM'i de yetmiyor",
        metin: `Sığdırmak için ${gb(r.offloadGerekli + (r.gerekliGB - r.toplamBellek))} GB taşınması gerekiyor ama ${r.ram} GB RAM'in yalnızca ${gb(r.ramTavani)} GB'ı kullanılabilir. Sistem RAM'ini büyüt, kuantizasyonu düşür ya da cihaz ekle.`,
      });

    if (r.offload > 0 && r.sigar) {
      const yavaslama = r.offloadOrani > 0 ? (r.kumeBW * cihaz.mbu) / r.pcieBW : 1;
      out.push({
        tip: r.offloadOrani > 0.5 ? "uyari" : "bilgi",
        baslik: `Offload devrede: ağırlığın %${Math.round(r.offloadOrani * 100)}'i sistem RAM'inde`,
        metin:
          `Model VRAM'e sığmadığı için sığdırmaya yetecek EN AZ miktar (${gb(r.offload)} GB) otomatik olarak host RAM'e taşındı; ` +
          `bu kısım her adımda ~${Math.round(r.pcieBW)} GB/s ile (PCIe ${r.hat} hat) okunuyor — VRAM'den ~${Math.round(yavaslama)}× yavaş. ` +
          (model.ap < model.tp
            ? `Neyse ki bu bir MoE: her adımda ${model.tp}B'nin yalnızca ${model.ap}B'si okunuyor, dolayısıyla offload cezası dense bir modele göre çok daha hafif kalıyor.`
            : `Dense modelde her adımda ağırlığın TAMAMI okunur, bu yüzden offload burada ağır bedel ödetiyor. Aynı belleğe sığan bir MoE çok daha iyi sonuç verir.`) +
          ` Simülatör kör (katman bazlı) offload modeller; uzman-farkında yerleştirme gibi akıllı stratejiler daha iyi sonuç verir — bu sayı alt sınırdır.`,
      });
    }

    if (quantBilgi?.durum?.[quant] === "yok")
      out.push({
        tip: "uyari", baslik: `${qAktif.ad} için hazır dosya bulunamadı`,
        metin: `${model.ad} modelinin taranan ${quantBilgi.depolar.length} GGUF deposunda bu şema yok. Ya listeden bulunan bir şema seç, ya da modeli llama.cpp'nin quantize aracıyla kendin üret (imatrix'li IQ şemaları için kalibrasyon verisi de gerekir). Arama eksiksiz değildir — depo adı modele benzemiyorsa kaçırmış olabilirim.`,
      });

    if (model.mtp && !mtpAcik)
      out.push({
        tip: "bilgi", baslik: "Kullanılmayan MTP head'i var",
        metin: `${model.ad} ${model.mtp} MTP head'iyle geliyor ama speculative decoding kapalı. Açarsan decode hızı ~${1 + MTP_KABUL_VARSAYILAN}× artar ve kalite değişmez (taslak doğrulanır, yanlışsa atılır). Bedava değil ama: ölçümlerde prefill 0,75×'e düşüyor (ilk token gecikir) ve ~1 GB ek VRAM istediği için sığan bağlam daralıyor.`,
      });
    else if (r.mtpAktif)
      out.push({
        tip: "olumlu", baslik: `Speculative decoding açık · ${r.mtpHizlanma}× decode`,
        metin: `Kabul edilen taslak token aynı ağırlık okumasıyla geldiği için neredeyse bedava; kalite etkilenmez. Karşılığında iki bedel var ve ikisi de bu hesaba dahil: prefill 0,75×'e düşüyor (ilk token ${Math.round((1 / 0.75 - 1) * 100)}% gecikiyor) ve ${gb(r.mtpEkGB)} ek VRAM gidiyor, yani sığan bağlam daralıyor. Hızlanmanın kendisi de modele göre değişiyor — ölçümlerde 1,24× ile 1,67× arası.`,
      });

    if (r.moeVerim < 0.6)
      out.push({
        tip: "uyari", baslik: `Seyrek MoE cezası: %${Math.round((1 - r.moeVerim) * 100)} hız kaybı`,
        metin: `${model.ad} her token için ${model.tp}B'nin yalnızca ${model.ap}B'sini uyandırıyor; erişim dağınık olduğu için ${cihaz.bellekTipi === "lpddr" ? "LPDDR birleşik bellekte" : "bu bellekte"} teorik bant genişliğinin ancak %${Math.round(r.moeVerim * 100)}'i gerçekleşiyor. Aynı boyutta dense bir model bu donanımda oransal olarak daha iyi kullanır.`,
      });

    const trTip = cihaz.tr === "kolay" ? "olumlu" : cihaz.tr === "kurumsal" ? "tehlike" : "uyari";
    out.push({
      tip: trTip,
      baslik: `Türkiye'de tedarik: ${TR_DURUM[cihaz.tr].kisa} · ~${paraTL(cihaz.try)}/adet`,
      metin: TR_NOT[cihaz.tr] + (cihaz.not ? ` ${cihaz.not}` : ""),
    });

    if (adet > 1)
      out.push({
        tip: r.tpEtki < 0.5 ? "uyari" : "bilgi",
        baslik: `${adet} cihaz tek küme · ${TP_ETIKET[r.link]} · verim %${Math.round(r.tpEtki * 100)}`,
        metin:
          r.link === "net"
            ? "Bu cihazlar ancak ağ/USB4 ile kümelenir; tensor parallelism verimi ~%33. Tek güçlü cihaz çoğu zaman çok sayıda zayıf kutudan iyidir."
            : r.link === "pcie"
            ? `Aynı kasada PCIe üzerinden bölünür, verim ~%60.${cihaz.slot ? ` Her kart ${cihaz.slot} slot kaplıyor — ${adet} kart için uygun anakart ve kasa gerekir.` : ""}`
            : "NVLink ile bağlanır, verim ~%86. Çok kartlı kurulumda en iyi seçenek.",
      });

    const tip = kvTipi(model.kv);
    if (tip !== "full attention (GQA)")
      out.push({
        tip: "olumlu", baslik: `Verimli attention: ${tip}`,
        metin: `Şu ayarda token başına ${r.kvKBtok.toFixed(0)} KB — full attention kullanan bir modelde bu çok daha yüksek olurdu. Uzun bağlam bu modelde belirgin ucuz.`,
      });

    if (model.gated)
      out.push({ tip: "uyari", baslik: "Kapalı (gated) depo", metin: "Bu modeli indirmek için önce HuggingFace üzerinden lisans onayı almalısın." });
    if (model.not) out.push({ tip: "bilgi", baslik: "Model notu", metin: model.not });

    if (r.sigar && tpsDurum !== "iyi")
      out.push({
        tip: tpsDurum === "kotu" ? "tehlike" : "uyari",
        baslik: `Hız hedefi ${tpsDurum === "kotu" ? "karşılanmıyor" : "sınırda"}`,
        metin: `Kullanıcı başına ~${r.kullaniciTokS.toFixed(1)} tok/s, hedefin ${hedef.tps}. Yukarıdaki sohbet önizlemesinden bunun okurken neye benzediğini görebilirsin.`,
      });
    if (r.sigar && ttftDurum !== "iyi")
      out.push({
        tip: ttftDurum === "kotu" ? "tehlike" : "uyari",
        baslik: `İlk token hedefi ${ttftDurum === "kotu" ? "aşılıyor" : "sınırda"}`,
        metin: `Yoğun anda ~${sureYazi(r.ttftYogun)}, hedefin ${hedef.ttftMs} ms. Prompt'u (${ctxYazi(girdiK)}) kısaltmak veya prefix caching açmak bunu düşürür. Ajan işlerinde uzun ilk token tolere edilebilir — o durumda hedefi yükselt.`,
      });
    if (r.sigar && kap.maxC > 0 && kullanici > kap.maxC)
      out.push({
        tip: "uyari", baslik: "Seçtiğin eşzamanlılık kapasitenin üstünde",
        metin: `Bu kurulum hedeflerini en fazla ${kap.maxC} eşzamanlı istekte tutabiliyor; sen ${kullanici} seçtin. Hedeflere göre bu donanım ~${kap.sohbet} sohbet ya da ~${kap.ajan} ajan kullanıcısı taşır.`,
      });

    return out;
  }, [model, quant, kvq, cihaz, adet, r, qAktif, kvAktif, indirGibi, ctxK, girdiK, kullanici, hedef, kap, tpsDurum, ttftDurum, quantBilgi, mtpAcik, offloadModu]);

  /* ---------------- Danışman bağlamı ---------------- */
  const sohbetBaglami =
    `Model: ${model.ad} (${model.tp}B toplam / ${model.ap}B aktif, ${model.lis}, bağlam ${ctxYazi(model.ctx)}, KV tipi ${kvTipi(model.kv)}, hf:${model.hf}).\n` +
    `Donanım: ${adet} × ${cihaz.ad} (${cihaz.mem}GB ${cihaz.bellekTipi.toUpperCase()}, ${cihaz.bw}GB/s, ${MIM_AD[cihaz.mim]}, ${cihaz.w}W, ~$${cihaz.fiyat}/${paraTL(cihaz.try)}, TR: ${TR_DURUM[cihaz.tr].ad})` +
    `${adet > 1 ? `, tek küme, ${TP_ETIKET[r.link]}, TP verimi %${Math.round(r.tpEtki * 100)}` : ""}.\n` +
    `Ayar: ${indirGibi ? "BF16 + FP16 KV (kuantizasyon yok)" : `${qAktif.ad} ağırlık / ${kvAktif.ad} KV`}, ` +
    `${ctxYazi(ctxK)} bağlam (KV için %${kvOran} doluluk varsayımı), ortalama prompt ${ctxYazi(girdiK)}, ` +
    `${kullanici} eşzamanlı kullanıcı, ortalama yanıt ${cikti} token.\n` +
    `Hesap: ağırlık ${gb(r.agirlikGB)} GB + KV ${gb(r.kvGB)} GB (${r.kvKBtok.toFixed(0)} KB/token) + çalışma ${gb(r.ekGB)} GB = ${gb(r.gerekliGB)} / ${gb(r.toplamBellek)} GB. ` +
    (r.sigar
      ? `SIĞIYOR (%${Math.round(r.doluluk * 100)}). Kullanıcı başına ~${r.kullaniciTokS.toFixed(1)} tok/s, toplam ~${Math.round(r.toplamTokS)} tok/s, ilk token ~${sureYazi(r.ttftYogun)}.`
      : `SIĞMIYOR — en az ${r.minAdet || "çok daha fazla"} adet gerekir.`) +
    (r.moeVerim < 0.999 ? ` Seyrek MoE erişim cezası nedeniyle gerçekleşen bant genişliği teorik değerin %${Math.round(r.moeVerim * 100)}'i alındı.` : "") +
    `\nMaliyet: ${para(r.maliyet)} (~${paraTL(r.maliyetTL)}), ${r.guc} W, yıllık elektrik ~${paraTL(r.yillikElektrikTL)}.` +
    (aktifProfil
      ? `\nKULLANICININ İŞ YÜKÜ: "${IS_YUKU_HARITA[aktifProfil].ad}" — ${IS_YUKU_HARITA[aktifProfil].ozet}. ` +
        `Tavsiyeni bu iş türüne göre ver; farklı iş yüklerinin darboğazı farklıdır.`
      : "\nKULLANICININ İŞ YÜKÜ: hazır profillerden birine uymuyor, kaydırakları elle ayarlamış.") +
    `\nKULLANICININ PERFORMANS HEDEFLERİ: ilk token ≤ ${hedef.ttftMs} ms, hız ≥ ${hedef.tps} tok/s, sohbet çarpanı ×${hedef.sohbetKat}, ajan çarpanı ×${hedef.ajanKat}. ` +
    (kap.maxC
      ? `Bu hedeflerle en fazla ${kap.maxC} eşzamanlı istek → ~${kap.sohbet} sohbet veya ~${kap.ajan} ajan kullanıcısı.`
      : `Hedefler C=1'de bile karşılanmıyor (sebep: ${kap.sebep === "bellek" ? "belleğe sığmıyor" : kap.sebep === "hiz" ? "hız yetersiz" : "ilk token çok uzun"}).`) +
    ` Tavsiye verirken bu hedefleri esas al; gerçekçi değillerse bunu söyle.`;

  const hfCtx = {
    quant, kvq, ctxK, girdiK, kullanici, cikti, cihaz, adet,
    kvOran: kvOran / 100, quantAd: indirGibi ? "BF16 (kuantizasyon yok)" : qAktif.ad,
  };

  const aileler = AILE_SIRA.filter((a) => MODELS.some((m) => m.aile === a));
  const gruplar = GRUP_SIRA.filter((g) => DEVICES.some((d) => d.grup === g));
  const aktifAyar = { modelId, cihazId, adet };

  /* Üst çubuğun yüksekliği dar ekranda iki satıra çıkıyor; yapışkan yan
     panel ve özet çubuğu bu değeri CSS değişkeninden okuyor. */
  const ustRef = useRef(null);
  useEffect(() => {
    const el = ustRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() =>
      document.documentElement.style.setProperty("--ust-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sayfayaGit = useCallback((k) => {
    setSekme(k);
    window.scrollTo({ top: 0 });
  }, []);

  const simulatoreYukle = useCallback((a) => { ayarYukle(a); setSekme("simulator"); }, [ayarYukle]);

  const isYukuAd = aktifProfil ? IS_YUKU_HARITA[aktifProfil].ad : "Özel iş yükü";
  const quantAd = indirGibi ? "BF16, kuantizasyon yok" : qAktif.ad;
  const gguf = /GGUF|IQ|^Q\d/.test(qAktif.ad);
  const bayrak = kvBayragi(kvq, gguf ? "gguf" : "vllm");

  /* ---------------- Yan panel: kontroller ---------------- */
  const kontroller = (
    <div style={{ display: "flex", flexDirection: "column", gap: S.md }}>
      <Panel baslik="Model" ozet={`${model.ad} · ${quantAd}`} simge={SIMGE.model}>
        <Secim etiket="Açık ağırlıklı model" deger={modelId} onChange={setModelId}>
          {aileler.map((a) => (
            <optgroup key={a} label={a}>
              {MODELS.filter((m) => m.aile === a).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.ad} · {ctxYazi(m.ctx)}{m.vl ? " · görsel" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </Secim>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -S.sm, marginBottom: S.sm }}>
          <Rozet tip="bilgi">
            {model.ap < model.tp ? `MoE · ${model.tp}B, ${model.ap}B aktif` : `Dense · ${model.tp}B`}
          </Rozet>
          <Rozet tip="bilgi">{kvTipi(model.kv)}</Rozet>
          {model.vl && <Rozet tip="olumlu">görsel giriş</Rozet>}
          {model.gated && <Rozet tip="uyari" baslik="İndirmek için HuggingFace onayı gerekir">onay gerekli</Rozet>}
        </div>
        <div style={{ ...T.mini, color: C.ink3, display: "flex", flexWrap: "wrap", gap: "2px 10px", marginBottom: S.md }}>
          <span>Bağlam {ctxYazi(model.ctx)}{model.ext ? ` (YaRN → ${ctxYazi(model.ext)})` : ""}</span>
          <span>{model.lis}</span>
          <span>KV {r.kvKBtok.toFixed(0)} KB/token</span>
          <a
            href={`https://huggingface.co/${model.hf}`} target="_blank" rel="noreferrer noopener"
            style={{ color: C.steel, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
          >
            HuggingFace {SIMGE.dis}
          </a>
        </div>

        <div style={{ borderTop: `1px solid ${C.line2}`, paddingTop: S.xs, marginBottom: S.sm }}>
          <Anahtar
            etiket="İndirdiğin gibi çalıştır"
            aciklama="BF16 ağırlık, FP16 KV — kuantizasyon yok"
            ipucu="Tam hassasiyet ağırlık (BF16) + KV cache'e dokunma (FP16). İkisi ayrı şeydir: ağırlık indirdiğin dosyada, KV ise sunucuyu başlatırken verilen bir çalışma zamanı ayarı. Belleğe sığıyorsa kuantizasyona hiç gerek yok."
            isaretli={indirGibi} onChange={setIndirGibi}
          />
          {/* MTP yalnızca modelin head'i varsa gösterilir — config.json'dan
              okundu, tahmin değil. Olmayan modelde seçenek sunmak yanıltıcı olur. */}
          {model.mtp ? (
            <Anahtar
              etiket="Speculative decoding (MTP)"
              aciklama={r.mtpAktif ? `${r.mtpHizlanma}× daha hızlı yazma` : `Modelde ${model.mtp} MTP head'i var`}
              ipucu="Açıldığında her adımda bir taslak token daha üretilir; kabul edilen taslak neredeyse bedava gelir, kalite değişmez. vLLM/SGLang'de tek satırlık ayar. Bedeli: prefill 0,75×'e düşer (ilk token gecikir) ve ~1 GB VRAM gider, yani sığan bağlam daralır."
              isaretli={mtpAcik} onChange={setMtpAcik}
            />
          ) : null}
        </div>

        {!indirGibi && (
          <>
            <Secim
              etiket="Ağırlık kuantizasyonu"
              deger={quant}
              onChange={setQuant}
              ipucu="Ağırlıkların kaç bitle saklandığı. Bu, indirdiğin dosyanın kendisidir: Q4_K_M gibi bir GGUF dosyası seçtiğinde ağırlıklar o hassasiyetle gelir. Düşük bit = daha az bellek ve daha hızlı, ama biraz kalite kaybı."
              alt={
                quantAraniyor
                  ? "HuggingFace'te hazır dosyalar aranıyor…"
                  : quantBilgi && !quantBilgi.bilinmiyor
                  ? `${quantBilgi.depolar.length} GGUF deposunda bulunan şemalar listeleniyor.`
                  : "Hazır dosya araması sonuç vermedi — tüm şemalar gösteriliyor."
              }
            >
              {QUANT_GRUP.map((g) => {
                const secenekler = QUANTS.filter((q) => {
                  if (q.grup !== g) return false;
                  if (tumQuantlar || q.id === quant) return true;
                  // "bilinmiyor" olanlar (FP8/NVFP4/AWQ gibi GGUF dışı
                  // formatlar) bu aramayla ölçülemez, hep gösterilir.
                  return quantBilgi?.durum?.[q.id] !== "yok";
                });
                if (!secenekler.length) return null;
                return (
                  <optgroup key={g} label={g}>
                    {secenekler.map((q) => {
                      const d = quantBilgi?.durum?.[q.id];
                      const isaret = d === "var" ? " ✓" : d === "yok" ? " · hazır dosya yok" : "";
                      return (
                        <option key={q.id} value={q.id}>
                          {q.ad} — {q.bit}, kalite ~{q.kalite}{isaret}
                        </option>
                      );
                    })}
                  </optgroup>
                );
              })}
            </Secim>

            {quantBilgi && !quantBilgi.bilinmiyor && (
              <div style={{ marginTop: -S.sm, marginBottom: S.md }}>
                <Anahtar
                  etiket="Hazır dosyası olmayanları da göster"
                  aciklama="Kendin kuantize edeceksen"
                  isaretli={tumQuantlar} onChange={setTumQuantlar}
                />
              </div>
            )}

            <Secim
              etiket="KV cache kuantizasyonu" deger={kvq} onChange={setKvq}
              ipucu={kvAktif.not}
            >
              {KVQUANTS.map((q) => <option key={q.id} value={q.id}>{q.ad}</option>)}
            </Secim>

            {/* En sık karışan nokta: KV kuantizasyonu indirilen dosyanın
                içinde GELMEZ, sunucuyu başlatırken bayrakla açılır. */}
            <div style={{ marginTop: -S.sm, marginBottom: S.sm }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ ...T.mini, color: C.ink3 }}>Sunucuyu başlatırken</span>
                <Ipucu>
                  KV kuantizasyonu indirdiğin dosyada gelmez ve otomatik açılmaz. KV cache konuşma
                  başlayınca oluşur, bu yüzden hassasiyeti sunucuyu başlatırken bayrakla verilir. Her
                  yığının varsayılanı tam hassasiyettir; bayrağı vermezsen buradaki bellek hesabı tutmaz.
                </Ipucu>
              </div>
              {bayrak.durum === "bayrak" ? (
                <Kod>{gguf ? "llama-server … " : "vllm serve … "}{bayrak.bayrak}</Kod>
              ) : (
                <div style={{ ...T.mini, color: C.ink3 }}>
                  {bayrak.durum === "varsayilan"
                    ? "Varsayılan davranış — ek bayrak gerekmiyor."
                    : `${gguf ? "llama.cpp" : "vLLM"} bu şemayı desteklemiyor; ${gguf ? "FP8/q8_0" : "FP8"} seç ya da diğer yığına geç.`}
                </div>
              )}
            </div>
          </>
        )}
      </Panel>

      <Panel baslik="İş yükü" ozet={`${isYukuAd} · ${kullanici} kişi · ${ctxYazi(ctxK)} bağlam`} simge={SIMGE.is}>
        <Secim
          etiket="Ne inşa ediyorsun?"
          deger={aktifProfil || "ozel"}
          onChange={(v) => v !== "ozel" && profilUygula(v)}
          ipucu={aktifProfil
            ? IS_YUKU_HARITA[aktifProfil].neden
            : "Bir profil seçince beş kaydırak ve dört performans hedefi birden dolar. Kaydıraklardan birini oynattığın an profil “özel”e döner — profil yalnızca bir başlangıç noktasıdır."}
        >
          <option value="ozel">Özel — kaydırakları kendim ayarlıyorum</option>
          {IS_YUKLERI.map((p) => (
            <option key={p.id} value={p.id}>{p.ad} — {p.ozet}</option>
          ))}
        </Secim>

        <Kaydirac
          etiket="Eşzamanlı kullanıcı" deger={kullanici} onChange={setKullanici}
          min={1} max={64} step={1} goster={`${kullanici} kişi`}
          ipucu="Aynı anda modelden cevap bekleyen istek sayısı. Toplam kullanıcı sayısı değildir — sohbet eden biri zamanının çoğunu okuyarak geçirir."
        />
        <Kaydirac
          etiket="Bağlam penceresi" deger={ctxK} onChange={setCtxK}
          min={4} max={1024} olcek="log" goster={`${ctxYazi(ctxK)} token`}
          ipucu="Her kullanıcı için ayrılan en uzun konuşma/belge uzunluğu. Uzun bağlam daha çok KV cache, yani daha çok bellek demek."
          alt={ctxK > model.ctx ? `Modelin desteği ${ctxYazi(model.ctx)} — aşıyorsun` : undefined}
        />
        <Kaydirac
          etiket="Ortalama prompt" deger={girdiK} onChange={setGirdiK}
          min={1} max={Math.max(4, ctxK)} olcek="log" goster={`${ctxYazi(girdiK)} token`}
          ipucu="Her istekte modelin işlemesi gereken yeni metin. İlk token gecikmesini bu belirler. Prefix caching açıksa yalnızca yeni token'lar sayılır."
        />
        <Kaydirac
          etiket="Ortalama yanıt" deger={cikti} onChange={setCikti}
          min={100} max={8000} step={100} goster={`${cikti} token`}
          ipucu={`Modelin bir yanıtta ürettiği metin. ${cikti} token yaklaşık ${harfYazi(cikti).replace("~", "")}.`}
        />
        <Kaydirac
          etiket="KV doluluk varsayımı" deger={kvOran} onChange={setKvOran}
          min={10} max={100} step={5} goster={`%${kvOran}`}
          ipucu="Her kullanıcının bağlam penceresini ortalama ne kadar doldurduğu. %100 en kötü senaryodur; sohbette çoğu konuşma pencerenin küçük bir kısmını kullanır."
        />
      </Panel>

      <Panel baslik="Donanım" ozet={`${adet} × ${cihaz.ad}`} simge={SIMGE.donanim}>
        <Secim etiket="Cihaz" deger={cihazId} onChange={setCihazId}>
          {gruplar.map((g) => (
            <optgroup key={g} label={g}>
              {DEVICES.filter((d) => d.grup === g).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ad} · {d.mem} GB{d.tr === "kolay" ? " · TR ✓" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </Secim>
        <Kaydirac
          etiket={cihaz.gpu ? "Sunucu sayısı" : "Adet"} deger={adet} onChange={setAdet}
          min={1} max={16} step={1}
          goster={cihaz.gpu ? `${adet} sunucu · ${adet * cihaz.gpu.adet} GPU` : `${adet} adet`}
          ipucu={cihaz.gpu
            ? "Sunucular arası bağlantı ağ üzerinden varsayılır (kötü senaryo). Model tek sunucuya sığıyorsa gerçekte her sunucu ayrı bir kopya çalıştırır ve kapasite sunucu sayısıyla çarpılır."
            : "Birden fazla cihaz tek küme olarak modeli paylaşır (tensor parallelism). Bağlantı NVLink, PCIe ya da ağ olabilir; verim buna göre düşer."}
        />

        <dl
          style={{
            margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
            background: C.line2, border: `1px solid ${C.line2}`, borderRadius: RADIUS.md, overflow: "hidden",
          }}
        >
          {[
            ["Bellek", `${cihaz.mem} GB ${cihaz.bellekTipi.toUpperCase()}`],
            ["Bant genişliği", `${cihaz.bw} GB/s`],
            ["Güç", `${cihaz.w} W`],
            ["Birim fiyat", `~${paraTL(cihaz.try)}`],
            ["Mimari", MIM_AD[cihaz.mim]],
            ["Türkiye", <span key="tr" style={{ color: TR_DURUM[cihaz.tr].renk }}>{TR_DURUM[cihaz.tr].kisa}</span>],
          ].map(([e, v]) => (
            <div key={e} style={{ background: C.paper, padding: `${S.sm}px ${S.md}px`, minWidth: 0 }}>
              <dt style={{ ...T.mini, color: C.ink3 }}>{e}</dt>
              <dd style={{ ...T.kucuk, ...RAKAMLAR, color: C.ink, fontWeight: 500, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</dd>
            </div>
          ))}
        </dl>
        <div style={{ ...T.mini, color: C.ink3, marginTop: S.sm, display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
          <span>Yığın: {(YIGIN[cihaz.mim] || []).slice(0, 3).join(", ")}</span>
          {adet > 1 && (
            <span style={{ color: r.tpEtki < 0.5 ? C.bad : C.ink3 }}>
              {TP_ETIKET[r.link]} · verim %{Math.round(r.tpEtki * 100)}
            </span>
          )}
          <span style={{ color: cihaz.mbuKalibre ? C.ok : C.ink3 }}>
            Bant kullanımı %{Math.round(cihaz.mbu * 100)} {cihaz.mbuKalibre ? "(ölçümün)" : "(tahmin)"}
          </span>
        </div>

        <SistemOzellik cihaz={cihaz} kompakt />
      </Panel>

      <Panel
        baslik="Gelişmiş" acikBaslangic={false} simge={SIMGE.ayar}
        ozet={cihaz.tur === "kart" ? "Offload, sistem RAM'i, kalibrasyon" : "Kendi ölçümünle kalibrasyon"}
      >
        {/* Offload yalnızca ayrık kartlarda anlamlı: birleşik bellekli
            kutuda ağırlıklar zaten sistem RAM'inde, taşınacak yer yok. */}
        {cihaz.tur === "kart" && (
          <>
            <Secim
              etiket="Sistem RAM'i" deger={String(sistemRam)} onChange={(v) => setSistemRam(Number(v))}
              ipucu={`Offload tavanını bu belirler (işletim sistemi için ${RAM_ISLETIM_PAYI} GB pay bırakılır).`}
            >
              <option value="0">Ana sisteme göre — {anaSistem(adet).ram} GB</option>
              {RAM_SECENEK.map((g) => <option key={g} value={g}>{g} GB</option>)}
            </Secim>
            <Secim
              etiket="Offload (sistem RAM'ine taşıma)"
              deger={offloadModu} onChange={setOffloadModu}
              ipucu="Model VRAM'e sığmıyorsa ağırlığın bir kısmı sistem RAM'ine taşınabilir. O kısım her adımda PCIe üzerinden okunduğu için yavaşlar; MoE modellerde ceza çok daha hafiftir."
              alt={
                offloadModu === "kapali"
                  ? "Model VRAM'e sığmıyorsa “sığmıyor” denir."
                  : r.offload > 0
                  ? `${gb(r.offload)} GB taşındı (ağırlığın %${Math.round(r.offloadOrani * 100)}'i) — VRAM'den ${Math.round((r.kumeBW * cihaz.mbu) / r.pcieBW)}× yavaş okunuyor.`
                  : "Gerek yok — model zaten VRAM'e sığıyor."
              }
            >
              <option value="otomatik">Otomatik — gerektiği kadar taşı</option>
              <option value="kapali">Kapalı — yalnızca VRAM kullan</option>
            </Secim>
          </>
        )}
        <div style={{ ...T.kucuk, fontWeight: 500, color: C.ink, marginBottom: 4 }}>Kendi ölçümünle kalibre et</div>
        <div style={{ ...T.mini, color: C.ink3 }}>
          Bu kurulumu kendi kartında ölçtüysen tok/s değerini gir; bu karttaki tüm tahminler ona göre düzelir.
        </div>
        <Kalibrasyon
          cihaz={cihaz} simHiz={r.kullaniciTokS} sigar={r.sigar}
          kalibrasyon={kalibrasyonlar[cihaz.id]}
          uygula={(id, v) => setKalibrasyonlar(kalibrasyonKaydet(id, { ...v, model: model.ad, quant: qAktif.ad }))}
          sil={(id) => setKalibrasyonlar(kalibrasyonSil(id))}
        />
      </Panel>
    </div>
  );

  /* ---------------- Sağ: sonuç ---------------- */
  const sonuclar = (
    <div style={{ display: "flex", flexDirection: "column", gap: S.lg, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: S.sm, flexWrap: "wrap" }}>
        <span style={{ ...T.mini, color: C.ink3, fontWeight: 500, marginRight: 2 }}>Hazır senaryolar</span>
        {SENARYOLAR.map((s) => (
          <button
            key={s.ad} onClick={() => ayarYukle(s.ayar)} title={s.aciklama} className="dokun"
            style={{
              background: C.paper, color: C.ink2, border: `1px solid ${C.line}`,
              borderRadius: RADIUS.hap, padding: "5px 12px", fontSize: 12.5, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {s.ad}
          </button>
        ))}
      </div>

      <Sonuc
        r={r} kap={kap} model={model} cihaz={cihaz} adet={adet} quant={quant}
        qAktif={qAktif} indirGibi={indirGibi} ctxK={ctxK} girdiK={girdiK}
        kullanici={kullanici} cikti={cikti} kvOran={kvOran} hedef={hedef}
        tpsDurum={tpsDurum} ttftDurum={ttftDurum} bildirimler={bildirimler}
        isYuku={isYukuAd}
        deneyim={
          <Hedefler
            hedef={hedef} setHedef={setHedef} kap={kap}
            tps={r.sigar ? r.kullaniciTokS : 0}
            ttftMs={r.sigar ? r.ttftYogun * 1000 : 0}
            sigar={r.sigar}
            modelAd={model.ad} donanimAd={`${adet} × ${cihaz.ad}`}
            dusunmeSeviye={dusunmeSeviye} setDusunmeSeviye={setDusunmeSeviye}
          />
        }
      />
    </div>
  );

  /* Diğer sayfalarda hesap hep şu anki kurulumla yapılıyor; bunu
     söylemezsek tablo "neden bu sayılar" sorusunu cevapsız bırakır. */
  const baglamSeridi = (
    <div
      style={{
        display: "flex", alignItems: "center", gap: `${S.xs}px ${S.md}px`, flexWrap: "wrap",
        background: C.paper, border: `1px solid ${C.line}`, borderRadius: RADIUS.lg,
        padding: `${S.sm + 2}px ${S.lg}px`, marginBottom: S.lg, ...T.kucuk,
      }}
    >
      <span style={{ color: C.ink3 }}>Hesaplar şu kuruluma göre:</span>
      <b style={{ color: C.ink, fontWeight: 600 }}>{model.ad}</b>
      <span style={{ color: C.ink3 }}>·</span>
      <span style={{ color: C.ink2 }}>{adet} × {cihaz.ad}</span>
      <span style={{ color: C.ink3 }}>·</span>
      <span style={{ color: C.ink2 }}>{isYukuAd}, {kullanici} kişi, {ctxYazi(ctxK)} bağlam</span>
      <button
        onClick={() => sayfayaGit("simulator")}
        style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: C.steel, fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}
      >
        Simülatörde değiştir {SIMGE.ok}
      </button>
    </div>
  );

  return (
    <div style={{ fontFamily: SANS, background: C.wash, color: C.ink, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ================= ÜST ÇUBUK ================= */}
      <header
        ref={ustRef}
        style={{
          position: "sticky", top: 0, zIndex: 45,
          background: "color-mix(in srgb, var(--paper) 88%, transparent)",
          backdropFilter: "saturate(1.6) blur(12px)", WebkitBackdropFilter: "saturate(1.6) blur(12px)",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div className="ust-ic sayfa-ic" style={{ maxWidth: 1480, margin: "0 auto", padding: "0 24px" }}>
          <button
            onClick={() => sayfayaGit("simulator")}
            style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
            aria-label="Simülatöre dön"
          >
            <span
              aria-hidden="true"
              style={{
                width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center",
                background: "linear-gradient(135deg, #6366f1, #4338ca)", boxShadow: GOLGE.hafif,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2.5" y="3" width="11" height="2.4" rx="1.2" fill="#fff" />
                <rect x="2.5" y="6.8" width="7.5" height="2.4" rx="1.2" fill="#f0a060" />
                <rect x="2.5" y="10.6" width="4.5" height="2.4" rx="1.2" fill="#c7caf7" />
              </svg>
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>LLM Kapasite</span>
              <span className="marka-alt" style={{ fontSize: 11.5, color: C.ink3 }}>
                {MODELS.length} model · {DEVICES.length} donanım · TR fiyatları
              </span>
            </span>
          </button>

          <nav className="ust-nav" role="tablist" aria-label="Sayfalar">
            {SAYFALAR.map((p) => {
              const secili = sekme === p.k;
              return (
                <button
                  key={p.k} role="tab" aria-selected={secili} className="nav-sekme"
                  onClick={() => sayfayaGit(p.k)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 13.5, fontWeight: secili ? 600 : 500, whiteSpace: "nowrap",
                    padding: "7px 12px", borderRadius: RADIUS.md, border: "none", cursor: "pointer",
                    background: secili ? C.steelSoft : "transparent",
                    color: secili ? C.steel : C.ink2,
                  }}
                >
                  {p.ad}
                  {p.rozet != null && (
                    <span style={{ ...T.sayi, fontSize: 11, padding: "0 6px", borderRadius: RADIUS.hap, background: secili ? C.paper : C.wash, color: secili ? C.steel : C.ink3 }}>
                      {p.rozet}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div
            role="radiogroup" aria-label="Tema"
            style={{ display: "inline-flex", padding: 3, gap: 2, background: C.wash, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, marginLeft: "auto", flexShrink: 0 }}
          >
            {[["light", SIMGE.acik, "Açık"], ["sistem", SIMGE.sistem, "Sistem"], ["dark", SIMGE.koyu, "Koyu"]].map(([k, sm, ad]) => {
              const secili = tema === k;
              return (
                <button
                  key={k} role="radio" aria-checked={secili} title={`Tema: ${ad.toLowerCase()}`} aria-label={`Tema: ${ad.toLowerCase()}`}
                  onClick={() => setTema(k)}
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                    fontSize: 12, fontWeight: secili ? 600 : 500, minWidth: 28,
                    padding: "5px 7px", borderRadius: RADIUS.sm, cursor: "pointer",
                    border: "none", background: secili ? C.paper : "transparent",
                    color: secili ? C.ink : C.ink3, boxShadow: secili ? GOLGE.hafif : "none",
                  }}
                >
                  {sm}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="sayfa-ic" style={{ width: "100%", maxWidth: 1480, margin: "0 auto", padding: `${S.xl}px 24px 120px`, flex: 1 }}>
        {sekme === "simulator" ? (
          <>
            <div style={{ marginBottom: S.xl }}>
              <h1 style={{ ...T.dev, margin: 0, color: C.ink }}>Hangi donanım, kaç adet, ne kadar token?</h1>
              <p style={{ ...T.govde, color: C.ink3, margin: `${S.xs + 2}px 0 0`, maxWidth: 760 }}>
                Modeli, iş yükünü ve donanımı seç; belleğe sığıp sığmadığını, ne hızda
                çalışacağını ve kaç kişiye yeteceğini anında gör. KV cache her modelin
                gerçek katman geometrisinden hesaplanır.
              </p>
            </div>
            <div className="sim-izgara">
              <aside className="sim-kenar" data-kaydirma="kasitli" aria-label="Ayarlar">{kontroller}</aside>
              {sonuclar}
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: S.lg }}>
              <h1 style={{ ...T.dev, margin: 0, color: C.ink }}>{SAYFA_BASLIK[sekme][0]}</h1>
              <p style={{ ...T.govde, color: C.ink3, margin: `${S.xs + 2}px 0 0`, maxWidth: 760 }}>
                {SAYFA_BASLIK[sekme][1]}
              </p>
            </div>
            {sekme !== "bilgi" && baglamSeridi}
            {sekme === "bantlar" && (
              <Bantlar hedef={hedef} kvOran={kvOran / 100} yukle={simulatoreYukle} aktifAyar={aktifAyar} />
            )}
            {sekme === "donanim" && (
              <DonanimTablosu
                ortak={ortak} model={model} cihazId={cihazId} hedef={hedef}
                kullanici={kullanici} girdiK={girdiK} ctxK={ctxK}
                sec={(id, n) => { setCihazId(id); setAdet(n); }}
              />
            )}
            {sekme === "modeller" && (
              <ModelTablosu
                ortak={ortak} cihaz={cihaz} adet={adet} modelId={modelId}
                qAktif={qAktif} indirGibi={indirGibi} ctxK={ctxK} kullanici={kullanici}
                sec={(id, cozum) => {
                  setModelId(id);
                  if (cozum) { setIndirGibi(false); setQuant(cozum.id); setKvq("q4"); }
                }}
              />
            )}
            {sekme === "grafik" && (
              <Grafik ortak={ortak} model={model} cihaz={cihaz} adet={adet} girdiK={girdiK} hedef={hedef} />
            )}
            {sekme === "bilgi" && <Bilgi />}
          </>
        )}
      </main>

      <footer style={{ borderTop: `1px solid ${C.line}`, background: C.paper }}>
        <div
          className="sayfa-ic"
          style={{
            maxWidth: 1480, margin: "0 auto", padding: `${S.lg}px 24px`, ...T.mini, color: C.ink3,
            display: "flex", justifyContent: "space-between", gap: S.md, flexWrap: "wrap",
          }}
        >
          <span>Seçimlerin adres çubuğunda saklanır — linki paylaşırsan karşı taraf aynı kurulumu görür.</span>
          <a href="https://github.com/furkanyesildag/Gpudeneme" target="_blank" rel="noreferrer noopener" style={{ color: C.ink2, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
            GitHub'da kaynak kodu {SIMGE.dis}
          </a>
        </div>
      </footer>

      <ChatBot baglam={sohbetBaglami} hfCtx={hfCtx} acikDis={sohbetAcik} setAcikDis={setSohbetAcik} />
    </div>
  );
}
