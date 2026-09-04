import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area, ComposedChart,
} from "recharts";

import { C, CHART, MONO, SANS } from "./theme.js";
import { MODELS, MODEL_HARITA, AILE_SIRA } from "./data/models.js";
import {
  DEVICES, CIHAZ_HARITA, GRUP_SIRA, TR_DURUM, TR_NOT, MIM_AD,
  FP4_NATIVE, FP8_NATIVE, YIGIN, ANA_SISTEM,
} from "./data/devices.js";
import { QUANTS, QUANT_HARITA, KVQUANTS, KVQUANT_HARITA, DUSUK_QUANT_ONER } from "./data/quants.js";
import { KAVRAMLAR, SENARYOLAR } from "./data/concepts.js";
import {
  hesapla, kvKBperToken, kvTipi, ctxYazi, harfYazi, para, paraTL, gb,
  sureYazi, TP_ETIKET, ELEKTRIK_TL_KWH,
} from "./engine.js";
import { Etiket, Kutu, BolumBasligi, Sayac, Bildirim, Secim, Kaydirac, Onay, Rozet, Dugme } from "./components/ui.jsx";
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
      return { tip: "olumlu", mesaj: `${ad} FP4'ü donanımda hızlandırır (NVIDIA'da NVFP4, AMD CDNA4'te MXFP4) — bu donanım için ideal seçim.` };
    if (m === "apple" || m === "amdapu" || m === "rdna3" || m === "rdna4" || m === "intel")
      return { tip: "uyari", mesaj: `${ad} üzerinde FP4 donanım desteği yok. Yer kazancı kalır ama hız kazancı gitmez; pratikte Q4_K_M daha oturmuş bir yol.` };
    return { tip: "uyari", mesaj: `FP4 yalnızca Blackwell ve CDNA4'te donanımda hızlanır. ${ad} üzerinde emülasyon olur — NVFP4 yerine FP8 veya Q4 daha hızlı sonuç verir.` };
  }
  if (quantId === "fp8") {
    if (FP8_NATIVE.has(m))
      return { tip: "olumlu", mesaj: `${ad} FP8'i donanımda destekler — bellek ve hız açısından verimli. Birçok model zaten doğrudan FP8 yayımlanıyor.` };
    if (m === "apple")
      return { tip: "uyari", mesaj: "Apple Silicon'da FP8 donanım hızlandırması yok. MLX veya GGUF (Q4-Q8) kullanılır; buradaki FP8 hızları iyimser olabilir. Q8_0 daha dürüst bir seçim." };
    return { tip: "uyari", mesaj: `${ad} üzerinde yerel FP8 yok. INT8 veya GGUF Q8_0 daha uygun; buradaki FP8 sayıları iyimser kalır.` };
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
    return { tip: "olumlu", mesaj: "QAT sürümü varsa daima düz Q4 yerine bunu seç — aynı boyut, çok daha az kalite kaybı. Gemma 4 ve Kimi K3 resmi QAT sürümü sunuyor." };
  return { tip: "bilgi", mesaj: "GGUF/llama.cpp tabanlı: CPU dahil her donanımda çalışır. Güvenli ve taşınabilir yerel format; tek kart senaryosunda ideal." };
}

