import React from "react";
import { C, CHART, MONO, S, T, RADIUS, DURUM } from "../theme.js";
import { Kart, Olcum, OlcumGrubu, Bildirim, Aciklama } from "../components/ui.jsx";
import { ctxYazi, gb, para, paraTL, sureYazi, ELEKTRIK_TL_KWH } from "../engine.js";

/* ------------------------------------------------------------------ */
/*  SONUÇ PANELİ                                                       */
/*                                                                     */
/*  Sayfanın cevap verdiği yer. Sıra bilinçli:                         */
/*    1. Karar   — çalışır mı, çalışmaz mı                             */
/*    2. Üç sayı — hız, kapasite, maliyet (en büyük punto)             */
/*    3. Bellek  — neyin ne kadar yer kapladığı                        */
/*    4. Detay   — gruplanmış ölçümler                                 */
/*    5. Uyarılar                                                      */
/* ------------------------------------------------------------------ */

const HEDEF_RENK = { iyi: C.ok, sinir: C.warn, kotu: C.bad };

export default function Sonuc({
  r, kap, model, cihaz, adet, quant, qAktif, indirGibi, ctxK, girdiK,
  kullanici, cikti, kvOran, hedef, tpsDurum, ttftDurum, bildirimler,
}) {
  const iyi = r.sigar && r.doluluk <= 0.9;
  const durum = !r.sigar
    ? { tip: "tehlike", ad: "Belleğe sığmıyor", ozet: `${gb(r.gerekliGB)} GB gerekiyor, ${gb(r.toplamBellek)} GB var.` }
    : r.doluluk > 0.9
    ? { tip: "uyari", ad: "Sınırda çalışır", ozet: `Bellek %${Math.round(r.doluluk * 100)} dolu — üretimde risk taşır.` }
    : { tip: "olumlu", ad: "Rahat çalışır", ozet: `Bellek %${Math.round(r.doluluk * 100)} dolu, pay var.` };
  const [dRenk, dZemin] = DURUM[durum.tip];

  const yuzde = (x) => Math.max(0, Math.min(100, (x / r.toplamBellek) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: S.md }}>
      {/* ---------- 1 + 2: karar ve başlıca sayılar ---------- */}
      <Kart vurgu={dRenk} style={{ overflow: "hidden" }}>
        <div
          style={{
            background: dZemin, borderBottom: `1px solid ${dRenk}40`,
            padding: `${S.md}px ${S.lg}px`, display: "flex",
            justifyContent: "space-between", alignItems: "baseline", gap: S.md, flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ ...T.baslik, color: dRenk }}>{durum.ad}</div>
            <div style={{ ...T.kucuk, color: C.ink2, marginTop: 2 }}>{durum.ozet}</div>
          </div>
          <div style={{ ...T.mini, color: C.ink2, textAlign: "right", maxWidth: 340 }}>
            {adet} × {cihaz.ad}
            {adet > 1 ? " · tek küme" : ""}
            <br />
            {model.ad} · {indirGibi ? "BF16, kuantizasyon yok" : qAktif.ad}
          </div>
        </div>

        <div
          style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: S.lg, padding: S.lg,
          }}
        >
          <Olcum
            boy="dev" etiket="Kullanıcı başına hız"
            deger={r.sigar ? r.kullaniciTokS.toFixed(1) : "—"} birim="tok/s"
            renk={r.sigar ? HEDEF_RENK[tpsDurum] : C.ink3}
            alt={`hedef ≥ ${hedef.tps} tok/s`}
          />
          <Olcum
            boy="dev" etiket="Sohbet kapasitesi"
            deger={kap.maxC ? kap.sohbet : "0"} birim="kişi"
            renk={kap.maxC ? C.ok : C.bad}
            alt={kap.maxC
              ? `${kap.maxC} eşzamanlı istek × ${hedef.sohbetKat}`
              : kap.sebep === "bellek" ? "tek istekte bile sığmıyor"
              : kap.sebep === "hiz" ? "tek istekte bile hız yetersiz"
              : "tek istekte bile ilk token uzun"}
          />
          <Olcum
            boy="dev" etiket="Donanım yatırımı"
            deger={paraTL(r.maliyetTL)} birim=""
            alt={`${para(r.maliyet)} · ${r.guc} W${r.host?.ad ? ` · ${r.host.ad} dahil` : ""}`}
          />
        </div>
      </Kart>

      {/* ---------- 3: bellek bütçesi ---------- */}
      <Kart style={{ padding: S.lg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: S.sm, marginBottom: S.sm + 2, flexWrap: "wrap" }}>
          <span style={{ ...T.etiket, color: C.ink3 }}>Bellek bütçesi · {adet} cihaz toplamı</span>
          <span style={{ ...T.sayi, fontSize: 12.5, color: C.ink2 }}>
            {gb(r.gerekliGB)} / {gb(r.toplamBellek)} GB
          </span>
        </div>

        <div
          style={{
            display: "flex", height: 26, background: C.line2,
            border: `1px solid ${C.line}`, borderRadius: RADIUS.sm,
            overflow: "hidden", marginBottom: S.md,
          }}
        >
          <div style={{ width: `${yuzde(r.agirlikGB)}%`, background: CHART.steel }} title={`Ağırlıklar ${gb(r.agirlikGB)} GB`} />
          <div style={{ width: `${yuzde(r.kvGB)}%`, background: CHART.kv }} title={`KV cache ${gb(r.kvGB)} GB`} />
          <div style={{ width: `${yuzde(r.ekGB)}%`, background: C.ovh }} title={`Çalışma zamanı ${gb(r.ekGB)} GB`} />
        </div>

        <div style={{ display: "flex", gap: S.lg, flexWrap: "wrap", ...T.mini }}>
          {[
            ["Ağırlıklar", r.agirlikGB, CHART.steel],
            ["KV cache", r.kvGB, CHART.kv],
            ["Çalışma zamanı", r.ekGB, C.ovh],
            ["Boşta", Math.max(0, r.toplamBellek - r.gerekliGB), C.line],
          ].map(([ad, v, renk]) => (
            <span key={ad} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 9, height: 9, background: renk, borderRadius: 2, display: "inline-block" }} />
              <span style={{ color: C.ink2 }}>{ad}</span>
              <span style={{ fontFamily: MONO, color: C.ink }}>{gb(v)} GB</span>
            </span>
          ))}
        </div>

        <Aciklama>
          KV cache: {kullanici} kullanıcı × {ctxYazi(ctxK)} bağlam × %{kvOran} doluluk ×{" "}
          {r.kvKBtok.toFixed(0)} KB/token = <b style={{ color: C.ink2 }}>{gb(r.kvGB)} GB</b>.
          Kullanıcı başına {gb(r.kvKullaniciGB)} GB.
        </Aciklama>
      </Kart>

      {/* ---------- 4: gruplanmış ölçümler ---------- */}
      <Kart style={{ padding: S.lg }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: `${S.xl}px ${S.xl}px` }}>
          <OlcumGrubu baslik="Hız">
            <Olcum
              etiket="İlk token" deger={r.sigar ? sureYazi(r.ttftYogun) : "—"}
              renk={r.sigar ? HEDEF_RENK[ttftDurum] : C.ink3}
              alt={`hedef ≤ ${hedef.ttftMs} ms`} />
            <Olcum
              etiket="Toplam verim" deger={r.sigar ? Math.round(r.toplamTokS) : "—"} birim="tok/s"
              alt={`${kullanici} eşzamanlı`} />
            <Olcum
              etiket="Tam yanıt" deger={r.sigar ? sureYazi(r.yanitSure) : "—"}
              alt={`${cikti} token`} />
          </OlcumGrubu>

          <OlcumGrubu baslik="Kapasite">
            <Olcum
              etiket="Maks. eşzamanlılık" deger={kap.maxC || "0"} birim="istek"
              renk={kap.maxC ? C.ink : C.bad}
              alt="hedefleri karşılayan en yüksek C" />
            <Olcum
              etiket="Ajan kapasitesi" deger={kap.ajan || "0"} birim="kişi"
              renk={kap.ajan ? C.steel : C.bad}
              alt={`Maks. C × ${hedef.ajanKat}`} />
            <Olcum
              etiket="Bellek tavanı" deger={r.maxKullanici} birim="kişi"
              alt="hız gözetmeden sığan" />
          </OlcumGrubu>

          <OlcumGrubu baslik="İşletme">
            <Olcum
              etiket="Yıllık elektrik" deger={paraTL(r.yillikElektrikTL)}
              alt={`7/24 · ${ELEKTRIK_TL_KWH} TL/kWh`} />
            <Olcum
              etiket="Bağlam tavanı" deger={ctxYazi(Math.floor(r.maxCtxK))}
              alt={r.maxCtxModelSinirli ? "modelin sınırı" : `${kullanici} kullanıcıyla`} />
            <Olcum
              etiket="MoE verimi" deger={`%${Math.round(r.moeVerim * 100)}`}
              renk={r.moeVerim < 0.5 ? C.warn : C.ink}
              alt={r.moeVerim >= 0.999 ? "dense model" : "seyrek erişim kaybı"}
              ipucu="Seyrek MoE'de her adımda farklı uzmanlar okunur; erişim dağınık olduğu için gerçekleşen bant genişliği düşer. Etki LPDDR birleşik bellekte ağır, HBM'de hafiftir." />
          </OlcumGrubu>
        </div>
      </Kart>

      {/* ---------- 5: uyarılar ---------- */}
      <Kart style={{ padding: S.lg }}>
        <div style={{ ...T.etiket, color: C.ink3, marginBottom: S.md }}>
          Notlar ve uyarılar
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: S.sm }}>
          {bildirimler.map((b, i) => <Bildirim key={i} {...b} />)}
        </div>
      </Kart>
    </div>
  );
}
