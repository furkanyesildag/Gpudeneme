import React from "react";
import { C, MONO, SANS, S, T, RADIUS } from "../theme.js";
import { mbuGeriHesapla } from "../kalibrasyon.js";

/* ------------------------------------------------------------------ */
/*  "KENDİ ÖLÇÜMÜNLE KALİBRE ET"                                       */
/*                                                                     */
/*  Aracın en zayıf varsayımı MBU. Kullanıcı kendi kurulumunda tek bir */
/*  ölçüm yapıp buraya girdiğinde, o cihazın MBU'sunu geri hesaplayıp  */
/*  saklıyoruz — sonraki tüm tahminler onun gerçeğine oturuyor.        */
/* ------------------------------------------------------------------ */

export default function Kalibrasyon({ cihaz, simHiz, sigar, kalibrasyon, uygula, sil }) {
  const [acik, setAcik] = React.useState(false);
  const [girdi, setGirdi] = React.useState("");

  const olculen = Number(String(girdi).replace(",", "."));
  const gecerli = Number.isFinite(olculen) && olculen > 0;
  const onizleme = gecerli && simHiz > 0 ? mbuGeriHesapla(simHiz, olculen, cihaz.mbu) : null;

  const kaydet = () => {
    if (!onizleme) return;
    uygula(cihaz.id, { mbu: onizleme.mbu, olculen });
    setGirdi("");
    setAcik(false);
  };

  return (
    <div style={{ marginTop: S.sm }}>
      {kalibrasyon ? (
        <div
          style={{
            background: C.okSoft, borderLeft: `3px solid ${C.ok}`, borderRadius: RADIUS.sm,
            padding: `${S.sm}px ${S.md}px`, display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: S.sm, flexWrap: "wrap",
          }}
        >
          <div style={{ ...T.mini, color: C.ink2, minWidth: 0 }}>
            <b style={{ color: C.ok }}>Kendi ölçümüne göre kalibre.</b>{" "}
            {kalibrasyon.olculen} tok/s girdin → MBU %{Math.round(kalibrasyon.mbu * 100)}
            {kalibrasyon.tarih ? ` · ${kalibrasyon.tarih}` : ""}. Bu karttaki tüm tahminler buna göre.
          </div>
          <button onClick={() => sil(cihaz.id)} style={kucukBtn}>Sıfırla</button>
        </div>
      ) : !acik ? (
        <button onClick={() => setAcik(true)} disabled={!sigar} style={{ ...kucukBtn, opacity: sigar ? 1 : 0.5 }}>
          Kendi ölçümünle kalibre et
        </button>
      ) : (
        <div style={{ background: C.paper2, border: `1px solid ${C.line2}`, borderRadius: RADIUS.sm, padding: `${S.sm}px ${S.md}px` }}>
          <div style={{ ...T.mini, color: C.ink2, marginBottom: S.sm }}>
            Bu kurulumu <b>kendi kartında</b> çalıştırıp ölçtüğün tok/s'yi yaz. Aracın bu
            karttaki bant genişliği varsayımını senin gerçeğine oturturum; sonraki tüm
            tahminler buna göre olur.
          </div>
          <div style={{ display: "flex", gap: S.sm, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="number" value={girdi} onChange={(e) => setGirdi(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && gecerli && kaydet()}
              placeholder={simHiz > 0 ? simHiz.toFixed(0) : "örn. 95"}
              aria-label="Ölçülen token/saniye"
              style={{
                width: 92, fontFamily: MONO, fontSize: 13, padding: "6px 8px",
                border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, background: C.paper, color: C.ink,
              }}
            />
            <span style={{ ...T.mini, color: C.ink3 }}>tok/s</span>
            <button onClick={kaydet} disabled={!onizleme} style={{ ...kucukBtn, background: onizleme ? C.steel : C.line, color: onizleme ? "#fff" : C.ink3, border: "none" }}>
              Uygula
            </button>
            <button onClick={() => { setAcik(false); setGirdi(""); }} style={kucukBtn}>Vazgeç</button>
          </div>
          {onizleme && (
            <div style={{ ...T.mini, color: onizleme.sinirda ? C.warn : C.ink3, marginTop: S.sm }}>
              {onizleme.sinirda
                ? `Bu ölçüm fiziksel sınırların dışında — MBU %${Math.round(onizleme.mbu * 100)}'e kırpıldı. Ölçümü ve birimi bir daha kontrol et (toplam verim değil, KULLANICI BAŞINA tok/s olmalı).`
                : `Şu an %${Math.round(cihaz.mbu * 100)} varsayıyorum; senin ölçümün %${Math.round(onizleme.mbu * 100)} ima ediyor (${(olculen / simHiz).toFixed(2)}× fark).`}
            </div>
          )}
          <div style={{ ...T.mini, color: C.ink3, marginTop: S.sm, borderTop: `1px solid ${C.line2}`, paddingTop: S.sm }}>
            Ölçerken: tek istek, sohbetin başında, aynı model ve aynı kuantizasyon.
            <b> Prompt işleme (prefill) hızını değil, üretim (decode) hızını</b> gir —
            llama.cpp bunu <code style={{ fontFamily: MONO }}>eval time</code>,
            vLLM <code style={{ fontFamily: MONO }}>output toks/s</code> olarak raporlar.
          </div>
        </div>
      )}
    </div>
  );
}

const kucukBtn = {
  fontFamily: SANS, fontSize: 11.5, padding: "5px 10px", borderRadius: RADIUS.sm,
  border: `1px solid ${C.line}`, background: C.paper, color: C.ink2, cursor: "pointer",
  whiteSpace: "nowrap",
};
