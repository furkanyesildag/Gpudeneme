/* ------------------------------------------------------------------ */
/*  SATIN ALMA BANTLARI                                                */
/*                                                                     */
/*  Simülatör "bu donanım bu modeli kaldırır mı?" sorusunu cevaplar.   */
/*  Ama gerçek satın alma kararı başka bir soruyu da içerir: bu para   */
/*  bandında ne alınır, nerede tıkanır, ne zaman yeniden almak         */
/*  gerekir. Bantlar o kararı taşır.                                   */
/*                                                                     */
/*  `ayar` alanı simülatöre yüklenir; anlatı alanları ise simülasyonun */
/*  hesaplayamadığı şeyleri söyler: stok durumu, platform büyüme       */
/*  yolu, PCIe hattı, yazılım olgunluğu, garanti.                      */
/* ------------------------------------------------------------------ */

export const BANTLAR = [
  {
    no: 1,
    ad: "Mac Studio M3 Ultra",
    fiyat: "~210 bin ₺",
    fiyatTemeli: "perakende",
    ozet: "Sessiz, 270 W, kurulum derdi yok — ama ilk token yavaş.",
    ne: "96 GB birleşik bellek, 819 GB/s, 270 W. Türkiye'de perakende satılıyor, kutudan çıkar çalışır.",
    ayar: {
      modelId: "qwen38_27b", cihazId: "m3u", adet: 1,
      quant: "q4km", kvq: "fp8", ctxK: 64, girdiK: 4,
      kullanici: 2, cikti: 800, indirGibi: false, mtp: true,
    },
    tekKullanici:
      "27B sınıfı modelleri MLX veya llama.cpp ile rahat çalıştırır; 96 GB birleşik bellek sayesinde 100B'lik MoE'ler bile sığar. Yazma hızı iyi.",
    ekip: "Hayır. Hesap gücü zayıf olduğu için ilk token uzun ve toplu işleme (batching) altında hızla kötüleşir.",
    kime:
      "Gürültü, güç veya yer kısıtı olan; masasının altına 700 W'lık bir kasa koyamayan. Apple ekosistemindeyse kurulum bir öğleden sonra sürer.",
    tikanma:
      "FP8/FP4 donanım hızlandırması yok, vLLM yok (MLX ve llama.cpp var). Uzun promptlarda ilk token saniyelerle ölçülür — RAG ve doküman işlerinde can sıkar. Büyüme yolu yok: ikinci Mac ancak ağ üzerinden bağlanır, verimi %33.",
    renk: "steel",
  },
  {
    no: 2,
    ad: "Tek RTX 5090",
    fiyat: "~211 bin ₺ (kart ~152 bin + sistem)",
    fiyatTemeli: "bileşen",
    ozet: "Perakendeden, bugün, kutusuyla alınabilecek en hızlı kart.",
    ne: "32 GB GDDR7, 1792 GB/s, 575 W, Blackwell. Raftan alınır.",
    ayar: {
      modelId: "qwen38_27b", cihazId: "5090", adet: 1,
      quant: "q4km", kvq: "fp8", ctxK: 64, girdiK: 4,
      kullanici: 4, cikti: 800, indirGibi: false, sistemRam: 64, mtp: true,
    },
    tekKullanici:
      "27B sınıfını Q4'te ~90 tok/s ile çalıştırır ve ilk token 2 saniyenin altındadır. Blackwell olduğu için NVFP4 donanımda hızlanır.",
    ekip: "Küçük ekip için evet: 27B'de birkaç düzine sohbet kullanıcısı taşır. Bağlamı uzatınca 32 GB hızla dolar.",
    kime: "“Tek kişi çalışacağım ama hız istiyorum, bugün alayım” diyen. Yetkili satıcı, sipariş ve teslim süresi istemeyen; mağazadan çıkıp aynı gün kurabilen.",
    tikanma:
      "32 GB tavan. 100B sınıfı MoE'ler ancak offload'la girer ve o zaman PCIe'ye takılır. 575 W — güç kaynağı ve kasa havalandırması ciddi planlanmalı. Masaüstü anakartta ikinci kart x8'e düşer.",
    ilginc:
      "“En hızlı kart” değil, “raftan alınabilecek en hızlı kart”. RTX PRO 6000 aynı 1792 GB/s bant genişliğini 96 GB bellekle veriyor (5090'ın 3 katı) ve hesap gücü de daha yüksek — ama 5 kat pahalı ve yetkili satıcıdan siparişle geliyor. Veri merkezi tarafında B200 ve MI300X bant genişliğinde 3-4 kat üstünde. 5090'ın üstünlüğü mutlak hız değil, bugün mağazada olması.",
    renk: "ok",
  },
  {
    no: 3,
    ad: "DGX Spark, tek node",
    fiyat: "290-400 bin ₺",
    fiyatTemeli: "perakende",
    ozet: "En ucuza büyük bir MoE'yi eline alıp denemek.",
    ne: "GB10, 128 GB birleşik bellek, 273 GB/s, 1 PFLOP FP4, masaüstü boyutunda.",
    ayar: {
      modelId: "qwen38_flash_next", cihazId: "spark", adet: 1,
      quant: "nvfp4", kvq: "fp8", ctxK: 32, girdiK: 4,
      kullanici: 1, cikti: 800, indirGibi: false,
    },
    tekKullanici:
      "Flash-Next'in topluluk NVFP4 buildini (109 GB, loader yaması gerekiyor) çalıştırır. MTP ile ~24,6 tok/s, onsuz ~16,8. Sohbet için yaşanır; uzun RAG prompt'larında ilk token saniyelerle ölçülür.",
    ekip: "Hayır. 273 GB/s bant genişliği batching'i (batching) taşımaz.",
    kime:
      "Tek kişi; “en ucuza bu modeli elime alıp deneyeyim” diyen. Ya da ileride bir üretim sistemi kuracaksa onun yanındaki geliştirme kutusu.",
    tikanma:
      "Ekibe hiçbir şekilde açılamaz. Birleşik bellek olduğu için uzman offload avantajı yok. İkinci Spark eklemek ağ üzerinden gider, tensor parallelism verimi ~%33'e düşer.",
    ilginc:
      "Aynı kutuda Flash-Next (180B ama 6B aktif), 27B dense modelden HIZLI koşar — bellek bant genişliği sınırlı bir dünyada belirleyici olan toplam parametre değil aktif parametredir.",
    renk: "steel",
  },
  {
    no: 4,
    ad: "RTX PRO 5000 Blackwell 72 GB iş istasyonu",
    fiyat: "~870 bin ₺",
    fiyatTemeli: "anahtar teslim",
    ozet: "Güçlü bir 27B'yi hem sana hem ekibe iyi çalıştır, 1 milyonun altında kal.",
    ne: "72 GB GDDR7, PRO 6000'in bir alt kardeşi. Hazır iş istasyonu olarak satılıyor.",
    ayar: {
      modelId: "qwen38_27b", cihazId: "pro5000_72", adet: 1,
      quant: "fp8", kvq: "fp8", ctxK: 32, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false,
    },
    tekKullanici:
      "Qwen3.8-27B FP8 (~28 GB) çok hızlı çalışır, üstüne bol KV cache alanı kalır. 27B sınıfında Spark'ın 5-8 katı hız.",
    ekip: "27B ile evet. 28 GB ağırlık + ~40 GB KV alanı, 32K bağlamda 8 kullanıcıya yeter.",
    kime: "“Büyük MoE'yi unut, güçlü bir 27B'yi hem bana hem ekibe iyi çalıştır” diyen.",
    tikanma:
      "Büyüme yok. 72 GB, 180B sınıfı MoE'lere topluluk offload buildleriyle bile dar. Platform muhtemelen aynı i9/W680 — ikinci kart yolu kapalı.",
    renk: "steel",
  },
  {
    no: 5,
    ad: "RTX PRO 6000 hazır iş istasyonu",
    fiyat: "1.445.598 ₺ · stokta",
    fiyatTemeli: "anahtar teslim",
    ozet: "Bu hafta lazım, stokta olsun, tek kutu olsun.",
    ne: "1× RTX PRO 6000 96 GB, i9-14900KF, 192 GB DDR5, 1 TB NVMe + 2 TB SATA, 1500 W, 2 yıl garanti, Ubuntu + CUDA + Docker kurulu gelir.",
    ayar: {
      modelId: "qwen38_27b", cihazId: "pro6000", adet: 1,
      quant: "fp8", kvq: "fp8", ctxK: 128, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false,
      sistemRam: 192, // i9 anakart, 4 DIMM — çift kanal
    },
    tekKullanici: "Qwen3.8-27B FP8'de 100 tok/s civarı. Çok kipli, 262K bağlam, her şey yerinde.",
    ekip: "27B ile rahat: 8 kişi, 256K bağlama kadar.",
    kime: "“Bu hafta lazım, kurulu gelsin, tek kutu olsun” diyen. 4. bandın stokta olan hâli.",
    tikanma:
      "i9'un 20 PCIe hattı var; ikinci kart x8'e düşer. 4 DIMM yuvası, 192 GB tavan. 1500 W ikinci kartı beslemez. İkinci kartın günü geldiğinde yeni sistem almak demek.",
    renk: "warn",
  },
  {
    no: 6,
    ad: "1× PRO 6000, büyüyebilen platform",
    fiyat: "1,8-2,1 milyon ₺",
    fiyatTemeli: "anahtar teslim",
    ozet: "Bugün aynı performans, yarın ikinci kartı takabilme hakkı.",
    ne: "Aynı kart; ama Threadripper PRO 9000 WX / EPYC 9005 anakart, 2 adet PCIe 5.0 ×16 hazır, 384 GB DDR5 ECC RDIMM, 2× 4 TB NVMe Gen5, 2000 W+ güç kaynağı, 3 yıl garanti.",
    ayar: {
      modelId: "qwen38_27b", cihazId: "pro6000", adet: 1,
      quant: "fp8", kvq: "fp8", ctxK: 256, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false,
      sistemRam: 384, // Threadripper PRO, 8 kanal ECC RDIMM
    },
    tekKullanici: "3. bant ile birebir aynı. Bugün için hiçbir performans farkı yok.",
    ekip: "3. bant ile aynı. Fark ikinci kart takıldığı gün ortaya çıkıyor.",
    kime: "“Şimdi ben, sonra ekip” diyen. 400-600 bin ₺'lik fark, ikinci kartı taktığında yeni sistem almamanın bedeli.",
    tikanma:
      "Tek kartla 180B sınıfı bir MoE'yi resmi ağırlıklarla çalıştıramaz; onun için ikinci kart lazım. Bugün ödediğin fazlanın karşılığını ancak büyürsen alırsın.",
    onerilen: true,
    renk: "ok",
  },
  {
    no: 7,
    ad: "2× PRO 6000, aynı platform",
    fiyat: "2,9-3,3 milyon ₺",
    fiyatTemeli: "anahtar teslim",
    ozet: "Büyük MoE kesin, ekip kesin, 5 yıllık plan.",
    ne: "4. bant + ikinci kart. Toplam 192 GB VRAM, tensor parallelism TP=2.",
    ayar: {
      modelId: "qwen38_flash_next", cihazId: "pro6000", adet: 2,
      quant: "fp8", kvq: "fp8", ctxK: 262, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false,
      // Anlatının dayandığı kurulum: n-gram embedding katmanı host RAM'de,
      // 384 GB sistem RAM'i ve modelin kendi MTP head'i açık.
      sistemRam: 384, mtp: true,
    },
    tekKullanici:
      "Flash-Next resmi FP8 checkpoint, n-gram embedding katmanı host RAM'de, GPU'da ~125 GiB, ~50 GB KV alanı. Modelin KV'si token başına ~12 KB olduğu için bu alan devasa. Ayrıca 27B'yi ikinci karta koyup iki modeli aynı anda servis edebilirsin.",
    ekip: "8 kişi Flash-Next'te 262K bağlamla rahat. Ajan yükü geldiğinde de dayanır.",
    kime: "“Büyük MoE kesin, ekip kesin, 5 yıl” diyen ve bütçenin tavanını kullanabilen.",
    tikanma:
      "2× RTX PRO 6000, vLLM'in doğrulanmış donanım listesinde yok (GB300, H200, MI355X var). SM120'de çalıştığı raporlanıyor ama ilk kuranlardan olursun. 384 GB sistem RAM'ini 768'e çıkarmak ve 3-4. kart sonraki yılların işi.",
    renk: "ok",
  },
  {
    no: 8,
    ad: "4× RTX PRO 5000 Blackwell 72 GB",
    fiyat: "1,7-1,9 milyon ₺",
    fiyatTemeli: "bileşen",
    ozet: "Aynı paraya 2× PRO 6000'den %50 daha fazla VRAM.",
    ne: "4 kart × 72 GB = 288 GB VRAM, 1450 W. Threadripper PRO / EPYC platform, her kart tam x16.",
    ayar: {
      modelId: "glm_53_flash", cihazId: "pro5000_72", adet: 4,
      quant: "nvfp4", kvq: "fp8", ctxK: 128, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false, sistemRam: 384, mtp: true,
    },
    tekKullanici:
      "288 GB VRAM, 320B sınıfı MoE'leri offload'sız alır. Kart başına bant genişliği PRO 6000'in altında ama dört kart toplandığında fark kapanıyor.",
    ekip: "Evet, rahat. Bu bandın asıl satış noktası bellek: uzun bağlamda çok sayıda kullanıcıyı KV cache'e sıkışmadan taşır.",
    kime:
      "“Bellek benim darboğazım, kart başına hız ikinci planda” diyen. 2× PRO 6000 ile neredeyse aynı paraya 96 GB fazla VRAM alıyorsun.",
    tikanma:
      "Dört kart demek dört PCIe yuvası, 1450 W ve ciddi soğutma demek — masaüstü kasasına sığmaz. Tensör paralelliği dört yönlü bölündüğü için verim iki karta göre biraz düşer. Büyümek için beşinci kart yok: platform dolu.",
    ilginc:
      "Aynı 288 GB'ı 3× PRO 6000 ile almak ~700 bin ₺ daha pahalı; karşılığında bir yuva boşta kalıyor ve kart başına bant genişliği yükseliyor. Hangisinin doğru olduğu, darboğazının bellek mi hız mı olduğuna bağlı.",
    renk: "ok",
  },
  {
    no: 9,
    ad: "2× AMD Instinct MI300X",
    fiyat: "1,7-2,0 milyon ₺",
    fiyatTemeli: "bileşen",
    ozet: "TL başına en çok VRAM ve bant genişliği — karşılığında ROCm.",
    ne: "2 kart × 192 GB HBM3 = 384 GB, kart başına 5300 GB/s. 1750 W. Kurumsal kanaldan, çoğu zaman sunucuyla birlikte.",
    ayar: {
      modelId: "glm_53_flash", cihazId: "mi300x", adet: 2,
      quant: "nvfp4", kvq: "fp8", ctxK: 256, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false, sistemRam: 384, mtp: true,
    },
    tekKullanici:
      "384 GB HBM ve 10 TB/s toplam bant genişliği: bu listedeki hiçbir NVIDIA yapılandırması bu parayla buna yaklaşmıyor. Sınır modelleri offload'sız, uzun bağlamla çalışır.",
    ekip: "Fazlasıyla. Bellek de bant genişliği de bu bandın çok üstünde bir yükü kaldırır.",
    kime:
      "Sayılara bakıp ekosistem riskini göze alabilen. Kurumsal alım yapabiliyorsan ve ROCm ile çalışmaya razıysan bu bandın en iyi teklifidir.",
    tikanma:
      "Asıl risk donanımda değil yazılımda: vLLM ve SGLang ROCm'de çalışıyor ama yeni model desteği CUDA'dan haftalar sonra geliyor, bazı çekirdekler eksik kalıyor. llama.cpp tarafı da NVIDIA kadar oturmuş değil. Türkiye'de bireysel satışı yok, kurumsal kanal gerekir. Yeni bir modeli çıktığı gün çalıştırmak istiyorsan bu bant seni bekletir.",
    renk: "warn",
  },
  {
    no: 10,
    ad: "3× RTX PRO 6000",
    fiyat: "2,4-2,7 milyon ₺",
    fiyatTemeli: "bileşen",
    ozet: "9. banttan doğal büyüme: 288 GB, bir yuva hâlâ boş.",
    ne: "3 kart × 96 GB = 288 GB VRAM, 2050 W. Threadripper PRO / EPYC platform.",
    ayar: {
      modelId: "glm_53_flash", cihazId: "pro6000", adet: 3,
      quant: "nvfp4", kvq: "fp8", ctxK: 128, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false, sistemRam: 384, mtp: true,
    },
    tekKullanici: "288 GB ve yüksek kart başına bant genişliği. 320B sınıfı MoE'ler rahat, ilk token bir saniyenin altında.",
    ekip: "Evet — bu, gerçek bir iç servis kurmak için makul bir taban.",
    kime: "9. bandı almış ve büyüyen; ya da baştan “bir kart payı bırakayım” diyen. Dördüncü yuva boş kaldığı için tek adımda daha büyüğe geçiş yolu açık kalıyor.",
    tikanma:
      "2050 W sürekli çekiş: Türkiye şartlarında yıllık elektrik faturası ciddi bir kalem. Üç kart tek kasada yoğun ısı üretir, sıcaklık sınırlaması (thermal throttling) riski gerçektir. Aynı VRAM'i 4× PRO 5000 ile ~700 bin ₺ ucuza almak mümkün.",
    renk: "ok",
  },
  {
    no: 11,
    ad: "4× RTX PRO 6000",
    fiyat: "3,2-3,5 milyon ₺",
    fiyatTemeli: "bileşen",
    ozet: "İş istasyonu platformunun sonuna kadar kullanılmış hâli.",
    ne: "4 kart × 96 GB = 384 GB VRAM, 2650 W. Bu, sunucu şasisine geçmeden gidilebilecek en uç nokta.",
    ayar: {
      modelId: "glm_53_flash", cihazId: "pro6000", adet: 4,
      quant: "nvfp4", kvq: "fp8", ctxK: 256, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false, sistemRam: 384, mtp: true,
    },
    tekKullanici:
      "384 GB VRAM: 700B sınıfı modeller bile 4 bitte offload'sız girer. Uzun bağlam ve büyük KV bütçesi aynı anda mümkün.",
    ekip: "Onlarca eşzamanlı kullanıcı. Bu noktadan sonra darboğaz donanım değil, modelin kendisi olmaya başlar.",
    kime: "“Bütçenin tavanı bu ve sunucu odam yok” diyen. Bir üst adım rack sunucu demek — gürültü, soğutma ve ayrı bir oda demek.",
    tikanma:
      "2650 W: tek fazlı bir prizden beslenemez, elektrik tesisatına bakmak gerekir. Dört kart tek kasada ciddi bir soğutma problemidir; iş istasyonu kasası yerine açık tezgâh ya da özel şasi gerekebilir. Platform dolu — beşinci kart sunucu şasisi demek. Ve 384 GB'ı 2× MI300X ile yarı fiyata almak mümkün, tek engel ROCm.",
    renk: "warn",
  },
];

