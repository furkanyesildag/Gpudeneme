/* ------------------------------------------------------------------ */
/*  BULUT API KARŞILAŞTIRMASI                                          */
/*                                                                     */
/*  "Kendi donanımımızı alalım mı, yoksa API'ye mi ödeyelim?"          */
/*  sorusunun para tarafı. Buradaki her sayı bir VARSAYIM ve hepsi     */
/*  açıkça yazılı — çünkü sonuç bunlara çok duyarlı ve yönetici        */
/*  özetinde tek bir rakam görünüyor.                                  */
/*                                                                     */
/*  Kasıtlı olarak TEMKİNLİ tarafta duruldu: bulut maliyeti düşük,     */
/*  donanım maliyeti yüksek tahmin edilirse amorti süresi UZUN çıkar.  */
/*  Yanılıyorsak donanımın aleyhine yanılalım — sunumda savunulabilir  */
/*  olan budur.                                                        */
/* ------------------------------------------------------------------ */

/* Eylül 2026 liste fiyatı, orta sınıf bir bulut modeli (Claude Sonnet 5:
   $2 giriş / $10 çıkış — 1M token başına). Daha ucuz küçük modeller de
   var, daha pahalı büyük modeller de; orta sınıf, buradaki donanımların
   çalıştırdığı 27-120B modellere kalite olarak en yakın karşılık. */
export const BULUT_GIRIS_USD = 2;   // 1M token
export const BULUT_CIKIS_USD = 10;  // 1M token
export const BULUT_MODEL = "Claude Sonnet 5";
export const BULUT_TARIH = "Eylül 2026";

/* Prompt caching indirimi: tekrar eden sistem promptu ve doküman
   bağlamı önbellekten okunduğunda giriş token'ı çok daha ucuza gelir.
   Gerçek kurulumlarda girişin kabaca yarısı önbellekten gelir; bunu
   hesaba katmamak bulut maliyetini ŞİŞİRİRDİ. */
export const ONBELLEK_ORANI = 0.5;
export const ONBELLEK_INDIRIMI = 0.9; // önbellekten okunan token %90 ucuz

/* Kullanım profilleri: kişi başına GÜNLÜK yük.
   Bu sayılar bir ekibin ortalamasıdır, yoğun kullanıcının değil. */
export const KULLANIM = [
  {
    id: "sohbet",
    ad: "Soru-cevap ve yazı işleri",
    aciklama: "E-posta, özet, çeviri, doküman soruları. Tipik ofis kullanımı.",
    istekGun: 40,
    girisTok: 2000,
    cikisTok: 700,
    /* Hedef çarpanı: sohbette insanlar düşünürken sistem boşta kalır,
       aynı donanım eşzamanlı kapasitesinden fazla kişiye yeter. */
    kat: "sohbet",
  },
  {
    id: "ajan",
    ad: "Kod yazma ve ajanlar",
    aciklama: "Kod üretimi, araç çağıran ajanlar, uzun doküman zincirleri. Kişi başına yük 5-6 kat ağır.",
    istekGun: 200,
    girisTok: 8000,
    cikisTok: 1500,
    kat: "ajan",
  },
];

export const IS_GUNU = 22;          // ayda
export const CALISMA_SAATI = 10;    // günde, elektrik hesabı için

/* Sanayi/ticarethane elektrik, dağıtım ve vergiler dahil kabaca.
   Kur gibi bu da oynak — sunumda varsayım olarak gösteriliyor. */
export const KWH_TL = 3.5;

/* Donanımın üstüne binen, simülatörün hesaplamadığı gerçek maliyetler.
   Bunları saymamak amorti süresini olduğundan kısa gösterirdi. */
export const YILLIK_ISLETME_ORANI = 0.08; // donanım bedelinin yıllık %'si:
// yedek parça, garanti dışı arıza, kesintisiz güç kaynağı, soğutma, yer.

/* Kurulum ve bakım için ayrılan insan zamanı — bir sistem yöneticisinin
   ayda ~2 günü. Aylık maliyet olarak. */
export const BAKIM_TL_AY = 25000;

/**
 * Bir ekibin aylık bulut API faturası (₺).
 * @param kisi     kaç kişi kullanacak
 * @param profil   KULLANIM içinden biri
 * @param usdTry   kur
 */
export function bulutAylikTL(kisi, profil, usdTry) {
  const istek = kisi * profil.istekGun * IS_GUNU;
  const girisM = (istek * profil.girisTok) / 1e6;
  const cikisM = (istek * profil.cikisTok) / 1e6;

  // Girişin bir kısmı önbellekten, ucuz.
  const girisUcret =
    girisM * (1 - ONBELLEK_ORANI) * BULUT_GIRIS_USD +
    girisM * ONBELLEK_ORANI * BULUT_GIRIS_USD * (1 - ONBELLEK_INDIRIMI);

  const usd = girisUcret + cikisM * BULUT_CIKIS_USD;
  return { usd, tl: usd * usdTry, istek, girisM, cikisM };
}

/**
 * Kendi donanımının aylık işletme maliyeti (₺) — elektrik + bakım + pay.
 * Donanımın satın alma bedeli buna DAHİL DEĞİL, ayrı duruyor.
 */
export function donanimAylikTL(guc, maliyetTL) {
  const kwhAy = (guc / 1000) * CALISMA_SAATI * IS_GUNU;
  const elektrik = kwhAy * KWH_TL;
  const isletme = (maliyetTL * YILLIK_ISLETME_ORANI) / 12;
  return { elektrik, isletme, bakim: BAKIM_TL_AY, toplam: elektrik + isletme + BAKIM_TL_AY };
}
