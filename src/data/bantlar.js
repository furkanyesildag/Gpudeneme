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
    ad: "İkinci el RTX 3090, tek kart",
    fiyat: "95-110 bin ₺",
    ozet: "En ucuza ciddi bir başlangıç — öğrenmek ve prototip için.",
    ne: "24 GB GDDR6X, 936 GB/s, 350 W. Üretimi bitti ama ikinci el piyasası derin; NVLink köprüsüyle ikili de çalışır.",
    ayar: {
      modelId: "gpt_oss_20b", cihazId: "3090", adet: 1,
      quant: "q4km", kvq: "fp8", ctxK: 32, girdiK: 2,
      kullanici: 2, cikti: 400, indirGibi: false, sistemRam: 64,
    },
    tekKullanici:
      "gpt-oss-20b veya Qwen3.5-9B sınıfı modeller çok hızlı çalışır. 27B'yi IQ4_XS ile sığdırır ama ilk token 6 saniyeye çıkar — 3090'ın hesap gücü zayıf, bant genişliği değil.",
    ekip: "Küçük modellerle şaşırtıcı derecede evet: gpt-oss-20b'de bir kart onlarca sohbet kullanıcısına yeter. Büyük modelde hayır.",
    kime: "“Önce bir öğreneyim, işime yarayacak mı göreyim” diyen. Bu bandın parası, üst bantlarda tek bir kartın kablosuna gitmiyor.",
    tikanma:
      "FP8 ve FP4 donanım desteği yok — yeni formatların hız avantajından yararlanamaz, GGUF'a mahkûm. 24 GB, 30B üstünü offload'sız almaz. İkinci el olduğu için garanti yok.",
    ilginc:
      "TL başına en yüksek bellek bant genişliği hâlâ bu kartta. Yerel LLM'de belirleyici olan bant genişliği olduğu için 3090, kendinden yeni ve pahalı birçok karttan iyi iş çıkarır.",
    renk: "steel",
  },
  {
    no: 2,
    ad: "Mac Studio M3 Ultra",
    fiyat: "~210 bin ₺",
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
    no: 3,
    ad: "Tek RTX 5090",
    fiyat: "~211 bin ₺ (kart ~152 bin + sistem)",
    ozet: "Türkiye'den bugün alınabilecek en hızlı tek kart.",
    ne: "32 GB GDDR7, 1792 GB/s, 575 W, Blackwell. Raftan alınır.",
    ayar: {
      modelId: "qwen38_27b", cihazId: "5090", adet: 1,
      quant: "q4km", kvq: "fp8", ctxK: 64, girdiK: 4,
      kullanici: 4, cikti: 800, indirGibi: false, sistemRam: 64, mtp: true,
    },
    tekKullanici:
      "27B sınıfını Q4'te ~90 tok/s ile çalıştırır ve ilk token 2 saniyenin altındadır. Blackwell olduğu için NVFP4 donanımda hızlanır.",
    ekip: "Küçük ekip için evet: 27B'de birkaç düzine sohbet kullanıcısı taşır. Bağlamı uzatınca 32 GB hızla dolar.",
    kime: "“Tek kişi çalışacağım ama hız istiyorum, bugün alayım” diyen. Fiyat/performans olarak bu listenin en dengeli noktası.",
    tikanma:
      "32 GB tavan. 100B sınıfı MoE'ler ancak offload'la girer ve o zaman PCIe'ye takılır. 575 W — güç kaynağı ve kasa havalandırması ciddi planlanmalı. Masaüstü anakartta ikinci kart x8'e düşer.",
    renk: "ok",
  },
  {
    no: 4,
    ad: "DGX Spark, tek node",
    fiyat: "290-400 bin ₺",
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
    no: 5,
    ad: "4× ikinci el RTX 3090",
    fiyat: "320-380 bin ₺",
    ozet: "96 GB VRAM'i en ucuza toplamanın yolu — karşılığında uğraş.",
    ne: "4 kart × 24 GB = 96 GB VRAM, 1650 W çekiş. Çok yuvalı bir anakart, riser kabloları ve 2000 W+ güç kaynağı gerekir.",
    ayar: {
      modelId: "gpt_oss_120b", cihazId: "3090", adet: 4,
      quant: "nvfp4", kvq: "fp8", ctxK: 64, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false, sistemRam: 128,
    },
    tekKullanici:
      "gpt-oss-120b sınıfı MoE'ler rahat çalışır; toplam bant genişliği 4 kartla toplandığı için hız yüksek kalır.",
    ekip: "Evet, hem de iyi: 96 GB VRAM ve toplu bant genişliği çok sayıda eşzamanlı isteği taşır.",
    kime: "Homelab kuran, ellerini kirletmeye razı olan. Aynı VRAM'i tek kartta almak 5-8 kat pahalı.",
    tikanma:
      "PCIe üzerinden tensör paralelliği verimi ~%60 — 4 kartın toplamını olduğu gibi alamazsın. 1650 W sürekli çekiş: Türkiye'de yıllık elektrik faturası kartların bir kısmı kadar tutar. Dört kartı soğutmak ve beslemek ayrı bir mühendislik işi, gürültü ofis odasına uygun değil. FP8/FP4 yok.",
    renk: "warn",
  },
  {
    no: 6,
    ad: "RTX PRO 5000 Blackwell 72 GB iş istasyonu",
    fiyat: "~870 bin ₺",
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
    no: 7,
    ad: "RTX PRO 6000 hazır iş istasyonu",
    fiyat: "1.445.598 ₺ · stokta",
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
    no: 8,
    ad: "1× PRO 6000, büyüyebilen platform",
    fiyat: "1,8-2,1 milyon ₺",
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
    no: 9,
    ad: "2× PRO 6000, aynı platform",
    fiyat: "2,9-3,3 milyon ₺",
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
];

/* ------------------------------------------------------------------ */
/*  Simülasyonun MODELLEYEMEDİĞİ şeyler — bantlarda anlatılıyor ama    */
/*  hesaba girmiyor. Kullanıcıya açıkça söylenmeli.                    */
/* ------------------------------------------------------------------ */
export const BANT_UYARISI =
  "Bantlardaki fiyat, stok, garanti, PCIe hattı ve platform büyüme bilgisi Türkiye'deki " +
  "satıcı yapılandırmalarına dayanır; simülatör bunları hesaplamaz. Offload artık " +
  "modelleniyor (5. bant onu kullanır), ama simülatör KÖR — katman bazlı — offload " +
  "varsayar: RAM'e taşınan ağırlıklar her adımda payları oranında okunur. Gerçekte " +
  "akıllı yerleştirme (sık kullanılan katmanları VRAM'de tutmak, seyrek erişilen " +
  "embedding tablosunu RAM'e atmak) daha iyi sonuç verir. Bu yüzden offload'lı " +
  "kurulumlarda gördüğün hız bir ALT SINIRDIR; gerçek kurulum daha hızlı olabilir.";
