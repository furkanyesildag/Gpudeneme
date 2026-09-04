/* ------------------------------------------------------------------ */
/*  İŞ YÜKÜ PROFİLLERİ                                                 */
/*                                                                     */
/*  "Ortalama prompt'um kaç K token?" sorusunu kimse cevaplayamaz. Ama   */
/*  herkes NE İNŞA ETTİĞİNİ bilir. Profil, o bilgiden beş iş yükü      */
/*  kaydırağını da doldurur.                                           */
/*                                                                     */
/*  Kritik nokta: profil aynı zamanda PERFORMANS HEDEFLERİNİ de        */
/*  belirler. Bunlar iki ayrı karar değil, tek kararın iki yüzü —      */
/*  IDE kod tamamlamada 300 ms gecikme şarttır, gece çalışan toplu     */
/*  işte 60 saniye bile umursanmaz. Kapasite sayıları ancak doğru      */
/*  hedeflerle anlamlıdır.                                             */
/*                                                                     */
/*  Sayılar mühendislik tahminidir, ölçüm değil. Her profil neden o    */
/*  değerleri aldığını `neden` alanında açıklar; kullanıcı katılmazsa  */
/*  kaydırakları elle oynatır ve profil "özel"e döner.                 */
/*                                                                     */
/*  is    : ctxK, girdiK, kullanici, cikti, kvOran (%)                 */
/*  hedef : ttftMs, tps, sohbetKat, ajanKat                            */
/* ------------------------------------------------------------------ */

