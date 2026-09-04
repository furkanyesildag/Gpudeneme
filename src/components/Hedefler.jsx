import React from "react";
import { C, MONO, SANS } from "../theme.js";
import { Kutu, Etiket } from "./ui.jsx";
import HizOrnegi from "./HizOrnegi.jsx";
import { HEDEF_SINIR, VARSAYILAN_HEDEF } from "../engine.js";

/* ------------------------------------------------------------------ */
/*  PERFORMANS HEDEFLERİ                                               */
/*                                                                     */
/*  Bu dört değer hiçbir satırı gizlemez — sayıların ANLAMINI          */
/*  değiştirir. "Kaç kullanıcı kaldırır?" sorusunun cevabı neyin       */
/*  kabul edilebilir sayıldığına bağlıdır; onu burada kullanıcı        */
/*  belirler.                                                          */
/* ------------------------------------------------------------------ */

const ALANLAR = [
  {
    k: "ttftMs",
    ad: "En yüksek ilk token hedefi",
    birim: "ms",
    adim: 100,
    ipucu:
      "Kullanıcının cevabın ilk harfini görmek için bekleyeceği en uzun süre. Sohbette 1 saniye rahat, 3 saniye sınırda, 10 saniye kullanıcıyı kaçırır. Kod ajanlarında çok daha yüksek tolere edilir çünkü kullanıcı zaten ekrana bakmıyordur.",
  },
  {
    k: "tps",
    ad: "En düşük token hızı hedefi",
    birim: "tok/s",
    adim: 1,
    ipucu:
      "Kullanıcı BAŞINA kabul edilebilir en düşük yazma hızı. Ortalama okuma hızı 200-250 kelime/dakika, yani kabaca 5-7 token/saniyedir — model bunun altına inerse kullanıcı harflerin belirmesini bekler. Rahat hissettiren band 15-30 token/saniyedir; bu, metnin okumandan hep bir adım önde gitmesini sağlar. Aşağıdaki örnekte istediğin hızı gerçek zamanlı deneyebilirsin.",
  },
  {
    k: "sohbetKat",
    ad: "Sohbet kullanım çarpanı",
    birim: "×",
    adim: 0.5,
    ipucu:
      "Bir eşzamanlı yuvanın kaç gerçek sohbet kullanıcısına yettiği. Sohbet eden biri zamanının çoğunu okuyarak ve yazarak geçirir, modeli sürekli meşgul etmez. 4 muhafazakâr bir varsayımdır; seyrek kullanılan iç araçlarda 8-10 de olabilir.",
  },
  {
    k: "ajanKat",
    ad: "Ajan kullanım çarpanı",
    birim: "×",
    adim: 0.5,
    ipucu:
      "Bir eşzamanlı yuvanın kaç ajan kullanıcısına yettiği. Ajanlar arka arkaya istek atıp araç çağırır, yuvayı çok daha yoğun kullanır. 1.5 tipik bir değerdir; sürekli çalışan otonom ajanlarda 1'e yaklaşır.",
  },
];

function Alan({ tanim, deger, onChange }) {
  const s = HEDEF_SINIR[tanim.k];
  const id = `hedef-${tanim.k}`;
  const kirp = (v) => Math.max(s.min, Math.min(s.max, v));
  return (
    <div>
      <label htmlFor={id} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: C.ink2, fontWeight: 500 }}>{tanim.ad}</span>
        <span
          title={tanim.ipucu}
          aria-label={tanim.ipucu}
          style={{
            fontFamily: MONO, fontSize: 9.5, width: 14, height: 14, lineHeight: "13px",
            textAlign: "center", borderRadius: "50%", border: `1px solid ${C.line}`,
            color: C.ink3, cursor: "help", flexShrink: 0,
          }}
        >
          i
        </span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          id={id}
          type="number"
          value={deger}
          min={s.min}
          max={s.max}
          step={tanim.adim}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(kirp(v));
          }}
          style={{
            width: "100%", fontFamily: MONO, fontSize: 14, padding: "6px 8px",
            border: `1px solid ${C.line}`, borderRadius: 3, background: C.paper, color: C.ink,
          }}
        />
        <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.ink3, whiteSpace: "nowrap" }}>
          {tanim.birim}
        </span>
      </div>
    </div>
  );
}

export default function Hedefler({ hedef, setHedef, buKurulumTps, buKurulumAd, acikBaslangic = false }) {
  const [acik, setAcik] = React.useState(acikBaslangic);
  const guncelle = (k, v) => setHedef({ ...hedef, [k]: v });
  const varsayilanMi = ALANLAR.every((a) => hedef[a.k] === VARSAYILAN_HEDEF[a.k]);

  return (
    <Kutu style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={acik}
        onClick={() => setAcik((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAcik((v) => !v); } }}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 12, padding: "12px 15px", cursor: "pointer", flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.steel }}>{acik ? "▾" : "▶"}</span>
          <div>
            <Etiket>Performans hedefleri ve kapasite varsayımları</Etiket>
            <div style={{ fontSize: 12, color: C.ink2, marginTop: 2 }}>
              {acik
                ? "Bu dört değer neyin kabul edilebilir sayıldığını belirler."
                : `İlk token ≤ ${hedef.ttftMs} ms · hız ≥ ${hedef.tps} tok/s · sohbet ×${hedef.sohbetKat} · ajan ×${hedef.ajanKat}`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!varsayilanMi && (
            <button
              onClick={(e) => { e.stopPropagation(); setHedef({ ...VARSAYILAN_HEDEF }); }}
              style={{
                fontFamily: SANS, fontSize: 11.5, padding: "4px 9px", borderRadius: 3,
                border: `1px solid ${C.line}`, background: C.paper, color: C.ink2, cursor: "pointer",
              }}
            >
              Varsayılana dön
            </button>
          )}
        </div>
      </div>

      {acik && (
        <div style={{ padding: "0 15px 15px", borderTop: `1px solid ${C.line2}` }}>
          <p style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.65, margin: "12px 0 14px", maxWidth: 780 }}>
            Her satırın <b>Maks. C</b>, <b>sohbet kapasitesi</b> ve <b>ajan kapasitesi</b> değeri bu
            hedeflerden yeniden hesaplanır; token hızı ve ilk token sütunlarının yeşil/kırmızı
            renklendirmesi de bunları izler. <b>Burada hiçbir satır filtrelenmez</b> — değişen şey,
            sayıların ne anlama geldiğidir.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "14px 18px", marginBottom: 16 }}>
            {ALANLAR.map((a) => (
              <Alan key={a.k} tanim={a} deger={hedef[a.k]} onChange={(v) => guncelle(a.k, v)} />
            ))}
          </div>

          <HizOrnegi
            tps={hedef.tps}
            etiket="hedef"
            ikinciTps={buKurulumTps > 0 ? buKurulumTps : null}
            ikinciEtiket={buKurulumAd || "bu kurulum"}
          />

          <div style={{ marginTop: 12, fontSize: 11.5, color: C.ink3, lineHeight: 1.65 }}>
            <b style={{ color: C.ink2 }}>Eşzamanlılık (C) kullanıcı sayısı değildir.</b> C, modelin aynı
            anda işlediği istek sayısıdır. Sohbet eden bir kişi zamanının çoğunu okuyarak ve yazarak
            geçirdiği için bir yuva birden çok kişiye yeter — çarpanlar bunu ifade eder. Ajanlar
            arka arkaya istek attığı için çarpanları düşüktür.
          </div>
        </div>
      )}
    </Kutu>
  );
}
