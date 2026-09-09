import React, { useMemo, useState } from "react";
import { C, S, T, RADIUS, MONO } from "../theme.js";
import { Kart, Dugme } from "../components/ui.jsx";
import { BANTLAR } from "../data/bantlar.js";
import { hesapla, kapasite, paraTL, USD_TRY, VARSAYILAN_HEDEF } from "../engine.js";
import { MODEL_HARITA } from "../data/models.js";
import { CIHAZ_HARITA } from "../data/devices.js";
import {
  KULLANIM, bulutAylikTL, donanimAylikTL, BULUT_MODEL, BULUT_TARIH,
  BULUT_GIRIS_USD, BULUT_CIKIS_USD, IS_GUNU, CALISMA_SAATI, KWH_TL, BAKIM_TL_AY,
  OMUR_YIL, yillikKarsilastirma,
} from "../data/bulut.js";

/* ------------------------------------------------------------------ */
/*  YÖNETİCİ ÖZETİ                                                     */
/*                                                                     */
/*  Detaylı analiz "bu donanım bu modeli kaldırır mı" sorusunu         */
/*  mühendise cevaplar. Bu ekran ise karar vericiye tek bir soruyu     */
/*  cevaplar: ALALIM MI?                                               */
/*                                                                     */
/*  Kural: burada kaydırak, kuantizasyon, MBU, tok/s YOK. İki seçim    */
/*  var (kaç kişi, ne için) ve gerisi cümleyle anlatılır. Sayı         */
/*  gösteriliyorsa yanında ne anlama geldiği yazar.                    */
/*                                                                     */
/*  Dürüstlük kuralı: riskler öneriyle AYNI ekranda ve aynı boyutta.   */
/*  Bu sayfa bir satış broşürü değil, bir karar notudur.               */
/* ------------------------------------------------------------------ */

const KISI_SECENEK = [5, 15, 40, 100];

/* Bantları kıyaslarken HEPSİNİ aynı yükle çalıştırıyoruz. Her bandın
   kendi `ayar`ındaki bağlam/prompt farklı — o ayarlar "bu sistem ne için
   alınır"ı anlatmak için var. Kapasiteleri yan yana koyacaksak yük ortak
   olmalı, yoksa "A, B'den fazla kişiye yetiyor" cümlesi donanımı değil
   ayarı ölçer. Model ve kuantizasyon banda özel kalıyor: onlar sistemin
   ne çalıştırabildiğinin parçası.

   Yük, kullanıcının seçtiği profilden geliyor — bulut faturasını
   hesaplayan token sayılarının AYNISINDAN. İkisi ayrışırsa donanımı bir
   yükle boyutlayıp faturayı başka bir yükle çıkarmış oluruz. */
const yukCikar = (profil) => ({
  ctxK: profil.ctxK,
  girdiK: Math.max(1, Math.round(profil.girisTok / 1024)),
  cikti: profil.cikisTok,
});

/* Okuma hızı kıyası: ortalama bir yetişkin dakikada ~250 kelime okur,
   yani saniyede ~4. Token ≈ 0,75 kelime (Türkçede daha düşük ama
   mertebe aynı). Yöneticiye "50 tok/s" demek bir şey ifade etmiyor;
   "okuduğundan 9 kat hızlı" ediyor. */
const OKUMA_KELIME_SN = 4;
const TOKEN_KELIME = 0.75;

function hizCumlesi(tokS) {
  const kelimeSn = tokS * TOKEN_KELIME;
  const kat = kelimeSn / OKUMA_KELIME_SN;
  // 10 katın ötesinde "48 kat" demek bir şey anlatmıyor — o noktada
  // kullanıcının yaşadığı şey artık "bekleme yok".
  if (kat >= 10) return "cevap anında dolmaya başlıyor, beklemek yok";
  if (kat >= 2) return `okuduğunuzdan ${kat.toFixed(kat < 5 ? 1 : 0)} kat hızlı yazıyor`;
  if (kat >= 1) return "okuma hızınızla başabaş yazıyor";
  return "okuma hızınızın altında — cevabı beklemeniz gerekir";
}

