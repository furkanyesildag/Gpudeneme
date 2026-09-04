import React from "react";
import { C, MONO, SANS, S, T, RADIUS } from "../theme.js";
import { Kart } from "./ui.jsx";
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
      <label htmlFor={id} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
        <span style={{ ...T.mini, color: C.ink2, fontWeight: 500 }}>{tanim.ad}</span>
        <span
          title={tanim.ipucu} aria-label={tanim.ipucu}
          style={{
            fontFamily: MONO, fontSize: 9, width: 13, height: 13, lineHeight: "12px",
            textAlign: "center", borderRadius: "50%", border: `1px solid ${C.line}`,
            color: C.ink3, cursor: "help", flexShrink: 0,
          }}
        >
          i
        </span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          id={id} type="number" value={deger}
          min={s.min} max={s.max} step={tanim.adim}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(Math.max(s.min, Math.min(s.max, v)));
          }}
          style={{
            width: "100%", fontFamily: MONO, fontSize: 13, padding: "6px 8px",
            border: `1px solid ${C.line}`, borderRadius: RADIUS.sm, background: C.paper, color: C.ink,
          }}
        />
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.ink3, whiteSpace: "nowrap" }}>
          {tanim.birim}
        </span>
      </div>
    </div>
  );
}

export default function Hedefler({
  hedef, setHedef, tps, ttftMs, sigar, modelAd, donanimAd,
  dusunme, setDusunme, dusunmeTok, setDusunmeTok, kap,
}) {
  const [gelismisAcik, setGelismisAcik] = React.useState(false);
  const varsayilanMi = ALANLAR.every((a) => hedef[a.k] === VARSAYILAN_HEDEF[a.k]);

  return (
    <Kart style={{ padding: S.lg }}>
      <SohbetOnizleme
        tps={tps} ttftMs={ttftMs} sigar={sigar}
        modelAd={modelAd} donanimAd={donanimAd}
        dusunme={dusunme} setDusunme={setDusunme}
        dusunmeTok={dusunmeTok} setDusunmeTok={setDusunmeTok}
      />

      {/* ---- gelişmiş: hedefler ---- */}
      <div style={{ marginTop: S.md }}>
        <button
          onClick={() => setGelismisAcik((v) => !v)}
          aria-expanded={gelismisAcik}
          style={{
            display: "flex", alignItems: "center", gap: S.sm, width: "100%",
            background: "transparent", border: "none", padding: `${S.sm}px 0`,
            cursor: "pointer", textAlign: "left", color: C.ink2,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.steel }}>{gelismisAcik ? "▾" : "▸"}</span>
          <span style={{ ...T.kucuk, fontWeight: 600, color: C.ink }}>
            Performans hedefleri ve kapasite varsayımları
          </span>
          <span style={{ ...T.mini, color: C.ink3 }}>
            ≤{hedef.ttftMs} ms · ≥{hedef.tps} tok/s · sohbet ×{hedef.sohbetKat} · ajan ×{hedef.ajanKat}
            {kap?.maxC ? ` → ${kap.sohbet} sohbet / ${kap.ajan} ajan kullanıcısı` : ""}
          </span>
        </button>

        {gelismisAcik && (
          <div style={{ paddingTop: S.sm, borderTop: `1px solid ${C.line2}` }}>
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
                <button
                  onClick={() => setHedef({ ...VARSAYILAN_HEDEF })}
                  style={{
                    fontFamily: SANS, fontSize: 11.5, padding: "5px 10px", borderRadius: RADIUS.sm,
                    border: `1px solid ${C.line}`, background: C.paper, color: C.ink2, cursor: "pointer",
                  }}
                >
                  Varsayılana dön
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Kart>
  );
}
