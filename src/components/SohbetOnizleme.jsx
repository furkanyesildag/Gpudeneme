import React from "react";
import { C, MONO, SANS, S, T, RADIUS } from "../theme.js";
import { sureYazi } from "../engine.js";

/* ------------------------------------------------------------------ */
/*  SOHBET ÖNİZLEMESİ                                                  */
/*                                                                     */
/*  "18 tok/s" bir şey ifade etmez. Bu bileşen seçili model ve         */
/*  donanımla GERÇEK bir sohbet turunu canlandırır:                    */
/*                                                                     */
/*    1. İstek gider          → ekranda hiçbir şey yok                 */
/*    2. İlk token gecikmesi  → model istemi okuyor (bekleme)          */
/*    3. Düşünme (açıksa)     → düşünce token'ları akar ama            */
/*                              kullanıcı hâlâ CEVABI görmez           */
/*    4. Yanıt                → asıl metin akar                        */
/*                                                                     */
/*  Düşünme modu burada belirleyici: akıl yürüten bir model, cevabın   */
/*  ilk harfini görene kadar geçen süreyi katlar. Sayı tablosunda      */
/*  görünmeyen ama günlük kullanımda en çok hissedilen şey budur.      */
/*                                                                     */
/*  Zamanlama duvar saatinden okunur (kare sayısından değil), böylece  */
/*  sekme arka plana atılıp dönüldüğünde benzetim ileri sıçrar,        */
/*  yavaşlamaz.                                                        */
/* ------------------------------------------------------------------ */

const SORU = "Elimizdeki 40 sayfalık teknik şartnameyi özetleyip riskli maddeleri çıkarır mısın?";

const DUSUNCE =
  "Kullanıcı iki şey istiyor: özet ve risk çıkarımı. Önce belgeyi bölümlere ayırmam gerek. " +
  "Şartnamelerde riskli maddeler genelde teslim süresi, cezai şart, kabul kriterleri ve " +
  "fikri mülkiyet başlıklarında toplanır. Özeti bölüm bazında kurup, sonra her bölümü bu dört " +
  "başlığa göre tarayacağım. Cezai şart maddesinde oran ve tavan var mı, ona ayrıca bakmalıyım. " +
  "Kabul kriterleri belirsizse bu tek başına en büyük risk olur, onu öne almalıyım.";

const YANIT =
  "Şartnameyi altı bölüme ayırdım ve her birini teslim, ceza, kabul ve mülkiyet başlıklarına göre taradım.\n\n" +
  "Özet: belge bir yazılım tedarik işini tanımlıyor; teslim üç fazda, toplam süre 9 ay, kabul testleri " +
  "idarenin belirleyeceği senaryolara göre yapılıyor.\n\n" +
  "Riskli gördüğüm maddeler:\n\n" +
  "1. Kabul kriterleri madde 7.3'te \"idarenin uygun görmesi\" olarak tanımlanmış; ölçülebilir bir eşik yok. " +
  "Bu, kabulün süresiz uzamasına açık kapı bırakıyor ve sözleşmedeki en büyük belirsizlik.\n\n" +
  "2. Cezai şart madde 11'de günlük binde beş, tavan yok. Üç aylık bir gecikme bedelin yarısını götürür.\n\n" +
  "3. Fikri mülkiyet madde 14'te tüm çıktılar idareye devrediliyor; kendi kütüphanelerin için istisna yok. " +
  "Mevcut kod tabanını bu işte kullanacaksan bu maddeyi mutlaka değiştirtmelisin.";

const KAR_TOK = 4; // token ≈ 4 karakter

const EVRE = {
  bos: { ad: "hazır", renk: "ink3" },
  bekleme: { ad: "istem işleniyor", renk: "warn" },
  dusunme: { ad: "model düşünüyor", renk: "steel" },
  yanit: { ad: "yanıt yazılıyor", renk: "ok" },
  bitti: { ad: "tamamlandı", renk: "ok" },
};

