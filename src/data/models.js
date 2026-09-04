/* ------------------------------------------------------------------ */
/*  MODEL VERİTABANI                                                   */
/*  Son doğrulama: 4 Eylül 2026 — huggingface.co API + config.json     */
/*                                                                     */
/*  Alanlar:                                                           */
/*    tp   toplam parametre (milyar) — safetensors sayımından          */
/*    ap   token başına aktif parametre (milyar) — model kartından     */
/*    ctx  doğuştan (native) bağlam, K token                           */
/*    ext  RoPE/YaRN ile uzatılabilen bağlam, K token (varsa)          */
/*    kv   KV cache geometrisi — config.json'dan hesaplandı:           */
/*           e  katman başına token başına ELEMAN sayısı               */
/*              (GQA: 2·kv_head·head_dim · MLA: kv_lora + rope)        */
/*           L  KV tutan (tam dikkatli) katman sayısı — lineer/Mamba   */
/*              katmanlar sayılmaz, çünkü bağlamla büyüyen KV tutmaz   */
/*           sw kayan pencereli katman sayısı (L'nin içinde)           */
/*           w  kayan pencere genişliği (token)                        */
/*    vl   görsel giriş (çok kipli)                                    */
/*    gated HuggingFace'te erişim onayı gerekiyor                      */
/*                                                                     */
/*  Bir bağlam C için KV cache = e · 2bayt ·                           */
/*      [ (L − sw)·C + sw·min(C, w) ]   → engine.js: kvBaytToplam()    */
/* ------------------------------------------------------------------ */

