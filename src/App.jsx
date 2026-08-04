import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  TASARIM JETONLARI                                                  */
/* ------------------------------------------------------------------ */

const C = {
  ink: "#12171C",
  ink2: "#3B454E",
  ink3: "#6B7780",
  line: "#D8DEE2",
  line2: "#EDF0F2",
  paper: "#FFFFFF",
  wash: "#F4F6F7",
  steel: "#1E4D6B",
  steelSoft: "#E7EEF3",
  ok: "#0E6E5E",
  okSoft: "#E2F0EC",
  warn: "#96600A",
  warnSoft: "#FAF0DC",
  bad: "#98211F",
  badSoft: "#FAE9E8",
  kv: "#C2703D",
  ovh: "#9AA4AB",
};

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
const SANS =
  '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/* ------------------------------------------------------------------ */
/*  DONANIM VERİTABANI                                                 */
/*  mem  = GB    bw = GB/s    tf = yoğun FP8 TFLOPS    w = watt        */
/*  link = birden fazla adet kullanıldığında ara bağlantı tipi         */
/* ------------------------------------------------------------------ */

const DEVICES = [
  // --- Hazır kutular / appliance ---
  { id: "spark", ad: "NVIDIA DGX Spark (GB10)", grup: "Hazır kutu", mem: 128, bw: 273, tf: 125, fiyat: 4699, w: 240, tur: "kutu", link: "net", mbu: 0.58 },
  { id: "station", ad: "DGX Station / MSI WS300 (GB300)", grup: "Hazır kutu", mem: 784, bw: 5000, tf: 4000, fiyat: 50000, w: 1800, tur: "kutu", link: "nvlink", mbu: 0.7 },
  { id: "gx10", ad: "ASUS Ascent GX10 (GB10)", grup: "Hazır kutu", mem: 128, bw: 273, tf: 125, fiyat: 3299, w: 240, tur: "kutu", link: "net", mbu: 0.58 },
  { id: "m3u512", ad: "Mac Studio M3 Ultra 512 GB", grup: "Hazır kutu", mem: 512, bw: 819, tf: 110, fiyat: 9499, w: 270, tur: "kutu", link: "net", mbu: 0.52 },
  { id: "m3u256", ad: "Mac Studio M3 Ultra 256 GB", grup: "Hazır kutu", mem: 256, bw: 819, tf: 110, fiyat: 7499, w: 270, tur: "kutu", link: "net", mbu: 0.52 },
  { id: "m4max", ad: "Mac Studio M4 Max 128 GB", grup: "Hazır kutu", mem: 128, bw: 546, tf: 70, fiyat: 3699, w: 160, tur: "kutu", link: "net", mbu: 0.52 },
  { id: "strix", ad: "Framework Desktop (Strix Halo 128 GB)", grup: "Hazır kutu", mem: 128, bw: 256, tf: 60, fiyat: 2200, w: 140, tur: "kutu", link: "net", mbu: 0.5 },

  // --- İş istasyonu kartları ---
  { id: "pro6000", ad: "RTX PRO 6000 Blackwell 96 GB", grup: "İş istasyonu kartı", mem: 96, bw: 1792, tf: 1000, fiyat: 13250, w: 600, tur: "kart", link: "pcie", mbu: 0.65 },
  { id: "pro5000_72", ad: "RTX PRO 5000 Blackwell 72 GB", grup: "İş istasyonu kartı", mem: 72, bw: 1344, tf: 700, fiyat: 7000, w: 300, tur: "kart", link: "pcie", mbu: 0.65 },
  { id: "pro5000_48", ad: "RTX PRO 5000 Blackwell 48 GB", grup: "İş istasyonu kartı", mem: 48, bw: 1344, tf: 700, fiyat: 4500, w: 300, tur: "kart", link: "pcie", mbu: 0.65 },
  { id: "pro4500", ad: "RTX PRO 4500 Blackwell 32 GB", grup: "İş istasyonu kartı", mem: 32, bw: 896, tf: 450, fiyat: 2600, w: 200, tur: "kart", link: "pcie", mbu: 0.65 },
  { id: "l40s", ad: "NVIDIA L40S 48 GB", grup: "İş istasyonu kartı", mem: 48, bw: 864, tf: 733, fiyat: 8000, w: 350, tur: "kart", link: "pcie", mbu: 0.65 },

  // --- Tüketici kartları ---
  { id: "5090", ad: "GeForce RTX 5090 32 GB", grup: "Tüketici kartı", mem: 32, bw: 1792, tf: 838, fiyat: 2200, w: 575, tur: "kart", link: "pcie", mbu: 0.63 },
  { id: "4090", ad: "GeForce RTX 4090 24 GB", grup: "Tüketici kartı", mem: 24, bw: 1008, tf: 660, fiyat: 1800, w: 450, tur: "kart", link: "pcie", mbu: 0.63 },
  { id: "3090", ad: "GeForce RTX 3090 24 GB (2. el)", grup: "Tüketici kartı", mem: 24, bw: 936, tf: 285, fiyat: 800, w: 350, tur: "kart", link: "pcie", mbu: 0.6 },

  // --- Veri merkezi ---
  { id: "a100", ad: "NVIDIA A100 80 GB", grup: "Veri merkezi", mem: 80, bw: 2039, tf: 624, fiyat: 15000, w: 400, tur: "kart", link: "nvlink", mbu: 0.7 },
  { id: "h100p", ad: "NVIDIA H100 PCIe 80 GB", grup: "Veri merkezi", mem: 80, bw: 2000, tf: 1513, fiyat: 25000, w: 350, tur: "kart", link: "pcie", mbu: 0.7 },
  { id: "h100s", ad: "NVIDIA H100 SXM 80 GB", grup: "Veri merkezi", mem: 80, bw: 3350, tf: 1979, fiyat: 30000, w: 700, tur: "kart", link: "nvlink", mbu: 0.72 },
  { id: "h200", ad: "NVIDIA H200 SXM 141 GB", grup: "Veri merkezi", mem: 141, bw: 4800, tf: 1979, fiyat: 32000, w: 700, tur: "kart", link: "nvlink", mbu: 0.72 },
  { id: "b200", ad: "NVIDIA B200 192 GB", grup: "Veri merkezi", mem: 192, bw: 8000, tf: 4500, fiyat: 40000, w: 1000, tur: "kart", link: "nvlink", mbu: 0.74 },

  // --- Uç / saha ---
  { id: "thor", ad: "Jetson AGX Thor 128 GB", grup: "Uç / saha", mem: 128, bw: 273, tf: 400, fiyat: 3499, w: 130, tur: "kutu", link: "net", mbu: 0.55 },
  { id: "agxorin", ad: "Jetson AGX Orin 64 GB", grup: "Uç / saha", mem: 64, bw: 204, tf: 138, fiyat: 1999, w: 60, tur: "kutu", link: "net", mbu: 0.55 },
  { id: "orinnano", ad: "Jetson Orin Nano Super 8 GB", grup: "Uç / saha", mem: 8, bw: 102, tf: 33, fiyat: 499, w: 25, tur: "kutu", link: "net", mbu: 0.55 },
];

