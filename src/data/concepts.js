/* ------------------------------------------------------------------ */
/*  KAVRAMLAR — teknik olmayan okuyucu için gündelik benzetmeler       */
/* ------------------------------------------------------------------ */

export const KAVRAMLAR = [
  { ad: "Token", benzet: "Yazıyı legolara bölmek gibi.", ozet: "Model kelimeleri değil, ~4 harflik parçaları (token) işler. Hız hep 'saniyede kaç token' (tok/s) diye ölçülür." },
  { ad: "Parametre", benzet: "Beynin sinir bağlantıları gibi.", ozet: "Modelin öğrenirken ayarladığı sayılar. Ne kadar çok parametre, o kadar yetenekli ama o kadar ağır ve yer kaplayan." },
  { ad: "Toplam / Aktif (MoE)", benzet: "Koca hastane ama seni tek uzman muayene eder.", ozet: "MoE modelde tüm parametreler bellekte durur, ama her token için yalnızca küçük bir kısmı (active params) çalışır. Belleği büyük modele göre, hızı küçük modele göre planla." },
  { ad: "Quantization (kuantizasyon)", benzet: "Fotoğrafı JPEG'e sıkıştırmak gibi.", ozet: "Ağırlıkları daha az bitle, kabaca yuvarlayarak saklamak. Çok daha az yer kaplar ve hızlanır; karşılığında az bir kalite kaybı olur." },
  { ad: "Bit derinliği (precision)", benzet: "Fiyatı kuruşuna kadar mı, yuvarlayarak mı yazıyorsun?", ozet: "Her sayıyı kaç haneyle yazdığın. 16 → 8 → 4 bit: her adımda bellek kabaca yarıya iner, kalite de biraz düşer." },
  { ad: "KV cache", benzet: "Modelin yanında tuttuğu not defteri.", ozet: "O anki konuşmaya dair kısa hafıza. Bağlam ve kullanıcı sayısı arttıkça şişer ve ciddi bellek yer — çoğu zaman asıl sığmama sebebi budur." },
  { ad: "Context / bağlam uzunluğu", benzet: "Masaya aynı anda sığdırabildiğin kağıt sayısı.", ozet: "Modelin bir anda aklında tutabildiği metin miktarı (context window). Uzun bağlam daha çok KV cache, yani daha çok bellek demek." },
  { ad: "Memory bandwidth", benzet: "Musluğun debisi — boru ne kadar kalın?", ozet: "Belleğin ne kadar hızlı okunabildiği (GB/s). Token üretim hızını asıl bu belirler, işlem gücü (TFLOPS) değil." },
  { ad: "TTFT (ilk token gecikmesi)", benzet: "Garsonun siparişi alıp mutfağa iletmesi.", ozet: "Soruyu gönderdikten sonra cevabın ilk harfi gelene kadar geçen 'düşünme' süresi. Uzun prompt'ta ve kalabalıkta uzar." },
  { ad: "Dense / MoE", benzet: "Tüm ekip mi çalışıyor, yoksa nöbetçi mi?", ozet: "Dense modelde her parametre her adımda çalışır; MoE'de (Mixture of Experts) yalnızca ilgili expert'ler. MoE aynı bellekle daha hızlıdır." },
  { ad: "Tensor parallelism (TP)", benzet: "Bir masayı dört kişi taşımak — koordinasyon şart.", ozet: "Tek modeli birden çok karta bölüp birlikte çalıştırmak. Kartlar arası interconnect (NVLink > PCIe > ağ) yavaşsa kazanç hızla düşer." },
  { ad: "Linear / sliding window attention", benzet: "Her şeyi değil, son sayfayı hatırlamak.", ozet: "Yeni modellerin çoğu katmanlarının bir kısmında bağlamın tamamını değil son N token'ı tutar. Uzun bağlamda KV cache'i dramatik düşürür — bu araç bunu hesaba katar." },
  { ad: "MLA (latent attention)", benzet: "Not defterini stenoyla tutmak.", ozet: "DeepSeek, GLM ve Kimi'nin kullandığı sıkıştırılmış KV yöntemi. Aynı bağlamı 3-5 kat daha az bellekle tutar." },
  { ad: "Batching", benzet: "Servisi tek tek değil, tepsiyle taşımak.", ozet: "Birden çok kullanıcının isteğini aynı anda işlemek. Toplam verimi çok artırır, kişi başına hızı bir miktar düşürür." },
  { ad: "Eşzamanlılık (C) ≠ kullanıcı", benzet: "Restoranda masa sayısı ile günlük müşteri sayısı.", ozet: "C, modelin aynı anda işlediği istek sayısıdır. Sohbet eden biri zamanının çoğunu okuyarak ve yazarak geçirdiği için bir 'masa' birden çok kişiye yeter; ajanlar ise masayı hiç boşaltmaz. Kapasite bu yüzden C'nin katıdır." },
  { ad: "Prefix caching", benzet: "Aynı kitabı her seferinde baştan okumamak.", ozet: "Sohbet geçmişinin ve sistem promptunun daha önce işlenmiş kısmı yeniden hesaplanmaz. İlk token gecikmesini dramatik düşürür — bu yüzden 'ortalama prompt uzunluğu' sanılandan çok daha kısadır." },
];

