import React, { useEffect, useRef, useState } from "react";
import { C, CHART, S, T, RADIUS, DURUM, GOLGE } from "../theme.js";
import { Kart, Olcum, OlcumGrubu, Bildirim, Aciklama, Ipucu, DurumSimge } from "../components/ui.jsx";
import { ctxYazi, gb, para, paraTL, sureYazi, ELEKTRIK_TL_KWH } from "../engine.js";

/* ------------------------------------------------------------------ */
/*  SONUÇ PANELİ                                                       */
/*                                                                     */
/*  Sayfanın cevap verdiği yer. Sıra bilinçli:                         */
/*    1. Karar    — çalışır mı, çalışmaz mı + dört temel sayı          */
/*    2. Bellek   — neyin ne kadar yer kapladığı                       */
/*    3. Deneyim  — kullanıcının ekranda göreceği sohbet               */
/*    4. Ayrıntı  — gruplanmış ölçümler                                */
/*    5. Notlar   — önem sırasıyla                                     */
/* ------------------------------------------------------------------ */

const HEDEF_RENK = { iyi: C.ok, sinir: C.warn, kotu: C.bad };

/* Notlar önem sırasıyla: önce engeller, sonra uyarılar. Bilgi notları
   ilk bakışta kalabalık yapıyordu; ilk birkaçı görünür, gerisi katlanır. */
const ONEM = { tehlike: 0, uyari: 1, olumlu: 2, bilgi: 3 };
const ILK_NOT = 4;
const NOT_AD = { tehlike: "engel", uyari: "uyarı", olumlu: "olumlu", bilgi: "bilgi" };

/* Ana sonuç kartı ekrandan çıkınca (kaydıraklarla oynarken, ya da dar
   ekranda kontroller sonucun üstünde kaldığında) temel sayılar ince bir
   çubukta görünür kalır — ayarı değiştirip etkisini görmek için yukarı
   kaydırmak gerekmesin. */
function OzetCubugu({ gorunur, durum, renk, r, kap, model, cihaz, adet, tpsDurum, ttftDurum, hedefe }) {
  const parca = (etiket, deger, birim, rnk) => (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5, whiteSpace: "nowrap" }}>
      <span style={{ ...T.mini, color: C.ink3 }}>{etiket}</span>
      <span style={{ ...T.sayi, fontSize: 14, color: rnk || C.ink }}>{deger}</span>
      {birim && <span style={{ fontSize: 11.5, color: C.ink3 }}>{birim}</span>}
    </span>
  );
  return (
    <div
      aria-hidden={!gorunur}
      style={{
        position: "fixed", top: "var(--ust-h)", left: 0, right: 0, zIndex: 44,
        background: C.paper, borderBottom: `1px solid ${C.line}`,
        boxShadow: GOLGE.orta,
        transform: gorunur ? "translateY(0)" : "translateY(-110%)",
        visibility: gorunur ? "visible" : "hidden",
        transition: "transform .18s ease, visibility .18s",
      }}
    >
      <button
        onClick={hedefe} tabIndex={gorunur ? 0 : -1}
        title="Sonuca git"
        style={{
          all: "unset", boxSizing: "border-box", cursor: "pointer", display: "flex",
          alignItems: "center", gap: `${S.xs}px ${S.lg}px`, flexWrap: "wrap",
          maxWidth: 1480, width: "100%", margin: "0 auto", padding: `${S.sm}px 24px`,
          fontFamily: "inherit",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: renk, flexShrink: 0 }} />
          <span style={{ ...T.kucuk, fontWeight: 600, color: renk, whiteSpace: "nowrap" }}>{durum}</span>
          <span className="ozet-cubugu-kurulum" style={{ ...T.mini, color: C.ink3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 380 }}>
            {model.ad} · {adet} × {cihaz.ad}
          </span>
        </span>
        <span className="ozet-cubugu-metrikler" style={{ display: "inline-flex", gap: `${S.xs}px ${S.lg}px`, flexWrap: "wrap", marginLeft: "auto" }}>
          {parca("hız", r.sigar ? r.kullaniciTokS.toFixed(1) : "—", "tok/s", r.sigar ? HEDEF_RENK[tpsDurum] : C.ink3)}
          {parca("ilk token", r.sigar ? sureYazi(r.ttftYogun) : "—", "", r.sigar ? HEDEF_RENK[ttftDurum] : C.ink3)}
          {parca("sohbet", kap.maxC ? kap.sohbet : "0", "kişi", kap.maxC ? C.ok : C.bad)}
          <span className="ozet-cubugu-bellek">{parca("bellek", `%${Math.round(Math.min(r.doluluk, 9.99) * 100)}`, "", r.sigar ? (r.doluluk > 0.9 ? C.warn : C.ink) : C.bad)}</span>
          <span className="ozet-cubugu-fiyat">{parca("yatırım", paraTL(r.maliyetTL))}</span>
        </span>
      </button>
    </div>
  );
}