/* ------------------------------------------------------------------ */
/*  MODEL VERİTABANI                                                   */
/*  tp = toplam milyar   ap = aktif milyar   kv = KB/token @ FP16      */
/* ------------------------------------------------------------------ */

const MODELS = [
  // Qwen
  { id: "q35_4", ad: "Qwen 3.5 4B", aile: "Qwen", tp: 4, ap: 4, kv: 48, ctx: 128, lis: "Apache 2.0" },
  { id: "q35_9", ad: "Qwen 3.5 9B", aile: "Qwen", tp: 9, ap: 9, kv: 72, ctx: 128, lis: "Apache 2.0" },
  { id: "q35_27", ad: "Qwen 3.5 27B (dense)", aile: "Qwen", tp: 27, ap: 27, kv: 128, ctx: 128, lis: "Apache 2.0" },
  { id: "q36_27", ad: "Qwen 3.6 27B (dense, agentic)", aile: "Qwen", tp: 27, ap: 27, kv: 128, ctx: 128, lis: "Apache 2.0" },
  { id: "q36_35", ad: "Qwen 3.6 35B-A3B (MoE)", aile: "Qwen", tp: 35, ap: 3, kv: 96, ctx: 128, lis: "Apache 2.0" },
  { id: "qcoder30", ad: "Qwen3-Coder 30B-A3B", aile: "Qwen", tp: 30, ap: 3, kv: 96, ctx: 256, lis: "Apache 2.0" },
  { id: "q35_397", ad: "Qwen 3.5 397B-A17B (MoE)", aile: "Qwen", tp: 397, ap: 17, kv: 160, ctx: 128, lis: "Apache 2.0" },

  // Gemma
  { id: "g4e2", ad: "Gemma 4 E2B", aile: "Gemma", tp: 2.3, ap: 2.3, kv: 12, ctx: 128, lis: "Apache 2.0" },
  { id: "g4e4", ad: "Gemma 4 E4B", aile: "Gemma", tp: 4.5, ap: 4.5, kv: 16, ctx: 128, lis: "Apache 2.0" },
  { id: "g4_12", ad: "Gemma 4 12B", aile: "Gemma", tp: 12, ap: 12, kv: 40, ctx: 256, lis: "Apache 2.0" },
  { id: "g4_26", ad: "Gemma 4 26B-A4B (MoE)", aile: "Gemma", tp: 26, ap: 3.9, kv: 48, ctx: 256, lis: "Apache 2.0" },
  { id: "g4_31", ad: "Gemma 4 31B (dense)", aile: "Gemma", tp: 31, ap: 31, kv: 60, ctx: 256, lis: "Apache 2.0" },

  // DeepSeek
  { id: "dsv32", ad: "DeepSeek V3.2 685B-A37B", aile: "DeepSeek", tp: 685, ap: 37, kv: 70, ctx: 128, lis: "MIT" },
  { id: "dsr1", ad: "DeepSeek R1 671B-A37B", aile: "DeepSeek", tp: 671, ap: 37, kv: 70, ctx: 128, lis: "MIT" },

  // GLM
  { id: "glm5", ad: "GLM-5 744B-A40B", aile: "GLM", tp: 744, ap: 40, kv: 120, ctx: 128, lis: "MIT" },
  { id: "glm47", ad: "GLM-4.7 355B-A32B", aile: "GLM", tp: 355, ap: 32, kv: 110, ctx: 128, lis: "MIT" },

  // Kimi / MiniMax
  { id: "kimi", ad: "Kimi K2.5 1T-A32B", aile: "Kimi", tp: 1000, ap: 32, kv: 100, ctx: 256, lis: "Değiştirilmiş MIT" },
  { id: "minimax", ad: "MiniMax M2.5 230B-A10B", aile: "MiniMax", tp: 230, ap: 10, kv: 90, ctx: 200, lis: "Apache 2.0" },

  // Llama
  { id: "l4scout", ad: "Llama 4 Scout 109B-A17B", aile: "Llama", tp: 109, ap: 17, kv: 80, ctx: 1000, lis: "Llama Community" },
  { id: "l4mav", ad: "Llama 4 Maverick 400B-A17B", aile: "Llama", tp: 400, ap: 17, kv: 80, ctx: 256, lis: "Llama Community" },
  { id: "l33_70", ad: "Llama 3.3 70B (dense)", aile: "Llama", tp: 70, ap: 70, kv: 320, ctx: 128, lis: "Llama Community" },

  // Mistral
  { id: "mlarge3", ad: "Mistral Large 3 675B-A39B", aile: "Mistral", tp: 675, ap: 39, kv: 120, ctx: 256, lis: "Apache 2.0" },
  { id: "msmall4", ad: "Mistral Small 4 24B-A3.5B", aile: "Mistral", tp: 24, ap: 3.5, kv: 64, ctx: 128, lis: "Apache 2.0" },
  { id: "devstral2", ad: "Devstral 2 123B (dense)", aile: "Mistral", tp: 123, ap: 123, kv: 200, ctx: 256, lis: "Apache 2.0" },

  // gpt-oss / Nemotron
  { id: "oss120", ad: "gpt-oss 120B-A5B", aile: "gpt-oss", tp: 120, ap: 5, kv: 72, ctx: 128, lis: "Apache 2.0" },
  { id: "oss20", ad: "gpt-oss 20B-A3.6B", aile: "gpt-oss", tp: 20, ap: 3.6, kv: 40, ctx: 128, lis: "Apache 2.0" },
  { id: "nemo9", ad: "Nemotron 3 Nano 9B", aile: "NVIDIA", tp: 9, ap: 9, kv: 60, ctx: 128, lis: "NVIDIA Open" },

  // Türkçe
  { id: "kumru74", ad: "Kumru 7.4B (Türkçe)", aile: "Türkçe", tp: 7.4, ap: 7.4, kv: 128, ctx: 8, lis: "VNGRS" },
  { id: "kumru2", ad: "Kumru 2B (Türkçe)", aile: "Türkçe", tp: 2, ap: 2, kv: 64, ctx: 8, lis: "Apache 2.0" },
];