/* ------------------------------------------------------------------ */
/*  HAZIR SENARYOLAR — tek tıkla gerçekçi bir kurulum yükler           */
/* ------------------------------------------------------------------ */

export const SENARYOLAR = [
  {
    ad: "Tek kişilik geliştirme",
    aciklama: "Kendi makinende kod ve metin — tek kullanıcı, uzun bağlam.",
    ayar: { modelId: "qwen38_27b", cihazId: "5090", adet: 1, quant: "q4km", kvq: "fp8", ctxK: 64, girdiK: 16, kullanici: 1, cikti: 1200, indirGibi: false },
  },
  {
    ad: "Küçük ekip (5-10 kişi)",
    aciklama: "Ofis içi sohbet asistanı, orta bağlam, makul hız.",
    ayar: { modelId: "gpt_oss_120b", cihazId: "pro6000", adet: 1, quant: "nvfp4", kvq: "fp8", ctxK: 32, girdiK: 8, kullanici: 8, cikti: 800, indirGibi: false },
  },
  {
    ad: "Şirket içi kod ajanı",
    aciklama: "Ajan işleri uzun prompt ve uzun bağlam ister; ilk token toleransı yüksektir.",
    ayar: { modelId: "ornith_15_35b_a3b", cihazId: "pro6000", adet: 1, quant: "fp8", kvq: "fp8", ctxK: 128, girdiK: 48, kullanici: 4, cikti: 2000, indirGibi: false },
  },
  {
    ad: "Dar bütçe / öğrenme",
    aciklama: "İkinci el kartla en ucuz çalışan kurulum.",
    ayar: { modelId: "gpt_oss_20b", cihazId: "3090", adet: 1, quant: "nvfp4", kvq: "fp8", ctxK: 32, girdiK: 8, kullanici: 2, cikti: 800, indirGibi: false },
  },
  {
    ad: "Sınır modeli, yerelde",
    aciklama: "Açık ağırlıklı en güçlü modeli çalıştırmak ne gerektiriyor?",
    ayar: { modelId: "glm_53", cihazId: "h200", adet: 8, quant: "fp8", kvq: "fp8", ctxK: 128, girdiK: 32, kullanici: 16, cikti: 1500, indirGibi: false },
  },
  {
    ad: "Türkçe, küçük donanım",
    aciklama: "Türkçe ağırlıklı iş, mütevazı kart.",
    ayar: { modelId: "gemma_4_12b_it", cihazId: "5060ti16", adet: 1, quant: "q4qat", kvq: "fp8", ctxK: 16, girdiK: 4, kullanici: 2, cikti: 600, indirGibi: false },
  },
];
