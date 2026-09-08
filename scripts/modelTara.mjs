#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  MODEL TARAMA                                                       */
/*                                                                     */
/*  Model veritabanı elle bakılmazsa haftalar içinde eskiyor. Bu betik */
/*  HuggingFace'te trend olan metin üretimi modellerini çeker, hangisi */
/*  veritabanında yok gösterir ve seçilenler için hazır kayıt üretir.  */
/*                                                                     */
/*  Kullanım:                                                          */
/*    npm run model-tara                     → eksikleri listele       */
/*    npm run model-tara -- --limit 100      → daha geniş tara         */
/*    npm run model-tara -- --uret Qwen/X    → o depo için kayıt üret  */
/*    npm run model-tara -- --uret-hepsi     → listedekilerin hepsi    */
/*                                                                     */
/*  Üretilen kaydı src/data/models.js içine elle yapıştır: `ad`,       */
/*  `aile` ve `not` alanlarını gözden geçirmek gerekir — bunlar        */
/*  otomatikleştirilemez, editoryal karardır.                          */
/* ------------------------------------------------------------------ */

import { readFileSync } from "node:fs";
import { MODELS } from "../src/data/models.js";

const API = "https://huggingface.co/api/models";
const arg = (ad, varsayilan = null) => {
  const i = process.argv.indexOf(ad);
  return i >= 0 ? (process.argv[i + 1] ?? true) : varsayilan;
};
const bayrak = (ad) => process.argv.includes(ad);

/* Türev/kuantize depolar taranmaz: bunlar taban modelin kopyasıdır ve
   veritabanına ayrı satır olarak girmeleri listeyi şişirir. */
const ATLA = /GGUF|AWQ|GPTQ|MLX|EXL\d|-bnb|int4|4bit|8bit|abliterat|uncensor|OBLITER|imatrix|Heretic|Unleashed|-w4|-w8|NVFP4$|-FP8$|onnx|ONNX|Distill-GGUF|draft|eagle|dspark|dflash/i;
/* Metin üretimi olmayan işler */
const METIN_DISI = /TTS|ASR|whisper|OCR|embed|rerank|diffus|video|image|audio|speech|vision-encoder|guard|reward|classifier/i;

