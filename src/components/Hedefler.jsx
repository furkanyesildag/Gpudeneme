import React from "react";
import { C, S, T } from "../theme.js";
import { Kart, Ipucu, Dugme } from "./ui.jsx";
import SohbetOnizleme from "./SohbetOnizleme.jsx";
import { HEDEF_SINIR, VARSAYILAN_HEDEF } from "../engine.js";

/* ------------------------------------------------------------------ */
/*  DENEYİM VE HEDEFLER                                                */
/*                                                                     */
/*  Öne çıkan şey soyut hedef kutuları değil, seçtiğin kurulumun       */
/*  GERÇEK sohbet deneyimi. Hedefler ikinci planda: kapasiteyi         */
/*  onlar tanımlar, ama önce insanın ne göreceğini göstermek gerekir.  */
/* ------------------------------------------------------------------ */

const ALANLAR = [
  {
    k: "ttftMs", ad: "En yüksek ilk token", birim: "ms", adim: 100,
    ipucu:
      "Kullanıcının cevabın ilk harfini görmek için bekleyeceği en uzun süre. Sohbette 1 saniye rahat, 3 saniye sınırda, 10 saniye kullanıcıyı kaçırır. Kod ajanlarında çok daha yüksek tolere edilir çünkü kullanıcı zaten ekrana bakmıyordur.",
  },
  {
    k: "tps", ad: "En düşük token hızı", birim: "tok/s", adim: 1,
    ipucu:
      "Kullanıcı BAŞINA kabul edilebilir en düşük yazma hızı. Ortalama okuma hızı 200-250 kelime/dakika, yani kabaca 5-7 token/saniyedir. Rahat hissettiren band 15-30 token/saniyedir; metin okumandan hep bir adım önde gider.",
  },
  {
    k: "sohbetKat", ad: "Sohbet çarpanı", birim: "×", adim: 0.5,
    ipucu:
      "Bir eşzamanlı yuvanın kaç gerçek sohbet kullanıcısına yettiği. Sohbet eden biri zamanının çoğunu okuyarak ve yazarak geçirir, modeli sürekli meşgul etmez. 4 muhafazakâr bir varsayımdır; seyrek kullanılan iç araçlarda 8-10 da olabilir.",
  },
  {
    k: "ajanKat", ad: "Ajan çarpanı", birim: "×", adim: 0.5,
    ipucu:
      "Bir eşzamanlı yuvanın kaç ajan kullanıcısına yettiği. Ajanlar arka arkaya istek atıp araç çağırır, yuvayı çok daha yoğun kullanır. 1.5 tipiktir; sürekli çalışan otonom ajanlarda 1'e yaklaşır.",
  },
];

function Alan({ tanim, deger, onChange }) {
  const s = HEDEF_SINIR[tanim.k];
  const id = `hedef-${tanim.k}`;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <label htmlFor={id} style={{ ...T.kucuk, color: C.ink, fontWeight: 500 }}>{tanim.ad}</label>
        <Ipucu>{tanim.ipucu}</Ipucu>
      </div>
      <div style={{ position: "relative" }}>
        <input
          id={id} type="number" value={deger} className="girdi"
          min={s.min} max={s.max} step={tanim.adim}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(Math.max(s.min, Math.min(s.max, v)));
          }}
          style={{ paddingRight: 48 }}
        />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.ink3, pointerEvents: "none" }}>
          {tanim.birim}
        </span>
      </div>
    </div>
  );
}

export default function Hedefler({
  hedef, setHedef, tps, ttftMs, sigar, modelAd, donanimAd,
  dusunmeSeviye, setDusunmeSeviye, kap,
}) {
  const [gelismisAcik, setGelismisAcik] = React.useState(false);
  const varsayilanMi = ALANLAR.every((a) => hedef[a.k] === VARSAYILAN_HEDEF[a.k]);

  return (
    <Kart style={{ padding: `${S.lg + 2}px ${S.lg + 4}px` }}>
      <SohbetOnizleme
        tps={tps} ttftMs={ttftMs} sigar={sigar}
        modelAd={modelAd} donanimAd={donanimAd}
        dusunmeSeviye={dusunmeSeviye} setDusunmeSeviye={setDusunmeSeviye}
      />

      {/* ---- gelişmiş: hedefler ---- */}
      <div style={{ marginTop: S.md, borderTop: `1px solid ${C.line2}` }}>
        <button
          onClick={() => setGelismisAcik((v) => !v)}
          aria-expanded={gelismisAcik}
          style={{
            display: "flex", alignItems: "center", gap: `${S.xs}px ${S.sm}px`, width: "100%", flexWrap: "wrap",
            background: "transparent", border: "none", padding: `${S.md}px 0 0`,
            cursor: "pointer", textAlign: "left", color: C.ink2,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: C.ink3, transform: gelismisAcik ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
            <path d="M4.5 3 7.5 6 4.5 9" />
          </svg>
          <span style={{ ...T.kucuk, fontWeight: 600, color: C.ink }}>
            Performans hedefleri
          </span>
          <span style={{ ...T.mini, color: C.ink3 }}>
            ≤{hedef.ttftMs} ms · ≥{hedef.tps} tok/s · sohbet ×{hedef.sohbetKat} · ajan ×{hedef.ajanKat}
            {kap?.maxC ? ` → ${kap.sohbet} sohbet / ${kap.ajan} ajan kullanıcısı` : ""}
          </span>
        </button>

        {gelismisAcik && (
          <div style={{ paddingTop: S.xs }}>
            <p style={{ ...T.kucuk, color: C.ink2, margin: `${S.md}px 0`, maxWidth: 800 }}>
              Bu dört değer neyin <b>kabul edilebilir</b> sayıldığını belirler. Her donanımın
              <b> Maks. C</b>, <b>sohbet</b> ve <b>ajan</b> kapasitesi bunlardan yeniden hesaplanır;
              hız ve ilk token sütunlarının renklendirmesi de bunları izler.
              <b> Hiçbir satır filtrelenmez</b> — değişen şey sayıların ne anlama geldiğidir.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: `${S.md}px ${S.lg}px` }}>
              {ALANLAR.map((a) => (
                <Alan key={a.k} tanim={a} deger={hedef[a.k]} onChange={(v) => setHedef({ ...hedef, [a.k]: v })} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: S.md, marginTop: S.md, flexWrap: "wrap" }}>
              <div style={{ ...T.mini, color: C.ink3, maxWidth: 620 }}>
                <b style={{ color: C.ink2 }}>Eşzamanlılık (C) kullanıcı sayısı değildir.</b> C, modelin aynı
                anda işlediği istek sayısıdır; çarpanlar bir yuvanın kaç kişiye yettiğini ifade eder.
              </div>
              {!varsayilanMi && (
                <Dugme boy="kucuk" onClick={() => setHedef({ ...VARSAYILAN_HEDEF })}>
                  Varsayılana dön
                </Dugme>
              )}
            </div>
          </div>
        )}
      </div>
    </Kart>
  );
}
