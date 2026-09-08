import React from "react";
import { C, MONO, S, T, RADIUS } from "../theme.js";
import { Bolum, Aciklama } from "../components/ui.jsx";
import { KAVRAMLAR } from "../data/concepts.js";
import { MODELS } from "../data/models.js";
import { DEVICES } from "../data/devices.js";
import { ELEKTRIK_TL_KWH } from "../engine.js";

/* Kavramlar, varsayımlar ve veri güveni — sayfanın "neden böyle" bölümü. */

const VARSAYIMLAR = [
  ["KV cache", "Her modelin katman geometrisi HuggingFace config.json'undan okundu: kaç katman KV tutuyor, kaçı sliding window, MLA mı GQA mı. Lineer/Mamba katmanları bağlamla büyüyen KV tutmadığı için sayılmaz — Qwen3.5+, GLM-5.3-Flash ve Nemotron-H'de KV bu yüzden çok düşük çıkar."],
  ["Decode hızı", "Bellek bant genişliği sınırlı kabul edilir. Adım başına okunan bayt = aktif ağırlık + batch'teki KV cache × 0,55. Gerçekleşen bant genişliği kullanımı (MBU) cihaza göre %50-74."],
  ["Seyrek MoE cezası", "MoE'de her token farklı uzmanları uyandırır; erişim dağınık olduğu için gerçekleşen bant genişliği düşer. Etki LPDDR birleşik bellekte ağır, HBM'de hafiftir. Katsayı, DGX Spark üzerinde yayımlanmış dense ve seyrek ölçüm çiftinden kalibre edildi."],
  ["İlk token", "Prefill hesap sınırlı kabul edilir, hesap verimi %42, girdi olarak prompt uzunluğu alınır (bağlam penceresi değil). Yoğun anda her ek kullanıcı için %62 kuyruk gecikmesi eklenir. Prefix caching açıksa gerçek prompt çok daha kısadır."],
  ["Kapasite", "Maks. C, hem hız hem ilk token hedefinin tutulduğu en yüksek eşzamanlı istek sayısıdır (ikili aramayla bulunur). Sohbet ve ajan kapasitesi bunun kullanım çarpanlarıyla çarpımıdır — çarpanlar davranış varsayımıdır, ölçüm değil."],
  ["Interconnect", "Tensor parallelism (TP) verimi NVLink %86, aynı kasada PCIe %60, ağ/USB4 üzerinden %33. Spark ve Mac kümelerinin düşük çıkması bu yüzdendir."],
  ["Bellek payı", "Birleşik bellekli kutularda %12, ayrık kartlarda %6 sistem payı düşülür. Çalışma zamanı için ayrıca 1,2 GB + ağırlığın %5'i + cihaz başına 0,35 GB ayrılır."],
  ["Ana sistem", "Ayrık kartlara, onları çalıştıracak bilgisayarın maliyeti ve gücü eklenir; kart sayısına göre basamaklıdır (masaüstü → çok yuvalı iş istasyonu → sunucu şasisi)."],
  ["Offload", "VRAM'e sığmayan ağırlıkların host RAM'de tutulan kısmı her adımda PCIe üzerinden okunur; süre, VRAM'den okunan bayt ile RAM'den okunan baytın ayrı ayrı sürelerinin toplamıdır. Model KÖR offload varsayar (taşınan ağırlıklar payları oranında okunur) — akıllı yerleştirme daha iyi sonuç verir, dolayısıyla bu bir alt sınırdır. KV cache offload edilmez: her adımda tamamı taranır."],
  ["Speculative decoding (MTP)", "MTP head'i olan modellerde her adımda bir taslak token daha üretilir ve aynı ağırlık okumasıyla doğrulanır; hızlanma = 1 + kabul_oranı, varsayılan kabul 0,5. Yalnızca decode'u etkiler, ilk token'ı değil. Hangi modelde head olduğu config.json'dan okundu, tahmin edilmedi."],
];

const GUVEN = [
  ["olumlu", "✓ Doğrudan kaynaktan", `Model parametre sayıları HuggingFace safetensors üstverisinden; katman sayısı, attention head sayısı, KV geometrisi, bağlam ve lisans config.json'dan programatik olarak çekildi. ${MODELS.length} deponun hepsi tek tek doğrulandı.`],
  ["olumlu", "✓ Üretici belirtimi", `${DEVICES.length} donanımın belleği, bant genişliği, TDP'si ve mimarisi üretici belirtimlerinden. Bant genişlikleri veri yolu genişliği × bellek hızından çapraz doğrulandı.`],
  ["uyari", "≈ Mühendislik tahmini", "MBU (%50-74), prefill verimi (%42), KV okuma katsayısı (0,55), MoE ceza üssü, tensor parallelism verimleri ve TFLOPS değerleri. Büyüklük mertebesi ve göreli fark doğrudur, spec-kesin değildir."],
  ["tehlike", "$ Yaklaşık ve oynak", "Fiyatlar. TL değerleri Eylül 2026 Türkiye perakende gözlemidir ve kurla, stokla, satıcıyla değişir. Satın alma öncesi canlı teklif alın — bütçeyi bu sayılara kilitlemeyin."],
];

