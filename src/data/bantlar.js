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
    no: 2,
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
    no: 3,
    ad: "RTX PRO 6000 hazır iş istasyonu",
    fiyat: "1.445.598 ₺ · stokta",
    ozet: "Bu hafta lazım, stokta olsun, tek kutu olsun.",
    ne: "1× RTX PRO 6000 96 GB, i9-14900KF, 192 GB DDR5, 1 TB NVMe + 2 TB SATA, 1500 W, 2 yıl garanti, Ubuntu + CUDA + Docker kurulu gelir.",
    ayar: {
      modelId: "qwen38_27b", cihazId: "pro6000", adet: 1,
      quant: "fp8", kvq: "fp8", ctxK: 128, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false,
    },
    tekKullanici: "Qwen3.8-27B FP8'de 100 tok/s civarı. Çok kipli, 262K bağlam, her şey yerinde.",
    ekip: "27B ile rahat: 8 kişi, 256K bağlama kadar.",
    kime: "“Bu hafta lazım, kurulu gelsin, tek kutu olsun” diyen. 4. bandın stokta olan hâli.",
    tikanma:
      "i9'un 20 PCIe hattı var; ikinci kart x8'e düşer. 4 DIMM yuvası, 192 GB tavan. 1500 W ikinci kartı beslemez. İkinci kartın günü geldiğinde yeni sistem almak demek.",
    renk: "warn",
  },
  {
    no: 4,
    ad: "1× PRO 6000, büyüyebilen platform",
    fiyat: "1,8-2,1 milyon ₺",
    ozet: "Bugün aynı performans, yarın ikinci kartı takabilme hakkı.",
    ne: "Aynı kart; ama Threadripper PRO 9000 WX / EPYC 9005 anakart, 2 adet PCIe 5.0 ×16 hazır, 384 GB DDR5 ECC RDIMM, 2× 4 TB NVMe Gen5, 2000 W+ güç kaynağı, 3 yıl garanti.",
    ayar: {
      modelId: "qwen38_27b", cihazId: "pro6000", adet: 1,
      quant: "fp8", kvq: "fp8", ctxK: 256, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false,
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
    no: 5,
    ad: "2× PRO 6000, aynı platform",
    fiyat: "2,9-3,3 milyon ₺",
    ozet: "Büyük MoE kesin, ekip kesin, 5 yıllık plan.",
    ne: "4. bant + ikinci kart. Toplam 192 GB VRAM, tensor parallelism TP=2.",
    ayar: {
      modelId: "qwen38_flash_next", cihazId: "pro6000", adet: 2,
      quant: "nvfp4", kvq: "fp8", ctxK: 262, girdiK: 4,
      kullanici: 8, cikti: 800, indirGibi: false,
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
  "satıcı yapılandırmalarına dayanır; simülatör bunları hesaplamaz. Simülatör ayrıca " +
  "ağırlıkların bir kısmını sistem RAM'ine taşımayı (offload) modellemez — 5. bandın " +
  "resmi FP8 checkpoint anlatısı buna dayanır, bu yüzden simülatör o kurulumu " +
  "“sığmıyor” gösterebilir. Bandı yükleyince göreceğin sayılar, offload OLMADAN " +
  "sadece VRAM'e sığdırma senaryosudur.";
