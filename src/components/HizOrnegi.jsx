import React from "react";
import { C, MONO, SANS } from "../theme.js";

/* ------------------------------------------------------------------ */
/*  "BU HIZ NEYE BENZİYOR?"                                            */
/*                                                                     */
/*  Bir sayının (18 tok/s) ne anlama geldiğini kimse sezgisel olarak   */
/*  bilmez. Burada metni gerçekten o hızda yazdırıyoruz — okuyan kişi  */
/*  beklemenin nasıl hissettirdiğini doğrudan görüyor.                 */
/*                                                                     */
/*  Yaklaşım: token ≈ 4 karakter (Türkçe'de biraz daha az, ama         */
/*  büyüklük mertebesi doğru). Zamanlama duvar saatine göre yapılır,   */
/*  kare sayısına göre değil — sekme arka plana atılıp geri            */
/*  gelindiğinde metin ileri sıçrar, yavaşlamaz.                       */
/* ------------------------------------------------------------------ */

const ORNEK_METIN = `Bir dil modelini kendi donanımında çalıştırdığında yanıt hızını üç şey belirler: hızlandırıcının bellek bant genişliği, ağırlıkların hangi kuantizasyonda tutulduğu ve aynı anda kaç kişinin sistemi kullandığı. Düşük token hızlarında metin kelime kelime belirir ve bekleme fark edilir hale gelir; arayüz sesli düşünüyormuş gibi hissettirir. Hız arttıkça cevap çoğu insanın okuyabileceğinden daha çabuk gelir ve deneyim tamamen karakter değiştirir: artık cevabın kurulmasını izlemezsin, sadece okursun. Bu iki uç arasında bir yerde, sohbet asistanının beklediğin bir makine olmaktan çıkıp sana ayak uyduran bir araca dönüştüğü nokta vardır. O noktanın tam olarak nerede olduğu yaptığın işe bağlıdır: uzun bir metni özetletirken saniyede on token yeterli gelebilir, ama kod yazan bir ajanı izlerken aynı hız dayanılmaz derecede yavaştır.`;

const KARAKTER_PER_TOKEN = 4;

