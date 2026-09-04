import React, { useState, useMemo, useEffect, useCallback } from "react";

import { C, MONO, SANS, S, T, RADIUS, GOLGE } from "./theme.js";
import { MODELS, MODEL_HARITA, AILE_SIRA } from "./data/models.js";
import {
  DEVICES, CIHAZ_HARITA, GRUP_SIRA, TR_DURUM, TR_NOT, MIM_AD,
  FP4_NATIVE, FP8_NATIVE, YIGIN,
} from "./data/devices.js";
import { QUANTS, QUANT_HARITA, KVQUANTS, KVQUANT_HARITA, DUSUK_QUANT_ONER } from "./data/quants.js";
import { SENARYOLAR } from "./data/concepts.js";
import {
  hesapla, kapasite, hedefDurumu, kvTipi, ctxYazi, harfYazi,
  para, paraTL, gb, sureYazi, TP_ETIKET, VARSAYILAN_HEDEF,
} from "./engine.js";
import {
  Kart, Bolum, Etiket, Secim, Kaydirac, Onay, Rozet, Dugme, Sekmeler, Aciklama,
} from "./components/ui.jsx";
import Hedefler from "./components/Hedefler.jsx";
import Sonuc from "./sections/Sonuc.jsx";
import Bantlar from "./sections/Bantlar.jsx";
import Grafik from "./sections/Grafik.jsx";
import { DonanimTablosu, ModelTablosu } from "./sections/Tablolar.jsx";
import Bilgi from "./sections/Bilgi.jsx";
import ChatBot from "./chat/ChatBot.jsx";
import { durumuOku, durumuYaz } from "./urlDurum.js";

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
  if (quantId === "q3")
    return { tip: "tehlike", mesaj: "Agresif 3-bit: her yerde çalışır ama kalite gözle görülür düşer. Genelde bir küçük modelin Q6'sı, büyük modelin Q3'ünden iyidir." };
  if (quantId === "q4qat")
    return { tip: "olumlu", mesaj: "QAT sürümü varsa daima düz Q4 yerine bunu seç — aynı boyut, çok daha az kalite kaybı." };
  return { tip: "bilgi", mesaj: "GGUF/llama.cpp tabanlı: CPU dahil her donanımda çalışır. Güvenli ve taşınabilir yerel format." };
}

const VARSAYILAN = {
  modelId: "qwen38_27b", cihazId: "5090", adet: 1, quant: "q4", kvq: "fp8",
  ctxK: 32, girdiK: 2, kullanici: 4, cikti: 800, kvOran: 60, indirGibi: false,
};

const HEDEF_RENK = { iyi: C.ok, sinir: C.warn, kotu: C.bad };

