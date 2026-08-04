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
  ReferenceLine,
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

// Bağlam uzunluğunu okunur biçimde göster: 128 → "128K", 1000 → "1M", 10000 → "10M"
const ctxYazi = (k) => (k >= 1000 ? `${(k / 1000) % 1 === 0 ? k / 1000 : (k / 1000).toFixed(1)}M` : `${k}K`);
// Token sayısını yaklaşık karakter/harf karşılığına çevir (~4 karakter/token, yaklaşık).
const harfYazi = (tok) => {
  const h = tok * 4;
  return h >= 1000 ? `~${(h / 1000).toFixed(h < 10000 ? 1 : 0)}b harf` : `~${h} harf`;
};

const linkBtnStil = {
  fontFamily: SANS,
  fontSize: 11.5,
  color: C.steel,
  textDecoration: "none",
  border: `1px solid ${C.line}`,
  borderRadius: 3,
  padding: "5px 9px",
  background: C.paper,
  whiteSpace: "nowrap",
};

const grafikSecStil = {
  fontFamily: SANS,
  fontSize: 11.5,
  padding: "4px 6px",
  border: `1px solid ${C.line}`,
  borderRadius: 3,
  background: C.paper,
  color: C.ink,
};

/* ------------------------------------------------------------------ */
/*  DONANIM VERİTABANI                                                 */
/*  mem  = GB    bw = GB/s    tf = yoğun FP8 TFLOPS    w = watt        */
/*  link = birden fazla adet kullanıldığında ara bağlantı tipi         */
/* ------------------------------------------------------------------ */

/* mem = birleşik RAM / VRAM (GB) — kutularda paylaşımlı sistem RAM'i,
   kartlarda kartın kendi VRAM'i. Dropdown'da her cihazın yanında gösterilir. */
const DEVICES = [
  // --- Hazır kutular / appliance (birleşik RAM) ---
  { id: "spark", ad: "NVIDIA DGX Spark (GB10)", grup: "Hazır kutu", mem: 128, bw: 273, tf: 125, fiyat: 4699, w: 240, tur: "kutu", link: "net", mbu: 0.58, tr: "sinirli", mim: "gb10" },
  { id: "station", ad: "DGX Station / MSI WS300 (GB300)", grup: "Hazır kutu", mem: 748, bw: 2000, tf: 4000, fiyat: 85000, w: 1600, tur: "kutu", link: "nvlink", mbu: 0.7, tr: "kurumsal", mim: "gb300" },
  { id: "gx10", ad: "ASUS Ascent GX10 (GB10)", grup: "Hazır kutu", mem: 128, bw: 276, tf: 125, fiyat: 2999, w: 240, tur: "kutu", link: "net", mbu: 0.58, tr: "sinirli", mim: "gb10" },
  { id: "m3u96", ad: "Mac Studio M3 Ultra", grup: "Hazır kutu", mem: 96, bw: 819, tf: 110, fiyat: 3999, w: 270, tur: "kutu", link: "net", mbu: 0.52, tr: "kolay", mim: "apple" },
  { id: "m4max", ad: "Mac Studio M4 Max", grup: "Hazır kutu", mem: 128, bw: 546, tf: 70, fiyat: 3699, w: 160, tur: "kutu", link: "net", mbu: 0.52, tr: "kolay", mim: "apple" },
  { id: "strix", ad: "Framework Desktop (Ryzen AI Max+ 395)", grup: "Hazır kutu", mem: 128, bw: 256, tf: 60, fiyat: 2200, w: 120, tur: "kutu", link: "net", mbu: 0.5, tr: "ithal", mim: "amd" },
  { id: "evox2", ad: "GMKtec EVO-X2 (Ryzen AI Max+ 395)", grup: "Hazır kutu", mem: 128, bw: 256, tf: 60, fiyat: 1999, w: 120, tur: "kutu", link: "net", mbu: 0.5, tr: "ithal", mim: "amd" },

  // --- İş istasyonu kartları ---
  { id: "pro6000", ad: "NVIDIA RTX PRO 6000 Blackwell", grup: "İş istasyonu kartı", mem: 96, bw: 1792, tf: 1000, fiyat: 13250, w: 600, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "blackwell" },
  { id: "pro5000_72", ad: "NVIDIA RTX PRO 5000 Blackwell", grup: "İş istasyonu kartı", mem: 72, bw: 1344, tf: 535, fiyat: 7000, w: 300, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "blackwell" },
  { id: "pro5000_48", ad: "NVIDIA RTX PRO 5000 Blackwell", grup: "İş istasyonu kartı", mem: 48, bw: 1344, tf: 535, fiyat: 4500, w: 300, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "blackwell" },
  { id: "pro4500", ad: "NVIDIA RTX PRO 4500 Blackwell", grup: "İş istasyonu kartı", mem: 32, bw: 896, tf: 405, fiyat: 2600, w: 200, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "blackwell" },
  { id: "l40s", ad: "NVIDIA L40S", grup: "İş istasyonu kartı", mem: 48, bw: 864, tf: 733, fiyat: 8000, w: 350, tur: "kart", link: "pcie", mbu: 0.65, tr: "kurumsal", mim: "ada" },
  { id: "r9700", ad: "AMD Radeon AI PRO R9700", grup: "İş istasyonu kartı", mem: 32, bw: 640, tf: 383, fiyat: 1300, w: 300, tur: "kart", link: "pcie", mbu: 0.6, tr: "ithal", mim: "amd" },

  // --- Tüketici kartları ---
  { id: "5090", ad: "GeForce RTX 5090", grup: "Tüketici kartı", mem: 32, bw: 1792, tf: 838, fiyat: 2800, w: 575, tur: "kart", link: "pcie", mbu: 0.63, tr: "kolay", mim: "blackwell" },
  { id: "4090", ad: "GeForce RTX 4090", grup: "Tüketici kartı", mem: 24, bw: 1008, tf: 660, fiyat: 2300, w: 450, tur: "kart", link: "pcie", mbu: 0.63, tr: "kolay", mim: "ada" },
  { id: "3090", ad: "GeForce RTX 3090 (2. el)", grup: "Tüketici kartı", mem: 24, bw: 936, tf: 285, fiyat: 800, w: 350, tur: "kart", link: "pcie", mbu: 0.6, tr: "kolay", mim: "ampere" },

  // --- Veri merkezi ---
  { id: "a100", ad: "NVIDIA A100 SXM", grup: "Veri merkezi", mem: 80, bw: 2039, tf: 312, fiyat: 18000, w: 400, tur: "kart", link: "nvlink", mbu: 0.7, tr: "kurumsal", mim: "ampere" },
  { id: "h100s", ad: "NVIDIA H100 SXM", grup: "Veri merkezi", mem: 80, bw: 3350, tf: 1979, fiyat: 30000, w: 700, tur: "kart", link: "nvlink", mbu: 0.72, tr: "kurumsal", mim: "hopper" },
  { id: "h200", ad: "NVIDIA H200 SXM", grup: "Veri merkezi", mem: 141, bw: 4800, tf: 1979, fiyat: 32000, w: 700, tur: "kart", link: "nvlink", mbu: 0.72, tr: "kurumsal", mim: "hopper" },
  { id: "b200", ad: "NVIDIA B200", grup: "Veri merkezi", mem: 192, bw: 8000, tf: 4500, fiyat: 40000, w: 1000, tur: "kart", link: "nvlink", mbu: 0.74, tr: "kurumsal", mim: "blackwell" },
  { id: "mi300x", ad: "AMD Instinct MI300X", grup: "Veri merkezi", mem: 192, bw: 5300, tf: 2610, fiyat: 15000, w: 750, tur: "kart", link: "nvlink", mbu: 0.7, tr: "kurumsal", mim: "cdna3" },
  { id: "mi325x", ad: "AMD Instinct MI325X", grup: "Veri merkezi", mem: 256, bw: 6000, tf: 2610, fiyat: 20000, w: 1000, tur: "kart", link: "nvlink", mbu: 0.7, tr: "kurumsal", mim: "cdna3" },
  { id: "mi355x", ad: "AMD Instinct MI355X (CDNA4)", grup: "Veri merkezi", mem: 288, bw: 8000, tf: 5000, fiyat: 30000, w: 1400, tur: "kart", link: "nvlink", mbu: 0.72, tr: "kurumsal", mim: "cdna4" },
  { id: "gaudi3", ad: "Intel Gaudi 3", grup: "Veri merkezi", mem: 128, bw: 3700, tf: 1835, fiyat: 15000, w: 900, tur: "kart", link: "nvlink", mbu: 0.68, tr: "kurumsal", mim: "gaudi" },

  // --- Uç / saha ---
  { id: "thor", ad: "Jetson AGX Thor", grup: "Uç / saha", mem: 128, bw: 273, tf: 400, fiyat: 3499, w: 130, tur: "kutu", link: "net", mbu: 0.55, tr: "sinirli", mim: "thor" },
  { id: "agxorin", ad: "Jetson AGX Orin", grup: "Uç / saha", mem: 64, bw: 204, tf: 138, fiyat: 1999, w: 60, tur: "kutu", link: "net", mbu: 0.55, tr: "sinirli", mim: "ampere" },
  { id: "orinnano", ad: "Jetson Orin Nano Super", grup: "Uç / saha", mem: 8, bw: 102, tf: 33, fiyat: 249, w: 25, tur: "kutu", link: "net", mbu: 0.55, tr: "sinirli", mim: "ampere" },
];

