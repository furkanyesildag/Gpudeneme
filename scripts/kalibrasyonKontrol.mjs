#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  KALİBRASYON KONTROLÜ                                               */
/*                                                                     */
/*  Motorun hız modelini, yayımlanmış GERÇEK ölçümlere karşı sınar.    */
/*  Bir sabiti değiştirdiğinde bu betiği çalıştır: hangi noktaların    */
/*  bozulduğunu anında görürsün.                                       */
/*                                                                     */
/*  ÖNEMLİ: burada formül YENİDEN YAZILMAZ — doğrudan hesapla()        */
/*  çağrılır. Kopya bir formülü sınamak, motorun kendisi bozukken      */
/*  kalibrasyonun yeşil kalmasına yol açardı.                          */
/*                                                                     */
/*  Model dosya boyutları ölçümü yapanların bildirdiği değerlerdir;    */
/*  bayt/parametre oranı oradan türetilir, böylece hangi               */
/*  kuantizasyon olduğu tahmin edilmek zorunda kalmaz.                 */
/* ------------------------------------------------------------------ */

import { hesapla, EK_YUK_SN, MOE_US, GIB_GB } from "../src/engine.js";
import { CIHAZ_HARITA } from "../src/data/devices.js";
import { MODEL_HARITA } from "../src/data/models.js";

/* Ölçümü yapan RTX 4080 listede yok (üretimi bitti) — kalibrasyon için tanımlı. */
const EK_CIHAZ = {
  "4080t": { id: "4080t", ad: "RTX 4080 16 GB", mem: 16, bw: 717, tf: 390, w: 320,
             usd: 0, try: 0, fiyat: 0, tur: "kart", link: "pcie", mbu: 0.77,
             tr: "kolay", mim: "ada", bellekTipi: "gddr", slot: 3 },
};

/* Ölçümde geçip de model listesinde bulunmayanlar (eski sürüm ya da
   topluluk türevi). KV geometrileri config.json'dan. */
const EK_MODEL = {
  qwen3_8b:      { ad: "Qwen3 8B",   tp: 8.2,  ap: 8.2,  kv: { e: 2048, L: 36, sw: 0, w: 0, Lt: 36 } },
  qwen3_14b:     { ad: "Qwen3 14B",  tp: 14.8, ap: 14.8, kv: { e: 2048, L: 40, sw: 0, w: 0, Lt: 40 } },
  qwen3_32b:     { ad: "Qwen3 32B",  tp: 32.8, ap: 32.8, kv: { e: 2048, L: 64, sw: 0, w: 0, Lt: 64 } },
  qwen3_30b_a3b: { ad: "Qwen3 30B-A3B", tp: 30.5, ap: 3.3, kv: { e: 1024, L: 48, sw: 0, w: 0, Lt: 48 } },
  // REAP: uzmanların %25'i budanmış GLM-4.7-Flash. Toplam düşer, token
  // başına uyanan uzman sayısı (dolayısıyla aktif parametre) değişmez.
  glm_47_flash_reap: { ad: "GLM-4.7-Flash-REAP 23B", tp: 23.0, ap: 3.6, kv: { e: 576, L: 47, sw: 0, w: 0, Lt: 47 } },
};