const SEKMELER = [
  { k: "bantlar", ad: "Satın alma bantları", rozet: 5 },
  { k: "donanim", ad: "Donanım karşılaştırması" },
  { k: "modeller", ad: "Model uyumu" },
  { k: "grafik", ad: "Duyarlılık grafiği" },
  { k: "bilgi", ad: "Kavramlar ve varsayımlar" },
];

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
  const [hedef, setHedef] = useState(() => ({ ...VARSAYILAN_HEDEF, ...ilk.hedef }));

  const [dusunme, setDusunme] = useState(false);
  const [dusunmeTok, setDusunmeTok] = useState(800);
  const [sekme, setSekme] = useState("bantlar");
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
  const cihaz = CIHAZ_HARITA[cihazId] || DEVICES[0];
  const qAktif = QUANT_HARITA[quant] || QUANTS[0];
  const kvAktif = KVQUANT_HARITA[kvq] || KVQUANTS[0];

  useEffect(() => {
    if (indirGibi && (quant !== "bf16" || kvq !== "fp16")) { setQuant("bf16"); setKvq("fp16"); }
  }, [indirGibi, quant, kvq]);

  useEffect(() => { if (girdiK > ctxK) setGirdiK(Math.max(1, Math.round(ctxK / 2))); }, [ctxK, girdiK]);

  useEffect(() => {
    durumuYaz({ modelId, cihazId, adet, quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran, indirGibi, hedef });
  }, [modelId, cihazId, adet, quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran, indirGibi, hedef]);

  const ortak = useMemo(
    () => ({ quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran: kvOran / 100 }),
    [quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran]
  );

  const r = useMemo(() => hesapla({ ...ortak, model, cihaz, adet }), [ortak, model, cihaz, adet]);

  const kap = useMemo(() => {
    const { kullanici: _y, ...taban } = ortak;
    return kapasite({ ...taban, model, cihaz, adet }, hedef);
  }, [ortak, model, cihaz, adet, hedef]);

  const tpsDurum = r.sigar ? hedefDurumu(r.kullaniciTokS, hedef.tps, true) : "kotu";
  const ttftDurum = r.sigar ? hedefDurumu(r.ttftYogun * 1000, hedef.ttftMs, false) : "kotu";

  /* Bir hazır ayarı (senaryo veya bant) yükle. */
  const ayarYukle = useCallback((a) => {
    setIndirGibi(!!a.indirGibi);
    setModelId(a.modelId); setCihazId(a.cihazId); setAdet(a.adet);
    setQuant(a.quant); setKvq(a.kvq); setCtxK(a.ctxK); setGirdiK(a.girdiK);
    setKullanici(a.kullanici); setCikti(a.cikti);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ---------------- Bildirimler ---------------- */
  const bildirimler = useMemo(() => {
    const out = [];
    const uyum = quantUyum(cihaz, quant);
    out.push({ tip: uyum.tip, baslik: `${qAktif.ad} · ${cihaz.ad}`, metin: uyum.mesaj });

    if (!r.sigar) {
      out.push({
        tip: "tehlike", baslik: "Belleğe sığmıyor",
        metin:
          `${adet} × ${cihaz.ad} (${gb(r.toplamBellek)} GB) bu ayarlara yetmiyor: ${gb(r.gerekliGB)} GB gerekiyor. ` +
          (r.agirlikGB > r.toplamBellek
            ? `Ağırlıklar tek başına ${gb(r.agirlikGB)} GB — ${DUSUK_QUANT_ONER[quant]} veya en az ${r.minAdet ? `${r.minAdet} adet` : "çok daha fazla"} cihaz gerekir.`
            : `Taşıran şey KV cache (${gb(r.kvGB)} GB). Kullanıcıyı ${r.maxKullanici}'e ya da bağlamı ${ctxYazi(Math.floor(r.maxCtxK))}'e düşür, ya da KV'yi ${kvq === "fp16" ? "FP8" : "Q4"} yap.`),
      });
    } else if (r.doluluk > 0.9) {
      out.push({
        tip: "uyari", baslik: "Bellek sınırında",
        metin: `Bellek %${Math.round(r.doluluk * 100)} dolu. Üretimde %80'in altını hedefle — ani uzun istem veya ek kullanıcı taşırır.`,
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
        metin: `${model.ad} doğuştan ${ctxYazi(model.ctx)} destekliyor. ${ctxYazi(ctxK)} için RoPE ölçeklendirmesi açman gerekir; kısa istemlerde kalite bir miktar düşebilir.`,
      });

    if (indirGibi)
      out.push({
        tip: "olumlu", baslik: "Kuantizasyon yok — indirdiğin gibi",
        metin: "Modeli HuggingFace'ten indirip olduğu gibi çalıştırmak (BF16 + FP16 KV). Belleğe sığıyorsa kuantizasyona hiç gerek yok.",
      });
    else if (kvq !== "fp16")
      out.push({ tip: "bilgi", baslik: `KV cache: ${kvAktif.ad}`, metin: kvAktif.not });

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
            ? "Bu cihazlar ancak ağ/USB4 ile kümelenir; tensör paralelliği verimi ~%33. Tek güçlü cihaz çoğu zaman çok sayıda zayıf kutudan iyidir."
            : r.link === "pcie"
            ? `Aynı kasada PCIe üzerinden bölünür, verim ~%60.${cihaz.slot ? ` Her kart ${cihaz.slot} slot kaplıyor — ${adet} kart için uygun anakart ve kasa gerekir.` : ""}`
            : "NVLink ile bağlanır, verim ~%86. Çok kartlı kurulumda en iyi seçenek.",
      });

    const tip = kvTipi(model.kv);
    if (tip !== "tam (GQA)")
      out.push({
        tip: "olumlu", baslik: `Verimli dikkat: ${tip}`,
        metin: `Şu ayarda token başına ${r.kvKBtok.toFixed(0)} KB — tam dikkatli bir modelde bu çok daha yüksek olurdu. Uzun bağlam bu modelde belirgin ucuz.`,
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
        metin: `Yoğun anda ~${sureYazi(r.ttftYogun)}, hedefin ${hedef.ttftMs} ms. İstemi (${ctxYazi(girdiK)}) kısaltmak veya önek önbelleği açmak bunu düşürür. Ajan işlerinde uzun ilk token tolere edilebilir — o durumda hedefi yükselt.`,
      });
    if (r.sigar && kap.maxC > 0 && kullanici > kap.maxC)
      out.push({
        tip: "uyari", baslik: "Seçtiğin eşzamanlılık kapasitenin üstünde",
        metin: `Bu kurulum hedeflerini en fazla ${kap.maxC} eşzamanlı istekte tutabiliyor; sen ${kullanici} seçtin. Hedeflere göre bu donanım ~${kap.sohbet} sohbet ya da ~${kap.ajan} ajan kullanıcısı taşır.`,
      });

    return out;
  }, [model, quant, kvq, cihaz, adet, r, qAktif, kvAktif, indirGibi, ctxK, girdiK, kullanici, hedef, kap, tpsDurum, ttftDurum]);

  /* ---------------- Danışman bağlamı ---------------- */
  const sohbetBaglami =
    `Model: ${model.ad} (${model.tp}B toplam / ${model.ap}B aktif, ${model.lis}, bağlam ${ctxYazi(model.ctx)}, KV tipi ${kvTipi(model.kv)}, hf:${model.hf}).\n` +
    `Donanım: ${adet} × ${cihaz.ad} (${cihaz.mem}GB ${cihaz.bellekTipi.toUpperCase()}, ${cihaz.bw}GB/s, ${MIM_AD[cihaz.mim]}, ${cihaz.w}W, ~$${cihaz.fiyat}/${paraTL(cihaz.try)}, TR: ${TR_DURUM[cihaz.tr].ad})` +
    `${adet > 1 ? `, tek küme, ${TP_ETIKET[r.link]}, TP verimi %${Math.round(r.tpEtki * 100)}` : ""}.\n` +
    `Ayar: ${indirGibi ? "BF16 + FP16 KV (kuantizasyon yok)" : `${qAktif.ad} ağırlık / ${kvAktif.ad} KV`}, ` +
    `${ctxYazi(ctxK)} bağlam (KV için %${kvOran} doluluk varsayımı), ortalama istem ${ctxYazi(girdiK)}, ` +
    `${kullanici} eşzamanlı kullanıcı, ortalama yanıt ${cikti} token.\n` +
    `Hesap: ağırlık ${gb(r.agirlikGB)} GB + KV ${gb(r.kvGB)} GB (${r.kvKBtok.toFixed(0)} KB/token) + çalışma ${gb(r.ekGB)} GB = ${gb(r.gerekliGB)} / ${gb(r.toplamBellek)} GB. ` +
    (r.sigar
      ? `SIĞIYOR (%${Math.round(r.doluluk * 100)}). Kullanıcı başına ~${r.kullaniciTokS.toFixed(1)} tok/s, toplam ~${Math.round(r.toplamTokS)} tok/s, ilk token ~${sureYazi(r.ttftYogun)}.`
      : `SIĞMIYOR — en az ${r.minAdet || "çok daha fazla"} adet gerekir.`) +
    (r.moeVerim < 0.999 ? ` Seyrek MoE erişim cezası nedeniyle gerçekleşen bant genişliği teorik değerin %${Math.round(r.moeVerim * 100)}'i alındı.` : "") +
    `\nMaliyet: ${para(r.maliyet)} (~${paraTL(r.maliyetTL)}), ${r.guc} W, yıllık elektrik ~${paraTL(r.yillikElektrikTL)}.` +
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

  return (
    <div style={{ fontFamily: SANS, background: C.wash, color: C.ink, minHeight: "100%" }}>
      {/* ================= BAŞLIK ================= */}
      <header
        style={{
          background: C.paper, borderBottom: `1px solid ${C.line}`,
          padding: `${S.lg}px ${S.lg}px ${S.md}px`,
        }}
      >
        <div style={{ maxWidth: 1560, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: S.lg, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260, flex: "1 1 480px" }}>
            <div style={{ ...T.etiket, color: C.steel, marginBottom: 6 }}>
              Yerel LLM altyapısı · kapasite simülasyonu
            </div>
            <h1 style={{ ...T.dev, margin: 0, color: C.ink }}>
              Hangi donanım, kaç adet, ne kadar token
            </h1>
            <p style={{ ...T.govde, color: C.ink2, margin: `${S.sm}px 0 0`, maxWidth: 720 }}>
              {MODELS.length} açık ağırlıklı model, {DEVICES.length} donanım, Türkiye fiyatlarıyla.
              KV cache hesabı her modelin gerçek{" "}
              <code style={{ fontFamily: MONO, fontSize: 12.5 }}>config.json</code> katman
              geometrisinden yapılır.
            </p>
          </div>
          <div style={{ display: "flex", gap: S.sm, alignItems: "center", flexWrap: "wrap" }}>
            <Dugme tur="birincil" boy="buyuk" onClick={() => setSohbetAcik(true)}>💬 Danışmana sor</Dugme>
            <select
              value={tema} onChange={(e) => setTema(e.target.value)} aria-label="Tema"
              style={{ fontFamily: SANS, fontSize: 12.5, padding: "8px 9px", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, background: C.paper, color: C.ink }}
            >
              <option value="sistem">Tema: sistem</option>
              <option value="light">Tema: açık</option>
              <option value="dark">Tema: koyu</option>
            </select>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1560, margin: "0 auto", padding: `${S.lg}px ${S.lg}px 110px` }}>
        {/* ---------------- Hazır senaryolar ---------------- */}
        <div style={{ display: "flex", alignItems: "center", gap: S.md, flexWrap: "wrap", marginBottom: S.md }}>
          <Etiket>Hazır senaryo</Etiket>
          {SENARYOLAR.map((s) => (
            <button
              key={s.ad} onClick={() => ayarYukle(s.ayar)} title={s.aciklama}
              style={{
                background: C.paper, color: C.ink2, border: `1px solid ${C.line}`,
                borderRadius: RADIUS.hap, padding: "6px 13px", fontFamily: SANS,
                fontSize: 12.5, cursor: "pointer", boxShadow: GOLGE.hafif,
              }}
            >
              {s.ad}
            </button>
          ))}
        </div>

        {/* ---------------- Kontroller + Sonuç ---------------- */}
        <div style={{ display: "flex", gap: S.md, alignItems: "flex-start", flexWrap: "wrap", marginBottom: S.md }}>
          {/* SOL: kontroller */}
          <div
            style={{
              flex: "1 1 300px", minWidth: 285, maxWidth: 360,
              display: "flex", flexDirection: "column", gap: S.md,
              position: "sticky", top: S.md,
              maxHeight: `calc(100vh - ${S.xl}px)`, overflowY: "auto",
              // Yapışkan sütun yalnızca yan yana düzende anlamlı; dar ekranda
              // sütunlar alt alta düştüğü için tarayıcı sticky'yi zaten yok sayar.
            }}
          >
            <Bolum baslik="Model">
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

              <div style={{ background: C.paper2, border: `1px solid ${C.line2}`, borderRadius: RADIUS.sm, padding: `${S.sm + 2}px ${S.md}px`, fontFamily: MONO, fontSize: 11, color: C.ink2, lineHeight: 1.8, marginBottom: S.md }}>
                {model.ap < model.tp
                  ? <>toplam <b style={{ color: C.ink }}>{model.tp}B</b> · aktif <b style={{ color: C.ink }}>{model.ap}B</b></>
                  : <>dense <b style={{ color: C.ink }}>{model.tp}B</b></>}
                <br />KV {r.kvKBtok.toFixed(0)} KB/token @ {ctxYazi(ctxK)}
                <br />bağlam {ctxYazi(model.ctx)}{model.ext ? ` (YaRN → ${ctxYazi(model.ext)})` : ""}
                <br />lisans: {model.lis}
              </div>

              <div style={{ display: "flex", gap: 6, marginBottom: S.md, flexWrap: "wrap" }}>
                {model.ap < model.tp && <Rozet>MoE</Rozet>}
                <Rozet tip="bilgi">{kvTipi(model.kv)}</Rozet>
                {model.vl && <Rozet tip="olumlu">görsel giriş</Rozet>}
                {model.gated && <Rozet tip="uyari" baslik="İndirmek için HuggingFace onayı gerekir">gated</Rozet>}
              </div>

              <a
                href={`https://huggingface.co/${model.hf}`} target="_blank" rel="noreferrer noopener"
                style={{ fontFamily: SANS, fontSize: 11.5, color: C.steel, textDecoration: "none", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, padding: "6px 10px", background: C.paper, display: "inline-block", marginBottom: S.md }}
              >
                ↗ {model.hf}
              </a>

              <Onay
                etiket="İndirdiğin gibi çalıştır"
                aciklama="Tam hassasiyet (BF16 + FP16 KV), hiç kuantizasyon yok."
                isaretli={indirGibi} onChange={setIndirGibi}
              />

              {!indirGibi && (
                <div style={{ marginTop: S.md }}>
                  <Secim etiket="Ağırlık kuantizasyonu" deger={quant} onChange={setQuant}>
                    {QUANTS.map((q) => (
                      <option key={q.id} value={q.id}>{q.ad} — {q.bit}, kalite ~{q.kalite}/100</option>
                    ))}
                  </Secim>
                  <Secim etiket="KV cache kuantizasyonu" deger={kvq} onChange={setKvq} alt={kvAktif.not}>
                    {KVQUANTS.map((q) => <option key={q.id} value={q.id}>{q.ad}</option>)}
                  </Secim>
                </div>
              )}
            </Bolum>

            <Bolum baslik="İş yükü">
              <Kaydirac
                etiket="Bağlam penceresi" deger={ctxK} onChange={setCtxK}
                min={4} max={1024} olcek="log" goster={`${ctxYazi(ctxK)} token`}
                alt={`Modelin desteği: ${ctxYazi(model.ctx)}${ctxK > model.ctx ? " — aşıyorsun" : ""}`}
              />
              <Kaydirac
                etiket="Ortalama istem uzunluğu" deger={girdiK} onChange={setGirdiK}
                min={1} max={Math.max(4, ctxK)} olcek="log" goster={`${ctxYazi(girdiK)} token`}
                alt="İlk token gecikmesini bu belirler. Önek önbelleği açıksa yalnızca yeni token'lar sayılır."
              />
              <Kaydirac etiket="Eşzamanlı kullanıcı" deger={kullanici} onChange={setKullanici} min={1} max={64} step={1} goster={`${kullanici} kişi`} />
              <Kaydirac etiket="Ortalama yanıt uzunluğu" deger={cikti} onChange={setCikti} min={100} max={8000} step={100} goster={`${cikti} tok ≈ ${harfYazi(cikti)}`} />
              <Kaydirac
                etiket="KV doluluk varsayımı" deger={kvOran} onChange={setKvOran}
                min={10} max={100} step={5} goster={`%${kvOran}`}
                alt="Her kullanıcının bağlam penceresini ortalama ne kadar doldurduğu. %100 en kötü senaryodur."
              />
            </Bolum>

            <Bolum baslik="Donanım">
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
              <Kaydirac etiket="Adet" deger={adet} onChange={setAdet} min={1} max={16} step={1} goster={`${adet} adet`} />
              <div style={{ background: C.paper2, border: `1px solid ${C.line2}`, borderRadius: RADIUS.sm, padding: `${S.sm + 2}px ${S.md}px`, fontFamily: MONO, fontSize: 11, color: C.ink2, lineHeight: 1.8 }}>
                {cihaz.mem} GB {cihaz.bellekTipi.toUpperCase()} · {cihaz.bw} GB/s · {cihaz.w} W
                <br />{MIM_AD[cihaz.mim]}
                <br />birim {para(cihaz.fiyat)} · <b style={{ color: C.ink }}>~{paraTL(cihaz.try)}</b>
                <br /><span style={{ color: TR_DURUM[cihaz.tr].renk }}>TR: {TR_DURUM[cihaz.tr].ad}</span>
                <br />yığın: {(YIGIN[cihaz.mim] || []).slice(0, 3).join(", ")}
                {adet > 1 && (
                  <><br /><span style={{ color: r.tpEtki < 0.5 ? C.bad : C.ink2 }}>
                    {TP_ETIKET[r.link]} · verim %{Math.round(r.tpEtki * 100)}
                  </span></>
                )}
              </div>
            </Bolum>
          </div>

          {/* SAĞ: sonuç */}
          <div style={{ flex: "3 1 560px", minWidth: 320 }}>
            <Sonuc
              r={r} kap={kap} model={model} cihaz={cihaz} adet={adet} quant={quant}
              qAktif={qAktif} indirGibi={indirGibi} ctxK={ctxK} girdiK={girdiK}
              kullanici={kullanici} cikti={cikti} kvOran={kvOran} hedef={hedef}
              tpsDurum={tpsDurum} ttftDurum={ttftDurum} bildirimler={bildirimler}
            />
          </div>
        </div>

        {/* ---------------- Sohbet önizlemesi + hedefler ---------------- */}
        <Hedefler
          hedef={hedef} setHedef={setHedef} kap={kap}
          tps={r.sigar ? r.kullaniciTokS : 0}
          ttftMs={r.sigar ? r.ttftYogun * 1000 : 0}
          sigar={r.sigar}
          modelAd={model.ad} donanimAd={`${adet} × ${cihaz.ad}`}
          dusunme={dusunme} setDusunme={setDusunme}
          dusunmeTok={dusunmeTok} setDusunmeTok={setDusunmeTok}
        />

        {/* ---------------- Sekmeli alt bölüm ---------------- */}
        <Sekmeler sekmeler={SEKMELER} aktif={sekme} onChange={setSekme} />

        {sekme === "bantlar" && (
          <Bantlar hedef={hedef} kvOran={kvOran / 100} yukle={ayarYukle} aktifAyar={aktifAyar} />
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

        <footer style={{ marginTop: S.xl, ...T.mini, color: C.ink3, textAlign: "center" }}>
          Seçimlerin adres çubuğunda saklanır — bu sayfanın linkini paylaşırsan karşı taraf aynı
          kurulumu ve aynı hedefleri görür.
          <br />
          <a href="https://github.com/furkanyesildag/Gpudeneme" target="_blank" rel="noreferrer noopener" style={{ color: C.steel }}>
            github.com/furkanyesildag/Gpudeneme
          </a>
        </footer>
      </main>

      <ChatBot baglam={sohbetBaglami} hfCtx={hfCtx} acikDis={sohbetAcik} setAcikDis={setSohbetAcik} />
    </div>
  );
}