export const MODELS = [

  /* --- Qwen --- */
  { id: "qwen38_24t_a95b", ad: "Qwen3.8-2.4T-A95B", aile: "Qwen", tp: 2446.2, ap: 95, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.8-2.4T-A95B", kv: { e: 2048, L: 23, sw: 0, w: 0, Lt: 92 }, not: "Qwen3.8-Max'ın açık ağırlık sürümü. Yalnızca düşünme modu.", ext: 1010 },
  { id: "qwen38_flash_next", ad: "Qwen3.8-Flash-Next 180B-A6B", aile: "Qwen", tp: 180.0, ap: 6, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.8-Flash-Next", kv: { e: 1024, L: 12, sw: 0, w: 0, Lt: 48 }, not: "125B gövde + 51B n-gram gömme + 4B MTP. Gated DeltaNet hibrit — KV çok küçük.", ext: 1000, vl: true },
  { id: "qwen38_27b", ad: "Qwen3.8 27B", aile: "Qwen", tp: 27.8, ap: 27.8, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.8-27B", kv: { e: 2048, L: 16, sw: 0, w: 0, Lt: 64 }, not: "64 katmanın 48'i lineer dikkat — 27B dense'e göre KV'si çok düşük.", ext: 1000, vl: true },
  { id: "qwen36_27b", ad: "Qwen3.6 27B", aile: "Qwen", tp: 27.8, ap: 27.8, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.6-27B", kv: { e: 2048, L: 16, sw: 0, w: 0, Lt: 64 }, vl: true },
  { id: "qwen36_35b_a3b", ad: "Qwen3.6 35B-A3B", aile: "Qwen", tp: 36.0, ap: 3, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.6-35B-A3B", kv: { e: 1024, L: 10, sw: 0, w: 0, Lt: 40 }, vl: true },
  { id: "qwen35_397b_a17b", ad: "Qwen3.5 397B-A17B", aile: "Qwen", tp: 403.4, ap: 17, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-397B-A17B", kv: { e: 1024, L: 15, sw: 0, w: 0, Lt: 60 }, vl: true },
  { id: "qwen35_122b_a10b", ad: "Qwen3.5 122B-A10B", aile: "Qwen", tp: 125.1, ap: 10, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-122B-A10B", kv: { e: 1024, L: 12, sw: 0, w: 0, Lt: 48 }, vl: true },
  { id: "qwen35_35b_a3b", ad: "Qwen3.5 35B-A3B", aile: "Qwen", tp: 36.0, ap: 3, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-35B-A3B", kv: { e: 1024, L: 10, sw: 0, w: 0, Lt: 40 }, vl: true },
  { id: "qwen35_27b", ad: "Qwen3.5 27B", aile: "Qwen", tp: 27.8, ap: 27.8, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-27B", kv: { e: 2048, L: 16, sw: 0, w: 0, Lt: 64 }, vl: true },
  { id: "qwen35_9b", ad: "Qwen3.5 9B", aile: "Qwen", tp: 9.7, ap: 9.7, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-9B", kv: { e: 2048, L: 8, sw: 0, w: 0, Lt: 32 }, vl: true },
  { id: "qwen35_4b", ad: "Qwen3.5 4B", aile: "Qwen", tp: 4.7, ap: 4.7, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-4B", kv: { e: 2048, L: 8, sw: 0, w: 0, Lt: 32 }, vl: true },
  { id: "qwen35_2b", ad: "Qwen3.5 2B", aile: "Qwen", tp: 2.3, ap: 2.3, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-2B", kv: { e: 1024, L: 6, sw: 0, w: 0, Lt: 24 }, vl: true },
  { id: "qwen35_08b", ad: "Qwen3.5 0.8B", aile: "Qwen", tp: 0.9, ap: 0.9, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3.5-0.8B", kv: { e: 1024, L: 6, sw: 0, w: 0, Lt: 24 }, vl: true },
  { id: "qwen_agentworld_35b_a3b", ad: "Qwen-AgentWorld 35B-A3B", aile: "Qwen", tp: 34.7, ap: 3, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen-AgentWorld-35B-A3B", kv: { e: 1024, L: 10, sw: 0, w: 0, Lt: 40 }, not: "Ajan/araç kullanımı için özelleştirilmiş Qwen3.5 türevi.", vl: true },

  /* --- DeepSeek --- */
  { id: "deepseek_v4_pro_0813", ad: "DeepSeek-V4-Pro 1.6T-A49B", aile: "DeepSeek", tp: 1650.5, ap: 49, ctx: 1024, lis: "MIT", hf: "deepseek-ai/DeepSeek-V4-Pro-0813", kv: { e: 1024, L: 7.742, sw: 0, w: 0, Lt: 61 }, not: "1M bağlam. Hiyerarşik KV sıkıştırma (katman başına 4× / 128×) sayesinde uzun bağlamda KV çok küçük." },
  { id: "deepseek_v4_flash_0731", ad: "DeepSeek-V4-Flash 284B-A13B", aile: "DeepSeek", tp: 304.2, ap: 13, ctx: 1024, lis: "MIT", hf: "deepseek-ai/DeepSeek-V4-Flash-0731", kv: { e: 1024, L: 7.406, sw: 0, w: 0, Lt: 43 }, not: "1M bağlam, 13B aktif — uzun bağlam/ajan işleri için en verimli açık modellerden." },
  { id: "deepseek_v4_flash_vision_exp", ad: "DeepSeek-V4-Flash-Vision (deneysel)", aile: "DeepSeek", tp: 304.6, ap: 13, ctx: 1024, lis: "MIT", hf: "deepseek-ai/DeepSeek-V4-Flash-Vision-Exp", kv: { e: 1024, L: 7.406, sw: 0, w: 0, Lt: 43 }, not: "Görsel giriş eklenmiş deneysel sürüm.", vl: true },
  { id: "deepseek_v32", ad: "DeepSeek-V3.2 685B-A37B", aile: "DeepSeek", tp: 685.4, ap: 37, ctx: 160, lis: "MIT", hf: "deepseek-ai/DeepSeek-V3.2", kv: { e: 576, L: 61, sw: 0, w: 0, Lt: 61 } },
  { id: "deepseek_v32_speciale", ad: "DeepSeek-V3.2-Speciale", aile: "DeepSeek", tp: 685.4, ap: 37, ctx: 160, lis: "MIT", hf: "deepseek-ai/DeepSeek-V3.2-Speciale", kv: { e: 576, L: 61, sw: 0, w: 0, Lt: 61 } },
  { id: "deepseek_r1", ad: "DeepSeek-R1 671B-A37B", aile: "DeepSeek", tp: 684.5, ap: 37, ctx: 160, lis: "MIT", hf: "deepseek-ai/DeepSeek-R1", kv: { e: 576, L: 61, sw: 0, w: 0, Lt: 61 } },
  { id: "deepseek_r1_distill_qwen_32b", ad: "DeepSeek-R1-Distill-Qwen 32B", aile: "DeepSeek", tp: 32.8, ap: 32.8, ctx: 131, lis: "MIT", hf: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", kv: { e: 2048, L: 64, sw: 0, w: 0, Lt: 64 } },

  /* --- GLM --- */
  { id: "glm_53", ad: "GLM-5.3 753B-A40B", aile: "GLM", tp: 753.3, ap: 40, ctx: 1024, lis: "MIT", hf: "zai-org/GLM-5.3", kv: { e: 576, L: 78, sw: 0, w: 0, Lt: 78 }, bench: "SWE-bench Verified / uzun ufuk kodlamada GLM-5.2 üstü", not: "GLM-5.2 ile aynı taban model; kazanç tamamen post-training'den." },
  { id: "glm_53_flash", ad: "GLM-5.3-Flash 320B-A18B", aile: "GLM", tp: 321.3, ap: 18, ctx: 1024, lis: "MIT", hf: "zai-org/GLM-5.3-Flash", kv: { e: 512, L: 11, sw: 0, w: 0, Lt: 45 }, bench: "GLM-5.2'yi geçiyor, 1/10 fiyat", not: "GLM-5 ailesinin ilk doğuştan çok kipli modeli. 45 katmanın 34'ü lineer — KV cache çok küçük.", vl: true },
  { id: "glm_52", ad: "GLM-5.2 753B-A40B", aile: "GLM", tp: 753.3, ap: 40, ctx: 1024, lis: "MIT", hf: "zai-org/GLM-5.2", kv: { e: 576, L: 78, sw: 0, w: 0, Lt: 78 } },
  { id: "glm_51", ad: "GLM-5.1 753B-A40B", aile: "GLM", tp: 753.9, ap: 40, ctx: 200, lis: "MIT", hf: "zai-org/GLM-5.1", kv: { e: 576, L: 78, sw: 0, w: 0, Lt: 78 } },
  { id: "glm_5", ad: "GLM-5 753B-A40B", aile: "GLM", tp: 753.9, ap: 40, ctx: 200, lis: "MIT", hf: "zai-org/GLM-5", kv: { e: 576, L: 78, sw: 0, w: 0, Lt: 78 } },
  { id: "glm_47_flash", ad: "GLM-4.7-Flash 31B-A3.6B", aile: "GLM", tp: 31.2, ap: 3.6, ctx: 200, lis: "MIT", hf: "zai-org/GLM-4.7-Flash", kv: { e: 576, L: 47, sw: 0, w: 0, Lt: 47 }, not: "Tek kart sınıfında MLA'lı küçük MoE — KV'si çok düşük." },
  { id: "glm_46", ad: "GLM-4.6 357B-A32B", aile: "GLM", tp: 356.8, ap: 32, ctx: 200, lis: "MIT", hf: "zai-org/GLM-4.6", kv: { e: 2048, L: 92, sw: 0, w: 0, Lt: 92 } },

  /* --- Kimi --- */
  { id: "kimi_k3", ad: "Kimi K3 2.8T-A89B", aile: "Kimi", tp: 2779.9, ap: 89, ctx: 1024, lis: "Kimi K3 (özel)", hf: "moonshotai/Kimi-K3", kv: { e: 576, L: 93, sw: 0, w: 0, Lt: 93 }, bench: "BrowseComp 90.4 (1M bağlam)", not: "896 uzmandan 16'sı aktif. MXFP4 QAT ile eğitilmiş — 4-bit kalite kaybı çok düşük.", vl: true },

  /* --- Kod --- */
  { id: "kimi_k27_code", ad: "Kimi K2.7 Code 1T-A32B", aile: "Kod", tp: 1026.9, ap: 32, ctx: 262, lis: "Kimi (değiştirilmiş MIT)", hf: "moonshotai/Kimi-K2.7-Code", kv: { e: 576, L: 61, sw: 0, w: 0, Lt: 61 } },

  /* --- Kimi --- */
  { id: "kimi_k26", ad: "Kimi K2.6 1T-A32B", aile: "Kimi", tp: 1026.9, ap: 32, ctx: 262, lis: "Kimi (değiştirilmiş MIT)", hf: "moonshotai/Kimi-K2.6", kv: { e: 576, L: 61, sw: 0, w: 0, Lt: 61 } },
  { id: "kimi_k25", ad: "Kimi K2.5 1T-A32B", aile: "Kimi", tp: 1026.9, ap: 32, ctx: 262, lis: "Kimi (değiştirilmiş MIT)", hf: "moonshotai/Kimi-K2.5", kv: { e: 576, L: 61, sw: 0, w: 0, Lt: 61 } },
  { id: "kimi_k2_instruct", ad: "Kimi K2 Instruct 1T-A32B", aile: "Kimi", tp: 1026.4, ap: 32, ctx: 131, lis: "Kimi (değiştirilmiş MIT)", hf: "moonshotai/Kimi-K2-Instruct", kv: { e: 576, L: 61, sw: 0, w: 0, Lt: 61 }, bench: "SWE-bench Verified 65.8" },

  /* --- Ornith --- */
  { id: "ornith_15_397b", ad: "Ornith-1.5 397B-A17B", aile: "Ornith", tp: 403.4, ap: 17, ctx: 262, lis: "MIT", hf: "ornith-ai/Ornith-1.5-397B", kv: { e: 1024, L: 15, sw: 0, w: 0, Lt: 60 }, bench: "Terminal-Bench 2.1 86.1 · DeepSWE 56.0", not: "Claude Opus 4.8 ile başa baş iddiası. Qwen3.5-397B tabanlı.", ext: 1000 },
  { id: "ornith_15_35b_a3b", ad: "Ornith-1.5 35B-A3B", aile: "Ornith", tp: 36.0, ap: 3, ctx: 262, lis: "MIT", hf: "ornith-ai/Ornith-1.5-35B-A3B", kv: { e: 1024, L: 10, sw: 0, w: 0, Lt: 40 }, not: "Tek 32-48 GB kartta çalışan en yetenekli ajan modellerinden." },
  { id: "ornith_15_9b", ad: "Ornith-1.5 9B", aile: "Ornith", tp: 9.7, ap: 9.7, ctx: 262, lis: "MIT", hf: "ornith-ai/Ornith-1.5-9B", kv: { e: 2048, L: 8, sw: 0, w: 0, Lt: 32 } },

  /* --- K2-Horizon --- */
  { id: "k2_horizon_375b_a23b", ad: "K2-Horizon 375B-A23B", aile: "K2-Horizon", tp: 379.2, ap: 23, ctx: 524, lis: "Apache 2.0", hf: "IFM/K2-Horizon-375B-A23B", kv: { e: 2048, L: 61, sw: 0, w: 0, Lt: 61 }, not: "512K doğuştan bağlam. Eğitim verisi ve kodu da açılıyor." },
  { id: "k2_horizon_mova_36b_a4b", ad: "K2-Horizon MoVA 36B-A4B", aile: "K2-Horizon", tp: 37.4, ap: 4, ctx: 524, lis: "Apache 2.0", hf: "IFM/K2-Horizon-MoVA-36B-A4B", kv: { e: 2048, L: 48, sw: 0, w: 0, Lt: 48 } },
  { id: "k2_horizon_32b", ad: "K2-Horizon 32B", aile: "K2-Horizon", tp: 34.8, ap: 34.8, ctx: 524, lis: "Apache 2.0", hf: "IFM/K2-Horizon-32B", kv: { e: 2048, L: 64, sw: 0, w: 0, Lt: 64 } },
  { id: "k2_horizon_7b", ad: "K2-Horizon 7B", aile: "K2-Horizon", tp: 9.0, ap: 9.0, ctx: 524, lis: "Apache 2.0", hf: "IFM/K2-Horizon-7B", kv: { e: 2048, L: 36, sw: 0, w: 0, Lt: 36 } },
  { id: "k2_horizon_37b", ad: "K2-Horizon 3.7B", aile: "K2-Horizon", tp: 5.1, ap: 5.1, ctx: 524, lis: "Apache 2.0", hf: "IFM/K2-Horizon-3.7B", kv: { e: 2048, L: 36, sw: 0, w: 0, Lt: 36 } },

  /* --- MiniMax --- */
  { id: "minimax_m3", ad: "MiniMax-M3 427B-A12B", aile: "MiniMax", tp: 427.0, ap: 12, ctx: 1024, lis: "MiniMax (özel)", hf: "MiniMaxAI/MiniMax-M3", kv: { e: 1024, L: 60, sw: 0, w: 0, Lt: 60 } },
  { id: "minimax_m27", ad: "MiniMax-M2.7 229B-A10B", aile: "MiniMax", tp: 228.7, ap: 10, ctx: 200, lis: "MiniMax (özel)", hf: "MiniMaxAI/MiniMax-M2.7", kv: { e: 2048, L: 62, sw: 0, w: 0, Lt: 62 } },
  { id: "minimax_m25", ad: "MiniMax-M2.5 229B-A10B", aile: "MiniMax", tp: 228.7, ap: 10, ctx: 196, lis: "MiniMax (özel)", hf: "MiniMaxAI/MiniMax-M2.5", kv: { e: 2048, L: 62, sw: 0, w: 0, Lt: 62 } },
  { id: "minimax_m2", ad: "MiniMax-M2 229B-A10B", aile: "MiniMax", tp: 228.7, ap: 10, ctx: 196, lis: "MiniMax (özel)", hf: "MiniMaxAI/MiniMax-M2", kv: { e: 2048, L: 62, sw: 0, w: 0, Lt: 62 } },

  /* --- Tencent --- */
  { id: "hy4_preview", ad: "Hy4 preview 770B-A49B", aile: "Tencent", tp: 780.0, ap: 49, ctx: 1024, lis: "Apache 2.0", hf: "tencent/Hy4-preview", kv: { e: 576, L: 78, sw: 0, w: 0, Lt: 78 }, not: "78 katman, 256 uzman + 1 paylaşımlı, top-8. Yerleşik MTP katmanı ile spekülatif kod çözme." },
  { id: "hy3", ad: "Hy3 299B-A19B", aile: "Tencent", tp: 298.8, ap: 19, ctx: 262, lis: "Apache 2.0", hf: "tencent/Hy3", kv: { e: 2048, L: 80, sw: 0, w: 0, Lt: 80 } },
  { id: "hy_mt2_30b_a3b", ad: "Hy-MT2 30B-A3B (çeviri)", aile: "Tencent", tp: 30.1, ap: 3, ctx: 262, lis: "Apache 2.0", hf: "tencent/Hy-MT2-30B-A3B", kv: { e: 1024, L: 48, sw: 0, w: 0, Lt: 48 }, not: "Çeviriye özel; Türkçe dahil çok dilli." },
  { id: "hunyuan_a13b_pretrain", ad: "Hunyuan A13B 80B-A13B", aile: "Tencent", tp: 80.4, ap: 13, ctx: 32, lis: "Tencent (özel)", hf: "tencent/Hunyuan-A13B-Pretrain", kv: { e: 2048, L: 32, sw: 0, w: 0, Lt: 32 } },

  /* --- Ling --- */
  { id: "ling_30_flash", ad: "Ling-3.0-flash 124B-A5.1B", aile: "Ling", tp: 127.5, ap: 5.1, ctx: 262, lis: "MIT", hf: "inclusionAI/Ling-3.0-flash", kv: { e: 576, L: 42, sw: 0, w: 0, Lt: 42 }, not: "5:1 KDA + MLA hibrit lineer dikkat. 1/64 seyrek MoE — çok düşük KV, çok hızlı." },
  { id: "ling_30_tiny", ad: "Ling-3.0-tiny 8B-A1.2B", aile: "Ling", tp: 7.9, ap: 1.2, ctx: 131, lis: "MIT", hf: "inclusionAI/Ling-3.0-tiny", kv: { e: 576, L: 24, sw: 0, w: 0, Lt: 24 } },

  /* --- Llama --- */
  { id: "llama_4_maverick_17b_128e_instruct", ad: "Llama 4 Maverick 400B-A17B", aile: "Llama", tp: 401.6, ap: 17, ctx: 1000, lis: "Llama 4 Community", hf: "meta-llama/Llama-4-Maverick-17B-128E-Instruct", kv: { e: 1024, L: 48, sw: 36, w: 8192 , Lt: 48 }, not: "HuggingFace'te erişim onayı gerekir (gated).", vl: true, gated: true },
  { id: "llama_4_scout_17b_16e_instruct", ad: "Llama 4 Scout 109B-A17B", aile: "Llama", tp: 108.6, ap: 17, ctx: 10000, lis: "Llama 4 Community", hf: "meta-llama/Llama-4-Scout-17B-16E-Instruct", kv: { e: 1280, L: 48, sw: 36, w: 8192 , Lt: 48 }, not: "10M bağlam iddiası; pratikte KV bütçesi çok önce biter. Gated repo.", vl: true, gated: true },

  /* --- Mistral --- */
  { id: "mistral_small_4_119b_2603", ad: "Mistral Small 4 119B-A6.5B", aile: "Mistral", tp: 119.4, ap: 6.5, ctx: 262, lis: "Apache 2.0", hf: "mistralai/Mistral-Small-4-119B-2603", kv: { e: 320, L: 36, sw: 0, w: 0, Lt: 36 }, not: "Instruct + Reasoning + Devstral tek modelde. MLA sayesinde KV çok düşük.", ext: 1000, vl: true },
  { id: "mistral_medium_35_128b", ad: "Mistral Medium 3.5 128B", aile: "Mistral", tp: 127.7, ap: 125, ctx: 262, lis: "Mistral (özel)", hf: "mistralai/Mistral-Medium-3.5-128B", kv: { e: 2048, L: 88, sw: 0, w: 0, Lt: 88 }, vl: true },

  /* --- Kod --- */
  { id: "devstral_2_123b_instruct_2512", ad: "Devstral 2 123B (kod)", aile: "Kod", tp: 125.0, ap: 125, ctx: 262, lis: "Mistral (özel)", hf: "mistralai/Devstral-2-123B-Instruct-2512", kv: { e: 2048, L: 88, sw: 0, w: 0, Lt: 88 }, bench: "SWE-bench Verified 72.2" },
  { id: "devstral_small_2_24b_instruct_2512", ad: "Devstral Small 2 24B (kod)", aile: "Kod", tp: 24.0, ap: 23.6, ctx: 393, lis: "Apache 2.0", hf: "mistralai/Devstral-Small-2-24B-Instruct-2512", kv: { e: 2048, L: 40, sw: 0, w: 0, Lt: 40 } },
  { id: "leanstral_15_119b_a6b", ad: "Leanstral 1.5 119B-A6.5B (Lean 4)", aile: "Kod", tp: 119, ap: 6.5, ctx: 262, lis: "Apache 2.0", hf: "mistralai/Leanstral-1.5-119B-A6B", kv: { e: 640, L: 36, sw: 0, w: 0 , Lt: 36 }, not: "Lean 4 ispat asistanı için. Mistral Small 4 mimarisi." },
  { id: "codestral_22b_v01", ad: "Codestral 22B (FIM)", aile: "Kod", tp: 22.2, ap: 22.2, ctx: 32, lis: "Mistral (MNPL)", hf: "mistralai/Codestral-22B-v0.1", kv: { e: 2048, L: 56, sw: 0, w: 0, Lt: 56 }, bench: "HumanEval 86.6" },
  { id: "qwen3_coder_480b_a35b_instruct", ad: "Qwen3-Coder 480B-A35B", aile: "Kod", tp: 480.2, ap: 35, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3-Coder-480B-A35B-Instruct", kv: { e: 2048, L: 62, sw: 0, w: 0, Lt: 62 }, bench: "SWE-bench Verified ~69.6" },
  { id: "qwen3_coder_30b_a3b_instruct", ad: "Qwen3-Coder 30B-A3B", aile: "Kod", tp: 30.5, ap: 3.3, ctx: 262, lis: "Apache 2.0", hf: "Qwen/Qwen3-Coder-30B-A3B-Instruct", kv: { e: 1024, L: 48, sw: 0, w: 0, Lt: 48 } },
  { id: "qwen25_coder_32b_instruct", ad: "Qwen2.5-Coder 32B", aile: "Kod", tp: 32.8, ap: 32.8, ctx: 32, lis: "Apache 2.0", hf: "Qwen/Qwen2.5-Coder-32B-Instruct", kv: { e: 2048, L: 64, sw: 0, w: 0, Lt: 64 }, bench: "HumanEval 88.4" },
  { id: "qwen25_coder_7b_instruct", ad: "Qwen2.5-Coder 7B", aile: "Kod", tp: 7.6, ap: 7.6, ctx: 32, lis: "Apache 2.0", hf: "Qwen/Qwen2.5-Coder-7B-Instruct", kv: { e: 1024, L: 28, sw: 0, w: 0, Lt: 28 } },
  { id: "deepseek_coder_v2_instruct", ad: "DeepSeek-Coder-V2 236B-A21B", aile: "Kod", tp: 235.7, ap: 21, ctx: 163, lis: "DeepSeek (özel)", hf: "deepseek-ai/DeepSeek-Coder-V2-Instruct", kv: { e: 576, L: 60, sw: 0, w: 0, Lt: 60 } },
  { id: "deepseek_coder_v2_lite_instruct", ad: "DeepSeek-Coder-V2-Lite 16B-A2.4B", aile: "Kod", tp: 15.7, ap: 2.4, ctx: 163, lis: "DeepSeek (özel)", hf: "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct", kv: { e: 576, L: 27, sw: 0, w: 0, Lt: 27 }, bench: "HumanEval 83.5" },
  { id: "north_mini_code_10", ad: "North-Mini-Code 1.0 30B-A2.2B", aile: "Kod", tp: 30.5, ap: 2.2, ctx: 500, lis: "Apache 2.0", hf: "CohereLabs/North-Mini-Code-1.0", kv: { e: 1024, L: 49, sw: 36, w: 4096, Lt: 49 }, not: "500K bağlam, kayan pencere — kod tabanı taramada çok verimli." },

  /* --- gpt-oss --- */
  { id: "gpt_oss_120b", ad: "gpt-oss-120b", aile: "gpt-oss", tp: 116.8, ap: 5.1, ctx: 131, lis: "Apache 2.0", hf: "openai/gpt-oss-120b", kv: { e: 1024, L: 36, sw: 18, w: 128, Lt: 36 }, not: "MXFP4 ile yayımlandı; 80 GB tek kartta çalışır. Katmanların yarısı 128 pencereli." },
  { id: "gpt_oss_20b", ad: "gpt-oss-20b", aile: "gpt-oss", tp: 20.9, ap: 3.6, ctx: 131, lis: "Apache 2.0", hf: "openai/gpt-oss-20b", kv: { e: 1024, L: 24, sw: 12, w: 128, Lt: 24 }, not: "16 GB sınıfı kartlarda rahat çalışan en yetenekli MoE'lerden." },

  /* --- Gemma --- */
  { id: "gemma_4_31b_it", ad: "Gemma 4 31B", aile: "Gemma", tp: 31.3, ap: 31.3, ctx: 262, lis: "Apache 2.0", hf: "google/gemma-4-31B-it", kv: { e: 8192, L: 60, sw: 50, w: 1024, Lt: 60 }, vl: true },
  { id: "gemma_4_26b_a4b_it", ad: "Gemma 4 26B-A4B", aile: "Gemma", tp: 25.8, ap: 3.0, ctx: 262, lis: "Apache 2.0", hf: "google/gemma-4-26B-A4B-it", kv: { e: 4096, L: 30, sw: 25, w: 1024, Lt: 30 }, vl: true },
  { id: "gemma_4_12b_it", ad: "Gemma 4 12B", aile: "Gemma", tp: 12.0, ap: 12.0, ctx: 262, lis: "Apache 2.0", hf: "google/gemma-4-12B-it", kv: { e: 4096, L: 48, sw: 40, w: 1024, Lt: 48 }, not: "QAT (q4_0) sürümü de var — 4-bit'te kalite kaybı çok az.", vl: true },
  { id: "gemma_4_e4b", ad: "Gemma 4 E4B (8B ham)", aile: "Gemma", tp: 8.0, ap: 5.2, ctx: 131, lis: "Apache 2.0", hf: "google/gemma-4-E4B", kv: { e: 1024, L: 42, sw: 35, w: 512, Lt: 42 }, not: "MatFormer: diskte 8B, çalışırken ~4B etkin. Bellek 8B'ye göre planlanmalı.", vl: true },

  /* --- NVIDIA --- */
  { id: "nvidia_nemotron_3_super_120b_a12b_", ad: "Nemotron 3 Super 120B-A12B", aile: "NVIDIA", tp: 123.6, ap: 12, ctx: 262, lis: "NVIDIA Open Model", hf: "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16", kv: { e: 512, L: 8, sw: 0, w: 0, Lt: 88 }, not: "Mamba-Transformer hibrit: 88 katmanın yalnızca 8'i KV tutar — uzun bağlamda çok ucuz." },
  { id: "nvidia_nemotron_35_lightning_30b_a", ad: "Nemotron 3.5 Lightning 30B-A3B", aile: "NVIDIA", tp: 31.6, ap: 3, ctx: 262, lis: "NVIDIA Open Model", hf: "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16", kv: { e: 512, L: 52, sw: 0, w: 0, Lt: 52 } },
  { id: "nvidia_nemotron_3_nano_30b_a3b_bf1", ad: "Nemotron 3 Nano 30B-A3B", aile: "NVIDIA", tp: 31.6, ap: 3, ctx: 262, lis: "NVIDIA Open Model", hf: "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16", kv: { e: 512, L: 6, sw: 0, w: 0, Lt: 52 }, not: "Hibrit Mamba; 52 katmanın 6'sı KV tutar." },
  { id: "nvidia_nemotron_3_nano_4b_bf16", ad: "Nemotron 3 Nano 4B", aile: "NVIDIA", tp: 4.0, ap: 4.0, ctx: 262, lis: "NVIDIA Open Model", hf: "nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16", kv: { e: 2048, L: 4, sw: 0, w: 0, Lt: 42 } },

  /* --- Microsoft --- */
  { id: "fara15_27b", ad: "Fara 1.5 27B (bilgisayar kullanımı)", aile: "Microsoft", tp: 27.4, ap: 27.4, ctx: 262, lis: "MIT", hf: "microsoft/Fara1.5-27B", kv: { e: 2048, L: 16, sw: 0, w: 0, Lt: 64 }, not: "Ekran/arayüz ajanı. Qwen3.5-27B tabanlı.", vl: true },
  { id: "fara15_9b", ad: "Fara 1.5 9B", aile: "Microsoft", tp: 9.4, ap: 9.4, ctx: 262, lis: "MIT", hf: "microsoft/Fara1.5-9B", kv: { e: 2048, L: 8, sw: 0, w: 0, Lt: 32 }, vl: true },
  { id: "fara15_4b", ad: "Fara 1.5 4B", aile: "Microsoft", tp: 4.5, ap: 4.5, ctx: 262, lis: "MIT", hf: "microsoft/Fara1.5-4B", kv: { e: 2048, L: 8, sw: 0, w: 0, Lt: 32 }, vl: true },
  { id: "phi_4", ad: "Phi-4 15B", aile: "Microsoft", tp: 14.7, ap: 14.7, ctx: 16, lis: "MIT", hf: "microsoft/phi-4", kv: { e: 2560, L: 40, sw: 0, w: 0, Lt: 40 } },
  { id: "phi_4_reasoning_plus", ad: "Phi-4 Reasoning Plus 14B", aile: "Microsoft", tp: 14.7, ap: 14.7, ctx: 32, lis: "MIT", hf: "microsoft/Phi-4-reasoning-plus", kv: { e: 2560, L: 40, sw: 0, w: 0, Lt: 40 } },
  { id: "phi_4_mini_instruct", ad: "Phi-4 Mini 3.8B", aile: "Microsoft", tp: 3.8, ap: 3.8, ctx: 131, lis: "MIT", hf: "microsoft/Phi-4-mini-instruct", kv: { e: 2048, L: 32, sw: 0, w: 0, Lt: 32 } },

  /* --- IBM --- */
  { id: "granite_42_30b", ad: "Granite 4.2 30B", aile: "IBM", tp: 29.3, ap: 29.3, ctx: 131, lis: "Apache 2.0", hf: "ibm-granite/granite-4.2-30b", kv: { e: 2048, L: 64, sw: 0, w: 0, Lt: 64 }, not: "Kurumsal kullanım için net lisans + MXFP4 resmi sürümü." },
  { id: "granite_42_8b", ad: "Granite 4.2 8B", aile: "IBM", tp: 8.8, ap: 8.8, ctx: 131, lis: "Apache 2.0", hf: "ibm-granite/granite-4.2-8b", kv: { e: 2048, L: 40, sw: 0, w: 0, Lt: 40 } },
  { id: "granite_42_3b", ad: "Granite 4.2 3B", aile: "IBM", tp: 3.7, ap: 3.7, ctx: 131, lis: "Apache 2.0", hf: "ibm-granite/granite-4.2-3b", kv: { e: 1024, L: 40, sw: 0, w: 0, Lt: 40 } },

  /* --- Cohere --- */
  { id: "command_a_plus_05_2026_bf16", ad: "Command A Plus 218B-A25B", aile: "Cohere", tp: 218.8, ap: 25, ctx: 200, lis: "Apache 2.0", hf: "CohereLabs/command-a-plus-05-2026-bf16", kv: { e: 2048, L: 32, sw: 24, w: 4096, Lt: 32 }, not: "Türkçe dahil çok dilli; kayan pencere ile KV düşük.", vl: true },

  /* --- Açık kaynak --- */
  { id: "olmo_31_32b_instruct", ad: "Olmo 3.1 32B Instruct", aile: "Açık kaynak", tp: 32.2, ap: 32.2, ctx: 65, lis: "Apache 2.0", hf: "allenai/Olmo-3.1-32B-Instruct", kv: { e: 2048, L: 64, sw: 48, w: 4096, Lt: 64 }, not: "Veri + eğitim kodu da açık — tam denetlenebilir." },
  { id: "olmo_3_32b_think", ad: "Olmo 3 32B Think", aile: "Açık kaynak", tp: 32.2, ap: 32.2, ctx: 65, lis: "Apache 2.0", hf: "allenai/Olmo-3-32B-Think", kv: { e: 2048, L: 64, sw: 48, w: 4096, Lt: 64 } },
  { id: "tmax_27b", ad: "tmax 27B", aile: "Açık kaynak", tp: 26.9, ap: 24.4, ctx: 262, lis: "Apache 2.0", hf: "allenai/tmax-27b", kv: { e: 2048, L: 16, sw: 0, w: 0, Lt: 64 } },
  { id: "tmax_9b", ad: "tmax 9B", aile: "Açık kaynak", tp: 9.0, ap: 9.0, ctx: 262, lis: "Apache 2.0", hf: "allenai/tmax-9b", kv: { e: 2048, L: 8, sw: 0, w: 0, Lt: 32 } },
  { id: "tmax_4b", ad: "tmax 4B", aile: "Açık kaynak", tp: 4.2, ap: 4.2, ctx: 262, lis: "Apache 2.0", hf: "allenai/tmax-4b", kv: { e: 2048, L: 8, sw: 0, w: 0, Lt: 32 } },

  /* --- Küçük --- */
  { id: "smollm3_3b", ad: "SmolLM3 3B", aile: "Küçük", tp: 3.1, ap: 3.1, ctx: 65, lis: "Apache 2.0", hf: "HuggingFaceTB/SmolLM3-3B", kv: { e: 1024, L: 36, sw: 0, w: 0, Lt: 36 } },
  { id: "lfm25_26b", ad: "LFM2.5 2.6B", aile: "Küçük", tp: 2.7, ap: 2.7, ctx: 131, lis: "LFM Open (özel)", hf: "LiquidAI/LFM2.5-2.6B", kv: { e: 1024, L: 30, sw: 0, w: 0, Lt: 30 }, not: "Telefon/uç cihaz için tasarlandı; CPU'da bile pratik." },
  { id: "lfm25_230m", ad: "LFM2.5 230M", aile: "Küçük", tp: 0.2, ap: 0.2, ctx: 128, lis: "LFM Open (özel)", hf: "LiquidAI/LFM2.5-230M", kv: { e: 1024, L: 14, sw: 0, w: 0, Lt: 14 } },
  { id: "nanbeige42_3b", ad: "Nanbeige 4.2 3B", aile: "Küçük", tp: 4.2, ap: 4.2, ctx: 262, lis: "Apache 2.0", hf: "Nanbeige/Nanbeige4.2-3B", kv: { e: 2048, L: 22, sw: 0, w: 0, Lt: 22 } },
  { id: "spark_x25_4b", ad: "Spark-X2.5 4B", aile: "Küçük", tp: 4.1, ap: 4.1, ctx: 1024, lis: "Apache 2.0", hf: "XHToken/Spark-X2.5-4B", kv: { e: 2048, L: 36, sw: 27, w: 512, Lt: 36 }, not: "4B'de 1M bağlam; 512 pencereli kayan dikkat." },

  /* --- Baidu --- */
  { id: "ernie_45_21b_a3b_thinking", ad: "ERNIE 4.5 21B-A3B Thinking", aile: "Baidu", tp: 21.8, ap: 3, ctx: 131, lis: "Apache 2.0", hf: "baidu/ERNIE-4.5-21B-A3B-Thinking", kv: { e: 1024, L: 28, sw: 0, w: 0, Lt: 28 } },

  /* --- Türkçe --- */
  { id: "kumru_2b", ad: "Kumru 2B (Türkçe)", aile: "Türkçe", tp: 2.4, ap: 2.4, ctx: 8, lis: "Apache 2.0", hf: "vngrs-ai/Kumru-2B", kv: { e: 1024, L: 18, sw: 0, w: 0, Lt: 18 }, not: "VNGRS tarafından sıfırdan Türkçe eğitilmiş. Bağlamı kısa (8K) ama Türkçe akıcılığı boyutuna göre iyi." },
  { id: "trendyol_llm_7b_chat_v10", ad: "Trendyol LLM 7B Chat (Türkçe)", aile: "Türkçe", tp: 7.0, ap: 7.0, ctx: 4, lis: "Apache 2.0", hf: "Trendyol/Trendyol-LLM-7B-chat-v1.0", kv: { e: 1024, L: 32, sw: 0, w: 0 , Lt: 32 }, not: "Llama-2 tabanlı Türkçe sohbet ince ayarı. Eski nesil — bağlamı 4K." },

  /* --- Topluluk --- */
  { id: "qwopus35_27b_v3", ad: "Qwopus 3.5 27B v3 (topluluk)", aile: "Topluluk", tp: 27.4, ap: 27.4, ctx: 262, lis: "Apache 2.0", hf: "Jackrong/Qwopus3.5-27B-v3", kv: { e: 2048, L: 16, sw: 0, w: 0, Lt: 64 }, not: "Tek geliştirici finetune'u — üretim öncesi kendi işinle test et." },
  { id: "qwen35_27b_claude_46_opus_reasonin", ad: "Qwen3.5-27B Opus-Distilled (topluluk)", aile: "Topluluk", tp: 27.8, ap: 27.8, ctx: 262, lis: "Apache 2.0", hf: "Jackrong/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled", kv: { e: 2048, L: 16, sw: 0, w: 0, Lt: 64 }, not: "Tek geliştirici finetune'u." },
  { id: "qwopus35_9b_v3_gguf", ad: "Qwopus 3.5 9B v3 GGUF (topluluk)", aile: "Topluluk", tp: 9.7, ap: 9.7, ctx: 262, lis: "Apache 2.0", hf: "Jackrong/Qwopus3.5-9B-v3-GGUF", kv: { e: 2048, L: 8, sw: 0, w: 0, Lt: 32 }, not: "Yalnızca GGUF — llama.cpp / Ollama ile." },
];

/* Aile sırası — açılır listede bu sırayla gruplanır. */
export const AILE_SIRA = [
  "Qwen", "DeepSeek", "GLM", "Kimi", "Ornith", "K2-Horizon", "MiniMax",
  "Tencent", "Ling", "Llama", "Mistral", "Kod", "gpt-oss", "Gemma",
  "NVIDIA", "Microsoft", "IBM", "Cohere", "Baidu", "Açık kaynak",
  "Küçük", "Türkçe", "Topluluk",
];

export const MODEL_HARITA = Object.fromEntries(MODELS.map((m) => [m.id, m]));