const QUANTS = [
  { id: "bf16", ad: "BF16 / FP16", bpp: 2.0, kayip: "referans" },
  { id: "fp8", ad: "FP8", bpp: 1.0, kayip: "~%1" },
  { id: "nvfp4", ad: "NVFP4 / MXFP4", bpp: 0.55, kayip: "~%2-3" },
  { id: "q4", ad: "Q4_K_M (GGUF)", bpp: 0.6, kayip: "~%3-5" },
  { id: "q4qat", ad: "Q4 QAT", bpp: 0.6, kayip: "~%1-2" },
  { id: "q3", ad: "Q3 (agresif)", bpp: 0.45, kayip: "~%8+" },
];

const KVQUANTS = [
  { id: "fp16", ad: "FP16", f: 1.0 },
  { id: "fp8", ad: "FP8 / q8_0", f: 0.5 },
  { id: "q4", ad: "Q4", f: 0.25 },
];

const TP_ETKI = { tek: 1.0, nvlink: 0.86, pcie: 0.6, net: 0.33 };
const TP_ETIKET = {
  nvlink: "NVLink",
  pcie: "PCIe (aynı kasa)",
  net: "Ağ (ayrı kutular)",
};

const ANAKART_FIYAT = 8500;
const ANAKART_WATT = 250;
const KART_BASINA_ANAKART = 4;

/* ------------------------------------------------------------------ */
/*  HESAP MOTORU                                                       */
/* ------------------------------------------------------------------ */