export default function HizOrnegi({ tps, etiket, ikinciTps, ikinciEtiket }) {
  const [oynuyor, setOynuyor] = React.useState(false);
  const [ilerleme, setIlerleme] = React.useState(0); // yazılmış karakter
  const [secili, setSecili] = React.useState("birinci");
  const basRef = React.useRef(0);
  const rafRef = React.useRef(0);
  const azHareket = React.useRef(false);

  React.useEffect(() => {
    try {
      azHareket.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch { /* eski tarayıcı */ }
  }, []);

  const aktifTps = Math.max(0.5, secili === "ikinci" && ikinciTps ? ikinciTps : tps);
  const aktifEtiket = secili === "ikinci" && ikinciTps ? ikinciEtiket : etiket;
  const karakterPerSn = aktifTps * KARAKTER_PER_TOKEN;
  const toplamSure = ORNEK_METIN.length / karakterPerSn;

  /* Hız veya kaynak değişince baştan başla — kıyas ancak baştan anlamlı. */
  React.useEffect(() => {
    setIlerleme(0);
    basRef.current = performance.now();
  }, [aktifTps]);

  React.useEffect(() => {
    if (!oynuyor) return;
    if (azHareket.current) { setIlerleme(ORNEK_METIN.length); setOynuyor(false); return; }

    basRef.current = performance.now() - (ilerleme / karakterPerSn) * 1000;
    const adim = () => {
      const gecen = (performance.now() - basRef.current) / 1000;
      const n = Math.floor(gecen * karakterPerSn);
      if (n >= ORNEK_METIN.length) { setIlerleme(ORNEK_METIN.length); setOynuyor(false); return; }
      setIlerleme(n);
      rafRef.current = requestAnimationFrame(adim);
    };
    rafRef.current = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(rafRef.current);
    // ilerleme kasıtlı olarak bağımlılık değil: her karakterde efekti yeniden
    // kurmak yerine tek bir animasyon döngüsü duvar saatinden okuyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oynuyor, karakterPerSn]);

  const oynat = () => {
    if (ilerleme >= ORNEK_METIN.length) setIlerleme(0);
    setOynuyor(true);
  };
  const durdur = () => setOynuyor(false);
  const bastan = () => { setIlerleme(0); setOynuyor(false); };

  const yazilan = ORNEK_METIN.slice(0, ilerleme);
  const bitti = ilerleme >= ORNEK_METIN.length;
  const yuzde = (ilerleme / ORNEK_METIN.length) * 100;
  const toplamToken = Math.round(ORNEK_METIN.length / KARAKTER_PER_TOKEN);
  const yazilanToken = Math.round(ilerleme / KARAKTER_PER_TOKEN);
  // Ortalama okuma hızı: 200-250 kelime/dk × ~1,3 token/kelime ÷ 60 ≈ 5-6 tok/s
  const okumaHizi = 5.5;

  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 4, background: C.paper, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: `1px solid ${C.line2}`, background: C.wash, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.09em", textTransform: "uppercase", color: C.ink3 }}>
            Bu hız neye benziyor?
          </div>
          <div style={{ fontSize: 12, color: C.ink2, marginTop: 2 }}>
            <b style={{ fontFamily: MONO, color: C.ink }}>{aktifTps.toFixed(1)} tok/s</b> · {aktifEtiket}
            {" · "}bu paragraf ({toplamToken} token) <b>{toplamSure < 60 ? `${toplamSure.toFixed(0)} sn` : `${Math.floor(toplamSure / 60)} dk ${Math.round(toplamSure % 60)} sn`}</b> sürer
            {" · "}<span title="Ortalama okuma hızı: 200-250 kelime/dakika ≈ 5-6 token/saniye">
              okumandan <b style={{ color: aktifTps >= okumaHizi ? C.ok : C.warn }}>
                {aktifTps >= okumaHizi ? `${(aktifTps / okumaHizi).toFixed(1)}× hızlı` : `${(okumaHizi / aktifTps).toFixed(1)}× yavaş`}
              </b>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {ikinciTps ? (
            <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 3, overflow: "hidden" }}>
              {[["birinci", etiket, tps], ["ikinci", ikinciEtiket, ikinciTps]].map(([k, ad, v]) => (
                <button
                  key={k}
                  onClick={() => { setSecili(k); setOynuyor(false); }}
                  style={{
                    fontFamily: SANS, fontSize: 11, padding: "4px 9px", cursor: "pointer", border: "none",
                    background: secili === k ? C.steel : C.paper,
                    color: secili === k ? "#fff" : C.ink2,
                  }}
                >
                  {ad} · {Number(v).toFixed(0)}
                </button>
              ))}
            </div>
          ) : null}
          <button onClick={oynuyor ? durdur : oynat} style={dugme(true)}>
            {oynuyor ? "⏸ Duraklat" : bitti ? "↻ Tekrar" : "▶ Oynat"}
          </button>
          {ilerleme > 0 && !oynuyor && (
            <button onClick={bastan} style={dugme(false)}>Baştan</button>
          )}
        </div>
      </div>

      <div style={{ height: 3, background: C.line2, position: "relative" }}>
        <div style={{ height: "100%", width: `${yuzde}%`, background: C.steel, transition: "none" }} />
        {(oynuyor || ilerleme > 0) && (
          <span style={{
            position: "absolute", right: 6, top: 5, fontFamily: MONO, fontSize: 10,
            color: C.ink3, background: C.paper, padding: "0 4px", borderRadius: 2,
          }}>
            {yazilanToken} / {toplamToken} token
          </span>
        )}
      </div>

      <div
        aria-live="off"
        style={{
          padding: "12px 14px", fontFamily: SANS, fontSize: 13, lineHeight: 1.7,
          color: C.ink2, minHeight: 132, maxHeight: 200, overflowY: "auto",
        }}
      >
        {ilerleme === 0 && !oynuyor ? (
          <span style={{ color: C.ink3, fontStyle: "italic" }}>
            "Oynat"a bas — metin tam olarak {aktifTps.toFixed(1)} token/saniye hızında yazılacak.
            Bir sayının okuma deneyimine ne yaptığını görmenin en hızlı yolu bu.
          </span>
        ) : (
          <>
            {yazilan}
            {!bitti && <span style={imlec} aria-hidden="true" />}
          </>
        )}
      </div>

      <div style={{ padding: "8px 14px 10px", fontSize: 11, color: C.ink3, lineHeight: 1.55, borderTop: `1px solid ${C.line2}` }}>
        Seçilen token hızını görselleştiren yaklaşık bir benzetimdir (token ≈ 4 karakter). Gerçek deneyim
        ilk token gecikmesine, yanıt uzunluğuna ve uygulamanın metni nasıl akıttığına göre değişir.
      </div>
    </div>
  );
}

const dugme = (birincil) => ({
  fontFamily: SANS, fontSize: 11.5, fontWeight: birincil ? 600 : 400,
  padding: "5px 11px", borderRadius: 3, cursor: "pointer", whiteSpace: "nowrap",
  background: birincil ? C.steel : C.paper,
  color: birincil ? "#fff" : C.ink2,
  border: birincil ? "none" : `1px solid ${C.line}`,
});

const imlec = {
  display: "inline-block", width: 7, height: 14, background: "var(--steel)",
  marginLeft: 2, verticalAlign: "text-bottom", animation: "yanip 1s steps(2) infinite",
};