const VARSAYILAN = {
  modelId: "qwen38_27b", cihazId: "5090", adet: 1, quant: "q4", kvq: "fp8",
  ctxK: 32, girdiK: 8, kullanici: 4, cikti: 800, kvOran: 60, indirGibi: false,
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
  const [kvOran, setKvOran] = useState(ilk.kvOran); // yüzde
  const [indirGibi, setIndirGibi] = useState(ilk.indirGibi);

  const [siralama, setSiralama] = useState("verim");
  const [modelSirala, setModelSirala] = useState("yetenek");
  const [modelFiltre, setModelFiltre] = useState("hepsi");
  const [trFiltre, setTrFiltre] = useState("hepsi");
  const [xEksen, setXEksen] = useState("kullanici");
  const [yEksen, setYEksen] = useState("hiz");
  const [kavramAcik, setKavramAcik] = useState(false);
  const [tema, setTema] = useState(() => {
    try { return localStorage.getItem("tema") || "sistem"; } catch { return "sistem"; }
  });
  const [sohbetAcik, setSohbetAcik] = useState(false);

  /* Tema */
  useEffect(() => {
    try {
      const kok = document.documentElement;
      if (tema === "sistem") {
        kok.removeAttribute("data-theme");
        // Yerleşik form kontrolleri (onay kutusu, kaydırak, açılır liste)
        // color-scheme'i izler; sistemde bırakınca ikisi de aynı yeri gösterir.
        kok.style.colorScheme = "light dark";
      } else {
        kok.setAttribute("data-theme", tema);
        kok.style.colorScheme = tema;
      }
      localStorage.setItem("tema", tema);
    } catch { /* yoksay */ }
  }, [tema]);

  const model = MODEL_HARITA[modelId] || MODELS[0];
  const cihaz = CIHAZ_HARITA[cihazId] || DEVICES[0];
  const qAktif = QUANT_HARITA[quant] || QUANTS[0];
  const kvAktif = KVQUANT_HARITA[kvq] || KVQUANTS[0];

  /* "İndirdiğin gibi" işaretliyken kuantizasyonu tam hassasiyette tut */
  useEffect(() => {
    if (indirGibi && (quant !== "bf16" || kvq !== "fp16")) { setQuant("bf16"); setKvq("fp16"); }
  }, [indirGibi, quant, kvq]);

  /* Girdi uzunluğu bağlamı aşmasın */
  useEffect(() => { if (girdiK > ctxK) setGirdiK(Math.max(1, Math.round(ctxK / 2))); }, [ctxK, girdiK]);

  /* URL'i güncel tut */
  useEffect(() => {
    durumuYaz({ modelId, cihazId, adet, quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran, indirGibi });
  }, [modelId, cihazId, adet, quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran, indirGibi]);

  const ortak = useMemo(
    () => ({ quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran: kvOran / 100 }),
    [quant, kvq, ctxK, girdiK, kullanici, cikti, kvOran]
  );

  const r = useMemo(
    () => hesapla({ ...ortak, model, cihaz, adet }),
    [ortak, model, cihaz, adet]
  );

  const senaryoUygula = useCallback((s) => {
    const a = s.ayar;
    setIndirGibi(!!a.indirGibi);
    setModelId(a.modelId); setCihazId(a.cihazId); setAdet(a.adet);
    setQuant(a.quant); setKvq(a.kvq); setCtxK(a.ctxK); setGirdiK(a.girdiK);
    setKullanici(a.kullanici); setCikti(a.cikti);
  }, []);

  /* ---------------- Grafik ---------------- */
  const egri = useMemo(() => {
    let xler;
    if (xEksen === "kullanici") xler = Array.from({ length: 32 }, (_, i) => i + 1);
    else if (xEksen === "adet") xler = Array.from({ length: 16 }, (_, i) => i + 1);
    else xler = [4, 8, 16, 32, 64, 128, 192, 256, 384, 512, 768, 1024];

    return xler.map((x) => {
      const args = { ...ortak, model, cihaz, adet };
      if (xEksen === "kullanici") args.kullanici = x;
      else if (xEksen === "adet") args.adet = x;
      else { args.ctxK = x; args.girdiK = Math.min(girdiK, x); }
      const h = hesapla(args);
      return {
        x,
        kisiBasi: h.sigar ? Number(h.kullaniciTokS.toFixed(1)) : null,
        toplam: h.sigar ? Number(h.toplamTokS.toFixed(0)) : null,
        ttft: h.sigar ? Number(h.ttftYogun.toFixed(2)) : null,
        bellek: Number(Math.min(250, h.doluluk * 100).toFixed(0)),
        agirlik: Number(((h.agirlikGB / h.toplamBellek) * 100).toFixed(1)),
        kv: Number(((h.kvGB / h.toplamBellek) * 100).toFixed(1)),
      };
    });
  }, [ortak, model, cihaz, adet, xEksen, girdiK]);

  const X_ETIKET = { kullanici: "kullanıcı", baglam: "bağlam", adet: "cihaz" };
  // Hız/ilk-token grafiklerinde hiçbir nokta sığmıyorsa çizilecek şey kalmaz;
  // boş eksen "bozuk" görünür, bunun yerine sebebini yazıyoruz.
  const egriBos = yEksen !== "bellek" && egri.every((p) => p.kisiBasi === null);

  /* ---------------- Donanım karşılaştırması ---------------- */
  const tablo = useMemo(() => {
    return DEVICES.map((d) => {
      if (trFiltre !== "hepsi" && d.tr !== trFiltre) return null;
      let bulunan = null;
      for (let n = 1; n <= 32; n++) {
        const h = hesapla({ ...ortak, model, cihaz: d, adet: n });
        if (h.sigar) { bulunan = { n, h }; break; }
      }
      if (!bulunan) return null;
      const { n, h } = bulunan;
      return {
        d, n,
        kisiBasi: h.kullaniciTokS, toplam: h.toplamTokS, ttft: h.ttftYogun,
        maliyet: h.maliyet, maliyetTL: h.maliyetTL, guc: h.guc,
        birim: h.maliyet / Math.max(h.toplamTokS, 0.01),
      };
    })
      .filter(Boolean)
      .sort((a, b) => {
        if (siralama === "verim") return b.toplam - a.toplam;
        if (siralama === "hiz") return b.kisiBasi - a.kisiBasi;
        if (siralama === "ucuz") return a.maliyet - b.maliyet;
        if (siralama === "guc") return a.guc - b.guc;
        return a.birim - b.birim;
      });
  }, [ortak, model, siralama, trFiltre]);

  /* ---------------- Bu donanıma hangi modeller sığar? ---------------- */
  const modelUyum = useMemo(() => {
    // DÜZELTME: "sığdıran en hafif kuantizasyon" = kaliteyi en az bozan,
    // yani bayt/parametre'si EN YÜKSEK olan sığan seçenek. Önceki sürüm
    // listeyi artan bpp ile tarayıp her zaman en agresif olanı (Q3) öneriyordu.
    const kalitedenDusuge = [...QUANTS].sort((a, b) => b.bpp - a.bpp);
    const rows = MODELS.filter((mm) => modelFiltre === "hepsi" || mm.aile === modelFiltre)
      .map((mm) => {
        const h = hesapla({ ...ortak, model: mm, cihaz, adet });
        let cozum = null;
        if (!h.sigar) {
          for (const q of kalitedenDusuge) {
            if (q.bpp >= qAktif.bpp) continue; // hâlihazırdakinden daha hafif olmalı
            const hh = hesapla({ ...ortak, model: mm, quant: q.id, kvq: "q4", cihaz, adet });
            if (hh.sigar) { cozum = q; break; }
          }
        }
        return { mm, sigar: h.sigar, kisi: h.kullaniciTokS, toplam: h.toplamTokS, doluluk: h.doluluk, cozum };
      });
    rows.sort((a, b) => {
      if (a.sigar !== b.sigar) return a.sigar ? -1 : 1;
      if (a.sigar) {
        if (modelSirala === "hiz") return b.kisi - a.kisi;
        if (modelSirala === "verim") return b.toplam - a.toplam;
        if (modelSirala === "yeni") return MODELS.indexOf(a.mm) - MODELS.indexOf(b.mm);
      }
      return b.mm.tp - a.mm.tp;
    });
    return rows;
  }, [ortak, cihaz, adet, modelSirala, modelFiltre, qAktif.bpp]);

  const siganSayisi = modelUyum.filter((x) => x.sigar).length;

  /* ---------------- Bildirimler ---------------- */
  const bildirimler = useMemo(() => {
    const out = [];
    const uyum = quantUyum(cihaz, quant);
    out.push({ tip: uyum.tip, baslik: `${qAktif.ad} · ${cihaz.ad}`, metin: uyum.mesaj });

    if (!r.sigar) {
      out.push({
        tip: "tehlike",
        baslik: "Belleğe sığmıyor",
        metin:
          `${adet} × ${cihaz.ad} (${gb(r.toplamBellek)} GB) bu ayarlara yetmiyor: ${gb(r.gerekliGB)} GB gerekiyor. ` +
          (r.agirlikGB > r.toplamBellek
            ? `Ağırlıklar tek başına ${gb(r.agirlikGB)} GB — ${DUSUK_QUANT_ONER[quant]} veya en az ${r.minAdet ? `${r.minAdet} adet` : "çok daha fazla"} cihaz gerekir.`
            : `Taşıran şey KV cache (${gb(r.kvGB)} GB). Kullanıcıyı ${r.maxKullanici}'e ya da bağlamı ${ctxYazi(Math.floor(r.maxCtxK))}'e düşür, ya da KV'yi ${kvq === "fp16" ? "FP8" : "Q4"} yap.`),
      });
    } else if (r.doluluk > 0.9) {
      out.push({
        tip: "uyari",
        baslik: "Bellek sınırında",
        metin: `Bellek %${Math.round(r.doluluk * 100)} dolu. Üretimde %80'in altını hedefle — ani uzun istem veya ek kullanıcı taşırır. Bir kademe düşük KV kuantizasyonu pay bırakır.`,
      });
    }

    if (r.ctxAsimi)
      out.push({
        tip: "tehlike",
        baslik: "Modelin bağlam sınırı aşıldı",
        metin: `${model.ad} en fazla ${ctxYazi(model.ext || model.ctx)} destekliyor; sen ${ctxYazi(ctxK)} seçtin. Bu ayarla model ya hata verir ya da kaliteyi kaybeder.`,
      });
    else if (r.ctxYarn)
      out.push({
        tip: "uyari",
        baslik: "YaRN/RoPE uzatması gerekiyor",
        metin: `${model.ad} doğuştan ${ctxYazi(model.ctx)} destekliyor. ${ctxYazi(ctxK)} için RoPE ölçeklendirmesi (YaRN) açman gerekir; kısa istemlerde kalite bir miktar düşebilir.`,
      });

    if (indirGibi)
      out.push({
        tip: "olumlu",
        baslik: "Kuantizasyon yok — indirdiğin gibi",
        metin: "Bu ayar, modeli HuggingFace'ten indirip olduğu gibi çalıştırmaktır (BF16 ağırlık + FP16 KV). Belleğe sığıyorsa kuantizasyona hiç gerek yok.",
      });
    else if (kvq !== "fp16")
      out.push({ tip: "bilgi", baslik: `KV cache: ${kvAktif.ad}`, metin: kvAktif.not });

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
            ? "Bu cihazlar ancak ağ/USB4 ile kümelenir; tensör paralelliği verimi ~%33. Tek güçlü cihaz çoğu zaman çok sayıda zayıf kutudan daha iyidir — karşılaştırma tablosuna bak."
            : r.link === "pcie"
            ? `Aynı kasada PCIe üzerinden bölünür, verim ~%60. ${cihaz.slot ? `Her kart ${cihaz.slot} slot kaplıyor — ${adet} kart için uygun anakart ve kasa gerekir.` : ""}`
            : "NVLink ile bağlanır, verim ~%86. Çok kartlı kurulumda en iyi seçenek.",
      });

    if (model.ap < model.tp)
      out.push({
        tip: "bilgi",
        baslik: "MoE (uzman-karışımı) model",
        metin: `${model.ad} bellekte ${model.tp}B durur ama her token için yalnızca ${model.ap}B aktif olur. Belleği büyük modele göre, hızı küçük modele göre planla — sık yapılan hata bunun tersidir.`,
      });

    const tip = kvTipi(model.kv);
    if (tip !== "tam (GQA)")
      out.push({
        tip: "olumlu",
        baslik: `Verimli dikkat: ${tip}`,
        metin:
          tip === "MLA / sıkıştırılmış"
            ? `${model.ad} sıkıştırılmış gizil KV (MLA) kullanıyor — aynı bağlamı klasik GQA'ya göre 3-5 kat az bellekle tutar. Uzun bağlam bu modelde çok daha ucuz.`
            : `${model.ad} katmanlarının çoğunda kayan pencere/lineer dikkat kullanıyor: KV cache bağlamla doğrusal büyümüyor. Şu ayarda token başına ${r.kvKBtok.toFixed(0)} KB — tam dikkatli bir modelde bu çok daha yüksek olurdu.`,
      });

    if (model.gated)
      out.push({ tip: "uyari", baslik: "Kapalı (gated) depo", metin: "Bu modeli indirmek için önce HuggingFace üzerinden lisans onayı almalısın. Onay bazen elle inceleniyor ve gün alabilir." });

    if (model.not) out.push({ tip: "bilgi", baslik: "Model notu", metin: model.not });

    if (r.sigar && r.kullaniciTokS < 10)
      out.push({
        tip: "uyari",
        baslik: "Kişi başına hız düşük",
        metin: `Kullanıcı başına ~${r.kullaniciTokS.toFixed(1)} tok/s — rahat okuma bandının (15-30) altında. Daha az eşzamanlı kullanıcı, daha düşük bitli ağırlık ya da daha yüksek bant genişlikli donanım gerekir.`,
      });
    if (r.sigar && r.ttftYogun > 15)
      out.push({
        tip: "uyari",
        baslik: "İlk token uzun",
        metin: `Yoğun anda ilk token ~${sureYazi(r.ttftYogun)}. İstem uzunluğunu (${ctxYazi(girdiK)}) kısaltmak, prefix caching açmak veya daha yüksek TFLOPS'lu donanım bunu düşürür. Ajan/kod işlerinde bu tolere edilebilir, sohbette edilemez.`,
      });

    return out;
  }, [model, quant, kvq, cihaz, adet, r, qAktif, kvAktif, indirGibi, ctxK, girdiK, kullanici]);

  /* ---------------- Görünüm yardımcıları ---------------- */
  const durumRenk = !r.sigar ? C.bad : r.doluluk > 0.9 ? C.warn : C.ok;
  const durumMetin = !r.sigar ? "Belleğe sığmıyor" : r.doluluk > 0.9 ? "Sınırda çalışır" : "Rahat çalışır";
  const durumZemin = !r.sigar ? C.badSoft : r.doluluk > 0.9 ? C.warnSoft : C.okSoft;
  const yuzde = (x) => Math.max(0, Math.min(100, (x / r.toplamBellek) * 100));

  const aileler = AILE_SIRA.filter((a) => MODELS.some((m) => m.aile === a));
  const gruplar = GRUP_SIRA.filter((g) => DEVICES.some((d) => d.grup === g));

  const sohbetBaglami =
    `Model: ${model.ad} (${model.tp}B toplam / ${model.ap}B aktif, ${model.lis}, bağlam ${ctxYazi(model.ctx)}, KV tipi ${kvTipi(model.kv)}, hf:${model.hf}).\n` +
    `Donanım: ${adet} × ${cihaz.ad} (${cihaz.mem}GB, ${cihaz.bw}GB/s, ${MIM_AD[cihaz.mim]}, ${cihaz.w}W, ~$${cihaz.fiyat}/${paraTL(cihaz.try)}, TR: ${TR_DURUM[cihaz.tr].ad})` +
    `${adet > 1 ? `, tek küme, ${TP_ETIKET[r.link]}, TP verimi %${Math.round(r.tpEtki * 100)}` : ""}.\n` +
    `Ayar: ${indirGibi ? "BF16 + FP16 KV (kuantizasyon yok)" : `${qAktif.ad} ağırlık / ${kvAktif.ad} KV`}, ` +
    `${ctxYazi(ctxK)} bağlam (KV için %${kvOran} doluluk varsayımı), ortalama istem ${ctxYazi(girdiK)}, ` +
    `${kullanici} eşzamanlı kullanıcı, ortalama yanıt ${cikti} token.\n` +
    `Hesap sonucu: ağırlık ${gb(r.agirlikGB)} GB + KV ${gb(r.kvGB)} GB (${r.kvKBtok.toFixed(0)} KB/token) + çalışma ${gb(r.ekGB)} GB = ${gb(r.gerekliGB)} GB / ${gb(r.toplamBellek)} GB kullanılabilir. ` +
    (r.sigar
      ? `SIĞIYOR (%${Math.round(r.doluluk * 100)} dolu). Kullanıcı başına ~${r.kullaniciTokS.toFixed(1)} tok/s, toplam ~${Math.round(r.toplamTokS)} tok/s, ilk token ~${sureYazi(r.ttftYogun)}. Bu bağlamda en fazla ${r.maxKullanici} kullanıcı; bu kullanıcı sayısıyla en fazla ${ctxYazi(Math.floor(r.maxCtxK))} bağlam.`
      : `SIĞMIYOR — en az ${r.minAdet || "çok daha fazla"} adet gerekir.`) +
    `\nMaliyet: ${para(r.maliyet)} (~${paraTL(r.maliyetTL)}) donanım, ${r.guc} W çekiş, yıllık elektrik ~${paraTL(r.yillikElektrikTL)}.`;

  const hfCtx = {
    quant, kvq, ctxK, girdiK, kullanici, cikti, cihaz, adet,
    kvOran: kvOran / 100, quantAd: indirGibi ? "BF16 (kuantizasyon yok)" : qAktif.ad,
  };

  return (
    <div style={{ fontFamily: SANS, background: C.wash, color: C.ink, padding: "20px 18px 96px", minHeight: "100%" }}>
      {/* ---------------- Başlık ---------------- */}
      <header style={{ marginBottom: 16, borderBottom: `2px solid ${C.ink}`, paddingBottom: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260, flex: "1 1 420px" }}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: C.steel, marginBottom: 6 }}>
              YEREL LLM ALTYAPISI · KAPASİTE SİMÜLASYONU
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 500, margin: 0, letterSpacing: "-0.02em" }}>
              Hangi donanım, kaç adet, ne kadar token
            </h1>
            <p style={{ fontSize: 13, color: C.ink2, margin: "7px 0 0", maxWidth: 700, lineHeight: 1.6 }}>
              {MODELS.length} açık ağırlıklı model ve {DEVICES.length} donanım. Bellek bütçesini, token hızını,
              ilk token gecikmesini, Türkiye fiyatını ve elektrik maliyetini çıkarır. Model verileri
              HuggingFace <code style={{ fontFamily: MONO, fontSize: 12 }}>config.json</code> dosyalarından
              doğrulandı — KV cache hesabı gerçek katman geometrisiyle yapılır.
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <Dugme onClick={() => setSohbetAcik(true)} tur="birincil">💬 Danışmana sor</Dugme>
            <select
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              aria-label="Tema"
              style={{ fontFamily: SANS, fontSize: 12, padding: "6px 8px", border: `1px solid ${C.line}`, borderRadius: 3, background: C.paper, color: C.ink }}
            >
              <option value="sistem">Tema: sistem</option>
              <option value="light">Tema: açık</option>
              <option value="dark">Tema: koyu</option>
            </select>
          </div>
        </div>
      </header>

      {/* ---------------- Hazır senaryolar ---------------- */}
      <Kutu style={{ marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Etiket>Hazır senaryo ile başla</Etiket>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {SENARYOLAR.map((s) => (
              <button key={s.ad} onClick={() => senaryoUygula(s)} title={s.aciklama}
                style={{ background: C.wash, color: C.ink2, border: `1px solid ${C.line}`, borderRadius: 14, padding: "5px 11px", fontFamily: SANS, fontSize: 12, cursor: "pointer" }}>
                {s.ad}
              </button>
            ))}
          </div>
        </div>
      </Kutu>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* ================= SOL: KONTROLLER ================= */}
        <div style={{ flex: "1 1 300px", minWidth: 280, maxWidth: 360 }}>
          <Kutu style={{ marginBottom: 13 }}>
            <BolumBasligi>MODEL</BolumBasligi>

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

            <div style={{ background: C.wash, border: `1px solid ${C.line2}`, padding: "9px 10px", fontFamily: MONO, fontSize: 11, color: C.ink2, lineHeight: 1.75, marginBottom: 11, borderRadius: 3 }}>
              {model.ap < model.tp ? (
                <>toplam <b style={{ color: C.ink }}>{model.tp}B</b> · aktif <b style={{ color: C.ink }}>{model.ap}B</b> (MoE)</>
              ) : (
                <>dense <b style={{ color: C.ink }}>{model.tp}B</b></>
              )}
              <br />
              KV {r.kvKBtok.toFixed(0)} KB/token @ {ctxYazi(ctxK)} · {kvTipi(model.kv)}
              <br />
              bağlam {ctxYazi(model.ctx)}{model.ext ? ` (YaRN ile ${ctxYazi(model.ext)})` : ""}
              <br />
              lisans: {model.lis}
              {model.bench && (<><br />benchmark: {model.bench}</>)}
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {model.vl && <Rozet renk={C.ok} zemin={C.okSoft}>görsel giriş</Rozet>}
              {model.gated && <Rozet renk={C.warn} zemin={C.warnSoft} baslik="İndirmek için HuggingFace'te onay gerekiyor">gated</Rozet>}
              {model.ap < model.tp && <Rozet>MoE</Rozet>}
              <Rozet renk={C.ink3} zemin={C.wash}>{kvTipi(model.kv)}</Rozet>
            </div>

            <a href={`https://huggingface.co/${model.hf}`} target="_blank" rel="noreferrer noopener"
              style={{ fontFamily: SANS, fontSize: 11.5, color: C.steel, textDecoration: "none", border: `1px solid ${C.line}`, borderRadius: 3, padding: "6px 9px", background: C.paper, display: "inline-block", marginBottom: 12 }}>
              ↗ {model.hf}
            </a>

            <Onay
              etiket="İndirdiğin gibi çalıştır"
              aciklama="Tam hassasiyet (BF16 + FP16 KV), hiç kuantizasyon yok. İşareti kaldırırsan kuantizasyon seçenekleri açılır."
              isaretli={indirGibi}
              onChange={setIndirGibi}
            />

            {!indirGibi && (
              <div style={{ marginTop: 13 }}>
                <Secim etiket="Ağırlık kuantizasyonu" deger={quant} onChange={setQuant}>
                  {QUANTS.map((q) => (
                    <option key={q.id} value={q.id}>{q.ad} — {q.bit}, kalite ~{q.kalite}/100</option>
                  ))}
                </Secim>
                <Secim etiket="KV cache kuantizasyonu" deger={kvq} onChange={setKvq}>
                  {KVQUANTS.map((q) => <option key={q.id} value={q.id}>{q.ad}</option>)}
                </Secim>
              </div>
            )}
          </Kutu>

          <Kutu style={{ marginBottom: 13 }}>
            <BolumBasligi>İŞ YÜKÜ</BolumBasligi>

            <Kaydirac
              etiket="Bağlam penceresi" deger={ctxK} onChange={setCtxK}
              min={4} max={1024} olcek="log" goster={`${ctxYazi(ctxK)} token`}
              alt={`Modelin desteği: ${ctxYazi(model.ctx)}${model.ext ? ` · YaRN ile ${ctxYazi(model.ext)}` : ""}${ctxK > model.ctx ? " — aşıyorsun" : ""}`}
            />
            <Kaydirac
              etiket="Ortalama istem uzunluğu" deger={girdiK} onChange={setGirdiK}
              min={1} max={Math.max(4, ctxK)} olcek="log" goster={`${ctxYazi(girdiK)} token`}
              alt="İlk token gecikmesini bu belirler — bağlam penceresi değil. Sohbette kısa, ajan/RAG işlerinde uzun olur."
            />
            <Kaydirac
              etiket="Eşzamanlı kullanıcı" deger={kullanici} onChange={setKullanici}
              min={1} max={64} step={1} goster={`${kullanici} kişi`}
            />
            <Kaydirac
              etiket="Ortalama yanıt uzunluğu" deger={cikti} onChange={setCikti}
              min={100} max={8000} step={100} goster={`${cikti} tok ≈ ${harfYazi(cikti)}`}
            />
            <Kaydirac
              etiket="KV doluluk varsayımı" deger={kvOran} onChange={setKvOran}
              min={10} max={100} step={5} goster={`%${kvOran}`}
              alt="Her kullanıcının bağlam penceresini ortalama ne kadar doldurduğu. vLLM/SGLang yalnızca kullanılan token için yer ayırır; %100 en kötü senaryodur."
            />
          </Kutu>

          <Kutu>
            <BolumBasligi>DONANIM</BolumBasligi>

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

            <div style={{ background: C.wash, border: `1px solid ${C.line2}`, padding: "9px 10px", fontFamily: MONO, fontSize: 11, color: C.ink2, lineHeight: 1.75, borderRadius: 3 }}>
              {cihaz.mem} GB · {cihaz.bw} GB/s · {cihaz.w} W
              <br />
              mimari: {MIM_AD[cihaz.mim]}
              <br />
              birim {para(cihaz.fiyat)} · <b style={{ color: C.ink }}>~{paraTL(cihaz.try)}</b>
              <br />
              <span style={{ color: TR_DURUM[cihaz.tr].renk }}>TR: {TR_DURUM[cihaz.tr].ad}</span>
              <br />
              yığın: {(YIGIN[cihaz.mim] || []).slice(0, 3).join(", ")}
              {adet > 1 && (
                <>
                  <br />
                  <span style={{ color: r.tpEtki < 0.5 ? C.bad : C.ink2 }}>
                    {TP_ETIKET[r.link]} · verim %{Math.round(r.tpEtki * 100)}
                  </span>
                </>
              )}
            </div>
          </Kutu>
        </div>

        {/* ================= SAĞ: SONUÇLAR ================= */}
        <div style={{ flex: "3 1 540px", minWidth: 320 }}>
          {/* Durum şeridi */}
          <div style={{ background: durumZemin, border: `1px solid ${durumRenk}`, borderRadius: 4, padding: "12px 15px", marginBottom: 13, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 500, color: durumRenk }}>{durumMetin}</div>
              <div style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>
                {adet} × {cihaz.ad}{adet > 1 ? " (tek küme)" : ""} · {model.ad} · {indirGibi ? "BF16" : qAktif.ad}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 500, color: durumRenk }}>%{Math.round(r.doluluk * 100)}</div>
              <div style={{ fontSize: 11, color: C.ink2 }}>bellek doluluğu</div>
            </div>
          </div>

          {/* Bellek bütçesi */}
          <Kutu style={{ marginBottom: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <Etiket>Bellek bütçesi — {adet} cihaz toplamı</Etiket>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink2 }}>
                {gb(r.gerekliGB)} / {gb(r.toplamBellek)} GB
              </span>
            </div>

            <div style={{ display: "flex", height: 28, background: C.line2, border: `1px solid ${C.line}`, overflow: "hidden", marginBottom: 10, borderRadius: 3 }}>
              <div style={{ width: `${yuzde(r.agirlikGB)}%`, background: CHART.steel }} title={`Ağırlıklar ${gb(r.agirlikGB)} GB`} />
              <div style={{ width: `${yuzde(r.kvGB)}%`, background: CHART.kv }} title={`KV cache ${gb(r.kvGB)} GB`} />
              <div style={{ width: `${yuzde(r.ekGB)}%`, background: C.ovh }} title={`Çalışma zamanı ${gb(r.ekGB)} GB`} />
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11.5 }}>
              {[
                ["Ağırlıklar", r.agirlikGB, CHART.steel],
                ["KV cache", r.kvGB, CHART.kv],
                ["Çalışma zamanı", r.ekGB, C.ovh],
                ["Boşta", Math.max(0, r.toplamBellek - r.gerekliGB), C.line],
              ].map(([ad, v, renk]) => (
                <div key={ad} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, background: renk, display: "inline-block", borderRadius: 2 }} />
                  <span style={{ color: C.ink2 }}>{ad}</span>
                  <span style={{ fontFamily: MONO, color: C.ink }}>{gb(v)} GB</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 11.5, color: C.ink3, lineHeight: 1.6 }}>
              KV cache: {kullanici} kullanıcı × {ctxYazi(ctxK)} × %{kvOran} doluluk × {r.kvKBtok.toFixed(0)} KB/token
              = {gb(r.kvGB)} GB. Kullanıcı başına {gb(r.kvKullaniciGB)} GB.
            </div>
          </Kutu>

          {/* Sayaçlar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))", gap: 11, marginBottom: 13 }}>
            <Sayac etiket="Kullanıcı başına" deger={r.sigar ? r.kullaniciTokS.toFixed(1) : "—"} birim="tok/s"
              alt={r.sigar ? `${cikti} token ${sureYazi(r.ciktiSure)}'de` : "sığmıyor"}
              renk={!r.sigar ? C.ink3 : r.kullaniciTokS < 10 ? C.bad : r.kullaniciTokS < 15 ? C.warn : C.ok} />
            <Sayac etiket="Toplam verim" deger={r.sigar ? Math.round(r.toplamTokS) : "—"} birim="tok/s"
              alt={`${kullanici} kullanıcı eşzamanlı`} />
            <Sayac etiket="İlk token (yoğun)" deger={r.sigar ? sureYazi(r.ttftYogun) : "—"} birim=""
              alt={`tek istekte ${sureYazi(r.ttftTek)}`}
              renk={!r.sigar ? C.ink3 : r.ttftYogun > 15 ? C.bad : r.ttftYogun > 5 ? C.warn : C.ok} />
            <Sayac etiket="Tam yanıt süresi" deger={r.sigar ? sureYazi(r.yanitSure) : "—"} birim=""
              alt="ilk token + yazma süresi" />
            <Sayac etiket="Donanım yatırımı" deger={paraTL(r.maliyetTL)} birim=""
              alt={`${para(r.maliyet)} · ${r.guc} W${r.host?.ad ? ` · ${r.host.ad} dahil` : ""}`} />
            <Sayac etiket="Yıllık elektrik" deger={paraTL(r.yillikElektrikTL)} birim=""
              alt={`7/24 açık · ${ELEKTRIK_TL_KWH} TL/kWh`} />
            <Sayac etiket="Bu bağlamda tavan" deger={r.maxKullanici} birim="kişi"
              alt={`${ctxYazi(ctxK)} bağlamla sığan en fazla kullanıcı`} />
            <Sayac etiket="Bu kişi sayısında tavan" deger={ctxYazi(Math.floor(r.maxCtxK))} birim=""
              alt={r.maxCtxModelSinirli
                ? `bellek ${ctxYazi(Math.floor(r.maxCtxBellek))} kaldırırdı — modelin sınırı ${ctxYazi(model.ext || model.ctx)}`
                : `${kullanici} kullanıcıyla sığan en uzun bağlam`}
              renk={r.maxCtxModelSinirli ? C.steel : undefined} />
          </div>

          {/* Notlar */}
          <Kutu style={{ marginBottom: 13 }}>
            <Etiket>Notlar ve uyarılar</Etiket>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
              {bildirimler.map((b, i) => <Bildirim key={i} {...b} />)}
            </div>
          </Kutu>

          {/* Grafik */}
          <Kutu style={{ marginBottom: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
              <Etiket>Grafik — eksenleri seç</Etiket>
              <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                <select value={yEksen} onChange={(e) => setYEksen(e.target.value)} style={grafikSec} aria-label="Dikey eksen">
                  <option value="hiz">Dikey: token hızı</option>
                  <option value="ttft">Dikey: ilk token</option>
                  <option value="bellek">Dikey: bellek dökümü</option>
                </select>
                <span style={{ fontSize: 11, color: C.ink3 }}>×</span>
                <select value={xEksen} onChange={(e) => setXEksen(e.target.value)} style={grafikSec} aria-label="Yatay eksen">
                  <option value="kullanici">Yatay: kullanıcı</option>
                  <option value="baglam">Yatay: bağlam</option>
                  <option value="adet">Yatay: cihaz adedi</option>
                </select>
              </div>
            </div>
            <div style={{ height: 220, marginTop: 8, position: "relative" }}>
              {egriBos && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center",
                  justifyContent: "center", textAlign: "center", padding: 20, zIndex: 2,
                  background: `${C.paper}E6`, fontSize: 12.5, color: C.ink2, lineHeight: 1.6, borderRadius: 4,
                }}>
                  <div style={{ maxWidth: 420 }}>
                    <b style={{ color: C.bad }}>Bu eksende çizilecek nokta yok.</b>
                    <br />
                    Model bu ayarlarla hiçbir {X_ETIKET[xEksen]} değerinde belleğe sığmıyor, dolayısıyla hız
                    değeri tanımsız. Kuantizasyonu düşür, bağlamı kısalt ya da cihaz adedini artır —
                    ya da dikey ekseni <b>bellek dökümü</b> yapıp ne kadar taştığını gör.
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={egri} margin={{ top: 6, right: 6, left: -16, bottom: 2 }}>
                  <CartesianGrid stroke={CHART.grid} strokeOpacity={0.22} vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 10.5, fill: CHART.axis, fontFamily: MONO }} stroke={CHART.axis} strokeOpacity={0.4}
                    tickFormatter={(v) => (xEksen === "baglam" ? ctxYazi(v) : v)} />
                  {yEksen === "hiz" ? (
                    <>
                      <YAxis yAxisId="l" tick={{ fontSize: 10.5, fill: CHART.axis, fontFamily: MONO }} stroke={CHART.axis} strokeOpacity={0.4} />
                      <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10.5, fill: CHART.axis, fontFamily: MONO }} stroke={CHART.axis} strokeOpacity={0.4} />
                    </>
                  ) : (
                    <YAxis yAxisId="l" domain={yEksen === "bellek" ? [0, 250] : [0, "auto"]}
                      tick={{ fontSize: 10.5, fill: CHART.axis, fontFamily: MONO }} stroke={CHART.axis} strokeOpacity={0.4}
                      tickFormatter={(v) => (yEksen === "bellek" ? `%${v}` : v)} />
                  )}
                  <Tooltip
                    contentStyle={{ fontFamily: MONO, fontSize: 11.5, border: `1px solid ${C.line}`, borderRadius: 3, background: C.paper, color: C.ink }}
                    labelFormatter={(v) => `${xEksen === "baglam" ? ctxYazi(v) : v} ${X_ETIKET[xEksen]}`}
                    formatter={(v, n) => [yEksen === "bellek" ? `%${v}` : v, n]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11.5, fontFamily: SANS }} />
                  {yEksen === "hiz" && (
                    <>
                      <Line yAxisId="l" type="monotone" dataKey="kisiBasi" name="Kullanıcı başına tok/s" stroke={CHART.steel} strokeWidth={2} dot={false} connectNulls={false} />
                      <Line yAxisId="r" type="monotone" dataKey="toplam" name="Toplam tok/s" stroke={CHART.kv} strokeWidth={2} dot={false} connectNulls={false} />
                      <ReferenceLine yAxisId="l" y={15} stroke={CHART.ok} strokeDasharray="4 4" label={{ value: "rahat okuma", fontSize: 10, fill: CHART.ok, position: "insideBottomLeft" }} />
                    </>
                  )}
                  {yEksen === "ttft" && (
                    <>
                      <Line yAxisId="l" type="monotone" dataKey="ttft" name="İlk token (sn)" stroke={CHART.bad} strokeWidth={2} dot={false} connectNulls={false} />
                      <ReferenceLine yAxisId="l" y={10} stroke={CHART.axis} strokeDasharray="4 4" label={{ value: "10 sn", fontSize: 10, fill: CHART.axis, position: "insideTopLeft" }} />
                    </>
                  )}
                  {yEksen === "bellek" && (
                    <>
                      <Area yAxisId="l" type="monotone" dataKey="agirlik" name="Ağırlıklar %" stackId="1" stroke={CHART.steel} fill={CHART.steel} fillOpacity={0.55} />
                      <Area yAxisId="l" type="monotone" dataKey="kv" name="KV cache %" stackId="1" stroke={CHART.kv} fill={CHART.kv} fillOpacity={0.55} />
                      <ReferenceLine yAxisId="l" y={100} stroke={CHART.bad} strokeDasharray="4 4" label={{ value: "bellek sınırı", fontSize: 10, fill: CHART.bad, position: "insideTopLeft" }} />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 6, lineHeight: 1.6 }}>
              {yEksen === "hiz" && "Çizgi kesiliyorsa orada belleğe sığmıyor demektir. Toplam verim yükselirken kişi başına hızın düşmesi normaldir; önemli olan kişi başına hızın okunur bandın altına inmemesi."}
              {yEksen === "ttft" && "İlk token gecikmesi istem uzunluğu ve kalabalıkla büyür. Sohbette 10 sn üzeri kullanıcıyı kaçırır; ajan işlerinde tolere edilebilir."}
              {yEksen === "bellek" && "Ağırlıklar sabit kalırken KV cache'in nasıl büyüdüğünü gösterir. Kırmızı çizgiyi geçen noktalarda model o ayarla belleğe SIĞMAZ."}
            </div>
          </Kutu>

          {/* Donanım karşılaştırması */}
          <Kutu style={{ marginBottom: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div>
                <Etiket>Tüm donanımlar, bu iş yükü için</Etiket>
                <div style={{ fontSize: 12, color: C.ink2 }}>
                  {model.ad} · {ctxYazi(ctxK)} · {kullanici} kullanıcı · her satır gereken minimum adedi gösterir
                </div>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <select value={trFiltre} onChange={(e) => setTrFiltre(e.target.value)} style={grafikSec} aria-label="Türkiye tedarik filtresi">
                  <option value="hepsi">Tedarik: hepsi</option>
                  <option value="kolay">Sadece TR'de satılan</option>
                  <option value="sinirli">Siparişle gelenler</option>
                  <option value="ithal">İthal</option>
                  <option value="kurumsal">Kurumsal kanal</option>
                </select>
                <select value={siralama} onChange={(e) => setSiralama(e.target.value)} style={grafikSec} aria-label="Sıralama">
                  <option value="verim">Sırala: toplam verim</option>
                  <option value="hiz">Sırala: kişi başına hız</option>
                  <option value="ucuz">Sırala: en ucuz</option>
                  <option value="birim">Sırala: token başına maliyet</option>
                  <option value="guc">Sırala: en az güç</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${C.ink}` }}>
                    {[["Donanım", "left"], ["Adet", "right"], ["Kişi/s", "right"], ["Toplam", "right"],
                      ["İlk tok", "right"], ["Maliyet", "right"], ["Güç", "right"], ["$/tok/s", "right"]].map(([h, a]) => (
                      <th key={h} style={{ ...thStil, textAlign: a }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tablo.map((row) => {
                    const secili = row.d.id === cihazId;
                    return (
                      <tr key={row.d.id}
                        onClick={() => { setCihazId(row.d.id); setAdet(row.n); }}
                        style={{ borderBottom: `1px solid ${C.line2}`, background: secili ? C.steelSoft : "transparent", cursor: "pointer" }}>
                        <td style={{ padding: "7px 8px" }}>
                          <div style={{ fontWeight: secili ? 600 : 400 }}>{row.d.ad}</div>
                          <div style={{ fontSize: 10.5, color: C.ink3, fontFamily: MONO, display: "flex", alignItems: "center", gap: 5 }}>
                            <span title={TR_DURUM[row.d.tr].ad} style={{ width: 7, height: 7, borderRadius: "50%", background: TR_DURUM[row.d.tr].renk, display: "inline-block", flexShrink: 0 }} />
                            {row.d.mem} GB · {row.d.bw} GB/s · {TR_DURUM[row.d.tr].kisa}
                          </div>
                        </td>
                        {[
                          `${row.n}×`,
                          row.kisiBasi.toFixed(1),
                          Math.round(row.toplam),
                          sureYazi(row.ttft),
                          paraTL(row.maliyetTL),
                          `${row.guc}W`,
                          `$${row.birim.toFixed(0)}`,
                        ].map((v, i) => (
                          <td key={i} style={{
                            padding: "7px 8px", textAlign: "right", fontFamily: MONO, whiteSpace: "nowrap",
                            color: i === 1 && row.kisiBasi < 10 ? C.bad : i === 1 && row.kisiBasi < 15 ? C.warn : i === 3 && row.ttft > 15 ? C.bad : C.ink,
                          }}>{v}</td>
                        ))}
                      </tr>
                    );
                  })}
                  {!tablo.length && (
                    <tr><td colSpan={8} style={{ padding: 16, textAlign: "center", color: C.ink3, fontSize: 12.5 }}>
                      Bu filtreyle hiçbir donanım bu iş yükünü 32 adede kadar taşıyamıyor. Bağlamı, kullanıcı sayısını düşür ya da kuantizasyon uygula.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 10, lineHeight: 1.6 }}>
              Satıra tıklayınca o kurulum yukarıdaki panele yüklenir. Ayrık kartlarda, kartları çalıştıracak
              <b> ana sistem</b> maliyeti ve gücü de eklenmiştir: {ANA_SISTEM.map((k) => `≤${k.maxKart} kart → ${k.ad} ${para(k.usd)}`).join(" · ")}.
              Hazır kutular (Mac Studio, Spark, mini PC) kendi başına bilgisayar olduğu için ek maliyet almaz.
              TL fiyatları Türkiye perakende gözlemi veya ithalat tahminidir.
            </div>
          </Kutu>

          {/* Model uyumu */}
          <Kutu>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div>
                <Etiket>Bu donanıma hangi modeller sığar?</Etiket>
                <div style={{ fontSize: 12, color: C.ink2 }}>
                  {adet} × {cihaz.ad} · {indirGibi ? "BF16" : qAktif.ad} · {ctxYazi(ctxK)} · {kullanici} kullanıcı ·{" "}
                  <b>{siganSayisi}</b> / {modelUyum.length} model sığıyor
                </div>
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <select value={modelFiltre} onChange={(e) => setModelFiltre(e.target.value)} style={grafikSec} aria-label="Aile filtresi">
                  <option value="hepsi">Aile: hepsi</option>
                  {aileler.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={modelSirala} onChange={(e) => setModelSirala(e.target.value)} style={grafikSec} aria-label="Model sıralaması">
                  <option value="yetenek">Sırala: en büyük</option>
                  <option value="hiz">Sırala: kişi başına hız</option>
                  <option value="verim">Sırala: toplam verim</option>
                  <option value="yeni">Sırala: veritabanı sırası</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${C.ink}` }}>
                    {[["Model", "left"], ["Boyut", "right"], ["Durum", "left"], ["Kişi/s", "right"], ["Toplam", "right"], ["%Dolu", "right"]].map(([h, a]) => (
                      <th key={h} style={{ ...thStil, textAlign: a, position: "sticky", top: 0, background: C.paper, zIndex: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modelUyum.map((row) => {
                    const secili = row.mm.id === modelId;
                    return (
                      <tr key={row.mm.id}
                        onClick={() => {
                          setModelId(row.mm.id);
                          if (!row.sigar && row.cozum) { setIndirGibi(false); setQuant(row.cozum.id); setKvq("q4"); }
                        }}
                        style={{ borderBottom: `1px solid ${C.line2}`, background: secili ? C.steelSoft : "transparent", cursor: "pointer", opacity: row.sigar ? 1 : 0.62 }}>
                        <td style={{ padding: "7px 8px" }}>
                          <div style={{ fontWeight: secili ? 600 : 400 }}>{row.mm.ad}</div>
                          <div style={{ fontSize: 10.5, color: C.ink3, fontFamily: MONO }}>
                            {row.mm.aile} · {row.mm.lis} · {kvTipi(row.mm.kv)}
                          </div>
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: MONO, whiteSpace: "nowrap" }}>
                          {row.mm.tp}B{row.mm.ap !== row.mm.tp ? <span style={{ color: C.ink3 }}>/{row.mm.ap}</span> : null}
                        </td>
                        <td style={{ padding: "7px 8px", whiteSpace: "nowrap" }}>
                          {row.sigar ? (
                            <span style={{ color: row.doluluk > 0.9 ? C.warn : C.ok, fontWeight: 500 }}>
                              {row.doluluk > 0.9 ? "sınırda" : "✓ sığar"}
                            </span>
                          ) : row.cozum ? (
                            <span style={{ color: C.steel, fontFamily: MONO, fontSize: 11.5 }} title={`${row.cozum.ad} + Q4 KV ile sığar`}>
                              {row.cozum.ad.split(" ")[0]} ile
                            </span>
                          ) : (
                            <span style={{ color: C.bad }}>sığmaz</span>
                          )}
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: MONO, color: row.sigar && row.kisi < 10 ? C.warn : C.ink }}>
                          {row.sigar ? row.kisi.toFixed(1) : "—"}
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: MONO }}>
                          {row.sigar ? Math.round(row.toplam) : "—"}
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: MONO, color: C.ink3 }}>
                          {row.sigar ? `%${Math.round(row.doluluk * 100)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 10, lineHeight: 1.6 }}>
              Sığmayanlarda "X ile" ifadesi, o modeli bu donanıma sığdıran <b>kaliteyi en az bozan</b> ağırlık
              kuantizasyonunu (KV cache Q4 ile birlikte) gösterir. Satıra tıklayınca model yüklenir; sığmıyorsa
              önerilen kuantizasyon da otomatik uygulanır.
            </div>
          </Kutu>
        </div>
      </div>

      {/* ---------------- Kuantizasyon açıklaması ---------------- */}
      <Kutu style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <Etiket>Kuantizasyon: {qAktif.ad}</Etiket>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.ink3 }}>
            {qAktif.bit} · {qAktif.bpp} bayt/parametre · kalite ~{qAktif.kalite}/100 (kayıp {qAktif.kayip})
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.65, marginBottom: 12 }}>
          Kuantizasyon, model ağırlıklarını daha az bitle saklamaktır: daha az bit → daha az bellek ve daha hızlı
          okuma, karşılığında bir miktar kalite kaybı. <b style={{ color: C.ink }}>Zorunlu değildir.</b> HuggingFace'ten
          indirdiğinde varsayılan olarak tam hassasiyet (BF16) gelir ve <b>belleğe sığdığı sürece olduğu gibi çalışır</b>.
          Ama tam hassasiyet parametre başına 2 bayttır (28B model ≈ 52 GB); çoğu kişi kuantize eder çünkü tam hâli
          tüketici kartına sığmaz. Sıra şudur: <b>önce KV cache'i küçült</b> (kalite etkisi çok az), <b>sonra ağırlığı</b>.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px 22px", fontSize: 12, lineHeight: 1.6 }}>
          <div><b style={{ color: C.ink }}>Nedir</b><br />{qAktif.ne}</div>
          <div><b style={{ color: C.ok }}>Artısı</b><br />{qAktif.arti}</div>
          <div><b style={{ color: C.warn }}>Eksisi</b><br />{qAktif.eksi}</div>
          <div><b style={{ color: C.ink }}>Ne zaman</b><br />{qAktif.nezaman}</div>
        </div>
      </Kutu>

      {/* ---------------- Kavramlar ---------------- */}
      <Kutu style={{ marginTop: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setKavramAcik((v) => !v)}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setKavramAcik((v) => !v); } }}>
          <div>
            <Etiket>Kavramlar, çok basitçe</Etiket>
            <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 2 }}>
              Kuantizasyon, KV cache, MoE, MLA… hepsi gündelik benzetmelerle
            </div>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.steel, border: `1px solid ${C.line}`, borderRadius: 3, padding: "4px 9px", whiteSpace: "nowrap" }}>
            {kavramAcik ? "gizle −" : "göster +"}
          </span>
        </div>
        {kavramAcik && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 11, marginTop: 14 }}>
            {KAVRAMLAR.map((k) => (
              <div key={k.ad} style={{ background: C.wash, border: `1px solid ${C.line2}`, borderRadius: 3, padding: "11px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>{k.ad}</div>
                <div style={{ fontSize: 12, color: C.steel, fontStyle: "italic", marginBottom: 5, lineHeight: 1.45 }}>{k.benzet}</div>
                <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.55 }}>{k.ozet}</div>
              </div>
            ))}
          </div>
        )}
      </Kutu>

      {/* ---------------- Varsayımlar ve veri güveni ---------------- */}
      <Kutu style={{ marginTop: 13 }}>
        <Etiket>Modelin varsayımları</Etiket>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px 26px", fontSize: 12.5, color: C.ink2, lineHeight: 1.65, marginTop: 8 }}>
          <div><b style={{ color: C.ink }}>KV cache</b><br />
            Her modelin katman geometrisi HuggingFace <code style={{ fontFamily: MONO }}>config.json</code>'undan
            okundu: kaç katman KV tutuyor, kaçı kayan pencereli, MLA mı GQA mı. Lineer/Mamba katmanları bağlamla
            büyüyen KV tutmadığı için sayılmaz — bu yüzden Qwen3.5+, GLM-5.3-Flash ve Nemotron-H'de KV çok düşük çıkar.</div>
          <div><b style={{ color: C.ink }}>Çözme hızı</b><br />
            Bellek bant genişliği sınırlı kabul edilir. Adım başına okunan bayt = aktif ağırlık + yığındaki
            KV cache × 0,55. Gerçekleşen bant genişliği kullanımı (MBU) cihaza göre %50-74.</div>
          <div><b style={{ color: C.ink }}>İlk token</b><br />
            Prefill hesap sınırlı kabul edilir, hesap verimi %42, girdi olarak <i>istem uzunluğu</i> alınır
            (bağlam penceresi değil). Yoğun anda her ek kullanıcı için %62 kuyruk gecikmesi eklenir.</div>
          <div><b style={{ color: C.ink }}>Ara bağlantı</b><br />
            Tensör paralelliği verimi NVLink %86, aynı kasada PCIe %60, ağ/USB4 üzerinden %33.
            Spark ve Mac kümelerinin düşük çıkması bu yüzdendir.</div>
          <div><b style={{ color: C.ink }}>Bellek payı</b><br />
            Birleşik bellekli kutularda %12, ayrık kartlarda %6 sistem payı düşülür. Çalışma zamanı için
            ayrıca 1,2 GB + ağırlığın %5'i + cihaz başına 0,35 GB ayrılır.</div>
          <div><b style={{ color: C.ink }}>Ana sistem</b><br />
            Ayrık kartlara, onları çalıştıracak bilgisayarın maliyeti ve gücü eklenir; kart sayısına göre
            basamaklıdır (masaüstü → çok yuvalı iş istasyonu → sunucu şasisi). Hazır kutular kendi başına
            bilgisayar olduğu için ek almaz.</div>
          <div><b style={{ color: C.ink }}>Fiyat ve elektrik</b><br />
            USD fiyatlar ABD sokak/MSRP yaklaşığı; TL fiyatlar Türkiye perakende gözlemi veya ithalat tahminidir
            (USD/TRY ≈ 48,4). Elektrik {ELEKTRIK_TL_KWH} TL/kWh, 7/24 tam yük varsayımıyla.</div>
        </div>
        <div style={{ marginTop: 13, paddingTop: 11, borderTop: `1px solid ${C.line2}`, fontSize: 12, color: C.ink3, lineHeight: 1.65 }}>
          Bu bir planlama aracıdır, ölçüm değildir. Sonuçlar büyüklük mertebesini ve donanımlar arası göreli farkı
          doğru gösterir; satın alma öncesinde seçilen kurulumun gerçek yükle kıyaslanması gerekir.
        </div>
      </Kutu>

      <Kutu style={{ marginTop: 13 }}>
        <Etiket>Veri güveni — son doğrulama 4 Eylül 2026</Etiket>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "10px 26px", fontSize: 12.5, color: C.ink2, lineHeight: 1.6, marginTop: 8 }}>
          <div><b style={{ color: C.ok }}>✓ Doğrudan kaynaktan (yüksek güven)</b><br />
            Model parametre sayıları HuggingFace safetensors üstverisinden; katman sayısı, dikkat başlıkları,
            KV geometrisi, bağlam uzunluğu ve lisans <code style={{ fontFamily: MONO }}>config.json</code> ve
            model kartından programatik olarak çekildi. {MODELS.length} deponun hepsi tek tek doğrulandı.</div>
          <div><b style={{ color: C.ok }}>✓ Üretici belirtimi</b><br />
            Donanım belleği (GB), bellek bant genişliği (GB/s), TDP (W) ve mimari — üretici belirtimlerinden.
            Bant genişlikleri veri yolu genişliği × bellek hızından çapraz doğrulandı.</div>
          <div><b style={{ color: C.warn }}>≈ Mühendislik tahmini</b><br />
            MBU (%50-74), prefill verimi (%42), KV okuma katsayısı (0,55), tensör paralelliği verimleri ve
            TFLOPS değerleri. Büyüklük mertebesi ve göreli fark doğrudur, spec-kesin değildir.
            MoE modellerde aktif parametre model kartından alındı; kartında yoksa config'den kestirildi.</div>
          <div><b style={{ color: C.bad }}>$ Yaklaşık ve oynak</b><br />
            Fiyatlar. TL değerleri Eylül 2026 Türkiye perakende gözlemidir ve kurla, stokla, satıcıyla değişir;
            HBM/GDDR7 kıtlığı sokak fiyatlarını MSRP üzerine çıkarıyor. <b>Satın alma öncesi canlı teklif alın</b> —
            bütçeyi bu sayılara kilitlemeyin.</div>
        </div>
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line2}`, fontSize: 12, color: C.ink3, lineHeight: 1.65 }}>
          <b>Bilinen sınırlar:</b> DGX Station GB300 katmanlı bellektir (496 GB LPDDR5X + 252 GB HBM3e); tek bant
          genişliği değeri ortalamadır. A100 ve Ampere kartlarda FP8 yoktur — TFLOPS sütunu FP16 değeridir.
          Llama 4 ve bazı depolar kapalıdır (gated), config'leri okunamadığı için KV geometrisi model kartından
          alınmıştır. TFLOPS sütunu yalnızca ilk-token tahmininde kullanılır; bellek ve token hızı sonuçlarını etkilemez.
        </div>
      </Kutu>

      <footer style={{ marginTop: 18, fontSize: 11.5, color: C.ink3, lineHeight: 1.7, textAlign: "center" }}>
        Seçimlerin adres çubuğunda saklanır — bu sayfanın linkini paylaşırsan karşı taraf aynı kurulumu görür.
        <br />
        Kaynak kod:{" "}
        <a href="https://github.com/furkanyesildag/Gpudeneme" target="_blank" rel="noreferrer noopener" style={{ color: C.steel }}>
          github.com/furkanyesildag/Gpudeneme
        </a>
      </footer>

      <ChatBot baglam={sohbetBaglami} hfCtx={hfCtx} acikDis={sohbetAcik} setAcikDis={setSohbetAcik} />
    </div>
  );
}

const grafikSec = {
  fontFamily: SANS, fontSize: 11.5, padding: "5px 7px",
  border: `1px solid ${C.line}`, borderRadius: 3, background: C.paper, color: C.ink,
};
const thStil = {
  padding: "7px 8px", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em",
  textTransform: "uppercase", color: C.ink3, fontWeight: 400, whiteSpace: "nowrap",
};
