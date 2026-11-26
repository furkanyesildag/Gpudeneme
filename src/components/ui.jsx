import React from "react";
import { C, MONO, SANS, S, T, RADIUS, GOLGE, DURUM, RAKAMLAR } from "../theme.js";

/* ------------------------------------------------------------------ */
/*  TEMEL YÜZEYLER                                                     */
/* ------------------------------------------------------------------ */

export const Kart = React.forwardRef(function Kart({ children, style, vurgu, ...rest }, ref) {
  return (
    <div
      ref={ref}
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
});

/** Başlıklı kart — sayfadaki her büyük blok bunu kullanır, ritim böyle tutar. */
export function Bolum({ baslik, aciklama, sag, children, style, ic = true }) {
  return (
    <Kart style={{ overflow: "hidden", ...style }}>
      {(baslik || sag) && (
        <div
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            gap: S.md, padding: `${S.lg}px ${S.lg + 4}px`, flexWrap: "wrap",
            borderBottom: `1px solid ${C.line2}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ ...T.altBaslik, margin: 0, color: C.ink }}>{baslik}</h2>
            {aciklama && (
              <div style={{ ...T.mini, color: C.ink3, marginTop: 3 }}>{aciklama}</div>
            )}
          </div>
          {sag && <div style={{ display: "flex", gap: S.sm, flexWrap: "wrap", alignItems: "center" }}>{sag}</div>}
        </div>
      )}
      <div style={ic ? { padding: `${S.lg}px ${S.lg + 4}px` } : undefined}>{children}</div>
    </Kart>
  );
}

let sayac = 0;
const yeniId = () => `alan-${++sayac}`;

/** Katlanabilir panel — yan menüdeki kontrol grupları. İçerik kapalıyken
    DOM'da kalır (yalnızca gizlenir), böylece seçimler ve testler bozulmaz. */
export function Panel({ baslik, ozet, simge, acikBaslangic = true, children }) {
  const [acik, setAcik] = React.useState(acikBaslangic);
  const id = React.useMemo(yeniId, []);
  return (
    <Kart style={{ overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        aria-expanded={acik}
        aria-controls={id}
        style={{
          all: "unset", boxSizing: "border-box", width: "100%", cursor: "pointer",
          display: "flex", alignItems: "center", gap: S.md,
          padding: `${S.md + 2}px ${S.lg}px`,
        }}
      >
        {simge && (
          <span
            aria-hidden="true"
            style={{
              width: 30, height: 30, borderRadius: RADIUS.md, flexShrink: 0,
              display: "grid", placeItems: "center",
              background: C.steelSoft, color: C.steel,
            }}
          >
            {simge}
          </span>
        )}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...T.altBaslik, color: C.ink, display: "block" }}>{baslik}</span>
          {ozet && (
            <span
              style={{
                ...T.mini, color: C.ink3, display: "block", marginTop: 1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {ozet}
            </span>
          )}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ color: C.ink3, transform: acik ? "rotate(180deg)" : "none", transition: "transform .18s", flexShrink: 0 }}
        >
          <path d="M3 4.5 6 7.5 9 4.5" />
        </svg>
      </button>
      <div id={id} hidden={!acik} style={{ padding: `0 ${S.lg}px ${S.xs}px`, borderTop: `1px solid ${C.line2}` }}>
        <div style={{ paddingTop: S.lg }}>{children}</div>
      </div>
    </Kart>
  );
}

export function Etiket({ children, style }) {
  return <div style={{ ...T.etiket, color: C.ink3, ...style }}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/*  AÇIKLAMA BALONCUĞU                                                 */
/*                                                                     */
/*  Uzun açıklamalar sayfayı metin duvarına çeviriyordu. Artık her     */
/*  kontrolün yanında küçük bir "?" var; üzerine gelince ya da         */
/*  dokununca açılır. Konumu ekrana göre hesaplanır (position: fixed), */
/*  böylece kaydırılan yan menünün içinde kırpılmaz.                   */
/* ------------------------------------------------------------------ */

export function Ipucu({ children, genislik = 300, etiket = "Açıklama" }) {
  const [konum, setKonum] = React.useState(null);
  const ref = React.useRef(null);
  const kapatZaman = React.useRef(null);

  const ac = () => {
    clearTimeout(kapatZaman.current);
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(genislik, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left - 14, window.innerWidth - w - 12));
    const altta = r.bottom + 220 < window.innerHeight || r.top < 240;
    setKonum({ left, w, top: altta ? r.bottom + 8 : undefined, bottom: altta ? undefined : window.innerHeight - r.top + 8 });
  };
  const kapat = () => { kapatZaman.current = setTimeout(() => setKonum(null), 80); };

  React.useEffect(() => {
    if (!konum) return;
    const k = () => setKonum(null);
    window.addEventListener("scroll", k, true);
    window.addEventListener("resize", k);
    return () => { window.removeEventListener("scroll", k, true); window.removeEventListener("resize", k); };
  }, [konum]);

  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle" }} onMouseEnter={ac} onMouseLeave={kapat}>
      <button
        ref={ref} type="button" aria-label={etiket} aria-expanded={!!konum}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); konum ? setKonum(null) : ac(); }}
        onFocus={ac} onBlur={kapat}
        style={{
          width: 16, height: 16, borderRadius: "50%", padding: 0, flexShrink: 0,
          display: "inline-grid", placeItems: "center", cursor: "help",
          border: `1px solid ${C.line}`, background: konum ? C.steelSoft : C.paper,
          color: konum ? C.steel : C.ink3, fontSize: 10, fontWeight: 700, lineHeight: 1,
        }}
      >
        ?
      </button>
      {konum && (
        <span
          role="tooltip"
          onMouseEnter={() => clearTimeout(kapatZaman.current)} onMouseLeave={kapat}
          style={{
            position: "fixed", left: konum.left, top: konum.top, bottom: konum.bottom,
            width: konum.w, zIndex: 80, background: C.koyu, color: "#e9ebf1",
            borderRadius: RADIUS.md, padding: `${S.sm + 2}px ${S.md}px`,
            boxShadow: GOLGE.yuksek, ...T.mini, fontWeight: 400, textAlign: "left",
            textTransform: "none", letterSpacing: 0, whiteSpace: "normal",
            animation: "belir .12s ease-out",
          }}
        >
          {children}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SAYI GÖSTERİMİ                                                     */
/* ------------------------------------------------------------------ */

/** Tek bir ölçüm. `boy` ile öne çıkarılır: "dev" başlıca sonuç, "orta" normal. */
export function Olcum({ etiket, deger, birim, alt, renk, boy = "orta", ipucu }) {
  const boyut = boy === "dev" ? 30 : boy === "kucuk" ? 17 : 21;
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...T.etiket, color: C.ink3, marginBottom: S.xs, display: "flex", alignItems: "center", gap: 5 }}>
        {etiket}
        {ipucu && <Ipucu>{ipucu}</Ipucu>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexWrap: "wrap" }}>
        <span style={{ ...T.sayi, fontSize: boyut, color: renk || C.ink, lineHeight: 1.1 }}>
          {deger}
        </span>
        {birim && (
          <span style={{ fontSize: boy === "dev" ? 13 : 12, color: C.ink3, fontWeight: 500 }}>
            {birim}
          </span>
        )}
      </div>
      {alt && <div style={{ ...T.mini, color: C.ink3, marginTop: 3 }}>{alt}</div>}
    </div>
  );
}

/** Ölçümleri konu başlığı altında gruplar — 8 serbest kutu yerine 3 küme. */
export function OlcumGrubu({ baslik, children, sutun = 3 }) {
  return (
    <div>
      <div
        style={{
          ...T.mini, fontWeight: 600, color: C.ink, paddingBottom: S.sm, marginBottom: S.md,
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

const ISARET = {
  bilgi: <path d="M8 7.2v4M8 4.9v.1" />,
  olumlu: <path d="m5.2 8.2 1.9 1.9 3.8-4" />,
  uyari: <path d="M8 4.8v3.8M8 11v.1" />,
  tehlike: <path d="m5.8 5.8 4.4 4.4M10.2 5.8l-4.4 4.4" />,
};

export function DurumSimge({ tip, boy = 20 }) {
  const [renk, zemin] = DURUM[tip] || DURUM.bilgi;
  return (
    <span
      aria-hidden="true"
      style={{
        width: boy, height: boy, borderRadius: "50%", background: zemin, color: renk,
        display: "inline-grid", placeItems: "center", flexShrink: 0,
      }}
    >
      <svg width={boy * 0.8} height={boy * 0.8} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {ISARET[tip] || ISARET.bilgi}
      </svg>
    </span>
  );
}

export function Bildirim({ tip, baslik, metin }) {
  const [renk] = DURUM[tip] || DURUM.bilgi;
  return (
    <div
      style={{
        display: "flex", gap: S.md, padding: `${S.md}px ${S.md + 2}px`,
        background: C.paper, border: `1px solid ${C.line2}`, borderRadius: RADIUS.md,
        boxShadow: `inset 3px 0 0 ${renk}`,
      }}
    >
      <DurumSimge tip={tip} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...T.kucuk, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{baslik}</div>
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
        fontSize: 11.5, fontWeight: 500, color: renk, lineHeight: 1.4,
        background: zemin, borderRadius: RADIUS.hap,
        padding: "2px 9px", whiteSpace: "nowrap", display: "inline-block", ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  GİRDİLER                                                           */
/* ------------------------------------------------------------------ */

function AlanBasligi({ id, etiket, ipucu, sag }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: S.sm, marginBottom: 6 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <label htmlFor={id} style={{ ...T.kucuk, color: C.ink, fontWeight: 500 }}>{etiket}</label>
        {ipucu && <Ipucu>{ipucu}</Ipucu>}
      </span>
      {sag}
    </div>
  );
}

export function Secim({ etiket, deger, onChange, children, ipucu, alt }) {
  const id = React.useMemo(yeniId, []);
  return (
    <div style={{ marginBottom: S.lg }}>
      {etiket && <AlanBasligi id={id} etiket={etiket} ipucu={ipucu} />}
      <select id={id} className="secim" value={deger} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      {alt && <div style={{ ...T.mini, color: C.ink3, marginTop: 6 }}>{alt}</div>}
    </div>
  );
}

export function Kaydirac({ etiket, deger, onChange, min, max, step, goster, alt, olcek, ipucu }) {
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
  const a = toSlider(min), b = toSlider(max);
  const dolu = b > a ? ((toSlider(Math.min(max, Math.max(min, deger))) - a) / (b - a)) * 100 : 0;
  return (
    <div style={{ marginBottom: S.lg }}>
      <AlanBasligi
        id={id} etiket={etiket} ipucu={ipucu}
        sag={
          <span
            style={{
              ...T.sayi, fontSize: 12.5, color: C.steel, background: C.steelSoft,
              borderRadius: RADIUS.sm, padding: "2px 8px", whiteSpace: "nowrap",
            }}
          >
            {goster}
          </span>
        }
      />
      <input
        id={id} type="range" className="kaydirac"
        min={a} max={b} step={logMod ? 0.01 : step}
        value={toSlider(deger)}
        onChange={(e) => onChange(fromSlider(Number(e.target.value)))}
        style={{ "--dolu": `${dolu}%` }}
      />
      {alt && <div style={{ ...T.mini, color: C.ink3, marginTop: 4 }}>{alt}</div>}
    </div>
  );
}

/** Açma/kapama anahtarı — onay kutusunun yerine. */
export function Anahtar({ etiket, aciklama, ipucu, isaretli, onChange, renk = C.steel }) {
  const id = React.useMemo(yeniId, []);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: S.md, padding: `${S.sm}px 0` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <label htmlFor={id} style={{ ...T.kucuk, fontWeight: 500, color: C.ink, cursor: "pointer" }}>{etiket}</label>
          {ipucu && <Ipucu>{ipucu}</Ipucu>}
        </span>
        {aciklama && <div style={{ ...T.mini, color: C.ink3, marginTop: 2 }}>{aciklama}</div>}
      </div>
      <button
        id={id} type="button" role="switch" aria-checked={isaretli}
        onClick={() => onChange(!isaretli)}
        style={{
          width: 36, height: 20, borderRadius: RADIUS.hap, padding: 2, flexShrink: 0, marginTop: 1,
          border: "none", cursor: "pointer", background: isaretli ? renk : C.line,
          transition: "background .15s", display: "flex",
        }}
      >
        <span
          style={{
            width: 16, height: 16, borderRadius: "50%", background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,.25)",
            transform: isaretli ? "translateX(16px)" : "none", transition: "transform .15s",
          }}
        />
      </button>
    </div>
  );
}

/** Geriye uyumluluk: eski onay kutusu artık bir anahtar. */
export function Onay({ etiket, aciklama, isaretli, onChange }) {
  return <Anahtar etiket={etiket} aciklama={aciklama} isaretli={isaretli} onChange={onChange} />;
}

export function Dugme({ children, onClick, tur = "ikincil", boy = "orta", style, ...rest }) {
  const turler = {
    birincil: { background: C.steel, color: C.onAccent, border: "1px solid transparent", boxShadow: GOLGE.hafif },
    ikincil: { background: C.paper, color: C.ink, border: `1px solid ${C.line}`, boxShadow: GOLGE.hafif },
    sade: { background: "transparent", color: C.ink2, border: "1px solid transparent" },
  };
  const boylar = {
    kucuk: { fontSize: 12, padding: "5px 10px" },
    orta: { fontSize: 13, padding: "8px 14px" },
    buyuk: { fontSize: 14, padding: "10px 18px" },
  };
  return (
    <button
      onClick={onClick}
      className="dokun"
      {...rest}
      style={{
        fontFamily: SANS, fontWeight: 600,
        borderRadius: RADIUS.md, cursor: "pointer", whiteSpace: "nowrap",
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
      className="secim"
      value={deger}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "auto", fontSize: 12.5, padding: "6px 30px 6px 10px", backgroundPosition: "right 9px center" }}
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
        display: "flex", gap: S.xs, overflowX: "auto",
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
              fontSize: 13, fontWeight: secili ? 600 : 500,
              padding: "10px 12px", cursor: "pointer", whiteSpace: "nowrap",
              background: "transparent", border: "none",
              color: secili ? C.ink : C.ink3,
              boxShadow: secili ? `inset 0 -2px 0 ${C.steel}` : "none",
            }}
          >
            {s.ad}
            {s.rozet != null && (
              <span
                style={{
                  ...T.sayi, fontSize: 11, marginLeft: 6, padding: "1px 6px",
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
  padding: `${S.sm + 2}px ${S.md}px`, fontSize: 11.5,
  color: C.ink3, fontWeight: 600, whiteSpace: "nowrap",
  background: C.paper2, borderBottom: `1px solid ${C.line}`,
};

export const tdStil = {
  padding: `${S.sm + 1}px ${S.md}px`, fontSize: 13,
  whiteSpace: "nowrap", ...RAKAMLAR,
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

/* Kod/komut satırı — MONO yalnızca burada ve benzeri yerlerde. */
export function Kod({ children, style }) {
  return (
    <code
      style={{
        fontFamily: MONO, fontSize: 11.5, color: C.ink2, background: C.wash,
        border: `1px solid ${C.line2}`, borderRadius: RADIUS.sm, padding: "6px 8px",
        display: "block", wordBreak: "break-all", lineHeight: 1.5, ...style,
      }}
    >
      {children}
    </code>
  );
}
