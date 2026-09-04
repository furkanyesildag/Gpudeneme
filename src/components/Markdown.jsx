import React from "react";
import { C, MONO, SANS } from "../theme.js";

/* ------------------------------------------------------------------ */
/*  KÜÇÜK MARKDOWN GÖSTERİCİ                                           */
/*  Dış bağımlılık yok, dangerouslySetInnerHTML yok — her şey React    */
/*  düğümü olarak üretilir, dolayısıyla model çıktısı HTML olarak      */
/*  yorumlanamaz (XSS yüzeyi yok).                                     */
/*  Destek: başlık, kalın/italik, satır içi kod, kod bloğu, madde ve   */
/*  numaralı liste, tablo, alıntı, yatay çizgi, bağlantı.              */
/* ------------------------------------------------------------------ */

const baglantiStil = { color: C.steel, textDecoration: "underline" };

/** Satır içi biçimleme: `kod`, **kalın**, *italik*, [ad](url), çıplak URL */
function satirIci(metin, anahtar = "s") {
  const parcalar = [];
  const dizgi =
    /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\([^)\s]+\))|(https?:\/\/[^\s<>)"']+)/g;
  let son = 0, m, i = 0;
  while ((m = dizgi.exec(metin))) {
    if (m.index > son) parcalar.push(metin.slice(son, m.index));
    const t = m[0];
    const k = `${anahtar}-${i++}`;
    if (m[1]) {
      parcalar.push(
        <code key={k} style={{ fontFamily: MONO, fontSize: "0.92em", background: C.wash, border: `1px solid ${C.line2}`, borderRadius: 3, padding: "1px 4px", wordBreak: "break-word" }}>
          {t.slice(1, -1)}
        </code>
      );
    } else if (m[2] || m[3]) {
      parcalar.push(<strong key={k} style={{ color: C.ink, fontWeight: 600 }}>{t.slice(2, -2)}</strong>);
    } else if (m[4]) {
      parcalar.push(<em key={k}>{t.slice(1, -1)}</em>);
    } else if (m[5]) {
      const mm = t.match(/\[([^\]]+)\]\(([^)\s]+)\)/);
      parcalar.push(
        <a key={k} href={mm[2]} target="_blank" rel="noreferrer noopener" style={baglantiStil}>{mm[1]}</a>
      );
    } else {
      parcalar.push(<a key={k} href={t} target="_blank" rel="noreferrer noopener" style={baglantiStil}>{t}</a>);
    }
    son = m.index + t.length;
  }
  if (son < metin.length) parcalar.push(metin.slice(son));
  return parcalar;
}

function KodBloku({ kod, dil }) {
  const [kopyalandi, setKopyalandi] = React.useState(false);
  const kopyala = () => {
    try {
      navigator.clipboard.writeText(kod);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1400);
    } catch { /* pano kapalıysa yoksay */ }
  };
  return (
    <div style={{ position: "relative", margin: "8px 0" }}>
      <button
        onClick={kopyala}
        style={{
          position: "absolute", top: 5, right: 5, fontFamily: MONO, fontSize: 10,
          background: C.paper, color: C.ink3, border: `1px solid ${C.line}`,
          borderRadius: 3, padding: "2px 6px", cursor: "pointer", zIndex: 1,
        }}
      >
        {kopyalandi ? "kopyalandı" : "kopyala"}
      </button>
      {dil && (
        <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.ink3, padding: "0 0 3px 2px", letterSpacing: "0.05em" }}>
          {dil}
        </div>
      )}
      <pre
        style={{
          margin: 0, background: C.wash, border: `1px solid ${C.line2}`, borderRadius: 4,
          padding: "9px 11px", overflowX: "auto", fontFamily: MONO, fontSize: 11.5,
          lineHeight: 1.55, color: C.ink,
        }}
      >
        <code>{kod}</code>
      </pre>
    </div>
  );
}