const SINIRLAR =
  "DGX Station GB300 katmanlı bellektir (496 GB LPDDR5X + 252 GB HBM3e); tek bant genişliği değeri ortalamadır. " +
  "A100 ve Ampere kartlarda FP8 yoktur — TFLOPS sütunu FP16 değeridir. Llama 4 ve bazı depolar kapalıdır (gated), " +
  "config'leri okunamadığı için KV geometrisi model kartından alınmıştır. TFLOPS yalnızca ilk-token tahmininde " +
  "kullanılır; bellek ve token hızı sonuçlarını etkilemez. Simülatör ağırlıkların sistem RAM'ine taşınmasını " +
  "(offload) ve speculative decodingyi (MTP/EAGLE) modellemez — ikisi de gerçekte sonucu iyileştirir.";

export default function Bilgi() {
  const [kavramAcik, setKavramAcik] = React.useState(true);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: S.md }}>
      <Bolum
        baslik="Kavramlar, çok basitçe"
        aciklama="Kuantizasyon, KV cache, MoE, MLA… hepsi gündelik benzetmelerle"
        sag={
          <button
            onClick={() => setKavramAcik((v) => !v)}
            style={{
              fontFamily: MONO, fontSize: 11.5, color: C.steel, border: `1px solid ${C.line}`,
              borderRadius: RADIUS.sm, padding: "4px 9px", background: C.paper, cursor: "pointer",
            }}
          >
            {kavramAcik ? "gizle −" : "göster +"}
          </button>
        }
      >
        {kavramAcik && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: S.md }}>
            {KAVRAMLAR.map((k) => (
              <div key={k.ad} style={{ background: C.paper2, border: `1px solid ${C.line2}`, borderRadius: RADIUS.sm, padding: `${S.md}px ${S.md}px` }}>
                <div style={{ ...T.kucuk, fontWeight: 600, color: C.ink, marginBottom: 3 }}>{k.ad}</div>
                <div style={{ ...T.mini, color: C.steel, fontStyle: "italic", marginBottom: 5 }}>{k.benzet}</div>
                <div style={{ ...T.mini, color: C.ink2 }}>{k.ozet}</div>
              </div>
            ))}
          </div>
        )}
      </Bolum>

      <Bolum baslik="Modelin varsayımları" aciklama="Hangi sayı nasıl üretiliyor">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: `${S.md}px ${S.xl}px` }}>
          {VARSAYIMLAR.map(([ad, metin]) => (
            <div key={ad}>
              <div style={{ ...T.kucuk, fontWeight: 600, color: C.ink, marginBottom: 3 }}>{ad}</div>
              <div style={{ ...T.mini, color: C.ink2 }}>{metin}</div>
            </div>
          ))}
        </div>
        <Aciklama style={{ paddingTop: S.md, borderTop: `1px solid ${C.line2}` }}>
          Bu bir planlama aracıdır, ölçüm değildir. Sonuçlar büyüklük mertebesini ve donanımlar arası
          göreli farkı doğru gösterir; satın alma öncesinde seçilen kurulumun gerçek yükle
          kıyaslanması gerekir. Elektrik {ELEKTRIK_TL_KWH} TL/kWh, 7/24 tam yük varsayımıyla.
        </Aciklama>
      </Bolum>

      <Bolum baslik="Veri güveni" aciklama="Son doğrulama: 4 Eylül 2026">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: `${S.md}px ${S.xl}px` }}>
          {GUVEN.map(([tip, ad, metin]) => {
            const renk = tip === "olumlu" ? C.ok : tip === "uyari" ? C.warn : C.bad;
            return (
              <div key={ad}>
                <div style={{ ...T.kucuk, fontWeight: 600, color: renk, marginBottom: 3 }}>{ad}</div>
                <div style={{ ...T.mini, color: C.ink2 }}>{metin}</div>
              </div>
            );
          })}
        </div>
        <Aciklama style={{ paddingTop: S.md, borderTop: `1px solid ${C.line2}` }}>
          <b style={{ color: C.ink2 }}>Bilinen sınırlar: </b>{SINIRLAR}
        </Aciklama>
      </Bolum>
    </div>
  );
}