/* ------------------------------------------------------------------ */
/*  MODEL VERİTABANI                                                   */
/*  tp = toplam milyar   ap = aktif milyar   kv = KB/token @ FP16      */
/* ------------------------------------------------------------------ */

/* Modeller — Ağustos 2026 açık ağırlıklı manzara.
   Her repo, arama sonuçlarında görülen gerçek HuggingFace repo yoludur.
   hf = HuggingFace repo yolu · kv = KB/token (MLA/kayan pencerede düşüktür) */
const MODELS = [
  // Qwen
  { id: "q35_397", ad: "Qwen3.5 397B-A17B", aile: "Qwen", tp: 397, ap: 17, kv: 188, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-397B-A17B", bench: "AIME2026 91.3" },
  { id: "q35_122", ad: "Qwen3.5 122B-A10B", aile: "Qwen", tp: 122, ap: 10, kv: 110, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-122B-A10B" },
  { id: "q35_35a3", ad: "Qwen3.5 35B-A3B", aile: "Qwen", tp: 35, ap: 3, kv: 96, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-35B-A3B" },
  { id: "q35_27", ad: "Qwen3.5 27B (dense)", aile: "Qwen", tp: 27, ap: 27, kv: 224, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-27B" },
  { id: "q35_4", ad: "Qwen3.5 4B", aile: "Qwen", tp: 4, ap: 4, kv: 100, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-4B" },
  { id: "q35_2", ad: "Qwen3.5 2B", aile: "Qwen", tp: 2, ap: 2, kv: 70, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-2B" },
  { id: "q35_08", ad: "Qwen3.5 0.8B", aile: "Qwen", tp: 0.8, ap: 0.8, kv: 45, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-0.8B" },
  { id: "q36_35a3", ad: "Qwen3.6 35B-A3B", aile: "Qwen", tp: 35, ap: 3, kv: 96, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3.6-35B-A3B" },
  { id: "q36_27", ad: "Qwen3.6 27B (dense)", aile: "Qwen", tp: 27, ap: 27, kv: 224, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3.6-27B" },
  // Kod (kod için özelleştirilmiş modeller)
  { id: "q3coder480", ad: "Qwen3-Coder 480B-A35B", aile: "Kod", tp: 480, ap: 35, kv: 140, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3-Coder-480B-A35B-Instruct", bench: "SWE-bench Verified ~69.6%" },
  { id: "q3coder30", ad: "Qwen3-Coder 30B-A3B", aile: "Kod", tp: 30, ap: 3.3, kv: 96, ctx: 256, lis: "Apache 2.0", hf: "Qwen/Qwen3-Coder-30B-A3B-Instruct" },
  { id: "q25coder32", ad: "Qwen2.5-Coder 32B", aile: "Kod", tp: 32, ap: 32, kv: 256, ctx: 32, lis: "Apache 2.0", hf: "Qwen/Qwen2.5-Coder-32B-Instruct", bench: "HumanEval 88.4%" },
  { id: "q25coder7", ad: "Qwen2.5-Coder 7B", aile: "Kod", tp: 7, ap: 7, kv: 128, ctx: 32, lis: "Apache 2.0", hf: "Qwen/Qwen2.5-Coder-7B-Instruct" },
  { id: "codestral22", ad: "Codestral 22B (FIM/otomatik tamamlama)", aile: "Kod", tp: 22, ap: 22, kv: 100, ctx: 32, lis: "Mistral (MNPL)", hf: "mistralai/Codestral-22B-v0.1", bench: "HumanEval 86.6%" },
  { id: "dscoderv2", ad: "DeepSeek-Coder-V2 236B-A21B", aile: "Kod", tp: 236, ap: 21, kv: 70, ctx: 128, lis: "DeepSeek License", hf: "deepseek-ai/DeepSeek-Coder-V2-Instruct" },
  { id: "dscoderv2lite", ad: "DeepSeek-Coder-V2-Lite 16B-A2.4B", aile: "Kod", tp: 16, ap: 2.4, kv: 40, ctx: 128, lis: "DeepSeek License", hf: "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct", bench: "HumanEval 83.5%" },
  { id: "kimik27c2", ad: "Kimi K2.7 Code", aile: "Kod", tp: 1000, ap: 32, kv: 70, ctx: 256, lis: "MIT (değiştirilmiş)", hf: "moonshotai/Kimi-K2.7-Code" },

  // DeepSeek (MLA — düşük KV)
  { id: "dsv4pro", ad: "DeepSeek-V4-Pro", aile: "DeepSeek", tp: 1600, ap: 49, kv: 75, ctx: 1000, lis: "MIT", hf: "deepseek-ai/DeepSeek-V4-Pro" },
  { id: "dsv4flash", ad: "DeepSeek-V4-Flash", aile: "DeepSeek", tp: 284, ap: 13, kv: 70, ctx: 1000, lis: "MIT", hf: "deepseek-ai/DeepSeek-V4-Flash" },
  { id: "dsv32", ad: "DeepSeek-V3.2", aile: "DeepSeek", tp: 685, ap: 37, kv: 70, ctx: 128, lis: "MIT", hf: "deepseek-ai/DeepSeek-V3.2" },
  { id: "dsv32s", ad: "DeepSeek-V3.2-Speciale", aile: "DeepSeek", tp: 685, ap: 37, kv: 70, ctx: 128, lis: "MIT", hf: "deepseek-ai/DeepSeek-V3.2-Speciale" },
  { id: "dsr1", ad: "DeepSeek-R1", aile: "DeepSeek", tp: 671, ap: 37, kv: 70, ctx: 128, lis: "MIT", hf: "deepseek-ai/DeepSeek-R1" },
  { id: "dsr1d32", ad: "DeepSeek-R1-Distill-Qwen-32B", aile: "DeepSeek", tp: 32, ap: 32, kv: 256, ctx: 128, lis: "MIT", hf: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B" },

  // GLM
  { id: "glm52", ad: "GLM-5.2", aile: "GLM", tp: 744, ap: 40, kv: 240, ctx: 1000, lis: "MIT", hf: "zai-org/GLM-5.2", bench: "SWE-bench Pro 62.1%" },
  { id: "glm51", ad: "GLM-5.1", aile: "GLM", tp: 744, ap: 40, kv: 240, ctx: 200, lis: "MIT", hf: "zai-org/GLM-5.1" },
  { id: "glm5", ad: "GLM-5", aile: "GLM", tp: 744, ap: 40, kv: 240, ctx: 200, lis: "MIT", hf: "zai-org/GLM-5", bench: "SWE-bench Verified 77.8%" },
  { id: "glm46", ad: "GLM-4.6", aile: "GLM", tp: 357, ap: 32, kv: 180, ctx: 200, lis: "MIT", hf: "zai-org/GLM-4.6" },

  // Kimi (MLA — düşük KV)
  { id: "kimik3", ad: "Kimi K3 2.8T-A104B", aile: "Kimi", tp: 2800, ap: 104, kv: 75, ctx: 1000, lis: "Kimi K3 License", hf: "moonshotai/Kimi-K3" },
  { id: "kimik26", ad: "Kimi K2.6", aile: "Kimi", tp: 1000, ap: 32, kv: 70, ctx: 256, lis: "MIT (değiştirilmiş)", hf: "moonshotai/Kimi-K2.6" },
  { id: "kimik25", ad: "Kimi K2.5", aile: "Kimi", tp: 1000, ap: 32, kv: 70, ctx: 256, lis: "MIT (değiştirilmiş)", hf: "moonshotai/Kimi-K2.5" },
  { id: "kimik2", ad: "Kimi K2 Instruct", aile: "Kimi", tp: 1000, ap: 32, kv: 70, ctx: 128, lis: "MIT (değiştirilmiş)", hf: "moonshotai/Kimi-K2-Instruct", bench: "SWE-bench Verified 65.8%" },

  // MiniMax
  { id: "mm3", ad: "MiniMax-M3 428B-A23B", aile: "MiniMax", tp: 428, ap: 23, kv: 90, ctx: 1000, lis: "Apache 2.0", hf: "MiniMaxAI/MiniMax-M3" },
  { id: "mm2", ad: "MiniMax-M2", aile: "MiniMax", tp: 230, ap: 10, kv: 90, ctx: 200, lis: "Apache 2.0", hf: "MiniMaxAI/MiniMax-M2" },

  // Llama
  { id: "l4mav", ad: "Llama 4 Maverick 400B-A17B", aile: "Llama", tp: 400, ap: 17, kv: 80, ctx: 1000, lis: "Llama 4 Community", hf: "meta-llama/Llama-4-Maverick-17B-128E-Instruct" },
  { id: "l4scout", ad: "Llama 4 Scout 109B-A17B", aile: "Llama", tp: 109, ap: 17, kv: 80, ctx: 10000, lis: "Llama 4 Community", hf: "meta-llama/Llama-4-Scout-17B-16E-Instruct" },

  // Mistral
  { id: "mlarge3", ad: "Mistral Large 3 675B-A41B", aile: "Mistral", tp: 675, ap: 41, kv: 120, ctx: 256, lis: "Apache 2.0", hf: "mistralai/Mistral-Large-3-675B-Instruct-2512-NVFP4" },
  { id: "devstral2", ad: "Devstral 2 123B (dense, kod)", aile: "Kod", tp: 123, ap: 123, kv: 352, ctx: 256, lis: "MIT (değiştirilmiş)", hf: "mistralai/Devstral-2-123B-Instruct-2512", bench: "SWE-bench Verified 72.2%" },
  { id: "devsmall2", ad: "Devstral Small 2 24B (kod)", aile: "Kod", tp: 24, ap: 24, kv: 128, ctx: 256, lis: "Apache 2.0", hf: "mistralai/Devstral-Small-2-24B-Instruct-2512" },

  // gpt-oss
  { id: "oss120", ad: "gpt-oss-120b", aile: "gpt-oss", tp: 117, ap: 5.1, kv: 72, ctx: 128, lis: "Apache 2.0", hf: "openai/gpt-oss-120b" },
  { id: "oss20", ad: "gpt-oss-20b", aile: "gpt-oss", tp: 21, ap: 3.6, kv: 40, ctx: 128, lis: "Apache 2.0", hf: "openai/gpt-oss-20b" },

  // Gemma (kayan pencere — düşük KV)
  { id: "g4_31", ad: "Gemma 4 31B (dense)", aile: "Gemma", tp: 31, ap: 31, kv: 60, ctx: 256, lis: "Gemma", hf: "google/gemma-4-31B-it" },
  { id: "g4_26a4", ad: "Gemma 4 26B-A4B (MoE)", aile: "Gemma", tp: 26, ap: 4, kv: 48, ctx: 256, lis: "Gemma", hf: "google/gemma-4-26B-A4B-it" },
  { id: "g4_12", ad: "Gemma 4 12B", aile: "Gemma", tp: 12, ap: 12, kv: 40, ctx: 256, lis: "Gemma", hf: "google/gemma-4-12B-it" },
  { id: "g4_e4", ad: "Gemma 4 E4B", aile: "Gemma", tp: 4, ap: 4, kv: 16, ctx: 128, lis: "Gemma", hf: "google/gemma-4-E4B" },
  { id: "gemma3_4", ad: "Gemma 3 4B", aile: "Gemma", tp: 4, ap: 4, kv: 16, ctx: 128, lis: "Gemma", hf: "google/gemma-3-4b-it" },

  // NVIDIA
  { id: "nem3super120", ad: "Nemotron 3 Super 120B-A12B", aile: "NVIDIA", tp: 120, ap: 12, kv: 80, ctx: 128, lis: "NVIDIA Open Model", hf: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16" },
  { id: "nem3nano30", ad: "Nemotron 3 Nano 30B-A3B", aile: "NVIDIA", tp: 30, ap: 3, kv: 60, ctx: 128, lis: "NVIDIA Open Model", hf: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16" },
  { id: "nem3nano4", ad: "Nemotron 3 Nano 4B", aile: "NVIDIA", tp: 4, ap: 4, kv: 90, ctx: 128, lis: "NVIDIA Open Model", hf: "nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16" },

  // Microsoft
  { id: "phi4", ad: "Phi-4 15B", aile: "Microsoft", tp: 15, ap: 15, kv: 200, ctx: 16, lis: "MIT", hf: "microsoft/phi-4" },
  { id: "phi4rp", ad: "Phi-4 Reasoning Plus 14B", aile: "Microsoft", tp: 14, ap: 14, kv: 200, ctx: 32, lis: "MIT", hf: "microsoft/Phi-4-reasoning-plus" },
  { id: "phi4mini", ad: "Phi-4 Mini 3.8B", aile: "Microsoft", tp: 3.8, ap: 3.8, kv: 100, ctx: 128, lis: "MIT", hf: "microsoft/Phi-4-mini-instruct" },

  // Diğer
  { id: "olmo31_32", ad: "Olmo 3.1 32B Instruct", aile: "Diğer", tp: 32, ap: 32, kv: 224, ctx: 64, lis: "Apache 2.0", hf: "allenai/Olmo-3.1-32B-Instruct" },
  { id: "olmo3think", ad: "Olmo 3 32B Think", aile: "Diğer", tp: 32, ap: 32, kv: 224, ctx: 64, lis: "Apache 2.0", hf: "allenai/Olmo-3-32B-Think" },
  { id: "smol3", ad: "SmolLM3 3B", aile: "Diğer", tp: 3, ap: 3, kv: 100, ctx: 128, lis: "Apache 2.0", hf: "HuggingFaceTB/SmolLM3-3B" },
  { id: "cmdaplus", ad: "Command A Plus 05-2026 218B-A25B", aile: "Diğer", tp: 218, ap: 25, kv: 180, ctx: 256, lis: "Apache 2.0", hf: "CohereLabs/command-a-plus-05-2026-bf16" },
  { id: "ernie21", ad: "ERNIE 4.5 21B-A3B Thinking", aile: "Diğer", tp: 21, ap: 3, kv: 48, ctx: 128, lis: "Apache 2.0", hf: "baidu/ERNIE-4.5-21B-A3B-Thinking" },
  { id: "hunyuan13", ad: "Hunyuan A13B 80B-A13B", aile: "Diğer", tp: 80, ap: 13, kv: 90, ctx: 256, lis: "Hunyuan License", hf: "tencent/Hunyuan-A13B-Pretrain" },

  // Türkçe
  { id: "kumru2", ad: "Kumru 2B (Türkçe)", aile: "Türkçe", tp: 2, ap: 2, kv: 70, ctx: 8, lis: "Apache 2.0", hf: "vngrs-ai/Kumru-2B" },
  { id: "trendyol7", ad: "Trendyol LLM 7B Chat (Türkçe)", aile: "Türkçe", tp: 7, ap: 7, kv: 128, ctx: 4, lis: "Apache 2.0", hf: "Trendyol/Trendyol-LLM-7B-chat-v1.0" },
];

const QUANTS = [
  {
    id: "bf16", ad: "BF16 / FP16", bpp: 2.0, kayip: "referans", bit: "16 bit",
    ne: "Modelin eğitildiği tam hassasiyet. Hiçbir sıkıştırma yok.",
    arti: "En yüksek kalite; bozulma sıfır.",
    eksi: "En yüksek bellek ve bant genişliği — her şey 2 kat yer kaplar, okuma da yavaşlar.",
    nezaman: "Kalite referansı olarak veya doğruluk kritikse ve belleğin bolsa.",
  },
  {
    id: "fp8", ad: "FP8", bpp: 1.0, kayip: "~%1", bit: "8 bit",
    ne: "8-bit kayan nokta. Ağırlık başına 1 bayt.",
    arti: "Belleği ve bant genişliğini yarıya indirir, kaliteyi neredeyse hiç bozmaz; modern NVIDIA kartlarında donanımda hızlandırılır.",
    eksi: "Yerel destek Hopper, Ada ve Blackwell ile sınırlı; Ampere/Apple/AMD'de avantaj kaybolur.",
    nezaman: "Modern NVIDIA donanımında pratik varsayılan tercih.",
  },
  {
    id: "nvfp4", ad: "NVFP4 / MXFP4", bpp: 0.55, kayip: "~%2-3", bit: "~4 bit",
    ne: "4-bit blok kayan nokta — yeni nesil düşük-bit format.",
    arti: "Belleği dörtte bire yakın düşürür; Blackwell'de donanım hızlandırmalı, kalitesi düz Q4'ten iyi.",
    eksi: "Donanım hızlandırması yalnızca Blackwell'de (RTX 50, RTX PRO Blackwell, B200, GB10/GB300, Thor). Diğerlerinde yazılımla, yavaş.",
    nezaman: "Blackwell donanımın varsa en iyi bellek/kalite dengesi.",
  },
  {
    id: "q4", ad: "Q4_K_M (GGUF)", bpp: 0.6, kayip: "~%3-5", bit: "~4 bit",
    ne: "llama.cpp/GGUF'un yaygın karışık 4-bit şeması.",
    arti: "CPU dahil her donanımda çalışır (Apple, AMD, NVIDIA). Belleği büyük ölçüde düşürür; en yaygın yerel format.",
    eksi: "Kalite BF16'ya göre bir miktar düşer; hız yine bellek sınırlı kalır.",
    nezaman: "Apple/AMD veya karışık donanımda pratik yerel varsayılan.",
  },
  {
    id: "q4qat", ad: "Q4 QAT", bpp: 0.6, kayip: "~%1-2", bit: "~4 bit",
    ne: "Kuantizasyona duyarlı eğitilmiş (QAT) 4-bit ağırlık.",
    arti: "Q4 boyutunda ama kalite kaybı çok daha az — model bu bit derinliğine göre ayarlanmış.",
    eksi: "Yalnızca üreticinin QAT sürümü yayımladığı modellerde bulunur.",
    nezaman: "Model bir QAT sürümü sunuyorsa düz Q4 yerine daima bunu seç.",
  },
  {
    id: "q3", ad: "Q3 (agresif)", bpp: 0.45, kayip: "~%8+", bit: "~3 bit",
    ne: "3-bit sıkıştırma — sınırı zorlayan agresif kuantizasyon.",
    arti: "En düşük bellek; çok büyük modeli küçük donanıma sığdırabilir.",
    eksi: "Kalite gözle görülür düşer: tutarsızlık, tekrar ve akıl yürütme hataları artar.",
    nezaman: "Yalnızca model başka türlü hiç sığmıyorsa, son çare.",
  },
];

const KVQUANTS = [
  { id: "fp16", ad: "FP16", f: 1.0, not: "Tam hassasiyet KV cache. En güvenli, en çok yer kaplar." },
  { id: "fp8", ad: "FP8 / q8_0", f: 0.5, not: "KV cache'i yarıya indirir; kalite etkisi çoğu işte ihmal edilebilir. İyi denge." },
  { id: "q4", ad: "Q4", f: 0.25, not: "KV cache'i dörtte bire indirir; uzun bağlamda bol yer açar ama çok uzun bağlamda doğruluk düşebilir." },
];

/* Türkiye tedarik durumu */
const TR_DURUM = {
  kolay: { ad: "Türkiye'de perakende satılıyor", kisa: "Satılıyor", renk: C.ok },
  sinirli: { ad: "Yetkili satıcı / sipariş", kisa: "Sipariş", renk: C.steel },
  ithal: { ad: "İthal · gümrük + KDV", kisa: "İthal", renk: C.warn },
  kurumsal: { ad: "Kurumsal / veri merkezi kanalı", kisa: "Kurumsal", renk: C.bad },
};

const TR_NOT = {
  kolay: "Türkiye'de perakende bulunuyor; yine de fiyatlar döviz kuru ve stokla oynar.",
  sinirli: "Yetkili iş istasyonu/sistem satıcılarından siparişle gelir; teslim haftalar sürebilir.",
  ithal: "Türkiye'de raf ürünü değil. Yurt dışından ithal edilir; üstüne gümrük + %20 KDV ve nakliye eklenir.",
  kurumsal: "Bireysel satışı pratikte yok. Veri merkezi/kurumsal kanaldan, çoğu zaman sunucuyla birlikte tedarik edilir.",
};

/* Mimari → kuantizasyon donanım desteği */
const MIM_AD = {
  blackwell: "Blackwell", gb10: "GB10 (Blackwell)", gb300: "GB300 (Blackwell)", thor: "Thor (Blackwell)",
  hopper: "Hopper", ada: "Ada Lovelace", ampere: "Ampere", apple: "Apple Silicon",
  amd: "AMD Ryzen AI / RDNA", cdna3: "AMD CDNA3 (Instinct)", cdna4: "AMD CDNA4 (Instinct)",
  gaudi: "Intel Gaudi 3",
};
const FP4_NATIVE = new Set(["blackwell", "gb10", "gb300", "thor", "cdna4"]);
const FP8_NATIVE = new Set(["blackwell", "gb10", "gb300", "thor", "hopper", "ada", "cdna3", "cdna4", "gaudi"]);

function quantUyum(cihaz, quantId) {
  const m = cihaz.mim;
  if (quantId === "nvfp4") {
    if (FP4_NATIVE.has(m))
      return { tip: "olumlu", mesaj: `${MIM_AD[m]} FP4'ü donanımda hızlandırır (NVIDIA'da NVFP4, AMD CDNA4'te MXFP4) — bu donanım için ideal.` };
    if (m === "apple" || m === "amd")
      return { tip: "uyari", mesaj: `${MIM_AD[m]} üzerinde FP4 donanım desteği yok. MXFP4 yazılımla çalışır ama hız avantajı sınırlı; pratikte Q4_K_M daha oturmuş.` };
    return { tip: "uyari", mesaj: `FP4 yalnızca Blackwell/CDNA4'te donanımda hızlanır. ${MIM_AD[m]} üzerinde emülasyon olur; NVFP4 yerine FP8 veya Q4 daha hızlı.` };
  }
  if (quantId === "fp8") {
    if (FP8_NATIVE.has(m))
      return { tip: "olumlu", mesaj: `${MIM_AD[m]} FP8'i donanımda destekler — bellek ve hız için verimli.` };
    if (m === "apple")
      return { tip: "uyari", mesaj: "Apple Silicon'da FP8 donanım hızlandırması yok. Pratikte MLX veya GGUF (Q4–Q8) kullanılır; buradaki FP8 hızları iyimser olabilir." };
    if (m === "amd")
      return { tip: "uyari", mesaj: "Strix Halo'da FP8 donanım hızlandırması sınırlı. GGUF Q4–Q8 daha oturmuş bir yol." };
    return { tip: "uyari", mesaj: `Ampere sınıfı donanımda (${MIM_AD[m]}) yerel FP8 yok. INT8 veya GGUF Q4/Q8 daha uygun; FP8 sayıları burada iyimser.` };
  }
  if (quantId === "bf16")
    return { tip: "bilgi", mesaj: "Tam hassasiyet: her donanımda çalışır ama en çok belleği ve bant genişliğini kullanır." };
  if (quantId === "q3")
    return { tip: "tehlike", mesaj: "Agresif 3-bit: her yerde çalışır ama kalite gözle görülür düşer. Yalnızca sığdırma zorunluysa." };
  return { tip: "bilgi", mesaj: "GGUF/llama.cpp tabanlı: CPU dahil her donanımda çalışır. Güvenli ve taşınabilir yerel format." };
}

const DUSUK_QUANT_ONER = {
  bf16: "FP8", fp8: "NVFP4 veya Q4", nvfp4: "Q4", q4: "Q3", q4qat: "Q3", q3: "daha fazla adet",
};

/* Yeni başlayanlar için sade kavram anlatımı */
const KAVRAMLAR = [
  { ad: "Token", benzet: "Yazıyı legolara bölmek gibi.", ozet: "Model kelimeleri değil, ~4 harflik parçaları (token) işler. Hız hep 'saniyede kaç token' diye ölçülür." },
  { ad: "Parametre", benzet: "Beynin sinir bağlantıları gibi.", ozet: "Modelin öğrenirken ayarladığı sayılar. Ne kadar çok parametre, o kadar yetenekli ama o kadar ağır ve yer kaplayan." },
  { ad: "Toplam / Aktif (MoE)", benzet: "Koca hastane ama seni tek uzman muayene eder.", ozet: "MoE modelde tüm parametreler bellekte durur, ama her token için yalnızca küçük bir kısmı (aktif) çalışır. Belleği büyük, hızı küçük modele benzer." },
  { ad: "Kuantizasyon", benzet: "Fotoğrafı JPEG'e sıkıştırmak gibi.", ozet: "Ağırlıkları daha az bitle, kabaca yuvarlayarak saklamak. Çok daha az yer kaplar ve hızlanır; karşılığında az bir kalite kaybı olur." },
  { ad: "Bit derinliği", benzet: "Fiyatı kuruşuna kadar mı, yuvarlayarak mı yazıyorsun?", ozet: "Her sayıyı kaç haneyle yazdığın. 16 → 8 → 4 bit: her adımda bellek kabaca yarıya iner, kalite de biraz düşer." },
  { ad: "KV cache", benzet: "Modelin yanında tuttuğu not defteri.", ozet: "O anki konuşmaya dair kısa hafıza. Bağlam ve kullanıcı sayısı arttıkça şişer ve ciddi bellek yer — çoğu zaman asıl sığmama sebebi budur." },
  { ad: "Bağlam uzunluğu", benzet: "Masaya aynı anda sığdırabildiğin kağıt sayısı.", ozet: "Modelin bir anda aklında tutabildiği metin miktarı (token cinsinden). Uzun bağlam daha çok KV cache, yani daha çok bellek demek." },
  { ad: "Bellek bant genişliği", benzet: "Musluğun debisi — boru ne kadar kalın?", ozet: "Belleğin ne kadar hızlı okunabildiği. Token üretim hızını asıl bu belirler, işlem gücü (TFLOPS) değil." },
  { ad: "İlk token gecikmesi", benzet: "Garsonun siparişi alıp mutfağa iletmesi.", ozet: "Soruyu gönderdikten sonra cevabın ilk harfi gelene kadar geçen 'düşünme' süresi. Uzun bağlamda ve kalabalıkta uzar." },
  { ad: "Dense / MoE", benzet: "Tüm ekip mi çalışıyor, yoksa nöbetçi mi?", ozet: "Dense modelde her parametre her adımda çalışır; MoE'de yalnızca ilgili 'uzmanlar'. MoE aynı bellekle daha hızlıdır." },
  { ad: "Tensör paralelliği", benzet: "Bir masayı dört kişi taşımak — koordinasyon şart.", ozet: "Tek modeli birden çok karta bölüp birlikte çalıştırmak. Kartlar arası bağlantı (NVLink > PCIe > ağ) yavaşsa kazanç hızla düşer." },
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
/*  CHATBOT — bilgi tabanı + DeepSeek istemcisi                         */
/*  API anahtarı KOD'A GÖMÜLMEZ; kullanıcı tarayıcıya girer,           */
/*  localStorage'da saklanır. Statik sitede güvenli olan tek yol.      */
/* ------------------------------------------------------------------ */

function bilgiTabani() {
  const m = MODELS.map(
    (x) =>
      `${x.ad} [${x.aile}]: ${x.tp}B toplam / ${x.ap}B aktif, KV ${x.kv}KB/tok, ${x.ctx}K bağlam, ${x.lis}${x.bench ? ", " + x.bench : ""}`
  ).join("\n");
  const d = DEVICES.map(
    (x) =>
      `${x.ad} [${x.grup}]: ${x.mem}GB bellek, ${x.bw}GB/s, ${x.w}W, ~$${x.fiyat}, ${MIM_AD[x.mim]}, Türkiye: ${TR_DURUM[x.tr].ad}`
  ).join("\n");
  const q = QUANTS.map((x) => `${x.ad} (${x.bit}, kayıp ${x.kayip})`).join("; ");
  return `MODELLER:\n${m}\n\nCİHAZLAR:\n${d}\n\nAĞIRLIK KUANTİZASYONU: ${q}\nKV CACHE KUANT: FP16 (tam), FP8 (yarı yer), Q4 (çeyrek yer).\n\nNASIL HESAPLANIR: gerekli bellek ≈ ağırlık(param × bayt/param) + KV cache(kullanıcı × bağlam × KV/token) + çalışma payı. Token üretim hızı bellek BANT GENİŞLİĞİ ile sınırlıdır (işlem gücü değil); MoE'de aktif parametre belirleyicidir. Kuantizasyon OPSİYONELDİR: BF16 + FP16 KV = modeli indirip olduğu gibi çalıştırmak (belleğe sığarsa gerek yok). Çok kart tek küme yapılınca bağlantı verimi NVLink>PCIe>ağ.`;
}

/* Cloudflare Worker aracı adresi. Worker'ı kurup URL'ini buraya yapıştırınca
   chatbot anahtar İSTEMEDEN çalışır (anahtar Worker'da gizli kalır).
   Boş bırakılırsa chatbot, kullanıcının tarayıcıya girdiği anahtarla çalışır.
   Bu URL gizli değildir; depoda durması güvenlidir. */
const PROXY_URL = "";

const SISTEM_PROMPT = `Sen "Yerel LLM Kapasite Simülasyonu" adlı aracın uzman danışmanısın. Kullanıcının açık ağırlıklı / yerel LLM altyapısı sorularını —donanım seçimi, kaç adet gerekir, kuantizasyon, bellek bütçesi, token hızı, ilk token gecikmesi, Türkiye'de tedarik, maliyet, hangi model uygun— PROFESYONEL, net ve pratik biçimde TÜRKÇE yanıtla. Aşağıdaki veriyi temel al; sayı UYDURMA, bilmediğini açıkça söyle. Kısa ama doyurucu ol, gerektiğinde madde madde ver, somut öneri yap. Aşağıdaki bilgi tabanı senin gerçeğindir:\n\n${bilgiTabani()}`;

function ChatBot({ baglam }) {
  const proxyModu = !!PROXY_URL;
  const [acik, setAcik] = React.useState(false);
  const [key, setKey] = React.useState(() => {
    try {
      return localStorage.getItem("ds_key") || "";
    } catch {
      return "";
    }
  });
  const [keyInput, setKeyInput] = React.useState("");
  const [mesajlar, setMesajlar] = React.useState([
    {
      role: "assistant",
      content:
        "Merhaba! Donanım seçimi, kuantizasyon, bellek/hız hesabı, hangi model, ya da Türkiye'de tedarik hakkında ne istersen sor.",
    },
  ]);
  const [girdi, setGirdi] = React.useState("");
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const kaydirRef = React.useRef(null);

  React.useEffect(() => {
    if (kaydirRef.current) kaydirRef.current.scrollTop = kaydirRef.current.scrollHeight;
  }, [mesajlar, yukleniyor, acik]);

  const anahtarKaydet = () => {
    const k = keyInput.trim();
    if (!k) return;
    try {
      localStorage.setItem("ds_key", k);
    } catch (e) { /* localStorage kapalıysa yoksay */ }
    setKey(k);
    setKeyInput("");
  };
  const anahtarSil = () => {
    try {
      localStorage.removeItem("ds_key");
    } catch (e) { /* yoksay */ }
    setKey("");
  };

  const gonder = async () => {
    const soru = girdi.trim();
    if (!soru || yukleniyor) return;
    const yeni = [...mesajlar, { role: "user", content: soru }];
    setMesajlar(yeni);
    setGirdi("");
    setYukleniyor(true);
    try {
      const sys = SISTEM_PROMPT + (baglam ? `\n\nKULLANICININ ŞU ANKİ SEÇİMİ:\n${baglam}` : "");
      const endpoint = proxyModu ? PROXY_URL : "https://api.deepseek.com/chat/completions";
      const headers = proxyModu
        ? { "Content-Type": "application/json" }
        : { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.3,
          messages: [{ role: "system", content: sys }, ...yeni.map((m) => ({ role: m.role, content: m.content }))],
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          res.status === 401
            ? "Anahtar geçersiz (401). Ayarlardan doğru DeepSeek anahtarını gir."
            : `Sunucu hatası ${res.status}. ${t.slice(0, 140)}`
        );
      }
      const data = await res.json();
      const cevap = data?.choices?.[0]?.message?.content || "(boş yanıt)";
      setMesajlar((m) => [...m, { role: "assistant", content: cevap }]);
    } catch (e) {
      const s = String(e && e.message ? e.message : e);
      const msg = /Failed to fetch|NetworkError|TypeError/.test(s)
        ? "Bağlantı kurulamadı. Tarayıcıdan DeepSeek'e doğrudan erişim engellenmiş olabilir (CORS/ağ) ya da anahtar hatalı olabilir."
        : s;
      setMesajlar((m) => [...m, { role: "assistant", content: "⚠ " + msg }]);
    } finally {
      setYukleniyor(false);
    }
  };

  const kabarcik = (rol) => ({
    alignSelf: rol === "user" ? "flex-end" : "flex-start",
    maxWidth: "85%",
    background: rol === "user" ? C.steel : C.wash,
    color: rol === "user" ? "#fff" : C.ink,
    border: rol === "user" ? "none" : `1px solid ${C.line2}`,
    borderRadius: 8,
    padding: "8px 11px",
    fontSize: 12.5,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  });

  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 50, fontFamily: SANS }}>
      {acik && (
        <div
          style={{
            width: 340,
            maxWidth: "calc(100vw - 36px)",
            height: 500,
            maxHeight: "calc(100vh - 100px)",
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            boxShadow: "0 12px 40px rgba(18,23,28,0.22)",
            display: "flex",
            flexDirection: "column",
            marginBottom: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: C.ink,
              color: "#fff",
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>LLM Altyapı Danışmanı</div>
              <div style={{ fontSize: 10.5, color: "#B7C0C7", fontFamily: MONO }}>DeepSeek ile</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {!proxyModu && key && (
                <button onClick={anahtarSil} title="Anahtarı sil" style={ikonBtnStil}>
                  anahtar ✕
                </button>
              )}
              <button onClick={() => setAcik(false)} style={ikonBtnStil}>
                kapat
              </button>
            </div>
          </div>

          {!proxyModu && !key ? (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
              <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.55 }}>
                Sohbet için <b>DeepSeek API anahtarını</b> gir. Anahtar yalnızca bu tarayıcıda
                (localStorage) saklanır; koda gömülmez, sunucuya/depoya gönderilmez.
              </div>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && anahtarKaydet()}
                placeholder="sk-..."
                style={{
                  fontFamily: MONO,
                  fontSize: 12.5,
                  padding: "9px 10px",
                  border: `1px solid ${C.line}`,
                  borderRadius: 4,
                }}
              />
              <button onClick={anahtarKaydet} style={gonderBtnStil}>
                Kaydet ve başla
              </button>
              <div style={{ fontSize: 11, color: C.ink3, lineHeight: 1.5 }}>
                Anahtarı{" "}
                <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" style={{ color: C.steel }}>
                  platform.deepseek.com
                </a>{" "}
                üzerinden alabilirsin.
              </div>
            </div>
          ) : (
            <>
              <div
                ref={kaydirRef}
                style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}
              >
                {mesajlar.map((m, i) => (
                  <div key={i} style={kabarcik(m.role)}>
                    {m.content}
                  </div>
                ))}
                {yukleniyor && (
                  <div style={{ ...kabarcik("assistant"), color: C.ink3, fontStyle: "italic" }}>yazıyor…</div>
                )}
              </div>
              <div style={{ borderTop: `1px solid ${C.line2}`, padding: 10, display: "flex", gap: 8 }}>
                <textarea
                  value={girdi}
                  onChange={(e) => setGirdi(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      gonder();
                    }
                  }}
                  rows={1}
                  placeholder="Sorunu yaz…"
                  style={{
                    flex: 1,
                    resize: "none",
                    fontFamily: SANS,
                    fontSize: 12.5,
                    padding: "8px 10px",
                    border: `1px solid ${C.line}`,
                    borderRadius: 4,
                    maxHeight: 90,
                  }}
                />
                <button onClick={gonder} disabled={yukleniyor} style={gonderBtnStil}>
                  Gönder
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setAcik((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: C.ink,
          color: "#fff",
          border: "none",
          borderRadius: 24,
          padding: "11px 16px",
          fontFamily: SANS,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(18,23,28,0.28)",
          marginLeft: "auto",
        }}
      >
        {acik ? "▾ Danışmanı kapat" : "💬 Danışmana sor"}
      </button>
    </div>
  );
}

const ikonBtnStil = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.3)",
  color: "#fff",
  borderRadius: 4,
  padding: "3px 8px",
  fontFamily: MONO,
  fontSize: 10.5,
  cursor: "pointer",
};
const gonderBtnStil = {
  background: C.steel,
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "9px 14px",
  fontFamily: SANS,
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
};

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

function Bildirim({ tip, baslik, metin }) {
  const renkler = {
    bilgi: [C.steel, C.steelSoft],
    olumlu: [C.ok, C.okSoft],
    uyari: [C.warn, C.warnSoft],
    tehlike: [C.bad, C.badSoft],
  };
  const isaret = { bilgi: "i", olumlu: "✓", uyari: "!", tehlike: "×" };
  const [renk, zemin] = renkler[tip] || renkler.bilgi;
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "9px 11px",
        background: zemin,
        borderLeft: `3px solid ${renk}`,
        borderRadius: 2,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          color: renk,
          fontSize: 13,
          lineHeight: 1.5,
          width: 14,
          flexShrink: 0,
          textAlign: "center",
        }}
      >
        {isaret[tip]}
      </span>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{baslik}</div>
        <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.55 }}>{metin}</div>
      </div>
    </div>
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
  const [modelId, setModelId] = useState("q35_27");
  const [quant, setQuant] = useState("bf16");
  const [kvq, setKvq] = useState("fp16");
  const [indirGibi, setIndirGibi] = useState(true);
  const [ctxK, setCtxK] = useState(64);
  const [kullanici, setKullanici] = useState(4);
  const [cikti, setCikti] = useState(800);
  const [cihazId, setCihazId] = useState("pro6000");
  const [adet, setAdet] = useState(2);
  // Birden çok cihaz seçilince tek küme olarak birleştirilir (tensör paralelliği).
  const topoloji = "kume";
  const [siralama, setSiralama] = useState("verim");
  const [modelSirala, setModelSirala] = useState("yetenek");
  const [xEksen, setXEksen] = useState("kullanici");
  const [yEksen, setYEksen] = useState("hiz");
  const [kavramAcik, setKavramAcik] = useState(true);

  const model = MODELS.find((m) => m.id === modelId);
  const cihaz = DEVICES.find((d) => d.id === cihazId);

  const r = useMemo(
    () => hesapla({ model, quant, kvq, ctxK, kullanici, cikti, cihaz, adet, topoloji }),
    [model, quant, kvq, ctxK, kullanici, cikti, cihaz, adet, topoloji]
  );

  // Seçilebilir grafik: X ekseni (kullanıcı / bağlam / adet), Y ekseni (hız / ilk token / bellek)
  const egri = useMemo(() => {
    let xler;
    if (xEksen === "kullanici") xler = Array.from({ length: 32 }, (_, i) => i + 1);
    else if (xEksen === "adet") xler = Array.from({ length: 16 }, (_, i) => i + 1);
    else xler = [4, 8, 16, 32, 64, 128, 192, 256, 384, 512, 768, 1024]; // bağlam K

    return xler.map((x) => {
      const args = { model, quant, kvq, ctxK, kullanici, cikti, cihaz, adet, topoloji };
      if (xEksen === "kullanici") args.kullanici = x;
      else if (xEksen === "adet") args.adet = x;
      else args.ctxK = x;
      const h = hesapla(args);
      return {
        x,
        kisiBasi: h.sigar ? Number(h.kullaniciTokS.toFixed(1)) : null,
        toplam: h.sigar ? Number(h.toplamTokS.toFixed(0)) : null,
        ttft: h.sigar ? Number(h.ttftYogun.toFixed(2)) : null,
        bellek: Number(Math.min(200, h.doluluk * 100).toFixed(0)),
      };
    });
  }, [model, quant, kvq, ctxK, kullanici, cikti, cihaz, adet, topoloji, xEksen]);

  const X_ETIKET = { kullanici: "Eşzamanlı kullanıcı", baglam: "Bağlam (K token)", adet: "Cihaz adedi" };

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

  // Ters bakış: bu donanıma hangi modeller sığar?
  const modelUyum = useMemo(() => {
    const dusuk = [...QUANTS].sort((a, b) => a.bpp - b.bpp); // en az bitten çoğa
    const rows = MODELS.map((mm) => {
      const h = hesapla({ model: mm, quant, kvq, ctxK, kullanici, cikti, cihaz, adet, topoloji });
      let cozum = null; // sığmıyorsa: sığdıran en hafif kuantizasyon
      if (!h.sigar) {
        for (const q of dusuk) {
          const hh = hesapla({ model: mm, quant: q.id, kvq: "q4", ctxK, kullanici, cikti, cihaz, adet, topoloji });
          if (hh.sigar) {
            cozum = q;
            break;
          }
        }
      }
      return { mm, sigar: h.sigar, kisi: h.kullaniciTokS, toplam: h.toplamTokS, doluluk: h.doluluk, cozum };
    });
    rows.sort((a, b) => {
      if (a.sigar !== b.sigar) return a.sigar ? -1 : 1;
      if (a.sigar) {
        if (modelSirala === "hiz") return b.kisi - a.kisi;
        if (modelSirala === "verim") return b.toplam - a.toplam;
        return b.mm.tp - a.mm.tp; // yetenek: en büyük model
      }
      return b.mm.tp - a.mm.tp;
    });
    return rows;
  }, [quant, kvq, ctxK, kullanici, cikti, cihaz, adet, topoloji, modelSirala]);

  const siganSayisi = modelUyum.filter((x) => x.sigar).length;

  const qAktif = QUANTS.find((q) => q.id === quant);

  // Dinamik notlar ve uyarılar
  const bildirimler = useMemo(() => {
    const out = [];
    const uyum = quantUyum(cihaz, quant);
    out.push({ tip: uyum.tip, baslik: `${qAktif.ad} · ${cihaz.ad}`, metin: uyum.mesaj });

    if (quant === "bf16" && kvq === "fp16")
      out.push({
        tip: "olumlu",
        baslik: "Kuantizasyon yok — indirdiğin gibi",
        metin: "Bu ayar, modeli HuggingFace'ten indirip olduğu gibi çalıştırmaktır (tam hassasiyet). Belleğe sığıyorsa kuantizasyon yapmana hiç gerek yok. Sığmıyorsa aşağıdaki bit seviyelerini düşürerek küçültebilirsin.",
      });

    const kv = KVQUANTS.find((x) => x.id === kvq);
    if (kvq !== "fp16")
      out.push({ tip: "bilgi", baslik: `KV cache: ${kv.ad}`, metin: kv.not });

    const trTip = cihaz.tr === "kolay" ? "olumlu" : cihaz.tr === "kurumsal" ? "tehlike" : "uyari";
    out.push({ tip: trTip, baslik: `Türkiye'de tedarik: ${TR_DURUM[cihaz.tr].kisa}`, metin: TR_NOT[cihaz.tr] });

    if (!r.sigar)
      out.push({
        tip: "tehlike",
        baslik: "Belleğe sığmıyor",
        metin: `Bu ayarlarla ${adet} × ${cihaz.ad} yetmiyor. Daha düşük bitli kuantizasyon (ör. ${DUSUK_QUANT_ONER[quant]}), daha kısa bağlam veya daha fazla adet gerekiyor.`,
      });
    else if (r.doluluk > 0.88)
      out.push({
        tip: "uyari",
        baslik: "Bellek sınırında",
        metin: `Bellek %${Math.round(r.doluluk * 100)} dolu. Ani uzun bağlam ya da ek kullanıcı taşırabilir; bir kademe düşük KV kuantizasyonu pay bırakır.`,
      });

    if (quant === "q3" && model.tp <= 15)
      out.push({
        tip: "uyari",
        baslik: "Küçük modelde agresif kuantizasyon",
        metin: `${model.ad} zaten küçük; Q3 kalite kaybı bu boyutta oransal olarak daha çok hissedilir. FP8 ya da Q4 daha dengeli olur.`,
      });

    if (adet > 1 && r.link === "net")
      out.push({
        tip: "uyari",
        baslik: "Ağ üzerinden kümeleme yavaş",
        metin: "Bu cihazlar küme için ağ (Ethernet/USB4) ile bağlanır; tensör paralelliği verimi ~%33. Tek güçlü cihaz çoğu zaman çok sayıda zayıf kutudan iyidir.",
      });

    if (model.ap < model.tp)
      out.push({
        tip: "bilgi",
        baslik: "MoE (uzman-karışımı) model",
        metin: `${model.ad} bellekte ${model.tp}B durur ama her adımda yalnızca ${model.ap}B aktif olur. Belleği büyük modele göre, hızı küçük modele göre planla.`,
      });

    if (r.sigar && r.kullaniciTokS < 12)
      out.push({
        tip: "uyari",
        baslik: "Kişi başına hız düşük",
        metin: `Kullanıcı başına ~${r.kullaniciTokS.toFixed(0)} tok/s, rahat okuma bandının altına inebilir. Daha az eşzamanlı kullanıcı, daha düşük bitli ağırlık veya daha yüksek bant genişlikli donanım hızlandırır.`,
      });

    return out;
  }, [model, quant, kvq, cihaz, adet, topoloji, r, qAktif]);

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

      {/* Kavramlar — sade anlatım */}
      <Kutu style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => setKavramAcik((v) => !v)}
        >
          <div>
            <Etiket>Kavramlar, çok basitçe</Etiket>
            <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 2 }}>
              Kuantizasyon, KV cache, token… hepsi gündelik benzetmelerle
            </div>
          </div>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              color: C.steel,
              border: `1px solid ${C.line}`,
              borderRadius: 3,
              padding: "4px 9px",
              whiteSpace: "nowrap",
            }}
          >
            {kavramAcik ? "gizle −" : "göster +"}
          </span>
        </div>

        {kavramAcik && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {KAVRAMLAR.map((k) => (
              <div
                key={k.ad}
                style={{
                  background: C.wash,
                  border: `1px solid ${C.line2}`,
                  borderRadius: 3,
                  padding: "11px 12px",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                  {k.ad}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.steel,
                    fontStyle: "italic",
                    marginBottom: 5,
                    lineHeight: 1.4,
                  }}
                >
                  {k.benzet}
                </div>
                <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.55 }}>{k.ozet}</div>
              </div>
            ))}
          </div>
        )}
      </Kutu>

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
                      {m.ad} · {ctxYazi(m.ctx)}
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
              {model.bench && (
                <>
                  <br />
                  benchmark: {model.bench}
                </>
              )}
            </div>

            {model.hf && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <a
                  href={`https://huggingface.co/${model.hf}`}
                  target="_blank"
                  rel="noreferrer"
                  style={linkBtnStil}
                >
                  ↗ HuggingFace kartı ve benchmarklar
                </a>
              </div>
            )}

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                cursor: "pointer",
                padding: "9px 10px",
                background: indirGibi ? C.okSoft : C.wash,
                border: `1px solid ${indirGibi ? C.ok : C.line2}`,
                borderRadius: 3,
                marginBottom: indirGibi ? 0 : 14,
              }}
            >
              <input
                type="checkbox"
                checked={indirGibi}
                onChange={(e) => {
                  const v = e.target.checked;
                  setIndirGibi(v);
                  if (v) {
                    setQuant("bf16");
                    setKvq("fp16");
                  }
                }}
                style={{ marginTop: 2, accentColor: C.ok, flexShrink: 0 }}
              />
              <span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                  İndirdiğin gibi çalıştır
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: C.ink2, marginTop: 2, lineHeight: 1.45 }}>
                  Tam hassasiyet (BF16 + FP16 KV), hiç kuantizasyon yok. İşareti kaldırırsan
                  kuantizasyon seçenekleri açılır.
                </span>
              </span>
            </label>

            {!indirGibi && (
              <div style={{ marginTop: 14 }}>
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
              </div>
            )}
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
              max={1024}
              step={4}
              goster={`${ctxYazi(ctxK)} token`}
            />
            <div style={{ fontSize: 11, color: C.ink3, marginTop: -8, marginBottom: 14, lineHeight: 1.5 }}>
              Seçili modelin desteği: <b style={{ color: C.ink2 }}>{ctxYazi(model.ctx)}</b>
              {ctxK > model.ctx ? " · bu modelin sınırını aşıyorsun" : ""}
            </div>
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
              goster={`${cikti} tok ≈ ${harfYazi(cikti)}`}
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
                      {d.ad} · {d.mem} GB{d.tr === "kolay" ? " · TR ✓" : ""}
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

            {adet > 1 && (
              <div style={{ fontSize: 11.5, color: C.ink3, marginBottom: 14, lineHeight: 1.5 }}>
                {adet} cihaz tek küme olarak birleştirilir (tensör paralelliği); bellek toplanır,
                bağlantı verimi hesaba katılır.
              </div>
            )}

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
              mimari: {MIM_AD[cihaz.mim]}
              <br />
              birim {para(cihaz.fiyat)}
              <br />
              <span style={{ color: TR_DURUM[cihaz.tr].renk }}>
                TR: {TR_DURUM[cihaz.tr].ad}
              </span>
              {adet > 1 && (
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
                {adet > 1 ? " (tek küme)" : ""} · {model.ad}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 500, color: durumRenk }}>
                %{Math.round(r.doluluk * 100)}
              </div>
              <div style={{ fontSize: 11, color: C.ink2 }}>bellek doluluğu</div>
            </div>
          </div>

          {/* Notlar ve uyarılar */}
          <Kutu style={{ marginBottom: 14 }}>
            <Etiket>Notlar ve uyarılar</Etiket>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {bildirimler.map((b, i) => (
                <Bildirim key={i} {...b} />
              ))}
            </div>
          </Kutu>

          {/* Kuantizasyon açıklaması */}
          <Kutu style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Etiket>Kuantizasyon: {qAktif.ad}</Etiket>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.ink3 }}>
                {qAktif.bit} · kalite kaybı {qAktif.kayip}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6, marginBottom: 12 }}>
              Kuantizasyon, model ağırlıklarını daha az bitle saklamaktır: daha az bit → daha az bellek
              ve daha hızlı okuma, karşılığında bir miktar kalite kaybı. Amaç, modeli donanıma
              sığdırırken kaybı kabul edilebilir tutmak.
              <br />
              <br />
              <b style={{ color: C.ink }}>Zorunlu değildir.</b> HuggingFace'ten modeli indirdiğinde
              varsayılan olarak tam hassasiyet (BF16) ağırlık ve FP16 KV cache gelir — bu "hiç
              kuantizasyon yok" halidir ve <b>belleğe sığdığı sürece olduğu gibi çalışır</b>. Ama tam
              hassasiyet parametre başına ~2 bayttır (30B model ≈ 60 GB); çoğu kişi kuantize eder çünkü
              tam hâli tüketici kartına sığmaz. Yani: sığıyorsa mecbur değilsin, sığmıyorsa ya da
              hızlanmasını istiyorsan küçültürsün.
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "10px 22px",
                fontSize: 12,
                lineHeight: 1.55,
              }}
            >
              <div>
                <b style={{ color: C.ink }}>Nedir</b>
                <br />
                {qAktif.ne}
              </div>
              <div>
                <b style={{ color: C.ok }}>Artısı</b>
                <br />
                {qAktif.arti}
              </div>
              <div>
                <b style={{ color: C.warn }}>Eksisi</b>
                <br />
                {qAktif.eksi}
              </div>
              <div>
                <b style={{ color: C.ink }}>Ne zaman</b>
                <br />
                {qAktif.nezaman}
              </div>
            </div>
          </Kutu>

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
                {r.agirlikGB <= r.dugumBellek ? (
                  <>
                    Ağırlıklar (<b>{r.agirlikGB.toFixed(0)} GB</b>) sığıyor; taşıran şey{" "}
                    <b>KV cache ({r.kvGB.toFixed(0)} GB)</b> — {kullanici} kullanıcı × {ctxYazi(ctxK)}{" "}
                    bağlam. En etkili çözüm: KV cache'i FP8/Q4 yap, kullanıcıyı{" "}
                    <b>{r.maxKullanici}</b>'e veya bağlamı <b>{ctxYazi(Math.max(0, Math.floor(r.maxCtxK)))}</b>'e düşür.
                  </>
                ) : (
                  <>
                    Ağırlıklar tek başına ({r.agirlikGB.toFixed(0)} GB) bu belleğe sığmıyor. Daha düşük
                    kuantizasyon (ör. FP8/Q4) ya da en az <b>{r.minAdet ? `${r.minAdet} adet` : "16+ adet"}</b>{" "}
                    cihaz gerekir.
                  </>
                )}
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

          {/* Seçilebilir grafik */}
          <Kutu style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <Etiket>Grafik — eksenleri seç</Etiket>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select value={yEksen} onChange={(e) => setYEksen(e.target.value)} style={grafikSecStil}>
                  <option value="hiz">Dikey: token hızı</option>
                  <option value="ttft">Dikey: ilk token (sn)</option>
                  <option value="bellek">Dikey: bellek doluluğu %</option>
                </select>
                <span style={{ fontSize: 11, color: C.ink3 }}>×</span>
                <select value={xEksen} onChange={(e) => setXEksen(e.target.value)} style={grafikSecStil}>
                  <option value="kullanici">Yatay: kullanıcı</option>
                  <option value="baglam">Yatay: bağlam</option>
                  <option value="adet">Yatay: cihaz adedi</option>
                </select>
              </div>
            </div>
            <div style={{ height: 210, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={egri} margin={{ top: 6, right: 8, left: -14, bottom: 4 }}>
                  <CartesianGrid stroke={C.line2} vertical={false} />
                  <XAxis
                    dataKey="x"
                    tick={{ fontSize: 10.5, fill: C.ink3, fontFamily: MONO }}
                    stroke={C.line}
                    tickFormatter={(v) => (xEksen === "baglam" ? ctxYazi(v) : v)}
                  />
                  {yEksen === "hiz" ? (
                    <>
                      <YAxis yAxisId="l" tick={{ fontSize: 10.5, fill: C.ink3, fontFamily: MONO }} stroke={C.line} />
                      <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10.5, fill: C.ink3, fontFamily: MONO }} stroke={C.line} />
                    </>
                  ) : (
                    <YAxis
                      yAxisId="l"
                      domain={yEksen === "bellek" ? [0, 200] : [0, "auto"]}
                      tick={{ fontSize: 10.5, fill: C.ink3, fontFamily: MONO }}
                      stroke={C.line}
                    />
                  )}
                  <Tooltip
                    contentStyle={{ fontFamily: MONO, fontSize: 11.5, border: `1px solid ${C.line}`, borderRadius: 3 }}
                    labelFormatter={(v) =>
                      `${xEksen === "baglam" ? ctxYazi(v) : v} ${xEksen === "kullanici" ? "kullanıcı" : xEksen === "adet" ? "cihaz" : "bağlam"}`
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11.5, fontFamily: SANS }} />
                  {yEksen === "hiz" && (
                    <>
                      <Line yAxisId="l" type="monotone" dataKey="kisiBasi" name="Kullanıcı başına tok/s" stroke={C.steel} strokeWidth={2} dot={false} connectNulls={false} />
                      <Line yAxisId="r" type="monotone" dataKey="toplam" name="Toplam tok/s" stroke={C.kv} strokeWidth={2} dot={false} connectNulls={false} />
                    </>
                  )}
                  {yEksen === "ttft" && (
                    <Line yAxisId="l" type="monotone" dataKey="ttft" name="İlk token (sn)" stroke={C.bad} strokeWidth={2} dot={false} connectNulls={false} />
                  )}
                  {yEksen === "bellek" && (
                    <>
                      <ReferenceLine yAxisId="l" y={100} stroke={C.bad} strokeDasharray="4 4" />
                      <Line yAxisId="l" type="monotone" dataKey="bellek" name="Bellek doluluğu %" stroke={C.steel} strokeWidth={2} dot={false} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 6, lineHeight: 1.6 }}>
              {yEksen === "hiz" &&
                "Çizgi kesiliyorsa orada belleğe sığmıyor demektir. Toplam verim yükselirken kişi başına hızın düşmesi normaldir; önemli olan kişi başına hızın okunur bandın altına inmemesi."}
              {yEksen === "ttft" && "İlk token gecikmesi: bağlam ve kalabalık arttıkça uzar. 10 sn üzeri kullanıcıyı bekletir."}
              {yEksen === "bellek" && "Kırmızı %100 çizgisini geçen noktalarda model o ayarla belleğe SIĞMAZ. Altında kalması gerekir."}
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
                          <div
                            style={{
                              fontSize: 10.5,
                              color: C.ink3,
                              fontFamily: MONO,
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <span
                              title={TR_DURUM[row.d.tr].ad}
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: TR_DURUM[row.d.tr].renk,
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                            {row.d.grup} · {TR_DURUM[row.d.tr].kisa}
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

          {/* Ters bakış: bu donanıma ne sığar? */}
          <Kutu style={{ marginTop: 14 }}>
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
                <Etiket>Bu donanıma hangi modeller sığar?</Etiket>
                <div style={{ fontSize: 12, color: C.ink2 }}>
                  {adet} × {cihaz.ad} · {indirGibi ? "BF16 (indirdiğin gibi)" : qAktif.ad} · {ctxK}K ·{" "}
                  {kullanici} kullanıcı · <b>{siganSayisi}</b> / {modelUyum.length} model sığıyor
                </div>
              </div>
              <select
                value={modelSirala}
                onChange={(e) => setModelSirala(e.target.value)}
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  padding: "5px 7px",
                  border: `1px solid ${C.line}`,
                  borderRadius: 3,
                  background: C.paper,
                }}
              >
                <option value="yetenek">Sırala: en büyük (yetenek)</option>
                <option value="hiz">Sırala: kişi başına hız</option>
                <option value="verim">Sırala: toplam verim</option>
              </select>
            </div>

            <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${C.ink}` }}>
                    {[
                      ["Model", "left"],
                      ["Boyut", "right"],
                      ["Durum", "left"],
                      ["Kişi/s", "right"],
                      ["Toplam", "right"],
                      ["%Dolu", "right"],
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
                          position: "sticky",
                          top: 0,
                          background: C.paper,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modelUyum.map((row) => {
                    const secili = row.mm.id === modelId;
                    return (
                      <tr
                        key={row.mm.id}
                        onClick={() => {
                          setModelId(row.mm.id);
                          if (!row.sigar && row.cozum) {
                            setIndirGibi(false);
                            setQuant(row.cozum.id);
                            setKvq("q4");
                          }
                        }}
                        style={{
                          borderBottom: `1px solid ${C.line2}`,
                          background: secili ? C.steelSoft : "transparent",
                          cursor: "pointer",
                          opacity: row.sigar ? 1 : 0.6,
                        }}
                      >
                        <td style={{ padding: "7px 8px" }}>
                          <div style={{ fontWeight: secili ? 500 : 400 }}>{row.mm.ad}</div>
                          <div style={{ fontSize: 10.5, color: C.ink3, fontFamily: MONO }}>
                            {row.mm.aile} · {row.mm.lis}
                          </div>
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: MONO, whiteSpace: "nowrap" }}>
                          {row.mm.tp}B
                          {row.mm.ap !== row.mm.tp ? (
                            <span style={{ color: C.ink3 }}>/{row.mm.ap}</span>
                          ) : null}
                        </td>
                        <td style={{ padding: "7px 8px", whiteSpace: "nowrap" }}>
                          {row.sigar ? (
                            <span style={{ color: row.doluluk > 0.88 ? C.warn : C.ok, fontWeight: 500 }}>
                              {row.doluluk > 0.88 ? "sınırda" : "✓ sığar"}
                            </span>
                          ) : row.cozum ? (
                            <span style={{ color: C.steel, fontFamily: MONO, fontSize: 11.5 }}>
                              {row.cozum.ad.split(" ")[0]} ile
                            </span>
                          ) : (
                            <span style={{ color: C.bad }}>sığmaz</span>
                          )}
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "right", fontFamily: MONO, color: row.sigar && row.kisi < 12 ? C.warn : C.ink }}>
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
              Sığmayanlarda "X ile" ifadesi, o modeli bu donanıma sığdıran en hafif ağırlık
              kuantizasyonunu (KV cache Q4 ile birlikte) gösterir. Satıra tıklayınca model yüklenir;
              sığmıyorsa öneri kuantizasyon da otomatik uygulanır.
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
            <div>
              <b style={{ color: C.ink }}>Türkiye tedariki</b>
              <br />
              {["kolay", "sinirli", "ithal", "kurumsal"].map((k) => (
                <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginRight: 12 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: TR_DURUM[k].renk,
                      display: "inline-block",
                    }}
                  />
                  {TR_DURUM[k].kisa}
                </span>
              ))}
              <br />
              Renk noktaları cihazın Türkiye'de ne kolaylıkla temin edilebileceğini gösterir; "İthal"
              ve "Kurumsal" seçeneklerde gümrük + %20 KDV, nakliye ve teslim süresi ciddi fark yaratır.
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

        {/* Veri güveni / doğrulama */}
        <Kutu style={{ marginTop: 14 }}>
          <Etiket>Veri güveni — son doğrulama 4 Ağustos 2026</Etiket>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "10px 26px",
              fontSize: 12.5,
              color: C.ink2,
              lineHeight: 1.6,
              marginTop: 8,
            }}
          >
            <div>
              <b style={{ color: C.ok }}>✓ Doğrulanmış (yüksek güven)</b>
              <br />
              Donanım belleği (GB), bellek bant genişliği (GB/s), TDP (W), mimari; model parametre/aktif
              sayısı, bağlam, lisans ve HuggingFace repo'su. Bağımsız kaynaklardan (üretici + teknik
              basın) tek tek teyit edildi.
            </div>
            <div>
              <b style={{ color: C.warn }}>≈ Tahmin (mühendislik)</b>
              <br />
              KV cache KB/token, bant genişliği verimi (%50–74), token hızı ve ilk-token formülleri.
              Uzman sağlamasından geçti; büyüklük mertebesi ve göreli fark doğru, ama spec-kesin değil.
              MLA (DeepSeek/Kimi) ve kayan pencere (Gemma) için "efektif" değerler kullanıldı.
            </div>
            <div>
              <b style={{ color: C.bad }}>$ Yaklaşık ve oynak</b>
              <br />
              Fiyatlar ABD sokak/MSRP yaklaşığıdır; 2026 HBM/GDDR kıtlığı sokak fiyatlarını MSRP üzerine
              çıkarıyor. Türkiye için gümrük + %20 KDV + kur eklenir. <b>Satın alma öncesi canlı teklif
              alın</b> — bütçeyi bu sayılara kilitlemeyin.
            </div>
            <div>
              <b style={{ color: C.ink }}>Bilinen sınırlar</b>
              <br />
              DGX Station GB300 katmanlı bellektir (496 GB LPDDR + 252 GB HBM); tek bant genişliği
              yaklaşıktır. A100'de FP8 yoktur (FP16 değeri). GLM ve bazı 2026 uçtaki modellerin
              katman/KV değerleri düşük güvenlidir.
            </div>
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${C.line2}`,
              fontSize: 12,
              color: C.ink3,
              lineHeight: 1.6,
            }}
          >
            Alım kararı öncesi: bu araç aday kurulumu daraltmak içindir; final seçim, gerçek modelle ve
            güncel fiyat teklifiyle bir kez doğrulanmalıdır. TFLOPS sütunu "ilk token" tahmininde
            kullanılır; bellek ve token hızı sonuçlarını etkilemez.
          </div>
        </Kutu>
      </div>

      <ChatBot
        baglam={`Model: ${model.ad} (${model.tp}B/${model.ap}B, ${model.lis}). Donanım: ${adet} × ${cihaz.ad} (${cihaz.mem}GB, Türkiye: ${TR_DURUM[cihaz.tr].kisa})${adet > 1 ? " tek küme (tensör paralel)" : ""}. Ayar: ${indirGibi ? "BF16 + FP16 KV (indirdiğin gibi, kuantizasyon yok)" : `${quant} ağırlık / ${kvq} KV`}, ${ctxK}K bağlam, ${kullanici} eşzamanlı kullanıcı. Sonuç: ${r.sigar ? `sığıyor, ~${Math.round(r.toplamTokS)} tok/s toplam, kullanıcı başına ~${r.kullaniciTokS.toFixed(1)} tok/s, bellek %${Math.round(r.doluluk * 100)} dolu` : `SIĞMIYOR (en az ${r.minAdet || "16+"} adet gerekir)`}.`}
      />
    </div>
  );
}