function Tablo({ satirlar }) {
  const hucre = (s) => s.replace(/^\||\|$/g, "").split("|").map((x) => x.trim());
  const basliklar = hucre(satirlar[0]);
  const govde = satirlar.slice(2).map(hucre);
  return (
    <div style={{ overflowX: "auto", margin: "8px 0" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11.5, width: "100%" }}>
        <thead>
          <tr>
            {basliklar.map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "5px 8px", borderBottom: `1.5px solid ${C.line}`, fontFamily: MONO, fontSize: 10, textTransform: "uppercase", color: C.ink3, fontWeight: 400, whiteSpace: "nowrap" }}>
                {satirIci(h, `th${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {govde.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={{ padding: "5px 8px", borderBottom: `1px solid ${C.line2}`, color: C.ink2, verticalAlign: "top" }}>
                  {satirIci(c, `td${i}-${j}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Markdown({ metin }) {
  const dugumler = React.useMemo(() => {
    const satirlar = String(metin || "").split("\n");
    const cikti = [];
    let i = 0, k = 0;

    while (i < satirlar.length) {
      const s = satirlar[i];

      // Kod bloğu
      const kodBas = s.match(/^\s*```(\w+)?/);
      if (kodBas) {
        const dil = kodBas[1] || "";
        const govde = [];
        i++;
        while (i < satirlar.length && !/^\s*```/.test(satirlar[i])) govde.push(satirlar[i++]);
        i++;
        cikti.push(<KodBloku key={k++} kod={govde.join("\n")} dil={dil} />);
        continue;
      }

      // Tablo
      if (/^\s*\|.*\|/.test(s) && /^\s*\|[\s:|-]+\|\s*$/.test(satirlar[i + 1] || "")) {
        const blok = [];
        while (i < satirlar.length && /^\s*\|/.test(satirlar[i])) blok.push(satirlar[i++].trim());
        cikti.push(<Tablo key={k++} satirlar={blok} />);
        continue;
      }

      // Başlık
      const b = s.match(/^(#{1,4})\s+(.*)$/);
      if (b) {
        const seviye = b[1].length;
        const boy = [15, 14, 13, 12.5][seviye - 1];
        cikti.push(
          <div key={k++} style={{ fontSize: boy, fontWeight: 600, color: C.ink, margin: "12px 0 5px", lineHeight: 1.35 }}>
            {satirIci(b[2], `h${k}`)}
          </div>
        );
        i++;
        continue;
      }

      // Yatay çizgi
      if (/^\s*([-*_])\1{2,}\s*$/.test(s)) {
        cikti.push(<hr key={k++} style={{ border: "none", borderTop: `1px solid ${C.line2}`, margin: "11px 0" }} />);
        i++;
        continue;
      }

      // Alıntı
      if (/^\s*>/.test(s)) {
        const blok = [];
        while (i < satirlar.length && /^\s*>/.test(satirlar[i])) blok.push(satirlar[i++].replace(/^\s*>\s?/, ""));
        cikti.push(
          <div key={k++} style={{ borderLeft: `3px solid ${C.line}`, paddingLeft: 10, margin: "7px 0", color: C.ink2, fontSize: 12.5, lineHeight: 1.6 }}>
            {satirIci(blok.join(" "), `q${k}`)}
          </div>
        );
        continue;
      }

      // Liste (madde veya numaralı, iç içe girinti destekli)
      if (/^\s*([-*+]|\d+[.)])\s+/.test(s)) {
        const ogeler = [];
        const numaraliMi = /^\s*\d+[.)]\s+/.test(s);
        while (i < satirlar.length && /^\s*([-*+]|\d+[.)])\s+/.test(satirlar[i])) {
          const girinti = (satirlar[i].match(/^\s*/) || [""])[0].length;
          ogeler.push({ girinti, metin: satirlar[i].replace(/^\s*([-*+]|\d+[.)])\s+/, "") });
          i++;
          // Listenin devamı olan sarılmış satırları da al
          while (i < satirlar.length && satirlar[i].trim() && !/^\s*([-*+]|\d+[.)]|#|>|\||```)/.test(satirlar[i])) {
            ogeler[ogeler.length - 1].metin += " " + satirlar[i].trim();
            i++;
          }
        }
        const Etiketli = numaraliMi ? "ol" : "ul";
        cikti.push(
          <Etiketli key={k++} style={{ margin: "5px 0", paddingLeft: 20, fontSize: 12.5, lineHeight: 1.65, color: C.ink2 }}>
            {ogeler.map((o, j) => (
              <li key={j} style={{ marginBottom: 3, marginLeft: Math.min(o.girinti, 8) * 2 }}>
                {satirIci(o.metin, `li${k}-${j}`)}
              </li>
            ))}
          </Etiketli>
        );
        continue;
      }

      // Boş satır
      if (!s.trim()) { i++; continue; }

      // Normal paragraf (ardışık satırları birleştir)
      const p = [];
      while (
        i < satirlar.length && satirlar[i].trim() &&
        !/^\s*([-*+]|\d+[.)]|#|>|\||```)/.test(satirlar[i]) &&
        !/^\s*([-*_])\1{2,}\s*$/.test(satirlar[i])
      ) p.push(satirlar[i++]);
      if (p.length) {
        cikti.push(
          <p key={k++} style={{ margin: "5px 0", fontSize: 12.5, lineHeight: 1.65, color: C.ink2 }}>
            {satirIci(p.join(" "), `p${k}`)}
          </p>
        );
      }
    }
    return cikti;
  }, [metin]);

  return <div style={{ fontFamily: SANS, wordBreak: "break-word" }}>{dugumler}</div>;
}