function hesapla({ model, quant, kvq, ctxK, kullanici, cikti, cihaz, adet, topoloji }) {
  const bpp = QUANTS.find((q) => q.id === quant).bpp;
  const kvf = KVQUANTS.find((q) => q.id === kvq).f;

  const agirlikGB = model.tp * bpp;
  const aktifGB = model.ap * bpp;
  const ctx = ctxK * 1024;
  const kvTokenGB = (model.kv * kvf) / (1024 * 1024);

  const kartMi = cihaz.tur === "kart";
  const anakartSayisi = kartMi ? Math.ceil(adet / KART_BASINA_ANAKART) : 0;
  const maliyet = cihaz.fiyat * adet + anakartSayisi * ANAKART_FIYAT;
  const guc = cihaz.w * adet + anakartSayisi * ANAKART_WATT;

  // Kullanılabilir bellek (işletim sistemi + çalışma zamanı payı düşülmüş)
  const rezerv = cihaz.tur === "kutu" ? 0.12 : 0.05;
  const cihazKullanilabilir = cihaz.mem * (1 - rezerv);

  const kumeMi = topoloji === "kume";
  const dugumSayisi = kumeMi ? 1 : adet;
  const dugumBasinaCihaz = kumeMi ? adet : 1;
  const dugumBellek = cihazKullanilabilir * dugumBasinaCihaz;

  // Ara bağlantı verimi
  const link = dugumBasinaCihaz > 1 ? cihaz.link : "tek";
  const tpEtki = TP_ETKI[link];
  const dugumBW = cihaz.bw * dugumBasinaCihaz * tpEtki;
  const dugumTF = cihaz.tf * dugumBasinaCihaz * (dugumBasinaCihaz > 1 ? 0.9 : 1);

  const kullaniciPerDugum = Math.max(1, Math.ceil(kullanici / dugumSayisi));

  // Bellek bütçesi (tek düğüm)
  const kvGB = kullaniciPerDugum * ctx * kvTokenGB;
  const ekGB = 1.5 + 0.06 * agirlikGB;
  const gerekliGB = agirlikGB + kvGB + ekGB;
  const sigar = gerekliGB <= dugumBellek;
  const doluluk = gerekliGB / dugumBellek;

  // Çözme hızı
  const adimBayt = aktifGB + kullaniciPerDugum * ctx * kvTokenGB * 0.55;
  const adimHiz = (dugumBW * cihaz.mbu) / adimBayt;
  const kullaniciTokS = adimHiz;
  const toplamTokS = adimHiz * kullaniciPerDugum * dugumSayisi;

  // İlk token gecikmesi
  const flops = 2 * model.ap * 1e9 * ctx;
  const ttftTek = flops / (dugumTF * 1e12 * 0.42);
  const ttftYogun = ttftTek * (1 + (kullaniciPerDugum - 1) * 0.55);

  // Kapasite sınırları
  const kvBasinaKullanici = ctx * kvTokenGB;
  const maxKullaniciDugum = Math.max(
    0,
    Math.floor((dugumBellek - agirlikGB - ekGB) / kvBasinaKullanici)
  );
  const maxKullanici = maxKullaniciDugum * dugumSayisi;
  const maxCtxK = Math.max(
    0,
    (dugumBellek - agirlikGB - ekGB) / (kullaniciPerDugum * kvTokenGB) / 1024
  );

  // Minimum adet (bu iş yükünü taşımak için)
  let minAdet = null;
  for (let n = 1; n <= 64; n++) {
    const nDugum = kumeMi ? 1 : n;
    const nCihaz = kumeMi ? n : 1;
    const bellek = cihazKullanilabilir * nCihaz;
    const kpd = Math.max(1, Math.ceil(kullanici / nDugum));
    const ihtiyac = agirlikGB + kpd * ctx * kvTokenGB + ekGB;
    if (ihtiyac <= bellek) {
      minAdet = n;
      break;
    }
  }

  const ciktiSure = cikti / Math.max(kullaniciTokS, 0.01);

  return {
    agirlikGB, kvGB, ekGB, gerekliGB, dugumBellek, sigar, doluluk,
    kullaniciTokS, toplamTokS, ttftTek, ttftYogun, ciktiSure,
    maxKullanici, maxCtxK, minAdet, maliyet, guc,
    dugumSayisi, dugumBasinaCihaz, kullaniciPerDugum, link, tpEtki,
    dugumBW, ctx, kvTokenGB, aktifGB,
  };
}

/* ------------------------------------------------------------------ */
/*  KÜÇÜK BİLEŞENLER                                                   */
/* ------------------------------------------------------------------ */

function Etiket({ children }) {
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: 10.5,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: C.ink3,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Kutu({ children, style }) {
  return (
    <div
      style={{
        background: C.paper,
        border: `1px solid ${C.line}`,
        borderRadius: 3,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Sayac({ etiket, deger, birim, alt, renk }) {
  return (
    <Kutu style={{ padding: "14px 16px" }}>
      <Etiket>{etiket}</Etiket>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 25,
            fontWeight: 500,
            color: renk || C.ink,
            lineHeight: 1.1,
          }}
        >
          {deger}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink3 }}>{birim}</span>
      </div>
      {alt && (
        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, lineHeight: 1.4 }}>
          {alt}
        </div>
      )}
    </Kutu>
  );
}

function Secim({ etiket, deger, onChange, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Etiket>{etiket}</Etiket>
      <select
        value={deger}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          fontFamily: SANS,
          fontSize: 13,
          padding: "7px 8px",
          border: `1px solid ${C.line}`,
          borderRadius: 3,
          background: C.paper,
          color: C.ink,
        }}
      >
        {children}
      </select>
    </div>
  );
}

function Kaydirac({ etiket, deger, onChange, min, max, step, goster }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Etiket>{etiket}</Etiket>
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.steel, fontWeight: 500 }}>
          {goster}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={deger}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.steel }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ANA BİLEŞEN                                                        */
/* ------------------------------------------------------------------ */

