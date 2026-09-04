import React from "react";
import { C, MONO, S, T } from "../theme.js";
import { Bolum, MiniSecim, Aciklama, TabloSarici, thStil, tdStil } from "../components/ui.jsx";
import { DEVICES, TR_DURUM, ANA_SISTEM } from "../data/devices.js";
import { MODELS, AILE_SIRA } from "../data/models.js";
import { QUANTS } from "../data/quants.js";
import { hesapla, kapasite, hedefDurumu, kvTipi, ctxYazi, para, paraTL, sureYazi } from "../engine.js";

const HEDEF_RENK = { iyi: C.ok, sinir: C.warn, kotu: C.bad };

/* ------------------------------------------------------------------ */
/*  DONANIM KARŞILAŞTIRMASI                                            */
/* ------------------------------------------------------------------ */

export function DonanimTablosu({ ortak, model, cihazId, hedef, kullanici, girdiK, ctxK, sec }) {
  const [siralama, setSiralama] = React.useState("kapasite");
  const [trFiltre, setTrFiltre] = React.useState("hepsi");

  const satirlar = React.useMemo(() => {
    const { kullanici: _y, ...taban } = ortak;
    return DEVICES.map((d) => {
      if (trFiltre !== "hepsi" && d.tr !== trFiltre) return null;
      let bulunan = null;
      for (let n = 1; n <= 32; n++) {
        const h = hesapla({ ...ortak, model, cihaz: d, adet: n });
        if (h.sigar) { bulunan = { n, h }; break; }
      }
      if (!bulunan) return null;
      const { n, h } = bulunan;
      const k = kapasite({ ...taban, model, cihaz: d, adet: n }, hedef);
      return {
        d, n, kisiBasi: h.kullaniciTokS, toplam: h.toplamTokS, ttft: h.ttftYogun,
        maliyet: h.maliyet, maliyetTL: h.maliyetTL, guc: h.guc,
        maxC: k.maxC, sohbet: k.sohbet, ajan: k.ajan, sebep: k.sebep,
        kisiBasiMaliyet: k.sohbet > 0 ? h.maliyetTL / k.sohbet : Infinity,
      };
    })
      .filter(Boolean)
      .sort((a, b) => {
        if (siralama === "kapasite") return b.sohbet - a.sohbet;
        if (siralama === "verim") return b.toplam - a.toplam;
        if (siralama === "hiz") return b.kisiBasi - a.kisiBasi;
        if (siralama === "ucuz") return a.maliyet - b.maliyet;
        if (siralama === "guc") return a.guc - b.guc;
        return a.kisiBasiMaliyet - b.kisiBasiMaliyet;
      });
  }, [ortak, model, siralama, trFiltre, hedef]);

  const basliklar = [
    ["Donanım", "left", ""],
    ["Adet", "right", "Bu iş yükünü belleğe sığdıran en az cihaz sayısı"],
    ["Kişi/s", "right", `${kullanici} eşzamanlı istekte kullanıcı başına hız · hedef ≥ ${hedef.tps}`],
    ["TTFT", "right", `Time to first token — ${kullanici} eşzamanlı istekte ilk token gecikmesi · hedef ≤ ${hedef.ttftMs} ms`],
    ["Maks. C", "right", "Her iki hedefin de tutulduğu en yüksek eşzamanlı istek"],
    ["Sohbet", "right", `Maks. C × ${hedef.sohbetKat} kişi`],
    ["Ajan", "right", `Maks. C × ${hedef.ajanKat} kişi`],
    ["Maliyet", "right", "Donanım + ana sistem, Türkiye yaklaşığı"],
    ["₺/kişi", "right", "Sohbet kullanıcısı başına donanım maliyeti"],
    ["Güç", "right", "Toplam çekiş"],
  ];

  return (
    <Bolum
      baslik="Tüm donanımlar, bu iş yükü için"
      aciklama={`${model.ad} · ${ctxYazi(ctxK)} bağlam · ${ctxYazi(girdiK)} prompt · hedef ≥${hedef.tps} tok/s, ≤${hedef.ttftMs} ms`}
      ic={false}
      sag={
        <>
          <MiniSecim etiket="Tedarik filtresi" deger={trFiltre} onChange={setTrFiltre}>
            <option value="hepsi">Tedarik: hepsi</option>
            <option value="kolay">Sadece TR'de satılan</option>
            <option value="sinirli">Siparişle gelenler</option>
            <option value="ithal">İthal</option>
            <option value="kurumsal">Kurumsal kanal</option>
          </MiniSecim>
          <MiniSecim etiket="Sıralama" deger={siralama} onChange={setSiralama}>
            <option value="kapasite">Sırala: sohbet kapasitesi</option>
            <option value="kisiMaliyet">Sırala: kullanıcı başına maliyet</option>
            <option value="hiz">Sırala: kişi başına hız</option>
            <option value="verim">Sırala: toplam verim</option>
            <option value="ucuz">Sırala: en ucuz</option>
            <option value="guc">Sırala: en az güç</option>
          </MiniSecim>
        </>
      }
    >
      <TabloSarici>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${C.line}` }}>
            {basliklar.map(([h, a, ip]) => (
              <th key={h} title={ip} style={{ ...thStil, textAlign: a }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((row) => {
            const secili = row.d.id === cihazId;
            return (
              <tr
                key={row.d.id}
                onClick={() => sec(row.d.id, row.n)}
                style={{
                  borderBottom: `1px solid ${C.line2}`,
                  background: secili ? C.steelSoft : "transparent",
                  cursor: "pointer",
                }}
              >
                <td style={{ padding: `${S.sm}px ${S.sm + 2}px` }}>
                  <div style={{ ...T.kucuk, fontWeight: secili ? 600 : 400, color: C.ink }}>{row.d.ad}</div>
                  <div style={{ ...T.mini, color: C.ink3, fontFamily: MONO, display: "flex", alignItems: "center", gap: 5, fontSize: 10.5 }}>
                    <span title={TR_DURUM[row.d.tr].ad} style={{ width: 6, height: 6, borderRadius: "50%", background: TR_DURUM[row.d.tr].renk, display: "inline-block", flexShrink: 0 }} />
                    {row.d.mem} GB · {row.d.bw} GB/s · {TR_DURUM[row.d.tr].kisa}
                  </div>
                </td>
                {[
                  { v: `${row.n}×` },
                  { v: row.kisiBasi.toFixed(1), renk: HEDEF_RENK[hedefDurumu(row.kisiBasi, hedef.tps, true)] },
                  { v: sureYazi(row.ttft), renk: HEDEF_RENK[hedefDurumu(row.ttft * 1000, hedef.ttftMs, false)] },
                  { v: row.maxC || "0", renk: row.maxC ? C.ink : C.bad, kalin: true,
                    ip: row.maxC ? "" : row.sebep === "bellek" ? "C=1'de belleğe sığmıyor" : row.sebep === "hiz" ? "C=1'de hız hedefin altında" : "C=1'de ilk token hedefi aşılıyor" },
                  { v: row.sohbet || "0", renk: row.sohbet ? C.ok : C.bad, kalin: true },
                  { v: row.ajan || "0", renk: row.ajan ? C.steel : C.bad },
                  { v: paraTL(row.maliyetTL) },
                  { v: isFinite(row.kisiBasiMaliyet) ? paraTL(row.kisiBasiMaliyet) : "—", renk: C.ink2 },
                  { v: `${row.guc}W`, renk: C.ink3 },
                ].map((h, i) => (
                  <td key={i} title={h.ip || undefined} style={{ ...tdStil, textAlign: "right", color: h.renk || C.ink, fontWeight: h.kalin ? 600 : 400 }}>
                    {h.v}
                  </td>
                ))}
              </tr>
            );
          })}
          {!satirlar.length && (
            <tr>
              <td colSpan={10} style={{ padding: S.xl, textAlign: "center", ...T.kucuk, color: C.ink3 }}>
                Bu filtreyle hiçbir donanım bu iş yükünü 32 adede kadar taşıyamıyor. Bağlamı veya
                kullanıcı sayısını düşür, ya da kuantizasyon uygula.
              </td>
            </tr>
          )}
        </tbody>
      </TabloSarici>
      <Aciklama style={{ padding: `0 ${S.lg}px ${S.lg}px`, marginTop: S.md }}>
        <b style={{ color: C.ink2 }}>Maks. C</b>, hem hız (≥{hedef.tps} tok/s) hem ilk token
        (≤{hedef.ttftMs} ms) hedefinin tutulduğu en yüksek eşzamanlı istek sayısıdır; Sohbet ve Ajan
        sütunları bunun ×{hedef.sohbetKat} ve ×{hedef.ajanKat} katı. Satıra tıklayınca o kurulum
        panele yüklenir. Ayrık kartlara ana sistem maliyeti ve gücü eklenmiştir
        ({ANA_SISTEM.map((k) => `≤${k.maxKart} kart → ${para(k.usd)}`).join(" · ")}); hazır kutular
        kendi başına bilgisayar olduğu için ek almaz.
      </Aciklama>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/*  MODEL UYUMU                                                        */
/* ------------------------------------------------------------------ */

export function ModelTablosu({ ortak, cihaz, adet, modelId, qAktif, indirGibi, ctxK, kullanici, sec }) {
  const [sirala, setSirala] = React.useState("yetenek");
  const [aile, setAile] = React.useState("hepsi");

  const satirlar = React.useMemo(() => {
    // Kaliteyi en az bozan sığan kuantizasyonu bulmak için bayt/parametre
    // AZALAN sırada tara: ilk sığan, en yüksek hassasiyetli olandır.
    const kalitedenDusuge = [...QUANTS].sort((a, b) => b.bpp - a.bpp);
    const rows = MODELS.filter((mm) => aile === "hepsi" || mm.aile === aile).map((mm) => {
      const h = hesapla({ ...ortak, model: mm, cihaz, adet });
      let cozum = null;
      if (!h.sigar) {
        for (const q of kalitedenDusuge) {
          if (q.bpp >= qAktif.bpp) continue;
          if (hesapla({ ...ortak, model: mm, quant: q.id, kvq: "q4", cihaz, adet }).sigar) { cozum = q; break; }
        }
      }
      return { mm, sigar: h.sigar, kisi: h.kullaniciTokS, toplam: h.toplamTokS, doluluk: h.doluluk, cozum };
    });
    rows.sort((a, b) => {
      if (a.sigar !== b.sigar) return a.sigar ? -1 : 1;
      if (a.sigar) {
        if (sirala === "hiz") return b.kisi - a.kisi;
        if (sirala === "verim") return b.toplam - a.toplam;
        if (sirala === "yeni") return MODELS.indexOf(a.mm) - MODELS.indexOf(b.mm);
      }
      return b.mm.tp - a.mm.tp;
    });
    return rows;
  }, [ortak, cihaz, adet, sirala, aile, qAktif.bpp]);

  const sigan = satirlar.filter((x) => x.sigar).length;
  const aileler = AILE_SIRA.filter((a) => MODELS.some((m) => m.aile === a));

  return (
    <Bolum
      baslik="Bu donanıma hangi modeller sığar?"
      aciklama={`${adet} × ${cihaz.ad} · ${indirGibi ? "BF16" : qAktif.ad} · ${ctxYazi(ctxK)} · ${kullanici} kullanıcı · ${sigan}/${satirlar.length} model sığıyor`}
      ic={false}
      sag={
        <>
          <MiniSecim etiket="Aile filtresi" deger={aile} onChange={setAile}>
            <option value="hepsi">Aile: hepsi</option>
            {aileler.map((a) => <option key={a} value={a}>{a}</option>)}
          </MiniSecim>
          <MiniSecim etiket="Sıralama" deger={sirala} onChange={setSirala}>
            <option value="yetenek">Sırala: en büyük</option>
            <option value="hiz">Sırala: kişi başına hız</option>
            <option value="verim">Sırala: toplam verim</option>
            <option value="yeni">Sırala: veritabanı sırası</option>
          </MiniSecim>
        </>
      }
    >
      <TabloSarici yukseklik={520}>
        <thead>
          <tr style={{ borderBottom: `1.5px solid ${C.line}` }}>
            {[["Model", "left"], ["Boyut", "right"], ["Durum", "left"], ["Kişi/s", "right"], ["Toplam", "right"], ["%Dolu", "right"]].map(([h, a]) => (
              <th key={h} style={{ ...thStil, textAlign: a, position: "sticky", top: 0, background: C.paper, zIndex: 1 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((row) => {
            const secili = row.mm.id === modelId;
            return (
              <tr
                key={row.mm.id}
                onClick={() => sec(row.mm.id, row.sigar ? null : row.cozum)}
                style={{
                  borderBottom: `1px solid ${C.line2}`,
                  background: secili ? C.steelSoft : "transparent",
                  cursor: "pointer", opacity: row.sigar ? 1 : 0.62,
                }}
              >
                <td style={{ padding: `${S.sm}px ${S.sm + 2}px` }}>
                  <div style={{ ...T.kucuk, fontWeight: secili ? 600 : 400, color: C.ink }}>{row.mm.ad}</div>
                  <div style={{ ...T.mini, fontSize: 10.5, color: C.ink3, fontFamily: MONO }}>
                    {row.mm.aile} · {row.mm.lis} · {kvTipi(row.mm.kv)}
                  </div>
                </td>
                <td style={{ ...tdStil, textAlign: "right" }}>
                  {row.mm.tp}B{row.mm.ap !== row.mm.tp ? <span style={{ color: C.ink3 }}>/{row.mm.ap}</span> : null}
                </td>
                <td style={{ ...tdStil, textAlign: "left" }}>
                  {row.sigar ? (
                    <span style={{ color: row.doluluk > 0.9 ? C.warn : C.ok, fontWeight: 500 }}>
                      {row.doluluk > 0.9 ? "sınırda" : "✓ sığar"}
                    </span>
                  ) : row.cozum ? (
                    <span style={{ color: C.steel, fontSize: 11.5 }} title={`${row.cozum.ad} + Q4 KV ile sığar`}>
                      {row.cozum.ad.split(" ")[0]} ile
                    </span>
                  ) : (
                    <span style={{ color: C.bad }}>sığmaz</span>
                  )}
                </td>
                <td style={{ ...tdStil, textAlign: "right", color: row.sigar && row.kisi < 10 ? C.warn : C.ink }}>
                  {row.sigar ? row.kisi.toFixed(1) : "—"}
                </td>
                <td style={{ ...tdStil, textAlign: "right" }}>{row.sigar ? Math.round(row.toplam) : "—"}</td>
                <td style={{ ...tdStil, textAlign: "right", color: C.ink3 }}>
                  {row.sigar ? `%${Math.round(row.doluluk * 100)}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TabloSarici>
      <Aciklama style={{ padding: `0 ${S.lg}px ${S.lg}px`, marginTop: S.md }}>
        Sığmayanlarda "X ile" ifadesi, o modeli bu donanıma sığdıran <b>kaliteyi en az bozan</b>
        {" "}ağırlık kuantizasyonunu (KV cache Q4 ile birlikte) gösterir. Satıra tıklayınca model
        yüklenir; sığmıyorsa önerilen kuantizasyon da otomatik uygulanır.
      </Aciklama>
    </Bolum>
  );
}
