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
import { hesapla, kvKBperToken, kvTipi } from "../src/engine.js";

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
  const taban = { model: m, quant: "q4", kvq: "fp8", ctxK: 32, girdiK: 8, kullanici: 4, cikti: 800, cihaz: d, adet: 1, kvOran: 0.6 };
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
console.log(`\n${MODELS.length} model · ${DEVICES.length} cihaz · ${QUANTS.length} kuantizasyon · ${SENARYOLAR.length} senaryo kontrol edildi.`);
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