const jget = async (u) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${u}`);
  return r.json();
};

/* ---- config.json → KV geometrisi (src/hf.js ile aynı mantık) ---- */
const LINEER = new Set(["linear_attention", "mamba", "recurrent", "gated_deltanet"]);

function kvGeometri(cfg) {
  const t = cfg.text_config || cfg;
  const L = t.num_hidden_layers;
  if (!L) return null;
  const hs = t.hidden_size, H = t.num_attention_heads;
  const kvh = t.num_key_value_heads ?? H;
  const hd = t.head_dim || (hs && H ? Math.floor(hs / H) : null);
  const mla = t.kv_lora_rank ? t.kv_lora_rank + (t.qk_rope_head_dim || 0) : 0;
  const e = mla || (kvh && hd ? 2 * kvh * hd : 0);
  if (!e) return null;

  if (Array.isArray(t.compress_ratios) && t.compress_ratios.length) {
    const eff = t.compress_ratios.slice(0, L).reduce((a, r) => a + 1 / (r || 1), 0);
    return { e, L: Math.round(eff * 1000) / 1000, sw: 0, w: 0, Lt: L };
  }
  const swa = t.sliding_window || 0;
  if (Array.isArray(t.layer_types) && t.layer_types.length) {
    let attn = 0, sw = 0;
    for (const k of t.layer_types) {
      if (LINEER.has(k)) continue;
      attn++;
      if (k === "sliding_attention") sw++;
    }
    return { e, L: attn, sw, w: swa, Lt: L };
  }
  if (typeof t.hybrid_override_pattern === "string")
    return { e, L: (t.hybrid_override_pattern.match(/\*/g) || []).length || L, sw: 0, w: 0, Lt: L };
  const maxPos = t.max_position_embeddings || 0;
  if (swa && (!maxPos || swa < maxPos)) return { e, L, sw: L, w: swa, Lt: L };
  return { e, L, sw: 0, w: 0, Lt: L };
}

function mtpSayisi(cfg) {
  for (const src of [cfg.text_config || {}, cfg]) {
    for (const k of ["num_nextn_predict_layers", "mtp_num_hidden_layers", "num_mtp_modules", "mtp_transformer_layers"]) {
      const v = src[k];
      if (typeof v === "number" && v > 0) return v;
    }
    if (src.use_mtp === true) return 1;
    const m = src.mtp;
    if (m && typeof m === "object" && m.num_hidden_layers > 0) return m.num_hidden_layers;
  }
  return 0;
}

function aktifParametre(cfg, toplamB) {
  const t = cfg.text_config || cfg;
  const { num_hidden_layers: L, hidden_size: hs } = t;
  const topk = t.num_experts_per_tok;
  const mi = t.moe_intermediate_size;
  const uzman = t.n_routed_experts || t.num_experts || t.num_local_experts || 0;
  if (!L || !hs || !topk || !mi || !uzman || uzman <= topk) return toplamB;
  const H = t.num_attention_heads || 1;
  const kvh = t.num_key_value_heads || H;
  const hd = t.head_dim || Math.floor(hs / H);
  const attn = hs * H * hd + 2 * hs * kvh * hd + H * hd * hs;
  const mlp = 3 * hs * mi * (topk + (t.n_shared_experts || 0));
  const emb = (t.vocab_size || 0) * hs * 2;
  return Math.max(0.1, Math.min((L * (attn + mlp) + emb) / 1e9, toplamB));
}

/* ---- bir depoyu tam kayda çevir ---- */
async function kayitUret(repo) {
  const bilgi = await jget(`${API}/${repo}?expand[]=safetensors&expand[]=cardData&expand[]=gated&expand[]=pipeline_tag`);
  let cfg;
  try {
    cfg = await (await fetch(`https://huggingface.co/${repo}/raw/main/config.json`)).json();
  } catch {
    throw new Error(`${repo}: config.json okunamadı`);
  }
  const st = bilgi.safetensors || {};
  const dokum = Object.values(st.parameters || {}).reduce((a, b) => a + b, 0);
  const tot = Math.max(st.total || 0, dokum); // HF'nin "total" alanı bazı depolarda hatalı
  if (!tot) throw new Error(`${repo}: parametre sayısı bulunamadı`);

  const kv = kvGeometri(cfg);
  if (!kv) throw new Error(`${repo}: KV geometrisi çıkarılamadı`);

  const t = cfg.text_config || cfg;
  const tp = Math.round((tot / 1e9) * 10) / 10;
  const ap = Math.round(aktifParametre(cfg, tp) * 10) / 10;
  const ctx = Math.round((t.max_position_embeddings || 32768) / 1024);
  const lis =
    bilgi.cardData?.license_name ||
    (Array.isArray(bilgi.cardData?.license) ? bilgi.cardData.license[0] : bilgi.cardData?.license) ||
    "belirtilmemiş";
  const mtp = mtpSayisi(cfg);
  const vl = !!(cfg.vision_config || cfg.audio_config);
  const id = repo.split("/")[1].toLowerCase().replace(/[.\-]/g, "_").slice(0, 34);

  const alanlar = [
    `id: ${JSON.stringify(id)}`,
    `ad: ${JSON.stringify(repo.split("/")[1])}`,
    `aile: "GÖZDEN GEÇİR"`,
    `tp: ${tp}`, `ap: ${ap}`, `ctx: ${ctx}`,
    `lis: ${JSON.stringify(lis)}`,
    `hf: ${JSON.stringify(repo)}`,
    `kv: { e: ${kv.e}, L: ${kv.L}, sw: ${kv.sw}, w: ${kv.w}, Lt: ${kv.Lt} }`,
  ];
  if (mtp) alanlar.push(`mtp: ${mtp}`);
  if (vl) alanlar.push("vl: true");
  if (bilgi.gated) alanlar.push("gated: true");
  return `  { ${alanlar.join(", ")} },`;
}

/* ---- ana akış ---- */
const limit = Number(arg("--limit", 60));
const uretHepsi = bayrak("--uret-hepsi");
const tekRepo = arg("--uret");

if (typeof tekRepo === "string") {
  console.log(await kayitUret(tekRepo));
  process.exit(0);
}

const db = readFileSync("src/data/models.js", "utf8");
console.log(`HuggingFace'te trend olan ilk ${limit} metin üretimi modeli taranıyor…\n`);

const trend = await jget(
  `${API}?sort=trendingScore&direction=-1&limit=${limit}&filter=text-generation`
);

const eksik = trend.filter((m) => {
  if (ATLA.test(m.id) || METIN_DISI.test(m.id)) return false;
  if ((m.createdAt || "") < "2026-01") return false; // eski nesil ilgi çekmiyor
  return !db.includes(`"${m.id}"`);
});

console.log(`veritabanında ${MODELS.length} model var.`);
console.log(`trend listesinde olup veritabanında OLMAYAN: ${eksik.length}\n`);

if (!eksik.length) {
  console.log("✓ Veritabanı güncel görünüyor.");
  process.exit(0);
}

for (const m of eksik) {
  console.log(
    `  ${m.id.padEnd(52)} beğeni ${String(m.likes || 0).padStart(5)} · indirme ${String(m.downloads || 0).padStart(9)} · ${(m.createdAt || "").slice(0, 10)}`
  );
}

if (!uretHepsi) {
  console.log(`\nKayıt üretmek için:  npm run model-tara -- --uret <org/model>`);
  console.log(`Hepsi için:          npm run model-tara -- --uret-hepsi`);
  process.exit(0);
}

console.log("\n/* --- src/data/models.js içine yapıştır, sonra ad/aile/not alanlarını düzelt --- */");
for (const m of eksik) {
  try {
    console.log(await kayitUret(m.id));
  } catch (e) {
    console.log(`  // ${m.id}: ${e.message}`);
  }
}
