import React from "react";
import { C, MONO, SANS } from "../theme.js";

export function Etiket({ children, id }) {
  return (
    <div
      id={id}
      style={{
        fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.09em",
        textTransform: "uppercase", color: C.ink3, marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

export function Kutu({ children, style, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        background: C.paper, border: `1px solid ${C.line}`,
        borderRadius: 4, padding: 16, ...style,
      }}
    >
      {children}
    </div>
  );
}

export function BolumBasligi({ children, sag }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em", color: C.ink,
        borderBottom: `1px solid ${C.line}`, paddingBottom: 8, marginBottom: 14,
      }}
    >
      <span>{children}</span>
      {sag}
    </div>
  );
}

export function Sayac({ etiket, deger, birim, alt, renk, ipucu }) {
  return (
    <Kutu style={{ padding: "13px 15px" }} title={ipucu}>
      <Etiket>{etiket}</Etiket>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500, color: renk || C.ink, lineHeight: 1.1 }}>
          {deger}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: C.ink3 }}>{birim}</span>
      </div>
      {alt && <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, lineHeight: 1.4 }}>{alt}</div>}
    </Kutu>
  );
}

const BILDIRIM_RENK = {
  bilgi: [C.steel, C.steelSoft, "i"],
  olumlu: [C.ok, C.okSoft, "✓"],
  uyari: [C.warn, C.warnSoft, "!"],
  tehlike: [C.bad, C.badSoft, "×"],
};

export function Bildirim({ tip, baslik, metin, cocuk }) {
  const [renk, zemin, isaret] = BILDIRIM_RENK[tip] || BILDIRIM_RENK.bilgi;
  return (
    <div style={{ display: "flex", gap: 10, padding: "9px 11px", background: zemin, borderLeft: `3px solid ${renk}`, borderRadius: 2 }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, color: renk, fontSize: 13, lineHeight: 1.5, width: 14, flexShrink: 0, textAlign: "center" }} aria-hidden="true">
        {isaret}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{baslik}</div>
        <div style={{ fontSize: 12, color: C.ink2, lineHeight: 1.55 }}>{metin}</div>
        {cocuk}
      </div>
    </div>
  );
}

let sayac = 0;
const yeniId = () => `alan-${++sayac}`;

export function Secim({ etiket, deger, onChange, children, ipucu }) {
  const id = React.useMemo(yeniId, []);
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id}>
        <Etiket>{etiket}</Etiket>
      </label>
      <select
        id={id}
        title={ipucu}
        value={deger}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", fontFamily: SANS, fontSize: 13, padding: "7px 8px",
          border: `1px solid ${C.line}`, borderRadius: 3, background: C.paper, color: C.ink,
        }}
      >
        {children}
      </select>
    </div>
  );
}

export function Kaydirac({ etiket, deger, onChange, min, max, step, goster, alt, olcek }) {
  const id = React.useMemo(yeniId, []);
  // olcek: "log" → kaydırağı logaritmik yap (bağlam gibi geniş aralıklar için)
  const logMod = olcek === "log";
  const toSlider = (v) => (logMod ? Math.log(v) : v);
  const fromSlider = (v) => (logMod ? Math.exp(v) : v);
  const yuvarla = (v) => {
    if (!logMod) return v;
    // Okunur değerlere yapış: 4,8,16,32,64,128,256,512,1024...
    const adaylar = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 2048, 4096];
    return adaylar.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <label htmlFor={id}>
          <Etiket>{etiket}</Etiket>
        </label>
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.steel, fontWeight: 500, whiteSpace: "nowrap" }}>
          {goster}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={toSlider(min)}
        max={toSlider(max)}
        step={logMod ? 0.01 : step}
        value={toSlider(deger)}
        onChange={(e) => onChange(yuvarla(fromSlider(Number(e.target.value))))}
        style={{ width: "100%", accentColor: "var(--steel)" }}
      />
      {alt && <div style={{ fontSize: 11, color: C.ink3, marginTop: 2, lineHeight: 1.45 }}>{alt}</div>}
    </div>
  );
}

export function Onay({ etiket, aciklama, isaretli, onChange, renk = C.ok }) {
  return (
    <label
      style={{
        display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer",
        padding: "9px 10px", background: isaretli ? C.okSoft : C.wash,
        border: `1px solid ${isaretli ? renk : C.line2}`, borderRadius: 3,
      }}
    >
      <input
        type="checkbox"
        checked={isaretli}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: "var(--ok)", flexShrink: 0 }}
      />
      <span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{etiket}</span>
        {aciklama && (
          <span style={{ display: "block", fontSize: 11.5, color: C.ink2, marginTop: 2, lineHeight: 1.45 }}>
            {aciklama}
          </span>
        )}
      </span>
    </label>
  );
}

export function Rozet({ children, renk = C.steel, zemin = C.steelSoft, baslik }) {
  return (
    <span
      title={baslik}
      style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: "0.04em", color: renk,
        background: zemin, border: `1px solid ${renk}33`, borderRadius: 3,
        padding: "2px 5px", whiteSpace: "nowrap", display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

export function Dugme({ children, onClick, tur = "ikincil", style, ...rest }) {
  const stiller = {
    birincil: { background: C.steel, color: "#fff", border: "none" },
    ikincil: { background: C.paper, color: C.ink, border: `1px solid ${C.line}` },
    sade: { background: "transparent", color: C.ink3, border: "none" },
  };
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        fontFamily: SANS, fontSize: 12.5, fontWeight: tur === "birincil" ? 600 : 500,
        borderRadius: 3, padding: "7px 12px", cursor: "pointer",
        ...stiller[tur], ...style,
      }}
    >
      {children}
    </button>
  );
}
