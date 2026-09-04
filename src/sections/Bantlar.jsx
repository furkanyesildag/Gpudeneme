import React from "react";
import { C, MONO, S, T, RADIUS, DURUM } from "../theme.js";
import { Kart, Dugme, Rozet, Aciklama } from "../components/ui.jsx";
import { BANTLAR, BANT_UYARISI } from "../data/bantlar.js";
import { hesapla, kapasite, gb, sureYazi, paraTL } from "../engine.js";
import { MODEL_HARITA } from "../data/models.js";
import { CIHAZ_HARITA } from "../data/devices.js";

/* ------------------------------------------------------------------ */
/*  SATIN ALMA BANTLARI                                                */
/*                                                                     */
/*  Simülatör "sığar mı, ne kadar hızlı" der. Bantlar ondan sonraki    */
/*  soruyu cevaplar: bu para bandında ne alınır, nerede tıkanır.       */
/*  Her kartta hem anlatı hem de simülatörün kendi hesabı var — ikisi  */
/*  ayrılıyorsa bu, bilinçli olarak görünür bırakıldı.                 */
/* ------------------------------------------------------------------ */

function Satir({ etiket, children, renk }) {
  if (!children) return null;
  return (
    <div style={{ display: "flex", gap: S.sm, marginBottom: S.sm }}>
      <span
        style={{
          ...T.etiket, fontSize: 9.5, color: renk || C.ink3, width: 74,
          flexShrink: 0, paddingTop: 2,
        }}
      >
        {etiket}
      </span>
      <span style={{ ...T.mini, color: C.ink2, minWidth: 0 }}>{children}</span>
    </div>
  );
}

export default function Bantlar({ hedef, kvOran, yukle, aktifAyar }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: S.md }}>
        {BANTLAR.map((b) => {
          const model = MODEL_HARITA[b.ayar.modelId];
          const cihaz = CIHAZ_HARITA[b.ayar.cihazId];
          const r = hesapla({ ...b.ayar, model, cihaz, kvOran });
          const { kullanici: _y, ...taban } = b.ayar;
          const k = kapasite({ ...taban, model, cihaz, kvOran }, hedef);
          const [vRenk] = DURUM[b.renk === "ok" ? "olumlu" : b.renk === "warn" ? "uyari" : "bilgi"];
          const seciliMi =
            aktifAyar &&
            aktifAyar.modelId === b.ayar.modelId &&
            aktifAyar.cihazId === b.ayar.cihazId &&
            aktifAyar.adet === b.ayar.adet;

          return (
            <Kart
              key={b.no}
              vurgu={seciliMi ? C.steel : b.onerilen ? C.ok : C.line}
              style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              {/* başlık */}
              <div
                style={{
                  padding: `${S.md}px ${S.lg}px`, minHeight: 118,
                  background: seciliMi ? C.steelSoft : C.paper2,
                  borderBottom: `1px solid ${C.line2}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: S.sm, marginBottom: S.xs, flexWrap: "wrap" }}>
                  <span
                    style={{
                      ...T.sayi, fontSize: 15, width: 26, height: 26, lineHeight: "25px",
                      textAlign: "center", borderRadius: "50%", flexShrink: 0,
                      background: vRenk, color: "#fff",
                    }}
                  >
                    {b.no}
                  </span>
                  <span style={{ ...T.altBaslik, color: C.ink, minWidth: 0 }}>{b.ad}</span>
                  {b.onerilen && <Rozet tip="olumlu">önerilen</Rozet>}
                  {seciliMi && <Rozet tip="bilgi">yüklü</Rozet>}
                </div>
                <div style={{ ...T.sayi, fontSize: 14, color: vRenk }}>{b.fiyat}</div>
                <div style={{ ...T.mini, color: C.ink2, marginTop: 3 }}>{b.ozet}</div>
              </div>

              {/* simülatörün kendi hesabı */}
              <div
                style={{
                  display: "flex", gap: S.md, flexWrap: "wrap", padding: `${S.sm}px ${S.lg}px`,
                  background: C.paper, borderBottom: `1px solid ${C.line2}`, ...T.mini,
                }}
              >
                {[
                  ["bellek", `${gb(r.gerekliGB)}/${gb(r.toplamBellek)} GB`, r.sigar ? C.ok : C.bad],
                  ["hız", `${r.kullaniciTokS.toFixed(0)} tok/s`, C.ink],
                  ["ilk token", sureYazi(r.ttftYogun), C.ink],
                  ["sohbet", `${k.sohbet} kişi`, k.sohbet ? C.ok : C.bad],
                ].map(([ad, v, renk]) => (
                  <span key={ad} style={{ display: "inline-flex", flexDirection: "column" }}>
                    <span style={{ ...T.etiket, fontSize: 9, color: C.ink3 }}>{ad}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: renk }}>{v}</span>
                  </span>
                ))}
              </div>

              {/* anlatı */}
              <div style={{ padding: `${S.md}px ${S.lg}px`, flex: 1 }}>
                <Satir etiket="ne">{b.ne}</Satir>
                <Satir etiket="tek kişi">{b.tekKullanici}</Satir>
                <Satir etiket="ekip">{b.ekip}</Satir>
                <Satir etiket="kime">{b.kime}</Satir>
                <Satir etiket="tıkanma" renk={C.warn}>{b.tikanma}</Satir>
                {b.ilginc && (
                  <div
                    style={{
                      ...T.mini, color: C.ink2, background: C.steelSoft,
                      borderLeft: `3px solid ${C.steel}`, borderRadius: RADIUS.sm,
                      padding: `${S.sm}px ${S.md}px`, marginTop: S.sm,
                    }}
                  >
                    <b style={{ color: C.steel }}>İlginç detay: </b>{b.ilginc}
                  </div>
                )}
              </div>

              <div style={{ padding: `${S.sm}px ${S.lg}px ${S.md}px` }}>
                <Dugme tur={b.onerilen ? "birincil" : "ikincil"} onClick={() => yukle(b.ayar)} style={{ width: "100%" }}>
                  Bu bandı simülatöre yükle
                </Dugme>
              </div>
            </Kart>
          );
        })}
      </div>

      <Aciklama style={{ marginTop: S.lg }}>
        <b style={{ color: C.ink2 }}>Simülatörün göremediği şeyler: </b>{BANT_UYARISI}
      </Aciklama>
    </div>
  );
}