export default function SohbetOnizleme({
  tps, ttftMs, modelAd, donanimAd, sigar,
  dusunme, setDusunme, dusunmeTok, setDusunmeTok,
}) {
  const [calisiyor, setCalisiyor] = React.useState(false);
  const [gecen, setGecen] = React.useState(0); // ms
  const basRef = React.useRef(0);
  const rafRef = React.useRef(0);
  const azHareket = React.useRef(false);
  const kaydirRef = React.useRef(null);

  React.useEffect(() => {
    try { azHareket.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* yoksay */ }
  }, []);

  /* --- zaman çizelgesi --- */
  const msPerKarakter = 1000 / (Math.max(0.5, tps) * KAR_TOK);
  const dusunmeKarakter = dusunme ? Math.round(dusunmeTok * KAR_TOK) : 0;
  const dusunmeSuresi = dusunmeKarakter * msPerKarakter;
  const yanitSuresi = YANIT.length * msPerKarakter;
  const t0 = ttftMs;                       // bekleme biter
  const t1 = t0 + dusunmeSuresi;           // düşünme biter
  const t2 = t1 + yanitSuresi;             // yanıt biter

  /* Ayar değişince baştan başla — kıyas ancak baştan anlamlı. */
  React.useEffect(() => { setCalisiyor(false); setGecen(0); }, [tps, ttftMs, dusunme, dusunmeTok]);

  React.useEffect(() => {
    if (!calisiyor) return;
    if (azHareket.current) { setGecen(t2); setCalisiyor(false); return; }
    basRef.current = performance.now() - gecen;
    const adim = () => {
      const g = performance.now() - basRef.current;
      if (g >= t2) { setGecen(t2); setCalisiyor(false); return; }
      setGecen(g);
      rafRef.current = requestAnimationFrame(adim);
    };
    rafRef.current = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calisiyor, t2]);

  /* Yeni metin geldikçe aşağı kaydır */
  React.useEffect(() => {
    if (kaydirRef.current && calisiyor) kaydirRef.current.scrollTop = kaydirRef.current.scrollHeight;
  }, [gecen, calisiyor]);

  const evre = gecen === 0 && !calisiyor ? "bos"
    : gecen < t0 ? "bekleme"
    : gecen < t1 ? "dusunme"
    : gecen < t2 ? "yanit"
    : "bitti";

  const dusunceYazilan = DUSUNCE.slice(0, Math.max(0, Math.floor((gecen - t0) / msPerKarakter)));
  const yanitYazilan = YANIT.slice(0, Math.max(0, Math.floor((gecen - t1) / msPerKarakter)));

  const baslat = () => { if (gecen >= t2) setGecen(0); setCalisiyor(true); };
  const durdur = () => setCalisiyor(false);
  const sifirla = () => { setCalisiyor(false); setGecen(0); };

  const evreRenk = { ink3: C.ink3, warn: C.warn, steel: C.steel, ok: C.ok }[EVRE[evre].renk];

  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: RADIUS.md, background: C.paper, overflow: "hidden" }}>
      {/* ---- üst şerit ---- */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: S.md,
          padding: `${S.sm + 2}px ${S.md}px`, background: C.paper2,
          borderBottom: `1px solid ${C.line2}`, flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ ...T.etiket, color: C.ink3 }}>İlk sohbetinde ne göreceksin</div>
          <div style={{ ...T.mini, color: C.ink2, marginTop: 2 }}>
            {modelAd} · {donanimAd}
            {sigar ? (
              <> · <b style={{ fontFamily: MONO, color: C.ink }}>{tps.toFixed(1)} tok/s</b>, ilk token{" "}
                <b style={{ fontFamily: MONO, color: C.ink }}>{sureYazi(ttftMs / 1000)}</b></>
            ) : (
              <> · <span style={{ color: C.bad }}>bu kurulum belleğe sığmıyor</span></>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: S.sm, alignItems: "center", flexWrap: "wrap" }}>
          {/* Düşünme açık / kapalı */}
          <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, overflow: "hidden" }}>
            {[[false, "Düşünme kapalı"], [true, "Düşünme açık"]].map(([v, ad]) => (
              <button
                key={String(v)}
                onClick={() => setDusunme(v)}
                aria-pressed={dusunme === v}
                style={{
                  fontFamily: SANS, fontSize: 11, padding: "5px 10px", cursor: "pointer", border: "none",
                  background: dusunme === v ? C.steel : C.paper,
                  color: dusunme === v ? "#fff" : C.ink3,
                  fontWeight: dusunme === v ? 600 : 400,
                }}
              >
                {ad}
              </button>
            ))}
          </div>
          <button onClick={calisiyor ? durdur : baslat} disabled={!sigar} style={anaDugme(sigar)}>
            {calisiyor ? "⏸ Duraklat" : evre === "bitti" ? "↻ Tekrar" : "▶ Sohbeti başlat"}
          </button>
          {gecen > 0 && !calisiyor && (
            <button onClick={sifirla} style={yanDugme}>Sıfırla</button>
          )}
        </div>
      </div>

      {/* ---- düşünme uzunluğu ---- */}
      {dusunme && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: S.md, padding: `${S.sm}px ${S.md}px`,
            background: C.steelSoft, borderBottom: `1px solid ${C.line2}`, flexWrap: "wrap",
          }}
        >
          <span style={{ ...T.mini, color: C.ink2, whiteSpace: "nowrap" }}>Düşünme uzunluğu</span>
          <input
            type="range" min={100} max={8000} step={100}
            value={dusunmeTok}
            onChange={(e) => setDusunmeTok(Number(e.target.value))}
            aria-label="Düşünme token sayısı"
            style={{ flex: "1 1 160px", accentColor: "var(--steel)", minWidth: 120 }}
          />
          <span style={{ ...T.sayi, fontSize: 12, color: C.steel, whiteSpace: "nowrap" }}>
            {dusunmeTok} token
          </span>
          <span style={{ ...T.mini, color: C.ink3, flex: "1 1 100%" }}>
            Akıl yürüten modeller cevaptan önce düşünce üretir. Kullanıcı bu süre boyunca asıl yanıtı
            görmez — basit sorularda birkaç yüz, zor sorularda birkaç bin token sürer.
          </span>
        </div>
      )}

      {/* ---- zaman çizelgesi ---- */}
      <div style={{ display: "flex", height: 4, background: C.line2 }}>
        <div style={{ width: `${(t0 / t2) * 100}%`, background: C.warn, opacity: gecen >= 0 ? 1 : 0.3 }} title={`İstem işleniyor: ${sureYazi(t0 / 1000)}`} />
        {dusunme && <div style={{ width: `${(dusunmeSuresi / t2) * 100}%`, background: C.steel }} title={`Düşünme: ${sureYazi(dusunmeSuresi / 1000)}`} />}
        <div style={{ width: `${(yanitSuresi / t2) * 100}%`, background: C.ok }} title={`Yanıt: ${sureYazi(yanitSuresi / 1000)}`} />
      </div>
      <div
        style={{
          position: "relative", height: 3, background: "transparent",
          marginTop: -4, pointerEvents: "none",
        }}
      >
        <div style={{ position: "absolute", left: `${Math.min(100, (gecen / t2) * 100)}%`, top: -1, width: 2, height: 6, background: C.ink }} />
      </div>

      {/* ---- sohbet gövdesi ---- */}
      <div ref={kaydirRef} style={{ padding: S.md, minHeight: 210, maxHeight: 300, overflowY: "auto", background: C.paper }}>
        {/* kullanıcı balonu */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: S.sm }}>
          <div style={{ background: C.steel, color: "#fff", borderRadius: RADIUS.md, padding: "8px 11px", ...T.kucuk, maxWidth: "80%" }}>
            {SORU}
          </div>
        </div>

        {/* durum satırı */}
        <div style={{ display: "flex", alignItems: "center", gap: S.sm, marginBottom: S.sm, ...T.mini }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: evreRenk, display: "inline-block", flexShrink: 0 }} />
          <span style={{ color: evreRenk, fontWeight: 500 }}>{EVRE[evre].ad}</span>
          <span style={{ fontFamily: MONO, color: C.ink3 }}>{(gecen / 1000).toFixed(1)} sn</span>
        </div>

        {evre === "bos" ? (
          <div style={{ ...T.kucuk, color: C.ink3, fontStyle: "italic" }}>
            {sigar
              ? "“Sohbeti başlat”a bas — bekleme, düşünme ve yazma süreleri seçtiğin model ve donanımın gerçek hesabıyla, gerçek zamanlı olarak canlandırılacak."
              : "Bu kurulum belleğe sığmadığı için canlandırılacak bir hız yok. Kuantizasyonu düşür, bağlamı kısalt ya da cihaz ekle."}
          </div>
        ) : (
          <>
            {/* düşünce bloğu */}
            {dusunme && gecen >= t0 && (
              <div
                style={{
                  background: C.paper2, border: `1px solid ${C.line2}`, borderLeft: `3px solid ${C.steel}`,
                  borderRadius: RADIUS.sm, padding: `${S.sm}px ${S.md}px`, marginBottom: S.sm,
                }}
              >
                <div style={{ ...T.etiket, color: C.steel, marginBottom: S.xs, fontSize: 9.5 }}>
                  düşünce · kullanıcı bunu beklerken cevabı göremez
                </div>
                <div style={{ ...T.mini, color: C.ink3, fontStyle: "italic" }}>
                  {dusunceYazilan}
                  {evre === "dusunme" && <span style={imlec} />}
                </div>
              </div>
            )}

            {/* yanıt */}
            {gecen >= t1 && (
              <div style={{ ...T.kucuk, color: C.ink2, whiteSpace: "pre-wrap" }}>
                {yanitYazilan}
                {evre === "yanit" && <span style={imlec} />}
              </div>
            )}

            {evre === "bekleme" && (
              <div style={{ ...T.kucuk, color: C.ink3 }}>
                <span style={{ letterSpacing: 2 }}>•••</span> model istemi okuyor
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- döküm ---- */}
      <div
        style={{
          display: "flex", gap: S.lg, flexWrap: "wrap", padding: `${S.sm + 2}px ${S.md}px`,
          borderTop: `1px solid ${C.line2}`, background: C.paper2, ...T.mini,
        }}
      >
        {[
          ["İstem işleniyor", t0, C.warn],
          ...(dusunme ? [["Düşünme", dusunmeSuresi, C.steel]] : []),
          ["Yanıt yazılıyor", yanitSuresi, C.ok],
        ].map(([ad, ms, renk]) => (
          <span key={ad} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, background: renk, borderRadius: 2, display: "inline-block" }} />
            <span style={{ color: C.ink2 }}>{ad}</span>
            <span style={{ fontFamily: MONO, color: C.ink }}>{sureYazi(ms / 1000)}</span>
          </span>
        ))}
        <span style={{ marginLeft: "auto", color: C.ink2 }}>
          Cevabın ilk harfi:{" "}
          <b style={{ fontFamily: MONO, color: dusunme ? C.warn : C.ink }}>{sureYazi(t1 / 1000)}</b>
          {" · "}Tamamı: <b style={{ fontFamily: MONO, color: C.ink }}>{sureYazi(t2 / 1000)}</b>
        </span>
      </div>
    </div>
  );
}

const anaDugme = (aktif) => ({
  fontFamily: SANS, fontSize: 12, fontWeight: 600, padding: "6px 13px",
  borderRadius: RADIUS.sm, border: "none", whiteSpace: "nowrap",
  background: aktif ? C.steel : C.line,
  color: aktif ? "#fff" : C.ink3,
  cursor: aktif ? "pointer" : "not-allowed",
});
const yanDugme = {
  fontFamily: SANS, fontSize: 12, padding: "6px 11px", borderRadius: RADIUS.sm,
  border: `1px solid ${C.line}`, background: C.paper, color: C.ink2, cursor: "pointer",
};
const imlec = {
  display: "inline-block", width: 6, height: 12, background: "var(--steel)",
  marginLeft: 2, verticalAlign: "text-bottom", animation: "yanip 1s steps(2) infinite",
};