export default function Simulator() {
  const [modelId, setModelId] = useState("qcoder30");
  const [quant, setQuant] = useState("fp8");
  const [kvq, setKvq] = useState("fp8");
  const [ctxK, setCtxK] = useState(64);
  const [kullanici, setKullanici] = useState(8);
  const [cikti, setCikti] = useState(800);
  const [cihazId, setCihazId] = useState("pro6000");
  const [adet, setAdet] = useState(2);
  const [topoloji, setTopoloji] = useState("bagimsiz");
  const [siralama, setSiralama] = useState("verim");

  const model = MODELS.find((m) => m.id === modelId);
  const cihaz = DEVICES.find((d) => d.id === cihazId);

  const r = useMemo(
    () => hesapla({ model, quant, kvq, ctxK, kullanici, cikti, cihaz, adet, topoloji }),
    [model, quant, kvq, ctxK, kullanici, cikti, cihaz, adet, topoloji]
  );

  // Eşzamanlılık eğrisi
  const egri = useMemo(() => {
    const out = [];
    for (let k = 1; k <= 32; k++) {
      const h = hesapla({ model, quant, kvq, ctxK, kullanici: k, cikti, cihaz, adet, topoloji });
      out.push({
        k,
        kisiBasi: h.sigar ? Number(h.kullaniciTokS.toFixed(1)) : null,
        toplam: h.sigar ? Number(h.toplamTokS.toFixed(0)) : null,
      });
    }
    return out;
  }, [model, quant, kvq, ctxK, cikti, cihaz, adet, topoloji]);

  // Tüm cihazlar karşılaştırması
  const tablo = useMemo(() => {
    return DEVICES.map((d) => {
      let bulunan = null;
      for (let n = 1; n <= 32; n++) {
        const h = hesapla({ model, quant, kvq, ctxK, kullanici, cikti, cihaz: d, adet: n, topoloji });
        if (h.sigar) {
          bulunan = { n, h };
          break;
        }
      }
      if (!bulunan) return { d, olmaz: true };
      return {
        d,
        n: bulunan.n,
        kisiBasi: bulunan.h.kullaniciTokS,
        toplam: bulunan.h.toplamTokS,
        ttft: bulunan.h.ttftYogun,
        maliyet: bulunan.h.maliyet,
        guc: bulunan.h.guc,
        birim: bulunan.h.maliyet / Math.max(bulunan.h.toplamTokS, 0.01),
      };
    })
      .filter((x) => !x.olmaz)
      .sort((a, b) => {
        if (siralama === "verim") return b.toplam - a.toplam;
        if (siralama === "hiz") return b.kisiBasi - a.kisiBasi;
        if (siralama === "ucuz") return a.maliyet - b.maliyet;
        return a.birim - b.birim;
      });
  }, [model, quant, kvq, ctxK, kullanici, cikti, topoloji, siralama]);

  const durumRenk = !r.sigar ? C.bad : r.doluluk > 0.88 ? C.warn : C.ok;
  const durumMetin = !r.sigar
    ? "Belleğe sığmıyor"
    : r.doluluk > 0.88
    ? "Sınırda çalışır"
    : "Rahat çalışır";
  const durumZemin = !r.sigar ? C.badSoft : r.doluluk > 0.88 ? C.warnSoft : C.okSoft;

  const yuzde = (x) => Math.max(0, Math.min(100, (x / r.dugumBellek) * 100));
  const para = (x) =>
    x >= 1000 ? `$${(x / 1000).toFixed(x >= 10000 ? 0 : 1)}k` : `$${Math.round(x)}`;

  const modelAileleri = [...new Set(MODELS.map((m) => m.aile))];
  const cihazGruplari = [...new Set(DEVICES.map((d) => d.grup))];

  return (
    <div
      style={{
        fontFamily: SANS,
        background: C.wash,
        color: C.ink,
        padding: "22px 20px 40px",
        minHeight: "100%",
      }}
    >
      {/* Başlık */}
      <div style={{ marginBottom: 20, borderBottom: `2px solid ${C.ink}`, paddingBottom: 14 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.14em",
            color: C.steel,
            marginBottom: 7,
          }}
        >
          YEREL LLM ALTYAPISI · KAPASİTE SİMÜLASYONU
        </div>
        <h1 style={{ fontSize: 27, fontWeight: 500, margin: 0, letterSpacing: "-0.02em" }}>
          Hangi donanım, kaç adet, ne kadar token
        </h1>
        <p style={{ fontSize: 13.5, color: C.ink2, margin: "8px 0 0", maxWidth: 720, lineHeight: 1.6 }}>
          Model, kuantizasyon, bağlam uzunluğu ve eşzamanlı kullanıcı sayısını seç. Simülasyon bellek
          bütçesini, token hızını, ilk token gecikmesini, maliyeti ve güç tüketimini çıkarır.
        </p>
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* ---------------- SOL: KONTROLLER ---------------- */}
        <div style={{ flex: "1 1 280px", minWidth: 270, maxWidth: 340 }}>
          <Kutu style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: "0.1em",
                color: C.ink,
                borderBottom: `1px solid ${C.line}`,
                paddingBottom: 8,
                marginBottom: 14,
              }}
            >
              MODEL
            </div>

            <Secim etiket="Açık ağırlıklı model" deger={modelId} onChange={setModelId}>
              {modelAileleri.map((a) => (
                <optgroup key={a} label={a}>
                  {MODELS.filter((m) => m.aile === a).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.ad}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Secim>

            <div
              style={{
                background: C.wash,
                border: `1px solid ${C.line2}`,
                padding: "8px 10px",
                fontFamily: MONO,
                fontSize: 11,
                color: C.ink2,
                lineHeight: 1.7,
                marginBottom: 14,
              }}
            >
              toplam {model.tp}B · aktif {model.ap}B
              <br />
              KV {model.kv} KB/token · maks {model.ctx}K
              <br />
              lisans: {model.lis}
            </div>

            <Secim etiket="Ağırlık kuantizasyonu" deger={quant} onChange={setQuant}>
              {QUANTS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.ad} — kalite kaybı {q.kayip}
                </option>
              ))}
            </Secim>

            <Secim etiket="KV cache kuantizasyonu" deger={kvq} onChange={setKvq}>
              {KVQUANTS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.ad}
                </option>
              ))}
            </Secim>
          </Kutu>

          <Kutu style={{ marginBottom: 14 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: "0.1em",
                borderBottom: `1px solid ${C.line}`,
                paddingBottom: 8,
                marginBottom: 14,
              }}
            >
              İŞ YÜKÜ
            </div>

            <Kaydirac
              etiket="Bağlam uzunluğu"
              deger={ctxK}
              onChange={setCtxK}
              min={4}
              max={256}
              step={4}
              goster={`${ctxK}K token`}
            />
            <Kaydirac
              etiket="Eşzamanlı kullanıcı"
              deger={kullanici}
              onChange={setKullanici}
              min={1}
              max={32}
              step={1}
              goster={`${kullanici} kişi`}
            />
            <Kaydirac
              etiket="Ortalama yanıt uzunluğu"
              deger={cikti}
              onChange={setCikti}
              min={100}
              max={4000}
              step={100}
              goster={`${cikti} token`}
            />
          </Kutu>

          <Kutu>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: "0.1em",
                borderBottom: `1px solid ${C.line}`,
                paddingBottom: 8,
                marginBottom: 14,
              }}
            >
              DONANIM
            </div>

            <Secim etiket="Cihaz" deger={cihazId} onChange={setCihazId}>
              {cihazGruplari.map((g) => (
                <optgroup key={g} label={g}>
                  {DEVICES.filter((d) => d.grup === g).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.ad}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Secim>

            <Kaydirac
              etiket="Adet"
              deger={adet}
              onChange={setAdet}
              min={1}
              max={16}
              step={1}
              goster={`${adet} adet`}
            />

            <Secim etiket="Topoloji" deger={topoloji} onChange={setTopoloji}>
              <option value="bagimsiz">Bağımsız düğüm — her cihazda ayrı model kopyası</option>
              <option value="kume">Tek küme — tensör paralelliği ile birleştir</option>
            </Secim>

            <div
              style={{
                background: C.wash,
                border: `1px solid ${C.line2}`,
                padding: "8px 10px",
                fontFamily: MONO,
                fontSize: 11,
                color: C.ink2,
                lineHeight: 1.7,
              }}
            >
              {cihaz.mem} GB · {cihaz.bw} GB/s · {cihaz.w} W
              <br />
              birim {para(cihaz.fiyat)}
              {adet > 1 && topoloji === "kume" && (
                <>
                  <br />
                  <span style={{ color: r.tpEtki < 0.5 ? C.bad : C.ink2 }}>
                    bağlantı: {TP_ETIKET[r.link]} · verim %{Math.round(r.tpEtki * 100)}
                  </span>
                </>
              )}
            </div>
          </Kutu>
        </div>

        {/* ---------------- SAĞ: SONUÇLAR ---------------- */}
        <div style={{ flex: "3 1 520px", minWidth: 320 }}>
          {/* Durum şeridi */}
          <div
            style={{
              background: durumZemin,
              border: `1px solid ${durumRenk}`,
              borderRadius: 3,
              padding: "12px 16px",
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 500, color: durumRenk }}>
                {durumMetin}
              </div>
              <div style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>
                {adet} × {cihaz.ad}
                {topoloji === "kume" && adet > 1 ? " (tek küme)" : ""} · {model.ad}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 500, color: durumRenk }}>
                %{Math.round(r.doluluk * 100)}
              </div>
              <div style={{ fontSize: 11, color: C.ink2 }}>bellek doluluğu</div>
            </div>
          </div>

          {/* SİGNATÜR: bellek bütçe şeridi */}
          <Kutu style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 10,
              }}
            >
              <Etiket>Düğüm başına bellek bütçesi</Etiket>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink2 }}>
                {r.gerekliGB.toFixed(1)} / {r.dugumBellek.toFixed(0)} GB
              </span>
            </div>

            <div
              style={{
                display: "flex",
                height: 30,
                background: C.line2,
                border: `1px solid ${C.line}`,
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <div style={{ width: `${yuzde(r.agirlikGB)}%`, background: C.steel }} />
              <div style={{ width: `${yuzde(r.kvGB)}%`, background: C.kv }} />
              <div style={{ width: `${yuzde(r.ekGB)}%`, background: C.ovh }} />
            </div>

            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 11.5 }}>
              {[
                ["Ağırlıklar", r.agirlikGB, C.steel],
                ["KV cache", r.kvGB, C.kv],
                ["Çalışma zamanı", r.ekGB, C.ovh],
                ["Boşta", Math.max(0, r.dugumBellek - r.gerekliGB), C.line],
              ].map(([ad, v, renk]) => (
                <div key={ad} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{ width: 10, height: 10, background: renk, display: "inline-block" }}
                  />
                  <span style={{ color: C.ink2 }}>{ad}</span>
                  <span style={{ fontFamily: MONO, color: C.ink }}>{v.toFixed(1)} GB</span>
                </div>
              ))}
            </div>

            {!r.sigar && (
              <div
                style={{
                  marginTop: 12,
                  padding: "9px 11px",
                  background: C.badSoft,
                  borderLeft: `3px solid ${C.bad}`,
                  fontSize: 12.5,
                  color: C.ink,
                  lineHeight: 1.6,
                }}
              >
                Bu iş yükü için en az <b>{r.minAdet ? `${r.minAdet} adet` : "16+ adet"}</b> gerekiyor.
                Alternatif olarak bağlamı <b>{r.maxCtxK.toFixed(0)}K</b> altına indir veya eşzamanlı
                kullanıcıyı <b>{r.maxKullanici}</b> kişiye düşür.
              </div>
            )}
          </Kutu>

          {/* Sayaçlar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <Sayac
              etiket="Kullanıcı başına"
              deger={r.sigar ? r.kullaniciTokS.toFixed(1) : "—"}
              birim="tok/s"
              alt={r.sigar ? `${r.ciktiSure.toFixed(1)} sn'de ${cikti} token` : "sığmıyor"}
              renk={r.kullaniciTokS < 12 ? C.warn : C.ok}
            />
            <Sayac
              etiket="Toplam verim"
              deger={r.sigar ? Math.round(r.toplamTokS) : "—"}
              birim="tok/s"
              alt={`${r.dugumSayisi} düğüm · düğüm başına ${r.kullaniciPerDugum} kişi`}
            />
            <Sayac
              etiket="İlk token (yoğun)"
              deger={r.sigar ? r.ttftYogun.toFixed(1) : "—"}
              birim="sn"
              alt={`tek istekte ${r.ttftTek.toFixed(1)} sn`}
              renk={r.ttftYogun > 10 ? C.bad : r.ttftYogun > 4 ? C.warn : C.ok}
            />
            <Sayac etiket="Donanım yatırımı" deger={para(r.maliyet)} birim="" alt={`${r.guc} W çekiş`} />
            <Sayac
              etiket="Bu bağlamda tavan"
              deger={r.maxKullanici}
              birim="kişi"
              alt={`${ctxK}K bağlamla sığan en fazla kullanıcı`}
            />
            <Sayac
              etiket="Bu kişi sayısında tavan"
              deger={r.maxCtxK.toFixed(0)}
              birim="K token"
              alt={`${kullanici} kişiyle sığan en uzun bağlam`}
            />
          </div>

          {/* Eğri */}
          <Kutu style={{ marginBottom: 14 }}>
            <Etiket>Eşzamanlı kullanıcı arttıkça ne oluyor</Etiket>
            <div style={{ height: 210, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={egri} margin={{ top: 6, right: 8, left: -14, bottom: 4 }}>
                  <CartesianGrid stroke={C.line2} vertical={false} />
                  <XAxis
                    dataKey="k"
                    tick={{ fontSize: 10.5, fill: C.ink3, fontFamily: MONO }}
                    stroke={C.line}
                  />
                  <YAxis
                    yAxisId="l"
                    tick={{ fontSize: 10.5, fill: C.ink3, fontFamily: MONO }}
                    stroke={C.line}
                  />
                  <YAxis
                    yAxisId="r"
                    orientation="right"
                    tick={{ fontSize: 10.5, fill: C.ink3, fontFamily: MONO }}
                    stroke={C.line}
                  />
                  <Tooltip
                    contentStyle={{
                      fontFamily: MONO,
                      fontSize: 11.5,
                      border: `1px solid ${C.line}`,
                      borderRadius: 3,
                    }}
                    labelFormatter={(v) => `${v} eşzamanlı kullanıcı`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11.5, fontFamily: SANS }} />
                  <Line
                    yAxisId="l"
                    type="monotone"
                    dataKey="kisiBasi"
                    name="Kullanıcı başına tok/s"
                    stroke={C.steel}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    yAxisId="r"
                    type="monotone"
                    dataKey="toplam"
                    name="Toplam tok/s"
                    stroke={C.kv}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 6, lineHeight: 1.6 }}>
              Çizgi kesiliyorsa o kullanıcı sayısında bellek yetmiyor demektir. Toplam verim yükselirken
              kullanıcı başına hızın düşmesi normaldir, önemli olan kişi başına hızın kullanılabilir
              bandın altına inmemesi.
            </div>
          </Kutu>

          {/* Karşılaştırma tablosu */}
          <Kutu>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div>
                <Etiket>Tüm donanımlar, bu iş yükü için</Etiket>
                <div style={{ fontSize: 12, color: C.ink2 }}>
                  {model.ad} · {ctxK}K bağlam · {kullanici} kullanıcı · her satır o cihazdan gereken
                  minimum adedi gösterir
                </div>
              </div>
              <select
                value={siralama}
                onChange={(e) => setSiralama(e.target.value)}
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  padding: "5px 7px",
                  border: `1px solid ${C.line}`,
                  borderRadius: 3,
                  background: C.paper,
                }}
              >
                <option value="verim">Sırala: toplam verim</option>
                <option value="hiz">Sırala: kişi başına hız</option>
                <option value="ucuz">Sırala: en ucuz</option>
                <option value="birim">Sırala: token başına maliyet</option>
              </select>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${C.ink}` }}>
                    {[
                      ["Donanım", "left"],
                      ["Adet", "right"],
                      ["Kişi/s", "right"],
                      ["Toplam", "right"],
                      ["İlk token", "right"],
                      ["Maliyet", "right"],
                      ["Güç", "right"],
                      ["$/tok/s", "right"],
                    ].map(([h, a]) => (
                      <th
                        key={h}
                        style={{
                          textAlign: a,
                          padding: "7px 8px",
                          fontFamily: MONO,
                          fontSize: 10.5,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: C.ink3,
                          fontWeight: 400,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tablo.map((row) => {
                    const secili = row.d.id === cihazId;
                    return (
                      <tr
                        key={row.d.id}
                        onClick={() => {
                          setCihazId(row.d.id);
                          setAdet(row.n);
                        }}
                        style={{
                          borderBottom: `1px solid ${C.line2}`,
                          background: secili ? C.steelSoft : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ padding: "7px 8px" }}>
                          <div style={{ fontWeight: secili ? 500 : 400 }}>{row.d.ad}</div>
                          <div style={{ fontSize: 10.5, color: C.ink3, fontFamily: MONO }}>
                            {row.d.grup}
                          </div>
                        </td>
                        {[
                          `${row.n}×`,
                          row.kisiBasi.toFixed(1),
                          Math.round(row.toplam),
                          `${row.ttft.toFixed(1)}s`,
                          para(row.maliyet),
                          `${row.guc}W`,
                          `$${row.birim.toFixed(0)}`,
                        ].map((v, i) => (
                          <td
                            key={i}
                            style={{
                              padding: "7px 8px",
                              textAlign: "right",
                              fontFamily: MONO,
                              whiteSpace: "nowrap",
                              color:
                                i === 1 && row.kisiBasi < 12
                                  ? C.warn
                                  : i === 3 && row.ttft > 10
                                  ? C.bad
                                  : C.ink,
                            }}
                          >
                            {v}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 10, lineHeight: 1.6 }}>
              Satıra tıklayınca o kurulum yukarıdaki panele yüklenir. Kart tipi cihazlarda her 4 karta
              bir {para(ANAKART_FIYAT)} sunucu şasi maliyeti eklenmiştir.
            </div>
          </Kutu>
        </div>
      </div>

      {/* Varsayımlar */}
      <div style={{ marginTop: 22 }}>
        <Kutu>
          <Etiket>Modelin varsayımları</Etiket>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "10px 26px",
              fontSize: 12.5,
              color: C.ink2,
              lineHeight: 1.65,
              marginTop: 8,
            }}
          >
            <div>
              <b style={{ color: C.ink }}>Çözme hızı</b>
              <br />
              Bellek bant genişliği sınırlı kabul edilir. Adım başına okunan bayt, aktif parametre
              artı yığındaki KV cache olarak alınır. Bant genişliği kullanımı cihaza göre %50-74.
            </div>
            <div>
              <b style={{ color: C.ink }}>Ara bağlantı</b>
              <br />
              Tensör paralelliği verimi NVLink %86, aynı kasadaki PCIe %60, ayrı kutular arası ağ %33
              alınmıştır. Spark ve Mac kümelerinin düşük çıkması bu yüzdendir.
            </div>
            <div>
              <b style={{ color: C.ink }}>Bellek payı</b>
              <br />
              Birleşik bellekli kutularda %12, ayrık kartlarda %5 işletim sistemi payı düşülür.
              Çalışma zamanı için ayrıca 1.5 GB artı ağırlığın %6'sı ayrılır.
            </div>
            <div>
              <b style={{ color: C.ink }}>İlk token</b>
              <br />
              Prefill hesap sınırlı kabul edilir, hesap verimi %42. Yoğun anda düğümdeki her ek
              kullanıcı için %55 gecikme eklenir.
            </div>
            <div>
              <b style={{ color: C.ink }}>KV cache</b>
              <br />
              Model başına KB/token değerleri yaklaşıktır. Kayan pencereli dikkat kullanan modellerde
              (Gemma ailesi) gerçek değer daha düşük olabilir.
            </div>
            <div>
              <b style={{ color: C.ink }}>Fiyatlar</b>
              <br />
              2026 yılı ABD liste ve sokak fiyatlarının yaklaşığıdır. GDDR7 ve HBM kıtlığı sebebiyle
              oynaktır. Türkiye'ye gümrük ve KDV eklenir.
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: `1px solid ${C.line2}`,
              fontSize: 12,
              color: C.ink3,
              lineHeight: 1.6,
            }}
          >
            Bu bir planlama aracıdır, ölçüm değildir. Sonuçlar büyüklük mertebesini ve donanımlar
            arası göreli farkı doğru gösterir; satın alma öncesinde seçilen kurulumun gerçek yükle
            kıyaslanması gerekir.
          </div>
        </Kutu>
      </div>
    </div>
  );
}
