/* ------------------------------------------------------------------ */
/*  HUGGINGFACE ANALİZÖRÜ                                              */
/*                                                                     */
/*  Kullanıcı bir HF linki (veya "org/model" yolu) verdiğinde:         */
/*    1) API'den depo verisi + safetensors parametre sayımı            */
/*    2) config.json'dan gerçek KV geometrisi                          */
/*  çekilip simülasyonun anlayacağı bir model kaydına çevrilir.        */
/*                                                                     */
/*  HuggingFace CORS'a açıktır; bu yüzden istekler doğrudan tarayıcıdan*/
/*  gider — aracı sunucu gerekmez, anahtar gerekmez.                   */
/* ------------------------------------------------------------------ */

const API = "https://huggingface.co/api/models";
const RAW = (repo, dosya) => `https://huggingface.co/${repo}/raw/main/${dosya}`;

/** Her türlü girdiden "org/model" deposunu çıkarır.
 *  Kabul eder: tam URL, /models/ yolu, çıplak org/model, GGUF alt dosya yolu. */
export function repoAyikla(girdi) {
  if (!girdi) return null;
  let s = String(girdi).trim();
  s = s.replace(/^["'<(\[]+|["'>)\]]+$/g, "");
  // Tam URL ise yolu al
  const m = s.match(/huggingface\.co\/(?:models\/)?([^\s?#]+)/i);
  if (m) s = m[1];
  s = s.replace(/^\/+/, "").split(/[?#]/)[0];
  // /tree/main, /blob/main/... gibi ekleri at
  s = s.replace(/\/(tree|blob|resolve|commits?|discussions|raw)\/.*$/i, "");
  s = s.replace(/\/+$/, "");
  const p = s.split("/").filter(Boolean);
  if (p.length < 2) return null;
  // İlk iki bileşen depo adıdır
  const repo = `${p[0]}/${p[1]}`;
  return /^[\w.\-]+\/[\w.\-]+$/.test(repo) ? repo : null;
}

/** Bir metin içindeki TÜM HuggingFace depolarını bulur. */
export function repolariBul(metin) {
  if (!metin) return [];
  const bulunan = new Set();
  const url = /https?:\/\/(?:www\.)?huggingface\.co\/[^\s,;)"'<>]+/gi;
  for (const u of metin.match(url) || []) {
    const r = repoAyikla(u);
    if (r) bulunan.add(r);
  }
  // Çıplak "org/model" — yalnızca bilinen dosya uzantısı değilse
  const ciplak = /(?:^|\s)([A-Za-z0-9][\w.\-]{1,40}\/[A-Za-z0-9][\w.\-]{1,80})(?=\s|$|[.,;)])/g;
  let x;
  while ((x = ciplak.exec(metin))) {
    const c = x[1];
    if (/\.(js|ts|jsx|py|md|json|html|css|txt|png|jpg|sh|yml)$/i.test(c)) continue;
    if (/^(https?|www)/i.test(c)) continue;
    bulunan.add(c);
  }
  return [...bulunan].slice(0, 4);
}

const jget = async (url, sinyal) => {
  const r = await fetch(url, { signal: sinyal });
  if (!r.ok) {
    const e = new Error(`HTTP ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
};

/* ------------------------------------------------------------------ */
/*  config.json → KV geometrisi                                        */
/* ------------------------------------------------------------------ */

const LINEER = new Set(["linear_attention", "mamba", "recurrent", "gated_deltanet"]);

export function konfigdenKV(cfg) {
  if (!cfg) return null;
  const t = cfg.text_config || cfg.language_config || cfg.llm_config || cfg;
  const L = t.num_hidden_layers || t.n_layer || t.num_layers;
  if (!L) return null;

  const hs = t.hidden_size || t.d_model || t.n_embd;
  const H = t.num_attention_heads || t.n_head;
  const kvh = t.num_key_value_heads ?? t.num_kv_heads ?? H;
  const hd = t.head_dim || (hs && H ? Math.floor(hs / H) : null);

  // MLA (DeepSeek/GLM/Kimi/Ling): tek gizil vektör, K ve V ayrı tutulmaz
  const mla = t.kv_lora_rank ? t.kv_lora_rank + (t.qk_rope_head_dim || 0) : 0;
  const e = mla || (kvh && hd ? 2 * kvh * hd : null);
  if (!e) return null;

  // DeepSeek V4: katman başına hiyerarşik sıkıştırma oranı
  if (Array.isArray(t.compress_ratios) && t.compress_ratios.length) {
    const eff = t.compress_ratios
      .slice(0, L)
      .reduce((a, r) => a + 1 / (r || 1), 0);
    return { e, L: Math.round(eff * 1000) / 1000, sw: 0, w: 0, tip: "hiyerarşik sıkıştırma" };
  }

  const swa = t.sliding_window || t.sliding_window_size || 0;

  if (Array.isArray(t.layer_types) && t.layer_types.length) {
    let attn = 0, sw = 0;
    for (const k of t.layer_types) {
      if (LINEER.has(k)) continue;
      attn++;
      if (k === "sliding_attention") sw++;
    }
    return {
      e, L: attn, sw, w: swa,
      tip: attn < t.layer_types.length ? "hibrit lineer" : sw ? "kayan pencere" : mla ? "MLA" : "GQA",
    };
  }

  if (typeof t.hybrid_override_pattern === "string") {
    const attn = (t.hybrid_override_pattern.match(/\*/g) || []).length;
    return { e, L: attn || L, sw: 0, w: 0, tip: "Mamba hibrit" };
  }

  const maxPos = t.max_position_embeddings || 0;
  if (swa && (!maxPos || swa < maxPos)) {
    return { e, L, sw: L, w: swa, tip: "kayan pencere" };
  }
  return { e, L, sw: 0, w: 0, tip: mla ? "MLA" : "GQA" };
}

/** MoE modellerde token başına aktif parametreyi config'den kestir. */
export function aktifParametre(cfg, toplamB) {
  const t = cfg?.text_config || cfg || {};
  const L = t.num_hidden_layers, hs = t.hidden_size;
  if (!L || !hs) return toplamB;
  const topk = t.num_experts_per_tok;
  const mi = t.moe_intermediate_size;
  const uzmanSayisi =
    t.n_routed_experts || t.num_experts || t.num_local_experts || 0;
  if (!topk || !mi || !uzmanSayisi || uzmanSayisi <= topk) return toplamB;

  const paylasimli = t.n_shared_experts || 0;
  const H = t.num_attention_heads || 1;
  const kvh = t.num_key_value_heads || H;
  const hd = t.head_dim || Math.floor(hs / H);
  const attn = hs * H * hd + 2 * hs * kvh * hd + H * hd * hs;
  const mlp = 3 * hs * mi * (topk + paylasimli);
  const emb = (t.vocab_size || 0) * hs * 2;
  const tahmin = (L * (attn + mlp) + emb) / 1e9;
  return Math.max(0.1, Math.min(tahmin, toplamB));
}

/* ------------------------------------------------------------------ */
/*  ANA GİRİŞ: bir depoyu analiz et                                    */
/* ------------------------------------------------------------------ */

export async function modeliAnalizEt(girdiRepo, sinyal) {
  const repo = repoAyikla(girdiRepo);
  if (!repo) throw new Error("Bu bir HuggingFace model yolu gibi görünmüyor. Örnek: Qwen/Qwen3.8-27B");

  let bilgi;
  try {
    bilgi = await jget(
      `${API}/${repo}?expand[]=safetensors&expand[]=gated&expand[]=downloads&expand[]=likes&expand[]=cardData&expand[]=tags&expand[]=pipeline_tag&expand[]=siblings&expand[]=lastModified`,
      sinyal
    );
  } catch (e) {
    if (e.status === 401 || e.status === 403 || e.status === 404)
      throw new Error(
        `"${repo}" okunamadı. HuggingFace bu depo için erişim vermiyor; üç olasılık var: ` +
          `(a) yazım hatası — büyük/küçük harf önemlidir, (b) depo kapalı (gated) ve önce lisans onayı gerekiyor, ` +
          `(c) depo özel. Adresi tarayıcıda açıp doğrula: https://huggingface.co/${repo}`
      );
    throw new Error(`HuggingFace'e ulaşılamadı (${e.message}).`);
  }

  let cfg = null;
  let tabanRepo = null; // config'in alındığı taban model (türev depolarda)
  try {
    cfg = await jget(RAW(repo, "config.json"), sinyal);
  } catch {
    /* GGUF/MLX depolarında config.json yoktur. Model kartındaki base_model
       alanını izleyerek taban modelin mimarisini almaya çalış. */
    const bm = bilgi.cardData?.base_model;
    const aday = repoAyikla(Array.isArray(bm) ? bm[0] : bm);
    if (aday && aday !== repo) {
      try {
        cfg = await jget(RAW(aday, "config.json"), sinyal);
        tabanRepo = aday;
        // Parametre sayımı da taban depodan gelsin — kuantize depolarda
        // safetensors üstverisi yoktur ve config'ten tahmin MoE'de çok saparr.
        try {
          const tb = await jget(`${API}/${aday}?expand[]=safetensors`, sinyal);
          if (tb?.safetensors?.total) bilgi.safetensors = tb.safetensors;
        } catch {
          /* önemli değil, aşağıda tahmine düşer */
        }
      } catch {
        /* taban model de okunamadı — aşağıda uyarı verilir */
      }
    }
  }

  const st = bilgi.safetensors || {};
  const tags = bilgi.tags || [];
  const dosyalar = (bilgi.siblings || []).map((s) => s.rfilename || "");
  const ggufDosyalari = dosyalar.filter((f) => /\.gguf$/i.test(f));
  const kuantizeMi =
    /gguf|awq|gptq|mlx|exl\d|bnb|int4|fp4|nf4/i.test(repo) ||
    tags.some((t) => /gguf|awq|gptq|mlx|exl|4bit|8bit/i.test(t));

  const kv = konfigdenKV(cfg);
  let tp = st.total ? st.total / 1e9 : null;

  // safetensors sayımı yoksa GGUF dosya boyutundan geri hesapla
  let tahminiTp = false;
  if (!tp && cfg) {
    const t = cfg.text_config || cfg;
    // Kaba parametre tahmini: katman × (dikkat + MLP) + gömme
    const L = t.num_hidden_layers, hs = t.hidden_size, V = t.vocab_size || 0;
    const inter = t.intermediate_size || (hs ? 4 * hs : 0);
    const uzman = t.n_routed_experts || t.num_experts || t.num_local_experts || 0;
    const mi = t.moe_intermediate_size || 0;
    if (L && hs) {
      // MoE'de MLP yerine TÜM uzmanların toplamı bellekte durur
      const mlp = uzman && mi ? 3 * hs * mi * uzman : 3 * hs * inter;
      tp = (L * (4 * hs * hs + mlp) + 2 * V * hs) / 1e9;
      tahminiTp = true;
    }
  }

  const ap = cfg && tp ? aktifParametre(cfg, tp) : tp;
  const t = cfg?.text_config || cfg || {};
  const ctxTok = t.max_position_embeddings || t.model_max_length || 0;

  const uyarilar = [];
  if (bilgi.gated) uyarilar.push("Bu depo kapalı (gated): indirmeden önce HuggingFace üzerinden erişim onayı almalısın.");
  if (!cfg)
    uyarilar.push(
      "config.json okunamadı — bu depo büyük ihtimalle yalnızca kuantize dosya (GGUF/MLX) barındırıyor ve model kartında bir taban model (base_model) belirtmemiş. Taban modelin kendi deposunu ver, tam hesabı oradan çıkarayım."
    );
  else if (tabanRepo)
    uyarilar.push(
      `Bu depoda config.json yok; mimari ve KV geometrisi taban modelden (${tabanRepo}) alındı. Parametre sayısı doğru, ama indireceğin dosyanın gerçek boyutunu depo dosya listesinden teyit et.`
    );
  if (kuantizeMi) uyarilar.push("Bu depo zaten kuantize edilmiş ağırlık içeriyor. Aşağıdaki bellek hesabı seçtiğin kuantizasyona göre yapılır; kendi indireceğin dosyanın boyutunu HuggingFace'teki dosya listesinden doğrula.");
  if (tahminiTp) uyarilar.push("Parametre sayısı safetensors üstverisinde yoktu; config.json'dan tahmin edildi (±%15 sapabilir).");
  if (!kv) uyarilar.push("KV cache geometrisi çıkarılamadı — bellek hesabı yalnızca ağırlıkları kapsar.");

  const pipeline = bilgi.pipeline_tag || "";
  const metinUretimiMi =
    !pipeline || /text-generation|text2text|image-text-to-text|any-to-any|conversational/i.test(pipeline);
  if (!metinUretimiMi)
    uyarilar.push(`Bu depo "${pipeline}" olarak etiketlenmiş — bir sohbet/metin üretimi modeli olmayabilir (ör. görüntü, ses veya video modeli). Simülasyon sonuçları anlamsız olabilir.`);

  const lisans =
    bilgi.cardData?.license_name ||
    (Array.isArray(bilgi.cardData?.license) ? bilgi.cardData.license[0] : bilgi.cardData?.license) ||
    "belirtilmemiş";

  return {
    repo,
    tabanRepo,
    url: `https://huggingface.co/${repo}`,
    ad: repo.split("/")[1],
    tp: tp ? Math.round(tp * 10) / 10 : null,
    ap: ap ? Math.round(ap * 10) / 10 : null,
    kv,
    ctxK: ctxTok ? Math.round(ctxTok / 1024) : null,
    ctxTok,
    lisans,
    mimari: (cfg?.architectures || t.architectures || [])[0] || "?",
    modelTipi: cfg?.model_type || t.model_type || "",
    indirme: bilgi.downloads || 0,
    begeni: bilgi.likes || 0,
    guncelleme: bilgi.lastModified ? String(bilgi.lastModified).slice(0, 10) : "",
    gated: !!bilgi.gated,
    vl: !!(cfg?.vision_config || cfg?.audio_config) || /image-text|any-to-any/i.test(pipeline),
    pipeline,
    kuantizeMi,
    ggufSayisi: ggufDosyalari.length,
    uzmanSayisi: t.n_routed_experts || t.num_experts || t.num_local_experts || 0,
    aktifUzman: t.num_experts_per_tok || 0,
    katman: t.num_hidden_layers || 0,
    tags: tags.filter((x) => !x.includes(":")).slice(0, 12),
    uyarilar,
    /* Simülasyona takılabilir model kaydı */
    kayit:
      tp && kv
        ? {
            id: `hf_${repo.replace(/[^\w]/g, "_")}`.slice(0, 60),
            ad: repo,
            aile: "HuggingFace'ten",
            tp: Math.round(tp * 10) / 10,
            ap: Math.round((ap || tp) * 10) / 10,
            ctx: ctxTok ? Math.max(1, Math.round(ctxTok / 1024)) : 32,
            lis: lisans,
            hf: repo,
            kv: { e: kv.e, L: kv.L, sw: kv.sw, w: kv.w },
            harici: true,
            vl: !!(cfg?.vision_config),
          }
        : null,
  };
}
