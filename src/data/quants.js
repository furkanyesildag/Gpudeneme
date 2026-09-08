/* ------------------------------------------------------------------ */
/*  AĞIRLIK KUANTİZASYONU                                              */
/*                                                                     */
/*  bpp = parametre başına BAYT. Değerler llama.cpp'nin yayımlanmış    */
/*  bit/ağırlık ölçümlerinden (7B referans) türetildi; gömme ve norm   */
/*  katmanları daha yüksek hassasiyette kaldığı için saf bit oranından */
/*  biraz yüksektir. Model başına ±%5 sapar.                           */
/*                                                                     */
/*  ÖNEMLİ: IQ (importance-matrix) şemaları, AYNI BOYUTTA klasik       */
/*  K-quant'lardan daha iyi kalite verir. IQ3_M (3,66 bit), Q3_K_M'den */
/*  (3,89 bit) hem küçük hem daha iyidir. Bunun bedeli çözme (dequant) */
/*  maliyetidir: IQ çekirdekleri daha karmaşıktır ve özellikle CPU ile */
/*  eski GPU'larda bir miktar yavaşlar — hizCarpani bunu ifade eder.   */
/*                                                                     */
/*  kalite: 100 = BF16 referansı. Perplexity artışına dayalı YAKLAŞIK  */
/*  bir sıralamadır, kesin bir ölçüm değildir; işten işe değişir.      */
/*  hizCarpani: decode hızına uygulanan çarpan (dequant maliyeti).     */
/*  gguf: llama.cpp dosya adında geçen etiket — HuggingFace'te bu      */
/*        kuantizasyonun bulunup bulunmadığını aramak için kullanılır. */
/* ------------------------------------------------------------------ */