function Sayi({ deger, etiket, alt, renk }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...T.sayi, fontSize: 26, color: renk || C.ink, lineHeight: 1.15 }}>{deger}</div>
      <div style={{ ...T.kucuk, color: C.ink2, marginTop: 2 }}>{etiket}</div>
      {alt && <div style={{ ...T.mini, color: C.ink3, marginTop: 1 }}>{alt}</div>}
    </div>
  );
}

function Madde({ isaret, renk, children }) {
  return (
    <li style={{ display: "flex", gap: S.sm, marginBottom: S.sm, listStyle: "none" }}>
      <span style={{ color: renk, fontFamily: MONO, flexShrink: 0, fontSize: 13 }}>{isaret}</span>
      <span style={{ ...T.govde, color: C.ink2, minWidth: 0 }}>{children}</span>
    </li>
  );
}

export default function YoneticiOzeti({ hedef, kvOran, detaya }) {
  const [kisi, setKisi] = useState(15);
  const [profilId, setProfilId] = useState("sohbet");
  const [varsayimAcik, setVarsayimAcik] = useState(false);

  const profil = KULLANIM.find((p) => p.id === profilId) || KULLANIM[0];
  const h = hedef || VARSAYILAN_HEDEF;

  /* Her bandı ekibin yüküyle çalıştır, yetenleri fiyata göre sırala.
     "En ucuz yeterli" öneriyi seçiyoruz — daha pahalısını önermek için
     bir sebep olmalı, ve o sebep bu ekranda yok. */
  const secenekler = useMemo(() => {
    return BANTLAR.map((b) => {
      const model = MODEL_HARITA[b.ayar.modelId];
      const cihaz = CIHAZ_HARITA[b.ayar.cihazId];
      if (!model || !cihaz) return null;
      const { kullanici: _y, ...taban } = b.ayar;
      const arg = { ...taban, ...yukCikar(profil), model, cihaz, kvOran };
      const k = kapasite(arg, h);
      const yeter = profil.kat === "ajan" ? k.ajan : k.sohbet;
      const r = hesapla({ ...arg, kullanici: Math.max(1, Math.min(k.maxC || 1, kisi)) });
      /* Fiyat motorun bileşen toplamından DEĞİL, bandın gerçek satıcı
         fiyatından geliyor — yöneticiye gösterilen rakam ile detay
         sekmesindeki rakam aynı olmalı, yoksa sunum çöker. */
      return { b, model, cihaz, kapasiteKisi: yeter, r, maliyetTL: b.fiyatTL, guc: r.guc };
    })
      .filter(Boolean)
      .sort((a, z) => a.maliyetTL - z.maliyetTL);
  }, [kisi, profil, h, kvOran]);

  const oneri = secenekler.find((s) => s.kapasiteKisi >= kisi && s.r.sigar);
  const enBuyuk = secenekler[secenekler.length - 1];

  /* Kaç tane en büyük sistem gerekirdi — "sığmıyor" demekle yetinmeyip
     ölçeğin ne olduğunu söylemek için. */
  const gerekenAdet = enBuyuk?.kapasiteKisi > 0 ? Math.ceil(kisi / enBuyuk.kapasiteKisi) : null;

  const bulut = bulutAylikTL(kisi, profil, USD_TRY);
  const isletme = oneri ? donanimAylikTL(oneri.guc, oneri.maliyetTL) : null;
  const aylikTasarruf = isletme ? bulut.tl - isletme.toplam : 0;
  const amortiAy = oneri && aylikTasarruf > 0 ? oneri.maliyetTL / aylikTasarruf : null;

  /* Asıl kıyas: iki yolun YILLIK maliyeti. "Bir defalık 1,8 milyon" ile
     "aylık fatura"yı yan yana koymanın tek dürüst yolu donanımı ömrüne
     bölmek. Amorti süresi, donanım pahalı kaldığında 2000 ay gibi
     anlamsız sayılar üretiyor ve yöneticiye hiçbir şey söylemiyor. */
  const yillik = oneri && isletme
    ? yillikKarsilastirma(oneri.maliyetTL, isletme.toplam, bulut.tl)
    : null;

  /* Tek kutu yetmiyorsa da soruyu cevapsız bırakma: N kutuluk kümenin
     maliyeti ne, buluta göre ne zaman başa baş geliyor. */
  const kume = useMemo(() => {
    if (!enBuyuk || !gerekenAdet || gerekenAdet < 2) return null;
    const tl = enBuyuk.maliyetTL * gerekenAdet;
    const isl = donanimAylikTL(enBuyuk.guc * gerekenAdet, tl);
    const tasarruf = bulut.tl - isl.toplam;
    return { tl, isletme: isl, tasarruf, amortiAy: tasarruf > 0 ? tl / tasarruf : null };
  }, [enBuyuk, gerekenAdet, bulut.tl]);

  /* ---- Asıl soru: alalım mı? ----
     Bu ekranın tek işi bu. Her senaryoda "evet" demek onu bir broşüre
     çevirirdi; hesap ne diyorsa o yazıyor. */
  const karar = !oneri
    ? {
        renk: C.warn, etiket: "Tek sunucu yetmez",
        baslik: `${kisi} kişi için tek kutu yeterli değil`,
      }
    : yillik.fark < 0
    ? {
        renk: C.ok, etiket: "Evet, alınmalı",
        baslik: `Buluttan yılda ${paraTL(-yillik.fark)} ucuz — üstelik veri içeride kalıyor`,
      }
    : yillik.fark < yillik.bulutYillik * 0.5
    ? {
        renk: C.ok, etiket: "Alınabilir",
        baslik: `Buluttan yılda ${paraTL(yillik.fark)} pahalı — veri içeride kalsın diye ödenebilir bir fark`,
      }
    : {
        renk: C.warn, etiket: "Bu ölçekte pahalı",
        baslik: `Buluttan yılda ${paraTL(yillik.fark)} pahalıya geliyor`,
      };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* ---------------- İki soru ---------------- */}
      <Kart style={{ padding: S.lg, marginBottom: S.lg }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: S.xl }}>
          <div style={{ flex: "1 1 240px" }}>
            <div style={{ ...T.altBaslik, color: C.ink, marginBottom: S.sm }}>
              Kaç kişi kullanacak?
            </div>
            <div style={{ display: "flex", gap: S.xs, flexWrap: "wrap" }}>
              {KISI_SECENEK.map((n) => (
                <Dugme
                  key={n} tur={kisi === n ? "birincil" : "ikincil"} boy="kucuk"
                  onClick={() => setKisi(n)}
                >
                  {n} kişi
                </Dugme>
              ))}
            </div>
          </div>

          <div style={{ flex: "1 1 300px" }}>
            <div style={{ ...T.altBaslik, color: C.ink, marginBottom: S.sm }}>
              Ne için kullanacaklar?
            </div>
            <div style={{ display: "flex", gap: S.xs, flexWrap: "wrap" }}>
              {KULLANIM.map((p) => (
                <Dugme
                  key={p.id} tur={profilId === p.id ? "birincil" : "ikincil"} boy="kucuk"
                  onClick={() => setProfilId(p.id)}
                >
                  {p.ad}
                </Dugme>
              ))}
            </div>
            <div style={{ ...T.mini, color: C.ink3, marginTop: S.sm }}>{profil.aciklama}</div>
          </div>
        </div>
      </Kart>

      {/* ---------------- Öneri ---------------- */}
      {oneri ? (
        <Kart vurgu={karar.renk} style={{ padding: 0, marginBottom: S.lg, overflow: "hidden" }}>
          <div
            style={{
              background: karar.renk === C.ok ? C.okSoft : C.warnSoft,
              padding: `${S.md}px ${S.lg}px`, borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div style={{ ...T.etiket, color: karar.renk }}>{karar.etiket}</div>
            <div style={{ ...T.altBaslik, color: C.ink, marginTop: 2 }}>{karar.baslik}</div>
          </div>

          <div style={{ padding: S.lg }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: S.lg, alignItems: "baseline" }}>
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ ...T.etiket, color: C.ink3, marginBottom: 4 }}>
                  {karar.renk === C.ok ? "Kurulacak sistem" : "Kurulursa bu kurulmalı"}
                </div>
                {/* Buraya donanım modeli YAZILMAZ. Karar verici "4× RTX PRO
                    5000 Blackwell 72 GB" cümlesinden hiçbir şey anlamaz ve
                    ekranın geri kalanına da güvenmez. Ne işe yaradığı yazar;
                    teknik karşılığı kartın altında tek satır dipnot. */}
                <div style={{ ...T.dev, color: C.ink }}>
                  {oneri.kapasiteKisi} kişilik şirket içi yapay zekâ sunucusu
                </div>
                <div style={{ ...T.govde, color: C.ink2, marginTop: S.xs }}>
                  Şirketin kendi binasında duran, dışarıya hiçbir şey göndermeyen
                  bir ChatGPT benzeri sistem.
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...T.sayi, fontSize: 34, color: C.ink }}>{paraTL(oneri.maliyetTL)}</div>
                <div style={{ ...T.mini, color: C.ink3 }}>
                  bir defalık · {oneri.b.fiyat}
                </div>
              </div>
            </div>

            {/* Ne alıyoruz */}
            <div style={{ marginTop: S.lg, paddingTop: S.lg, borderTop: `1px solid ${C.line}` }}>
              <div style={{ ...T.altBaslik, color: C.ink, marginBottom: S.md }}>
                Bu parayla ne alıyoruz
              </div>
              <ul style={{ margin: 0, padding: 0 }}>
                <Madde isaret="✓" renk={C.ok}>
                  <b>{oneri.kapasiteKisi} kişi</b> aynı anda kullanabilir — ihtiyacınız {kisi} kişi.
                  {oneri.kapasiteKisi > kisi * 1.5 && " Büyümeye yeriniz var."}
                </Madde>
                <Madde isaret="✓" renk={C.ok}>
                  <b>{hizCumlesi(oneri.r.kullaniciTokS)}</b> — ilk kelime{" "}
                  {oneri.r.ttftYogun < 1
                    ? `yarım saniyeden kısa sürede`
                    : `~${oneri.r.ttftYogun.toFixed(1)} saniyede`}{" "}
                  gelir.
                </Madde>
                <Madde isaret="✓" renk={C.ok}>
                  <b>Şirket verisi binadan çıkmaz.</b> Sözleşmeler, müşteri bilgisi,
                  kod — hiçbiri dışarıdaki bir şirkete gönderilmez. İnternet kesilse
                  bile çalışmaya devam eder.
                </Madde>
                <Madde isaret="✓" renk={C.ok}>
                  Kullandıkça artan bir fatura yok. Bir kere alınır, elektrik dışında
                  kullanım başına ücret ödenmez.
                </Madde>
              </ul>

              {/* Odada teknik biri varsa "peki ne alıyoruz" sorusunun cevabı
                  burada dursun — ama başrolde değil. */}
              <div
                style={{
                  ...T.mini, color: C.ink3, marginTop: S.md, paddingTop: S.md,
                  borderTop: `1px solid ${C.line}`,
                }}
              >
                Teknik karşılığı: {oneri.b.ad} · {oneri.model.ad} ·{" "}
                {Math.round(oneri.guc)} W.{" "}
                <button
                  onClick={detaya}
                  style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    color: C.steel, textDecoration: "underline", fontFamily: "inherit",
                    fontSize: "inherit",
                  }}
                >
                  Ayrıntılı hesap
                </button>
              </div>
            </div>
          </div>
        </Kart>
      ) : (
        <Kart vurgu={C.warn} style={{ padding: S.lg, marginBottom: S.lg }}>
          <div style={{ ...T.baslik, color: C.warn }}>Bu ekip için tek kutuluk bir öneri yok</div>
          <div style={{ ...T.govde, color: C.ink2, marginTop: S.sm }}>
            {kisi} kişinin {profil.ad.toLowerCase()} yükünü tek bir sunucu kaldırmıyor.
            Alınabilecek en güçlü sistem ({enBuyuk ? paraTL(enBuyuk.maliyetTL) : "—"})
            {" "}{enBuyuk?.kapasiteKisi} kişiye yetiyor.
            {kume && (
              <> Bu ekip için <b>{gerekenAdet} adet</b> gerekir — kabaca{" "}
              <b>{paraTL(kume.tl)}</b>. Aynı işi buluttan almak ayda{" "}
              <b>{paraTL(bulut.tl)}</b>;{" "}
              {kume.amortiAy && kume.amortiAy <= 48 ? (
                <>bu kümenin kendini ödemesi <b>{Math.ceil(kume.amortiAy)} ay</b> sürer,
                yani donanım ömrü içinde başa baş gelir.</>
              ) : kume.amortiAy ? (
                <>bu kümenin kendini ödemesi <b>{Math.ceil(kume.amortiAy)} ay</b> sürer —
                donanımın ömründen uzun, yani parasal gerekçe yok.</>
              ) : (
                <>bu ölçekte bile donanımın aylık işletme gideri buluttan yüksek.</>
              )}
            </>
            )}{" "}
            Detaylı analize geçip birden fazla sistemi birlikte planlayabilirsiniz.
          </div>
        </Kart>
      )}

      {/* ---------------- Para karşılaştırması ---------------- */}
      {oneri && (
        <Kart style={{ padding: S.lg, marginBottom: S.lg }}>
          <div style={{ ...T.altBaslik, color: C.ink, marginBottom: S.md }}>
            Aynı işi buluttan satın alsak
          </div>

          <div
            style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: S.lg, alignItems: "start",
            }}
          >
            <Sayi
              deger={paraTL(yillik.bulutYillik)}
              etiket="Buluttan alsak — yılda"
              alt={`${kisi} kişi, ${BULUT_MODEL} fiyatıyla`}
            />
            <Sayi
              deger={paraTL(yillik.donanimYillik)}
              etiket="Kendi sistemimiz — yılda"
              alt={`donanım ${OMUR_YIL} yıla bölündü + elektrik ve bakım`}
            />
            <Sayi
              deger={`${yillik.fark < 0 ? "−" : "+"}${paraTL(Math.abs(yillik.fark))}`}
              renk={yillik.fark < 0 ? C.ok : C.warn}
              etiket={yillik.fark < 0 ? "Yıllık tasarruf" : "Veri içeride kalsın diye yıllık fark"}
              alt={yillik.fark < 0 ? "donanım hem ucuz hem güvenli" : "gizliliğin yıllık bedeli"}
            />
          </div>

          <div style={{ ...T.govde, color: C.ink2, marginTop: S.lg, paddingTop: S.md, borderTop: `1px solid ${C.line}` }}>
            {yillik.fark < 0 ? (
              <>
                Bu kullanımda donanım buluttan <b>hem ucuz hem güvenli</b>. {OMUR_YIL} yıllık
                toplamda <b>{paraTL(-yillik.fark * OMUR_YIL)}</b> fark ediyor ve şirket
                verisi hiç dışarı çıkmıyor.
              </>
            ) : (
              <>
                Donanım buluttan pahalı — çünkü {kisi} kişilik bu kullanım, bir defalık{" "}
                {paraTL(oneri.maliyetTL)}'lik yatırımı doldurmuyor. Karar burada
                <b> parayla değil, veriyle</b> verilir: yılda {paraTL(yillik.fark)}, şirket
                verisinin binadan çıkmaması için ödenen bedeldir. Bu bedele değip
                değmeyeceği hukuk ve risk tarafının sorusu.
              </>
            )}
          </div>
        </Kart>
      )}

      {/* ---------------- Riskler ---------------- */}
      {oneri && (
        <Kart vurgu={C.warn} style={{ padding: S.lg, marginBottom: S.lg }}>
          <div style={{ ...T.altBaslik, color: C.ink, marginBottom: S.md }}>
            Karar verirken bilinmesi gerekenler
          </div>
          <ul style={{ margin: 0, padding: 0 }}>
            <Madde isaret="!" renk={C.warn}>
              <b>Fiyatlar kura bağlı.</b> Donanım dolarla alınıyor; buradaki ₺ tutarı{" "}
              {USD_TRY} ₺/$ kuruyla hesaplandı. Kur değişirse bu rakam değişir.
            </Madde>
            <Madde isaret="!" renk={C.warn}>
              <b>Bu bir tahmindir, teklif değildir.</b> Satın almadan önce satıcıdan
              canlı fiyat alınmalı; stok durumu ve teslim süresi ayrıca sorulmalı.
            </Madde>
            <Madde isaret="!" renk={C.warn}>
              <b>İnsan kaynağı gerekiyor.</b> Kurulum ve bakım için bir sistem
              yöneticisinin ayda birkaç günü ayrılmalı. Hesaba aylık{" "}
              {paraTL(BAKIM_TL_AY)} olarak katıldı.
            </Madde>
            <Madde isaret="!" renk={C.warn}>
              <b>Açık kaynak modeller en iyi bulut modelleri kadar iyi değil.</b>{" "}
              Çoğu ofis işi için farkı hissedilmez; en zor akıl yürütme ve kodlama
              işlerinde bulut hâlâ önde. Kritik işler için ikisi birlikte kullanılabilir.
            </Madde>
          </ul>
        </Kart>
      )}

      {/* ---------------- Varsayımlar (katlanmış) ---------------- */}
      <Kart style={{ padding: S.lg }}>
        <button
          onClick={() => setVarsayimAcik((v) => !v)}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            ...T.kucuk, color: C.steel, fontFamily: "inherit",
          }}
        >
          {varsayimAcik ? "▾" : "▸"} Bu sayılar neye dayanıyor?
        </button>

        {varsayimAcik && (
          <div style={{ ...T.kucuk, color: C.ink2, marginTop: S.md, lineHeight: 1.75 }}>
            <p style={{ margin: `0 0 ${S.sm}px` }}>
              <b>Kullanım:</b> kişi başına günde {profil.istekGun} istek, istek başına{" "}
              {profil.girisTok.toLocaleString("tr")} token soru ve{" "}
              {profil.cikisTok.toLocaleString("tr")} token cevap, ayda {IS_GUNU} iş günü.
              {kisi} kişi için ayda ~{Math.round(bulut.istek / 1000)} bin istek.
            </p>
            <p style={{ margin: `0 0 ${S.sm}px` }}>
              <b>Bulut fiyatı:</b> {BULUT_MODEL}, {BULUT_TARIH} liste fiyatı — 1 milyon
              token başına ${BULUT_GIRIS_USD} giriş / ${BULUT_CIKIS_USD} çıkış. Girişin
              %{Math.round(profil.onbellek * 100)}'inin prompt cache'ten geldiği
              (dolayısıyla %90 ucuz olduğu) varsayıldı — bu varsayım bulut maliyetini
              <i>düşürür</i>, yani karşılaştırma buluta cömert davranıyor.
            </p>
            <p style={{ margin: `0 0 ${S.sm}px` }}>
              <b>Kapasite kıyası:</b> bütün sistemler aynı yükle ölçüldü —{" "}
              {profil.ctxK}K bağlam, {(profil.girisTok / 1024).toFixed(0)}K prompt,{" "}
              {profil.cikisTok} token cevap. Bunlar yukarıdaki bulut faturasını
              hesaplayan sayıların aynısı. Model ve kuantizasyon her sistemin
              kendi tasarım noktası.
            </p>
            <p style={{ margin: `0 0 ${S.sm}px` }}>
              <b>İşletme:</b> günde {CALISMA_SAATI} saat çalışma, {KWH_TL} ₺/kWh elektrik,
              donanım bedelinin yıllık %8'i kadar yedek parça ve altyapı payı, aylık{" "}
              {paraTL(BAKIM_TL_AY)} sistem yöneticisi zamanı.
            </p>
            <p style={{ margin: 0, color: C.ink3 }}>
              Hız ve kapasite rakamları, yayımlanmış 16 gerçek ölçüme göre kalibre
              edilmiş bir modelden geliyor (ortalama sapma %7). Bütün ara hesapları
              görmek için{" "}
              <button
                onClick={detaya}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  color: C.steel, textDecoration: "underline", fontFamily: "inherit", fontSize: "inherit",
                }}
              >
                detaylı analize
              </button>{" "}
              geçin.
            </p>
          </div>
        )}
      </Kart>
    </div>
  );
}
