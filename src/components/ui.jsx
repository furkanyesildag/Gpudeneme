import React from "react";
import { C, MONO, SANS, S, T, RADIUS, GOLGE, DURUM } from "../theme.js";

/* ------------------------------------------------------------------ */
/*  TEMEL YÜZEYLER                                                     */
/* ------------------------------------------------------------------ */

export function Kart({ children, style, vurgu, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        background: C.paper,
        border: `1px solid ${vurgu || C.line}`,
        borderRadius: RADIUS.lg,
        boxShadow: GOLGE.hafif,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Başlıklı kart — sayfadaki her büyük blok bunu kullanır, ritim böyle tutar. */
export function Bolum({ baslik, aciklama, sag, children, style, ic = true }) {
  return (
    <Kart style={{ overflow: "hidden", ...style }}>
      {(baslik || sag) && (
        <div
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-end",
            gap: S.md, padding: `${S.md}px ${S.lg}px`, flexWrap: "wrap",
            borderBottom: `1px solid ${C.line2}`, background: C.paper2,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ ...T.altBaslik, margin: 0, color: C.ink }}>{baslik}</h2>
            {aciklama && (
              <div style={{ ...T.mini, color: C.ink3, marginTop: 3 }}>{aciklama}</div>
            )}
          </div>
          {sag && <div style={{ display: "flex", gap: S.sm, flexWrap: "wrap" }}>{sag}</div>}
        </div>
      )}
      <div style={ic ? { padding: S.lg } : undefined}>{children}</div>
    </Kart>
  );
}

export function Etiket({ children, style }) {
  return <div style={{ ...T.etiket, color: C.ink3, ...style }}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  SAYI GÖSTERİMİ                                                     */
/* ------------------------------------------------------------------ */

/** Tek bir ölçüm. `boy` ile öne çıkarılır: "dev" başlıca sonuç, "orta" normal. */
export function Olcum({ etiket, deger, birim, alt, renk, boy = "orta", ipucu }) {
  const boyut = boy === "dev" ? 32 : boy === "kucuk" ? 18 : 23;
  return (
    <div title={ipucu} style={{ minWidth: 0 }}>
      <div style={{ ...T.etiket, color: C.ink3, marginBottom: S.xs }}>{etiket}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
        <span style={{ ...T.sayi, fontSize: boyut, color: renk || C.ink, lineHeight: 1.05 }}>
          {deger}
        </span>
        {birim && (
          <span style={{ fontFamily: MONO, fontSize: boy === "dev" ? 13 : 11.5, color: C.ink3 }}>
            {birim}
          </span>
        )}
      </div>
      {alt && <div style={{ ...T.mini, color: C.ink3, marginTop: S.xs }}>{alt}</div>}
    </div>
  );
}

/** Ölçümleri konu başlığı altında gruplar — 8 serbest kutu yerine 3 küme. */
export function OlcumGrubu({ baslik, children, sutun = 3 }) {
  return (
    <div>
      <div
        style={{
          ...T.etiket, color: C.ink3, paddingBottom: S.sm, marginBottom: S.md,
          borderBottom: `1px solid ${C.line2}`,
        }}
      >
        {baslik}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${sutun >= 3 ? 118 : 140}px, 1fr))`,
          gap: `${S.lg}px ${S.md}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GERİ BİLDİRİM                                                      */
/* ------------------------------------------------------------------ */

const ISARET = { bilgi: "i", olumlu: "✓", uyari: "!", tehlike: "×" };

export function Bildirim({ tip, baslik, metin }) {
  const [renk, zemin] = DURUM[tip] || DURUM.bilgi;
  return (
    <div
      style={{
        display: "flex", gap: S.sm + 2, padding: `${S.sm + 2}px ${S.md}px`,
        background: zemin, borderLeft: `3px solid ${renk}`, borderRadius: RADIUS.sm,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: MONO, fontWeight: 700, color: renk, fontSize: 12.5,
          lineHeight: 1.55, width: 13, flexShrink: 0, textAlign: "center",
        }}
      >
        {ISARET[tip]}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...T.kucuk, fontWeight: 600, color: C.ink, marginBottom: 1 }}>{baslik}</div>
        <div style={{ ...T.kucuk, color: C.ink2 }}>{metin}</div>
      </div>
    </div>
  );
}

