import React from "react";
import { C, S, T, RADIUS, DURUM } from "../theme.js";
import { Kart, Dugme, Rozet, Aciklama } from "../components/ui.jsx";
import { BANTLAR, BANT_UYARISI, FIYAT_TEMELI } from "../data/bantlar.js";
import { hesapla, kapasite, gb, sureYazi } from "../engine.js";
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
          ...T.mini, fontWeight: 600, color: renk || C.ink3, width: 70,
          flexShrink: 0,
        }}
      >
        {etiket}
      </span>
      <span style={{ ...T.kucuk, color: C.ink2, minWidth: 0 }}>{children}</span>
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
                  padding: `${S.lg}px ${S.lg + 2}px ${S.md}px`, minHeight: 124,
                  background: seciliMi ? C.steelSoft : C.paper,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: S.sm, marginBottom: S.xs, flexWrap: "wrap" }}>
                  <span
                    style={{
                      ...T.sayi, fontSize: 13, width: 24, height: 24, lineHeight: "24px",
                      textAlign: "center", borderRadius: RADIUS.sm + 1, flexShrink: 0,
                      background: vRenk, color: C.onAccent,
                    }}
                  >
                    {b.no}
                  </span>
                  <span style={{ ...T.altBaslik, color: C.ink, minWidth: 0 }}>{b.ad}</span>
                  {b.onerilen && <Rozet tip="olumlu">önerilen</Rozet>}
                  {seciliMi && <Rozet tip="bilgi">yüklü</Rozet>}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ ...T.sayi, fontSize: 17, color: C.ink }}>{b.fiyat}</span>
                  {b.fiyatTemeli && (
                    <span
                      title={FIYAT_TEMELI[b.fiyatTemeli]}
                      style={{ ...T.mini, fontSize: 11, color: C.ink3, background: C.wash, borderRadius: RADIUS.hap, padding: "1px 8px", cursor: "help" }}
                    >
                      {b.fiyatTemeli}
                    </span>
                  )}
                </div>
                <div style={{ ...T.kucuk, color: C.ink2, marginTop: 4 }}>{b.ozet}</div>
              </div>

              {/* simülatörün kendi hesabı */}
              <div
                style={{
                  display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: S.sm,
                  padding: `${S.sm + 2}px ${S.lg + 2}px`, background: C.paper2,
                  borderTop: `1px solid ${C.line2}`, borderBottom: `1px solid ${C.line2}`, ...T.mini,
                }}
              >
                {[
                  ["Bellek", `${gb(r.gerekliGB)}/${gb(r.toplamBellek)} GB`, r.sigar ? C.ok : C.bad],
                  ["Hız", `${r.kullaniciTokS.toFixed(0)} tok/s`, C.ink],
                  ["İlk token", sureYazi(r.ttftYogun), C.ink],
                  k.sohbet
                    ? ["Sohbet", `${k.sohbet} kişi`, C.ok]
                    : ["Sohbet", k.sebep === "bellek" ? "sığmıyor" : k.sebep === "hiz" ? "hız < hedef" : "TTFT > hedef", C.warn,
                       k.sebep === "ttft"
                         ? `Bu bandın ilk token süresi senin hedefini (${hedef.ttftMs} ms) aşıyor; hedef gevşerse kapasite görünür.`
                         : k.sebep === "hiz"
                         ? `Bu bant tek istekte bile senin hız hedefine (${hedef.tps} tok/s) ulaşmıyor.`
                         : "Bu bant mevcut iş yükü ayarlarında belleğe sığmıyor."],
                ].map(([ad, v, renk, ipucu]) => (
                  <span key={ad} title={ipucu} style={{ display: "inline-flex", flexDirection: "column", cursor: ipucu ? "help" : undefined }}>
                    <span style={{ ...T.mini, color: C.ink3 }}>{ad}</span>
                    <span style={{ ...T.sayi, fontSize: 13.5, color: renk }}>{v}</span>
                  </span>
                ))}
              </div>

              {/* anlatı */}
              <div style={{ padding: `${S.md + 2}px ${S.lg + 2}px`, flex: 1 }}>
                <Satir etiket="Ne">{b.ne}</Satir>
                <Satir etiket="Tek kişi">{b.tekKullanici}</Satir>
                <Satir etiket="Ekip">{b.ekip}</Satir>
                <Satir etiket="Kime">{b.kime}</Satir>
                <Satir etiket="Tıkanma" renk={C.warn}>{b.tikanma}</Satir>
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

              <div style={{ padding: `${S.xs}px ${S.lg + 2}px ${S.lg}px` }}>
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