/* cihaz · model · dosya boyutu · birimi · bağlam K · ölçülen tok/s · sistem RAM · kaynak */
const OLCUMLER = [
  // hardware-corner.net · RTX 5090 · llama-bench TG@4K · hepsi VRAM'e sığar
  ["5090",  "qwen3_8b",           4.78, "GiB",  4, 185.9, 64, "hardware-corner"],
  ["5090",  "qwen3_14b",          8.53, "GiB",  4, 123.8, 64, "hardware-corner"],
  ["5090",  "qwen3_32b",         18.64, "GiB",  4,  61.4, 64, "hardware-corner"],
  ["5090",  "qwen3_30b_a3b",     16.47, "GiB",  4, 234.3, 64, "hardware-corner"],

  // dev.to/rosgluk · RTX 4080 16 GB · i7-14700 · 64 GB DDR5-6000 · llama-cli
  // VRAM'e sığanlar (GPU yükü ~%95+)
  ["4080t", "qwen35_35b_a3b",    13.60,  "GB", 19, 136.4, 64, "rosgluk"],
  ["4080t", "qwen35_27b",        11.50,  "GB", 19,  45.3, 64, "rosgluk"],
  ["4080t", "gemma_4_26b_a4b_it",13.40,  "GB", 19, 121.7, 64, "rosgluk"],
  ["4080t", "glm_47_flash_reap", 12.60,  "GB", 19, 122.0, 64, "rosgluk"],
  // OFFLOAD: dosya VRAM'den büyük, katmanların bir kısmı CPU'da
  ["4080t", "glm_47_flash",      16.30,  "GB", 19,  91.8, 64, "rosgluk · offload"],
  ["4080t", "qwen35_122b_a10b",  44.70,  "GB", 19,  22.3, 64, "rosgluk · offload"],
  ["4080t", "gemma_4_31b_it",    11.80,  "GB", 19,  29.2, 64, "rosgluk · offload"],
  // OFFLOAD: 64K'da KV büyüyünce ağırlıklar RAM'e taşınıyor
  ["4080t", "qwen35_27b",        11.50,  "GB", 64,  22.7, 64, "rosgluk · offload"],
  ["4080t", "gemma_4_31b_it",    11.80,  "GB", 64,   8.1, 64, "rosgluk · offload"],
  ["4080t", "qwen35_122b_a10b",  44.70,  "GB", 64,  21.5, 64, "rosgluk · offload"],

  // OpenZeka · DGX Spark · NVFP4 · birleşik bellek, offload yok
  ["spark", "qwen36_27b",        16.12, "GiB",  4,  12.63, 0, "OpenZeka"],
  ["spark", "qwen38_flash_next",104.40, "GiB",  4,  16.8,  0, "OpenZeka"],
];

let toplamSapma = 0, kotu = 0;
const satirlar = [];
console.log("model                      cihaz  ctx   ölçülen    model    sapma   kaynak");
for (const [cid, mid, boyut, birim, ctxK, olculen, ram, kaynak] of OLCUMLER) {
  const cihaz = CIHAZ_HARITA[cid] || EK_CIHAZ[cid];
  const model = MODEL_HARITA[mid] || EK_MODEL[mid];
  if (!cihaz) { console.log(`  ${mid}: cihaz "${cid}" yok`); kotu++; continue; }
  if (!model) { console.log(`  model "${mid}" yok`); kotu++; continue; }

  // Dosya boyutundan bayt/parametre türet — kuantizasyon tahmin edilmesin.
  // Birim kaynağa göre değişiyor: hardware-corner sütunu açıkça "Size (GiB)",
  // rosgluk ise HF'nin ondalık GB'sini veriyor (Gemma 4 31B'de 11,8 GB = 10,99 GiB
  // + 3,75 GiB KV, makalenin bildirdiği 14,8 GiB VRAM'e birebir oturuyor).
  const gib = birim === "GB" ? boyut / GIB_GB : boyut;
  const quant = { id: "olcum", ad: "ölçülen dosya", bpp: (gib * GIB_GB) / model.tp, hizCarpani: 1 };

  const r = hesapla({
    model, quant, kvq: "fp16", ctxK, girdiK: 0.5, kullanici: 1, cikti: 256,
    cihaz, adet: 1, kvOran: 1, offloadModu: "otomatik", mtp: false, sistemRam: ram || null,
  });

  const tahmin = r.kullaniciTokS;
  const sapma = (tahmin - olculen) / olculen;
  toplamSapma += Math.abs(sapma);
  if (Math.abs(sapma) > 0.15) kotu++;
  const isaret = Math.abs(sapma) > 0.15 ? "✗" : Math.abs(sapma) > 0.08 ? "~" : "✓";
  const off = r.offload > 0.05 ? ` off ${r.offload.toFixed(1)}G` : "";
  satirlar.push(
    `${isaret} ${(model.ad || mid).padEnd(25)}${cid.padEnd(7)}${String(ctxK).padStart(3)}K` +
    `${olculen.toFixed(1).padStart(9)}${tahmin.toFixed(1).padStart(9)}${(sapma * 100).toFixed(0).padStart(7)}%   ${kaynak}${off}`
  );
}
console.log(satirlar.join("\n"));
const ort = (toplamSapma / OLCUMLER.length) * 100;
console.log(`\nortalama mutlak sapma %${ort.toFixed(1)} · %15'ten kötü: ${kotu}/${OLCUMLER.length}`);
console.log(`sabitler: tavan MBU cihazdan · sabit ek yük ${EK_YUK_SN * 1000} ms/token · MoE üssü ${MOE_US}`);
process.exit(kotu > 3 || ort > 15 ? 1 : 0);