export function Rozet({ children, tip = "bilgi", baslik, style }) {
  const [renk, zemin] = DURUM[tip] || DURUM.bilgi;
  return (
    <span
      title={baslik}
      style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: "0.03em", color: renk,
        background: zemin, border: `1px solid ${renk}30`, borderRadius: RADIUS.sm,
        padding: "2px 6px", whiteSpace: "nowrap", display: "inline-block", ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  GİRDİLER                                                           */
/* ------------------------------------------------------------------ */

let sayac = 0;
const yeniId = () => `alan-${++sayac}`;

const girdiStil = {
  width: "100%", fontFamily: SANS, fontSize: 13, padding: "8px 9px",
  border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
  background: C.paper, color: C.ink,
};

export function Secim({ etiket, deger, onChange, children, ipucu, alt }) {
  const id = React.useMemo(yeniId, []);
  return (
    <div style={{ marginBottom: S.md }}>
      <label htmlFor={id} style={{ display: "block", marginBottom: S.xs + 1 }}>
        <span style={{ ...T.mini, color: C.ink2, fontWeight: 500 }}>{etiket}</span>
      </label>
      <select id={id} title={ipucu} value={deger} onChange={(e) => onChange(e.target.value)} style={girdiStil}>
        {children}
      </select>
      {alt && <div style={{ ...T.mini, color: C.ink3, marginTop: S.xs }}>{alt}</div>}
    </div>
  );
}

export function Kaydirac({ etiket, deger, onChange, min, max, step, goster, alt, olcek }) {
  const id = React.useMemo(yeniId, []);
  const logMod = olcek === "log";
  const YAPIS = [1, 2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 2048, 4096];
  const toSlider = (v) => (logMod ? Math.log(Math.max(min, v)) : v);
  const fromSlider = (v) => {
    if (!logMod) return v;
    const ham = Math.exp(v);
    return YAPIS.filter((x) => x >= min && x <= max)
      .reduce((a, b) => (Math.abs(b - ham) < Math.abs(a - ham) ? b : a));
  };
  return (
    <div style={{ marginBottom: S.md }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: S.sm, marginBottom: S.xs }}>
        <label htmlFor={id}>
          <span style={{ ...T.mini, color: C.ink2, fontWeight: 500 }}>{etiket}</span>
        </label>
        <span style={{ ...T.sayi, fontSize: 12.5, color: C.steel, whiteSpace: "nowrap" }}>{goster}</span>
      </div>
      <input
        id={id} type="range"
        min={toSlider(min)} max={toSlider(max)} step={logMod ? 0.01 : step}
        value={toSlider(deger)}
        onChange={(e) => onChange(fromSlider(Number(e.target.value)))}
        style={{ width: "100%", accentColor: "var(--steel)", display: "block" }}
      />
      {alt && <div style={{ ...T.mini, color: C.ink3, marginTop: S.xs }}>{alt}</div>}
    </div>
  );
}

export function Onay({ etiket, aciklama, isaretli, onChange }) {
  return (
    <label
      style={{
        display: "flex", alignItems: "flex-start", gap: S.sm, cursor: "pointer",
        padding: `${S.sm + 2}px ${S.md}px`,
        background: isaretli ? C.okSoft : C.paper2,
        border: `1px solid ${isaretli ? C.ok : C.line2}`,
        borderRadius: RADIUS.sm,
      }}
    >
      <input
        type="checkbox" checked={isaretli}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: "var(--ok)", flexShrink: 0 }}
      />
      <span>
        <span style={{ ...T.kucuk, fontWeight: 600, color: C.ink }}>{etiket}</span>
        {aciklama && (
          <span style={{ display: "block", ...T.mini, color: C.ink2, marginTop: 2 }}>{aciklama}</span>
        )}
      </span>
    </label>
  );
}