export const IS_YUKLERI = [
  {
    id: "sohbet_kisa",
    ad: "Kısa sohbet / soru-cevap",
    ozet: "Tek seferlik sorular, kısa cevaplar",
    is: { ctxK: 16, girdiK: 1, kullanici: 8, cikti: 400, kvOran: 40 },
    hedef: { ttftMs: 800, tps: 20, sohbetKat: 6, ajanKat: 2 },
    neden:
      "Sohbet turları kısadır ve prefix caching açıkken her turda yalnızca yeni mesaj işlenir — bu yüzden prompt 1K civarında kalır, pencerenin tamamı dolmaz. Kullanıcılar sorular arasında okur ve yazar, yani bir yuva birçok kişiye yeter (×6). İlk token 1 saniyenin altında olmalı; insan ekrana bakıyor.",
  },
  {
    id: "sohbet_uzun",
    ad: "Uzun sohbet (biriken geçmiş)",
    ozet: "Saatlerce süren, geçmişi büyüyen konuşmalar",
    is: { ctxK: 64, girdiK: 4, kullanici: 6, cikti: 700, kvOran: 75 },
    hedef: { ttftMs: 1500, tps: 20, sohbetKat: 4, ajanKat: 1.5 },
    neden:
      "Konuşma uzadıkça geçmiş birikir ve KV cache pencereyi büyük ölçüde doldurur (%75). Prefix caching geçmişi yeniden işlemekten kurtarır, o yüzden prompt yine kısa kalır — ama bellek yükü kalıcıdır. Asıl darboğaz burada hız değil, kullanıcı başına KV maliyetidir.",
  },
  {
    id: "rag",
    ad: "RAG · şirket dokümanları",
    ozet: "Getirilen parçalar + soru",
    is: { ctxK: 32, girdiK: 12, kullanici: 12, cikti: 600, kvOran: 55 },
    hedef: { ttftMs: 2500, tps: 18, sohbetKat: 5, ajanKat: 2 },
    neden:
      "Her soruda vektör veritabanından 8-15 parça getirilir; prompt 10-15K'ya çıkar ve her seferinde FARKLI olduğu için prefix caching pek işe yaramaz — ilk token bu yüzden uzar. İç arama araçları kalabalık kullanılır ama seyrek: yüksek eşzamanlılık, yüksek çarpan.",
  },
  {
    id: "dokuman",
    ad: "Doküman özetleme / analiz",
    ozet: "Belgenin tamamı prompt'a giriyor",
    is: { ctxK: 128, girdiK: 96, kullanici: 2, cikti: 1500, kvOran: 90 },
    hedef: { ttftMs: 30000, tps: 15, sohbetKat: 2, ajanKat: 1 },
    neden:
      "Prompt'un kendisi belgedir — 100 sayfalık bir şartname ~100K token eder. Devasa prefill yüzünden ilk token dakikalarla ölçülebilir ve bu KABUL EDİLEBİLİR; kullanıcı zaten dosyayı yükleyip bekliyordur. Buna karşılık aynı anda çok az kişi çalışır ve KV neredeyse tamamen dolar.",
  },
  {
    id: "kod_ajani",
    ad: "Kod ajanı (Claude Code benzeri)",
    ozet: "Depoyu gezen, araç çağıran ajan",
    is: { ctxK: 256, girdiK: 48, kullanici: 3, cikti: 2500, kvOran: 70 },
    hedef: { ttftMs: 20000, tps: 25, sohbetKat: 2, ajanKat: 1 },
    neden:
      "Ajan dosya okur, araç çağırır, sonuçları bağlama ekler — bağlam hızla 100K'ları bulur. Kullanıcı ekrana bakmadığı için uzun ilk token tolere edilir, ama yazma hızı önemlidir çünkü çıktı uzundur (2500+ token). Ajan yuvayı hiç boşaltmaz: çarpan 1.",
  },
  {
    id: "kod_tamamlama",
    ad: "Kod tamamlama (IDE içi)",
    ozet: "Yazarken beliren satır içi öneriler",
    is: { ctxK: 16, girdiK: 3, kullanici: 16, cikti: 80, kvOran: 35 },
    hedef: { ttftMs: 300, tps: 30, sohbetKat: 8, ajanKat: 3 },
    neden:
      "Tamamlama gecikmesi 300 ms'yi geçerse geliştirici zaten yazmış olur ve öneri çöpe gider — bu, tüm iş yükleri içinde ilk token'a en duyarlı olanı. Buna karşılık çıktı çok kısadır (bir-iki satır). Geliştiriciler zamanlarının çok azını istek atarak geçirir, bu yüzden çarpan yüksektir (×8).",
  },
  {
    id: "toplu",
    ad: "Batching / gece işi",
    ozet: "Etiketleme, sınıflandırma, veri dönüştürme",
    is: { ctxK: 16, girdiK: 6, kullanici: 32, cikti: 500, kvOran: 50 },
    hedef: { ttftMs: 60000, tps: 4, sohbetKat: 1, ajanKat: 1 },
    neden:
      "Kimse beklemiyor, tek önemli şey saatte kaç kayıt bittiği. Gecikme hedefleri pratikte kapatılır (60 sn / 4 tok-s) ve eşzamanlılık donanımın taşıyabildiği kadar yükseltilir — burada TOPLAM VERİM sütununa bakılır, kişi başına hıza değil. Çarpanlar 1: her yuva sürekli doludur.",
  },
  {
    id: "ceviri",
    ad: "Çeviri / metin dönüştürme",
    ozet: "Girdi kadar uzun çıktı üreten işler",
    is: { ctxK: 8, girdiK: 2, kullanici: 24, cikti: 2000, kvOran: 45 },
    hedef: { ttftMs: 3000, tps: 12, sohbetKat: 2, ajanKat: 1 },
    neden:
      "Çeviride çıktı girdiyle aynı uzunluktadır, bu yüzden süreyi neredeyse tamamen YAZMA belirler; ilk token önemsizleşir. Bağlam kısa tutulabilir (paragraf paragraf işlenir), böylece KV ucuzlar ve eşzamanlılık yükseltilebilir.",
  },
  {
    id: "sesli",
    ad: "Sesli asistan / gerçek zamanlı",
    ozet: "Konuşma hızına yetişmesi gereken yanıt",
    is: { ctxK: 8, girdiK: 2, kullanici: 8, cikti: 250, kvOran: 40 },
    hedef: { ttftMs: 400, tps: 25, sohbetKat: 4, ajanKat: 2 },
    neden:
      "Sesli yanıtta ilk token doğrudan sessizlik olarak duyulur; 400 ms üstü konuşmayı bozar. Metin sese çevrileceği için yazma hızının konuşma hızını (~3 kelime/sn) rahat geçmesi yeterlidir. Cevaplar kısadır — kimse sesli asistandan üç paragraf dinlemek istemez.",
  },
];

export const IS_YUKU_HARITA = Object.fromEntries(IS_YUKLERI.map((x) => [x.id, x]));

/** Şu anki ayarlar bir profille tam olarak eşleşiyor mu? */
export function eslesenProfil(is, hedef) {
  return (
    IS_YUKLERI.find(
      (p) =>
        p.is.ctxK === is.ctxK &&
        p.is.girdiK === is.girdiK &&
        p.is.kullanici === is.kullanici &&
        p.is.cikti === is.cikti &&
        p.is.kvOran === is.kvOran &&
        p.hedef.ttftMs === hedef.ttftMs &&
        p.hedef.tps === hedef.tps &&
        p.hedef.sohbetKat === hedef.sohbetKat &&
        p.hedef.ajanKat === hedef.ajanKat
    )?.id || null
  );
}
