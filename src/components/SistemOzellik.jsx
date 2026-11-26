import React from "react";
import { C, S, T, RADIUS, RAKAMLAR } from "../theme.js";

/* ------------------------------------------------------------------ */
/*  HAZIR SUNUCU ÖZELLİKLERİ                                           */
/*                                                                     */
/*  Tek bir kart için "bellek · bant genişliği · watt" yeter. Hazır    */
/*  bir GPU sunucusu ise işlemcisi, RAM'i, ağ kartları, güç kaynağı,   */
/*  kasası ve garantisiyle alınır — satın alma kararında bunlar da     */
/*  masaya gelir. Veri devices.js'teki `sistem` alanından.             */
/* ------------------------------------------------------------------ */

const SATIRLAR = [
  ["GPU", null],
  ["İşlemci", "islemci"],
  ["Sistem RAM'i", "ram"],
  ["GPU bağlantısı", "nvlink"],
  ["Ağ", "ag"],
  ["Güç", "guc"],
  ["Kasa", "kasa"],
  ["Garanti", "garanti"],
  ["İşletim sistemi", "isletimSistemi"],
  ["Fiyat", "fiyatNotu"],
];

export default function SistemOzellik({ cihaz, baslik = "Sunucu özellikleri", kompakt = false }) {
  if (!cihaz?.sistem) return null;
  const g = cihaz.gpu;
  const gpuSatiri = g
    ? `${g.adet} × ${g.mem} GB HBM3e · GPU başına ${(g.bw / 1000).toLocaleString("tr")} TB/s · toplam ${(cihaz.mem / 1000).toLocaleString("tr", { maximumFractionDigits: 1 })} TB`
    : null;

  return (
    <div
      style={{
        marginTop: S.md, border: `1px solid ${C.line2}`, borderRadius: RADIUS.md,
        background: C.paper2, padding: `${S.sm + 2}px ${S.md}px`,
      }}
    >
      <div style={{ ...T.etiket, color: C.steel, marginBottom: S.sm }}>{baslik}</div>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: kompakt ? "1fr" : "max-content 1fr", columnGap: S.md, rowGap: kompakt ? 2 : S.xs }}>
        {SATIRLAR.map(([etiket, alan]) => {
          const deger = alan ? cihaz.sistem[alan] : gpuSatiri;
          if (!deger) return null;
          return (
            <React.Fragment key={etiket}>
              <dt style={{ ...T.mini, color: C.ink3, marginTop: kompakt ? S.xs : 0 }}>{etiket}</dt>
              <dd style={{ ...T.mini, color: C.ink2, margin: 0, ...(alan === null ? RAKAMLAR : {}), minWidth: 0 }}>
                {deger}
              </dd>
            </React.Fragment>
          );
        })}
      </dl>
    </div>
  );
}