export function Dugme({ children, onClick, tur = "ikincil", boy = "orta", style, ...rest }) {
  const turler = {
    birincil: { background: C.steel, color: "#fff", border: "1px solid transparent" },
    ikincil: { background: C.paper, color: C.ink, border: `1px solid ${C.line}` },
    sade: { background: "transparent", color: C.ink3, border: "1px solid transparent" },
  };
  const boylar = {
    kucuk: { fontSize: 11.5, padding: "4px 9px" },
    orta: { fontSize: 12.5, padding: "7px 13px" },
    buyuk: { fontSize: 13.5, padding: "9px 17px" },
  };
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        fontFamily: SANS, fontWeight: tur === "birincil" ? 600 : 500,
        borderRadius: RADIUS.sm, cursor: "pointer", whiteSpace: "nowrap",
        ...turler[tur], ...boylar[boy], ...style,
      }}
    >
      {children}
    </button>
  );
}

/** Küçük açılır liste — tablo başlıklarındaki sıralama/filtre kontrolleri. */
export function MiniSecim({ deger, onChange, children, etiket }) {
  return (
    <select
      aria-label={etiket}
      value={deger}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontFamily: SANS, fontSize: 11.5, padding: "5px 7px",
        border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
        background: C.paper, color: C.ink,
      }}
    >
      {children}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  SEKMELER                                                           */
/* ------------------------------------------------------------------ */

export function Sekmeler({ sekmeler, aktif, onChange }) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex", gap: S.xs, overflowX: "auto", padding: `0 0 ${S.xs}px`,
        borderBottom: `1px solid ${C.line}`, marginBottom: S.lg,
      }}
    >
      {sekmeler.map((s) => {
        const secili = s.k === aktif;
        return (
          <button
            key={s.k}
            role="tab"
            aria-selected={secili}
            onClick={() => onChange(s.k)}
            style={{
              fontFamily: SANS, fontSize: 13, fontWeight: secili ? 600 : 500,
              padding: "9px 14px", cursor: "pointer", whiteSpace: "nowrap",
              background: "transparent", border: "none",
              color: secili ? C.ink : C.ink3,
              borderBottom: `2px solid ${secili ? C.steel : "transparent"}`,
              marginBottom: -5,
            }}
          >
            {s.ad}
            {s.rozet != null && (
              <span
                style={{
                  ...T.sayi, fontSize: 10.5, marginLeft: 6, padding: "1px 5px",
                  borderRadius: RADIUS.hap, background: secili ? C.steelSoft : C.wash,
                  color: secili ? C.steel : C.ink3,
                }}
              >
                {s.rozet}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TABLO PARÇALARI                                                    */
/* ------------------------------------------------------------------ */

export const thStil = {
  padding: `${S.sm}px ${S.sm + 2}px`, fontFamily: MONO, fontSize: 10,
  letterSpacing: "0.06em", textTransform: "uppercase", color: C.ink3,
  fontWeight: 500, whiteSpace: "nowrap",
};

export const tdStil = {
  padding: `${S.sm}px ${S.sm + 2}px`, fontFamily: MONO, fontSize: 12.5,
  whiteSpace: "nowrap",
};

export function TabloSarici({ children, yukseklik }) {
  return (
    <div style={{ overflowX: "auto", maxHeight: yukseklik, overflowY: yukseklik ? "auto" : undefined }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>{children}</table>
    </div>
  );
}

export function Aciklama({ children, style }) {
  return (
    <div style={{ ...T.mini, color: C.ink3, marginTop: S.md, ...style }}>{children}</div>
  );
}