/* Dört temel sayıdan biri. Rengi hedefe göre; altındaki satır neyle
   kıyaslandığını söyler. */
function Kpi({ etiket, deger, birim, renk, alt, durum, ipucu }) {
  const DURUM_AD = { iyi: ["hedefte", C.ok], sinir: ["sınırda", C.warn], kotu: ["hedef dışı", C.bad] };
  const d = durum && DURUM_AD[durum];
  return (
    <div style={{ padding: `${S.lg}px ${S.lg + 4}px`, minWidth: 0 }}>
      <div style={{ ...T.mini, color: C.ink3, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {etiket}
        {ipucu && <Ipucu>{ipucu}</Ipucu>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
        <span style={{ ...T.sayi, fontSize: 30, lineHeight: 1.05, color: renk || C.ink }}>{deger}</span>
        {birim && <span style={{ fontSize: 13, color: C.ink3, fontWeight: 500 }}>{birim}</span>}
      </div>
      <div style={{ ...T.mini, color: C.ink3, marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {d && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: d[1], fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: d[1] }} />
            {d[0]}
          </span>
        )}
        <span>{alt}</span>
      </div>
    </div>
  );
}

export default function Sonuc({
  r, kap, model, cihaz, adet, quant, qAktif, indirGibi, ctxK, girdiK,
  kullanici, cikti, kvOran, hedef, tpsDurum, ttftDurum, bildirimler, deneyim, isYuku,
}) {
  const durum = !r.sigar
    ? { tip: "tehlike", ad: "Belleğe sığmıyor", ozet: `${gb(r.gerekliGB)} GB gerekiyor, ${gb(r.toplamBellek)} GB var.` }
    : r.doluluk > 0.9
    ? { tip: "uyari", ad: "Sınırda çalışır", ozet: `Bellek %${Math.round(r.doluluk * 100)} dolu — üretimde risk taşır.` }
    : { tip: "olumlu", ad: "Rahat çalışır", ozet: `Bellek %${Math.round(r.doluluk * 100)} dolu, büyümek için pay var.` };
  const [dRenk, dZemin] = DURUM[durum.tip];

  const yuzde = (x) => Math.max(0, Math.min(100, (x / r.toplamBellek) * 100));

  /* Ana kart görünür değilken özet çubuğunu göster. Sayfanın en üstündeyken
     (başlık okunurken) çubuk gereksiz kalabalık yapar, o yüzden biraz
     kaydırılmış olmak da şart. */
  const kartRef = useRef(null);
  const [kartGorunur, setKartGorunur] = useState(true);
  const [kaydirildi, setKaydirildi] = useState(false);
  useEffect(() => {
    const el = kartRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([g]) => setKartGorunur(g.isIntersecting), { threshold: 0 });
    io.observe(el);
    const kaydir = () => setKaydirildi(window.scrollY > 140);
    kaydir();
    window.addEventListener("scroll", kaydir, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", kaydir); };
  }, []);

  const [tumNotlar, setTumNotlar] = useState(false);
  const sirali = [...bildirimler].sort((a, b) => (ONEM[a.tip] ?? 9) - (ONEM[b.tip] ?? 9));
  /* Engel ve uyarılar asla katlanmaz; katlanan yalnızca bilgi notlarıdır. */
  const zorunlu = sirali.filter((b) => b.tip === "tehlike" || b.tip === "uyari").length;
  const gorunenSayi = tumNotlar ? sirali.length : Math.max(zorunlu, ILK_NOT);
  const gizli = sirali.length - gorunenSayi;
  const sayilar = Object.entries(
    sirali.reduce((o, b) => ({ ...o, [b.tip]: (o[b.tip] || 0) + 1 }), {})
  );

  const bellekParcalari = [
    ["Ağırlıklar", r.agirlikGB, CHART.steel],
    ["KV cache", r.kvGB, CHART.kv],
    ["Çalışma zamanı", r.ekGB, "var(--ovh)"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: S.lg }}>
      <OzetCubugu
        gorunur={!kartGorunur && kaydirildi} durum={durum.ad} renk={dRenk}
        r={r} kap={kap} model={model} cihaz={cihaz} adet={adet}
        tpsDurum={tpsDurum} ttftDurum={ttftDurum}
        hedefe={() => kartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      {/* ---------- 1: karar ve dört temel sayı ---------- */}
      <Kart ref={kartRef} style={{ overflow: "hidden", scrollMarginTop: "calc(var(--ust-h) + 16px)", boxShadow: GOLGE.orta }}>
        <div
          style={{
            padding: `${S.lg + 2}px ${S.lg + 4}px`,
            background: `linear-gradient(180deg, ${dZemin}, transparent)`,
            display: "flex", alignItems: "flex-start", gap: S.md,
          }}
        >
          <DurumSimge tip={durum.tip} boy={34} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: `${S.xs}px ${S.md}px`, flexWrap: "wrap" }}>
              <span style={{ ...T.baslik, fontSize: 20, color: dRenk }}>{durum.ad}</span>
              <span style={{ ...T.kucuk, color: C.ink2 }}>{durum.ozet}</span>
            </div>
            <div style={{ ...T.kucuk, color: C.ink3, marginTop: 3 }}>
              <b style={{ color: C.ink, fontWeight: 600 }}>{model.ad}</b>
              {" · "}{adet} × {cihaz.ad}{adet > 1 ? " (tek küme)" : ""}
              {" · "}{indirGibi ? "BF16" : qAktif.ad}
              {isYuku ? ` · ${isYuku}` : ""}
            </div>
          </div>
        </div>

        <div className="kpi-izgara" style={{ borderTop: `1px solid ${C.line2}` }}>
          <Kpi
            etiket="Kullanıcı başına hız"
            deger={r.sigar ? r.kullaniciTokS.toFixed(1) : "—"} birim="tok/s"
            renk={r.sigar ? HEDEF_RENK[tpsDurum] : C.ink3}
            durum={r.sigar ? tpsDurum : null}
            alt={`hedef ≥ ${hedef.tps}`}
            ipucu="Her kullanıcının ekranında cevabın yazılma hızı (token/saniye). Okuma hızı ~5-7 tok/s; 15-30 tok/s rahat hissettirir."
          />
          <Kpi
            etiket="İlk token süresi"
            deger={r.sigar ? sureYazi(r.ttftYogun) : "—"}
            renk={r.sigar ? HEDEF_RENK[ttftDurum] : C.ink3}
            durum={r.sigar ? ttftDurum : null}
            alt={`hedef ≤ ${hedef.ttftMs} ms`}
            ipucu="Soruyu gönderdikten sonra cevabın ilk harfi gelene kadar geçen süre (yoğun anda). Prompt işleme (prefill) süresi artı kuyrukta bekleme."
          />
          <Kpi
            etiket="Kapasite"
            deger={kap.maxC ? kap.sohbet : "0"} birim="sohbet kullanıcısı"
            renk={kap.maxC ? C.ink : C.bad}
            alt={kap.maxC
              ? `veya ${kap.ajan} ajan · ${kap.maxC} eşzamanlı istek`
              : kap.sebep === "bellek" ? "tek istekte bile sığmıyor"
              : kap.sebep === "hiz" ? "tek istekte bile hız yetersiz"
              : "tek istekte bile ilk token uzun"}
            ipucu={`Hız ve ilk token hedeflerini tutturarak aynı anda işlenebilen istek sayısı (${kap.maxC || 0}), sohbet çarpanı ×${hedef.sohbetKat} ve ajan çarpanı ×${hedef.ajanKat} ile kullanıcıya çevrilir. Çarpanlar aşağıdaki "Performans hedefleri" bölümünden değişir.`}
          />
          <Kpi
            etiket="Donanım yatırımı"
            deger={paraTL(r.maliyetTL)}
            alt={`${para(r.maliyet)} · ${r.guc} W${r.host?.ad ? ` · ${r.host.ad} dahil` : ""}`}
            ipucu="Kart(lar) ve onları taşıyacak ana sistemin yaklaşık Türkiye fiyatı. Kur ve stok fiyatı ±%15 oynatabilir."
          />
        </div>
      </Kart>

      {/* ---------- 2: bellek bütçesi ---------- */}
      <Kart style={{ padding: `${S.lg + 2}px ${S.lg + 4}px` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: S.sm, marginBottom: S.md, flexWrap: "wrap" }}>
          <span style={{ ...T.altBaslik, color: C.ink }}>
            Bellek bütçesi
            <span style={{ ...T.mini, color: C.ink3, fontWeight: 400, marginLeft: 8 }}>{adet} cihaz toplamı</span>
          </span>
          <span style={{ ...T.sayi, fontSize: 14, color: C.ink2 }}>
            {gb(r.gerekliGB)} <span style={{ color: C.ink3, fontWeight: 500 }}>/ {gb(r.toplamBellek)} GB</span>
            <span style={{ marginLeft: 8, color: r.sigar ? (r.doluluk > 0.9 ? C.warn : C.ok) : C.bad }}>
              %{Math.round(Math.min(r.doluluk, 9.99) * 100)}
            </span>
          </span>
        </div>

        <div
          role="img"
          aria-label={`Bellek: ağırlıklar ${gb(r.agirlikGB)} GB, KV cache ${gb(r.kvGB)} GB, çalışma zamanı ${gb(r.ekGB)} GB, toplam ${gb(r.toplamBellek)} GB`}
          style={{ display: "flex", gap: 3, height: 14, background: C.line2, borderRadius: RADIUS.hap, overflow: "hidden", marginBottom: S.md }}
        >
          {bellekParcalari.map(([ad, v, renk]) => (
            <div key={ad} style={{ width: `${yuzde(v)}%`, background: renk, transition: "width .25s ease" }} title={`${ad} ${gb(v)} GB`} />
          ))}
        </div>

        <div style={{ display: "flex", gap: `${S.xs}px ${S.xl}px`, flexWrap: "wrap", ...T.kucuk }}>
          {[...bellekParcalari, ["Boşta", Math.max(0, r.toplamBellek - r.gerekliGB), C.line]].map(([ad, v, renk]) => (
            <span key={ad} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 10, height: 10, background: renk, borderRadius: 3, display: "inline-block" }} />
              <span style={{ color: C.ink3 }}>{ad}</span>
              <span style={{ ...T.sayi, fontWeight: 600, color: C.ink }}>{gb(v)} GB</span>
            </span>
          ))}
        </div>

        <Aciklama>
          KV cache = {kullanici} kullanıcı × {ctxYazi(ctxK)} bağlam × %{kvOran} doluluk ×{" "}
          {r.kvKBtok.toFixed(0)} KB/token = <b style={{ color: C.ink2 }}>{gb(r.kvGB)} GB</b>
          {" "}(kullanıcı başına {gb(r.kvKullaniciGB)} GB).
        </Aciklama>
      </Kart>

      {/* ---------- 3: deneyim ---------- */}
      {deneyim}

      {/* ---------- 4: gruplanmış ölçümler ---------- */}
      <Kart style={{ padding: `${S.lg + 2}px ${S.lg + 4}px` }}>
        <div style={{ ...T.altBaslik, color: C.ink, marginBottom: S.lg }}>Ayrıntılar</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: `${S.xl}px ${S.xl}px` }}>
          <OlcumGrubu baslik="Hız">
            <Olcum
              etiket="Toplam verim" deger={r.sigar ? Math.round(r.toplamTokS) : "—"} birim="tok/s"
              alt={`${kullanici} eşzamanlı`}
              ipucu="Throughput: tüm kullanıcılar toplamında saniyede üretilen token. Batching sayesinde eşzamanlılık arttıkça yükselir." />
            <Olcum
              etiket="Tam yanıt" deger={r.sigar ? sureYazi(r.yanitSure) : "—"}
              alt={`${cikti} token`} />
            <Olcum
              etiket="MoE verimi" deger={`%${Math.round(r.moeVerim * 100)}`}
              renk={r.moeVerim < 0.5 ? C.warn : C.ink}
              alt={r.moeVerim >= 0.999 ? "dense model" : "seyrek erişim kaybı"}
              ipucu="Seyrek MoE'de her adımda farklı uzmanlar okunur; erişim dağınık olduğu için gerçekleşen bant genişliği düşer. Etki LPDDR birleşik bellekte ağır, HBM'de hafiftir." />
          </OlcumGrubu>

          <OlcumGrubu baslik="Kapasite">
            <Olcum
              etiket="Maks. eşzamanlılık" deger={kap.maxC || "0"} birim="istek"
              renk={kap.maxC ? C.ink : C.bad}
              alt="hedefleri tutturan en yüksek"
              ipucu="Eşzamanlılık (C) kullanıcı sayısı değildir: modelin aynı anda işlediği istek sayısıdır." />
            <Olcum
              etiket="Ajan kapasitesi" deger={kap.ajan || "0"} birim="kişi"
              renk={kap.ajan ? C.ink : C.bad}
              alt={`maks. C × ${hedef.ajanKat}`} />
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
              etiket="Güç çekişi" deger={r.guc} birim="W"
              alt="tam yükte" />
          </OlcumGrubu>
        </div>
      </Kart>

      {/* ---------- 5: notlar ---------- */}
      <Kart style={{ padding: `${S.lg + 2}px ${S.lg + 4}px` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: S.sm, marginBottom: S.md, flexWrap: "wrap" }}>
          <span style={{ ...T.altBaslik, color: C.ink }}>Notlar ve uyarılar</span>
          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sayilar.map(([tip, n]) => {
              const [renk, zemin] = DURUM[tip] || DURUM.bilgi;
              return (
                <span key={tip} style={{ ...T.sayi, fontSize: 11.5, fontWeight: 600, color: renk, background: zemin, borderRadius: RADIUS.hap, padding: "2px 9px", whiteSpace: "nowrap" }}>
                  {n} {NOT_AD[tip] || tip}
                </span>
              );
            })}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: S.sm }}>
          {sirali.slice(0, gorunenSayi).map((b, i) => <Bildirim key={`${i}-${b.baslik}`} {...b} />)}
        </div>
        {(gizli > 0 || tumNotlar) && sirali.length > ILK_NOT && (
          <button
            onClick={() => setTumNotlar((v) => !v)}
            className="dokun"
            style={{
              marginTop: S.sm, width: "100%", ...T.kucuk, fontWeight: 600,
              color: C.steel, background: C.paper2, border: `1px solid ${C.line2}`,
              borderRadius: RADIUS.md, padding: `${S.sm + 1}px ${S.md}px`, cursor: "pointer",
            }}
          >
            {tumNotlar ? "Daha az göster" : `${gizli} bilgi notu daha göster`}
          </button>
        )}
      </Kart>
    </div>
  );
}