export const QUANTS = [
  /* ---------------- Tam hassasiyet ---------------- */
  {
    id: "bf16", ad: "BF16 / FP16", grup: "Tam hassasiyet", bpp: 2.0, bit: "16 bit",
    kayip: "referans", kalite: 100, hizCarpani: 1.0, gguf: ["BF16", "F16"],
    ne: "Modelin eğitildiği tam hassasiyet. Hiçbir sıkıştırma yok.",
    arti: "En yüksek kalite; bozulma sıfır. İnce ayar için tek doğru seçenek.",
    eksi: "En yüksek bellek ve bant genişliği — her şey 2 kat yer kaplar, okuma da o oranda yavaşlar.",
    nezaman: "Kalite referansı olarak, ince ayar yaparken veya belleğin bolsa.",
  },

  /* ---------------- 8 bit ---------------- */
  {
    id: "fp8", ad: "FP8 (E4M3)", grup: "8 bit", bpp: 1.06, bit: "8 bit",
    kayip: "~%1", kalite: 99, hizCarpani: 1.0, gguf: [],
    ne: "8-bit kayan nokta. Ağırlık başına 1 bayt + blok ölçek katsayıları.",
    arti: "Belleği yarıya indirir, kaliteyi neredeyse hiç bozmaz; modern NVIDIA/AMD kartlarında donanımda hızlandırılır. Birçok model artık doğrudan FP8 yayımlanıyor.",
    eksi: "Yerel destek Hopper, Ada, Blackwell, RDNA4 ve CDNA3+ ile sınırlı; Ampere/Apple'da avantaj kaybolur.",
    nezaman: "Modern NVIDIA donanımında üretim için pratik varsayılan.",
  },
  {
    id: "q8", ad: "Q8_0 (GGUF)", grup: "8 bit", bpp: 1.06, bit: "8,5 bit",
    kayip: "~%0,5", kalite: 99.5, hizCarpani: 1.0, gguf: ["Q8_0"],
    ne: "llama.cpp'nin 8-bit tam sayı şeması, blok başına tek ölçek.",
    arti: "BF16'dan pratikte ayırt edilemez, yarı yer kaplar ve her donanımda (Apple, AMD, Intel, CPU) çalışır.",
    eksi: "FP8 gibi donanımda hızlandırılmaz; hız kazancı yalnızca bant genişliğinden gelir.",
    nezaman: "Apple/AMD/Intel donanımında kaliteyi hiç düşürmeden yarı yer isteniyorsa.",
  },

  /* ---------------- 6-5 bit ---------------- */
  {
    id: "q6k", ad: "Q6_K", grup: "6-5 bit", bpp: 0.82, bit: "6,6 bit",
    kayip: "~%1", kalite: 98.5, hizCarpani: 1.0, gguf: ["Q6_K"],
    ne: "6-bit K-quant; Q8 ile Q4 arasındaki üst basamak.",
    arti: "Kalite kaybı ölçülebilir sınırın altında sayılır, Q8'den belirgin az yer kaplar.",
    eksi: "Q4'e göre ~%35 daha çok bellek.",
    nezaman: "Kalite kaybına duyarlı işlerde (kod, uzun akıl yürütme) en güvenli sıkıştırma.",
  },
  {
    id: "q5km", ad: "Q5_K_M", grup: "6-5 bit", bpp: 0.71, bit: "5,7 bit",
    kayip: "~%1,5", kalite: 98, hizCarpani: 1.0, gguf: ["Q5_K_M", "Q5_K_S", "Q5_K"],
    ne: "5-bit K-quant, karışık blok yapısı.",
    arti: "Q6 ile Q4 arasındaki tatlı nokta; kalite kaybı çoğu işte hissedilmez.",
    eksi: "Q4'ten ~%18 daha çok bellek; her modelde hazır sürümü olmayabilir.",
    nezaman: "Q4 biraz düşük geliyorsa ama Q6 belleğe sığmıyorsa.",
  },

  /* ---------------- 4 bit ---------------- */
  {
    id: "nvfp4", ad: "NVFP4 / MXFP4", grup: "4 bit", bpp: 0.58, bit: "~4 bit",
    kayip: "~%2", kalite: 97, hizCarpani: 1.0, gguf: [],
    ne: "4-bit blok kayan nokta — mikro blok başına ayrı çarpan taşır.",
    arti: "Blackwell/CDNA4'te donanım hızlandırmalı, kalitesi düz Q4'ten belirgin iyi. gpt-oss ve Kimi K3 doğrudan bu formatta eğitildi.",
    eksi: "Donanım hızlandırması yalnızca Blackwell ve AMD CDNA4'te. Diğerlerinde yazılımla açılır — yer kazancı kalır, hız kazancı gitmez.",
    nezaman: "Blackwell donanımın varsa en iyi bellek/kalite dengesi.",
  },
  {
    id: "q4qat", ad: "Q4 QAT", grup: "4 bit", bpp: 0.6, bit: "~4 bit",
    kayip: "~%1", kalite: 98, hizCarpani: 1.0, gguf: ["Q4_0", "Q4_K_M"],
    ne: "Kuantizasyona duyarlı eğitilmiş (QAT) 4-bit ağırlık — model bu bit derinliğine göre ayarlanmış.",
    arti: "Q4 boyutunda ama kalite kaybı çok daha az. Gemma 4 ve Kimi K3 resmi QAT sürümü sunuyor.",
    eksi: "Yalnızca üreticinin QAT sürümü yayımladığı modellerde bulunur — her model için yok.",
    nezaman: "Model bir QAT sürümü sunuyorsa düz Q4 yerine DAİMA bunu seç.",
  },
  {
    id: "q4km", ad: "Q4_K_M", grup: "4 bit", bpp: 0.6, bit: "4,8 bit",
    kayip: "~%3", kalite: 95.5, hizCarpani: 1.0, gguf: ["Q4_K_M", "Q4_K", "Q4_K_L", "Q4_K_XL"],
    ne: "llama.cpp'nin en yaygın karışık 4-bit K-quant şeması.",
    arti: "CPU dahil her donanımda çalışır. Yerel kullanımın fiili standardı; her model için hazır dosyası bulunur.",
    eksi: "Aynı boyuttaki IQ4_XS'ten bir tık daha kötü kalite verir.",
    nezaman: "Apple/AMD veya karışık donanımda güvenli varsayılan.",
  },
  {
    id: "iq4xs", ad: "IQ4_XS (imatrix)", grup: "4 bit", bpp: 0.53, bit: "4,25 bit",
    kayip: "~%3", kalite: 96, hizCarpani: 0.95, gguf: ["IQ4_XS", "IQ4_NL"],
    ne: "Importance-matrix ile üretilmiş 4-bit şema: hangi ağırlığın önemli olduğu kalibrasyon verisinden ölçülüp korunur.",
    arti: "Q4_K_M'den HEM küçük HEM biraz daha iyi. 4 bit sınıfında en iyi bellek/kalite dengesi.",
    eksi: "Dequant çekirdeği daha karmaşık — CPU ve eski GPU'larda birkaç yüzde yavaşlar. imatrix'siz üretilmiş sürümleri kötüdür, saygın bir depodan al.",
    nezaman: "GGUF kullanıyorsan ve depoda IQ4_XS varsa Q4_K_M yerine bunu seç.",
  },
  {
    id: "awq", ad: "AWQ / GPTQ 4-bit", grup: "4 bit", bpp: 0.63, bit: "4 bit",
    kayip: "~%2-4", kalite: 96, hizCarpani: 1.0, gguf: [],
    ne: "Kalibrasyon verisiyle önemli ağırlıkları koruyan GPU-yerel 4-bit şemalar.",
    arti: "vLLM/SGLang'de yüksek verimle çalışır; toplu servis için GGUF'tan hızlıdır.",
    eksi: "Kalibrasyona bağlı; her model için hazır sürüm olmayabilir ve CPU'ya taşınmaz.",
    nezaman: "vLLM ile çok kullanıcılı servis verirken ve FP8 belleğe sığmıyorsa.",
  },

  /* ---------------- 3 bit ---------------- */
  {
    id: "q3km", ad: "Q3_K_M", grup: "3 bit", bpp: 0.486, bit: "3,9 bit",
    kayip: "~%6", kalite: 91, hizCarpani: 1.0, gguf: ["Q3_K_M", "Q3_K", "Q3_K_L", "Q3_K_S", "Q3_K_XL"],
    ne: "3-bit K-quant.",
    arti: "Her yerde bulunur ve dequant'ı hızlıdır.",
    eksi: "Aynı boyuttaki IQ3_M'den daha KÖTÜ — hatta IQ3_M hem küçük hem iyidir. Klasik şema burada geride kalıyor.",
    nezaman: "Neredeyse hiç: IQ3_M varsa onu tercih et.",
  },
  {
    id: "iq3m", ad: "IQ3_M (imatrix)", grup: "3 bit", bpp: 0.457, bit: "3,7 bit",
    kayip: "~%4", kalite: 93, hizCarpani: 0.92, gguf: ["IQ3_M", "IQ3_S"],
    ne: "Importance-matrix ile 3-bit; 3 bit sınıfının en dengelisi.",
    arti: "Q3_K_M'den hem küçük hem belirgin daha iyi. 3 bite inmek zorundaysan doğru adres.",
    eksi: "Dequant maliyeti hissedilir (~%8). Kalite yine de BF16'nın altında, uzun akıl yürütmede fark açılır.",
    nezaman: "Model 4 bitte sığmıyor ama 3 bitte sığıyorsa ilk denenecek şema.",
  },
  {
    id: "iq3xxs", ad: "IQ3_XXS (imatrix)", grup: "3 bit", bpp: 0.383, bit: "3,1 bit",
    kayip: "~%8", kalite: 88, hizCarpani: 0.92, gguf: ["IQ3_XXS", "IQ3_XS"],
    ne: "3 bitin alt ucu.",
    arti: "Q2 sınıfına inmeden elde edilebilecek en küçük makul boyut.",
    eksi: "Kalite düşüşü gözle görülür: tutarsızlık ve tekrar artar.",
    nezaman: "IQ3_M sığmıyorsa, Q2'ye inmeden önceki son durak.",
  },

  /* ---------------- 2 bit ve altı ---------------- */
  {
    id: "q2k", ad: "Q2_K", grup: "2 bit ve altı", bpp: 0.37, bit: "3,0 bit",
    kayip: "~%12", kalite: 82, hizCarpani: 1.0, gguf: ["Q2_K", "Q2_K_L", "Q2_K_XL"],
    ne: "2-bit K-quant (pratikte ~3 bit yer kaplar).",
    arti: "Çok küçük; devasa bir modeli mütevazı donanıma sığdırabilir.",
    eksi: "Kalite ciddi düşer. Aynı boyuttaki IQ2_M'den daha kötü.",
    nezaman: "Neredeyse hiç: IQ2_M varsa onu seç.",
  },
  {
    id: "iq2m", ad: "IQ2_M (imatrix)", grup: "2 bit ve altı", bpp: 0.338, bit: "2,7 bit",
    kayip: "~%14", kalite: 79, hizCarpani: 0.90, gguf: ["IQ2_M", "IQ2_S"],
    ne: "Importance-matrix ile 2-bit.",
    arti: "Bu boyutta elde edilebilecek en iyi kalite. Büyük bir modelin IQ2'si, küçük bir modelin Q6'sından iyi olabilir — ama bu modele göre değişir, test et.",
    eksi: "Akıl yürütme ve kod üretiminde bozulma açıkça hissedilir.",
    nezaman: "Yalnızca çok büyük bir modeli başka türlü hiç çalıştıramıyorsan.",
  },
  {
    id: "iq2xxs", ad: "IQ2_XXS (imatrix)", grup: "2 bit ve altı", bpp: 0.258, bit: "2,1 bit",
    kayip: "~%25", kalite: 68, hizCarpani: 0.90, gguf: ["IQ2_XXS", "IQ2_XS"],
    ne: "2 bitin alt ucu — sınırı zorlayan sıkıştırma.",
    arti: "En düşük makul bellek.",
    eksi: "Model belirgin biçimde aptallaşır: talimat takibi zayıflar, tekrar ve uydurma artar.",
    nezaman: "Deneme amaçlı. Üretimde kullanma.",
  },
  {
    id: "iq1m", ad: "IQ1_M (imatrix)", grup: "2 bit ve altı", bpp: 0.219, bit: "1,75 bit",
    kayip: "%40+", kalite: 50, hizCarpani: 0.88, gguf: ["IQ1_M", "IQ1_S"],
    ne: "1-bit sınıfı; teknik bir merak konusu.",
    arti: "İnanılmaz küçük — 1T'lik bir modeli 200 GB'a indirir.",
    eksi: "Çıktı çoğu iş için kullanılamaz hale gelir. Neredeyse her zaman bir küçük modelin Q4'ü daha iyidir.",
    nezaman: "Sadece merak için. Ciddi bir iş için değil.",
  },
];