/* ------------------------------------------------------------------ */
/*  Simülasyonun MODELLEYEMEDİĞİ şeyler — bantlarda anlatılıyor ama    */
/*  hesaba girmiyor. Kullanıcıya açıkça söylenmeli.                    */
/* ------------------------------------------------------------------ */
/* Fiyat temelleri aynı şey değil ve karıştırılırsa liste yanıltıcı olur:
   "anahtar teslim" bir entegratörün kurulu, garantili sistem fiyatıdır ve
   montaj, test, destek ve kâr içerir; "bileşen" kart + platform bileşen
   fiyatlarının toplamıdır; "perakende" raftan alınan hazır ürün fiyatıdır.
   Aynı donanım için anahtar teslim fiyat, bileşen toplamının 1,5-2 katına
   çıkabilir. Kartlardaki simülatör maliyeti her zaman bileşen temellidir. */
export const FIYAT_TEMELI = {
  "perakende": "raftan alınan hazır ürün",
  "bileşen": "kart + platform bileşen fiyatı",
  "anahtar teslim": "entegratörden kurulu, garantili sistem",
};

export const BANT_UYARISI =
  "Bantlardaki fiyat, stok, garanti, PCIe hattı ve platform büyüme bilgisi Türkiye'deki " +
  "satıcı yapılandırmalarına dayanır; simülatör bunları hesaplamaz. İlan fiyatlarının " +
  "TEMELİ farklıdır (perakende / bileşen / anahtar teslim) ve her kartta belirtilir — " +
  "anahtar teslim bir sistem, aynı donanımın bileşen toplamının 1,5-2 katı olabilir. " +
  "Kartlardaki simülatör maliyeti her zaman bileşen temellidir, bu yüzden anahtar " +
  "teslim bantlarda ilan fiyatının altında kalır. Bantlar simülatör maliyetine göre sıralıdır. Offload artık " +
  "modelleniyor (5. bant onu kullanır), ama simülatör KÖR — katman bazlı — offload " +
  "varsayar: RAM'e taşınan ağırlıklar her adımda payları oranında okunur. Gerçekte " +
  "akıllı yerleştirme (sık kullanılan katmanları VRAM'de tutmak, seyrek erişilen " +
  "embedding tablosunu RAM'e atmak) daha iyi sonuç verir. Bu yüzden offload'lı " +
  "kurulumlarda gördüğün hız bir ALT SINIRDIR; gerçek kurulum daha hızlı olabilir.";