export const QUANT_HARITA = Object.fromEntries(QUANTS.map((q) => [q.id, q]));

/* Açılır listedeki grup sırası — büyükten küçüğe. */
export const QUANT_GRUP = ["Tam hassasiyet", "8 bit", "6-5 bit", "4 bit", "3 bit", "2 bit ve altı"];

/* ------------------------------------------------------------------ */
/*  KV CACHE KUANTİZASYONU                                             */
/* ------------------------------------------------------------------ */
export const KVQUANTS = [
  { id: "fp16", ad: "FP16 (tam)", f: 1.0, not: "Tam hassasiyet KV cache. En güvenli, en çok yer kaplar." },
  { id: "fp8", ad: "FP8 / q8_0", f: 0.5, not: "KV cache'i yarıya indirir; kalite etkisi çoğu işte ölçülemeyecek kadar küçük. Uzun bağlamda ilk yapılacak iyileştirme." },
  { id: "q5", ad: "Q5_1", f: 0.35, not: "KV'yi üçte bire yakın indirir; FP8 ile Q4 arasındaki ara basamak." },
  { id: "q4", ad: "Q4", f: 0.28, not: "KV cache'i yaklaşık dörtte bire indirir; çok uzun bağlamda hatırlama doğruluğu düşebilir. Ağırlık kuantizasyonundan ÖNCE buna bak." },
];

export const KVQUANT_HARITA = Object.fromEntries(KVQUANTS.map((q) => [q.id, q]));

/* Bellek sıkışınca bir sonraki adım için öneri zinciri (kaliteyi en az bozan yol) */
export const DUSUK_QUANT_ONER = {
  bf16: "FP8 veya Q8_0", fp8: "Q6_K veya NVFP4", q8: "Q6_K", q6k: "Q5_K_M",
  q5km: "IQ4_XS", nvfp4: "IQ4_XS", q4qat: "IQ4_XS", q4km: "IQ4_XS",
  iq4xs: "IQ3_M", awq: "IQ4_XS", q3km: "IQ3_M", iq3m: "IQ3_XXS",
  iq3xxs: "IQ2_M", q2k: "IQ2_M", iq2m: "IQ2_XXS", iq2xxs: "IQ1_M",
  iq1m: "daha fazla cihaz veya offload",
};
