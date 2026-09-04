/* ------------------------------------------------------------------ */
/*  KUANTİZASYON                                                       */
/*  bpp = parametre başına BAYT (bytes per parameter).                 */
/*  Gerçek dosya boyutları GGUF/kuantize repolardan gözlenen           */
/*  ortalamalardır; gömme ve norm katmanları genelde daha yüksek       */
/*  hassasiyette kaldığı için saf bit oranından biraz yüksektir.       */
/* ------------------------------------------------------------------ */

export const QUANTS = [
  {
    id: "bf16", ad: "BF16 / FP16", bpp: 2.0, kayip: "referans", bit: "16 bit", kalite: 100,
    ne: "Modelin eğitildiği tam hassasiyet. Hiçbir sıkıştırma yok.",
    arti: "En yüksek kalite; bozulma sıfır. Eğitim ve ince ayar için tek doğru seçenek.",
    eksi: "En yüksek bellek ve bant genişliği — her şey 2 kat yer kaplar, okuma da o oranda yavaşlar.",
    nezaman: "Kalite referansı olarak, ince ayar yaparken veya doğruluk kritikse ve belleğin bolsa.",
  },
  {
    id: "fp8", ad: "FP8 (E4M3)", bpp: 1.06, kayip: "~%1", bit: "8 bit", kalite: 99,
    ne: "8-bit kayan nokta. Ağırlık başına 1 bayt + blok ölçek katsayıları.",
    arti: "Belleği ve bant genişliğini yarıya indirir, kaliteyi neredeyse hiç bozmaz; modern NVIDIA/AMD kartlarında donanımda hızlandırılır. Birçok model artık doğrudan FP8 olarak yayımlanıyor.",
    eksi: "Yerel destek Hopper, Ada, Blackwell, RDNA4 ve CDNA3+ ile sınırlı; Ampere/Apple'da avantaj kaybolur.",
    nezaman: "Modern NVIDIA donanımında üretim için pratik varsayılan.",
  },
  {
    id: "nvfp4", ad: "NVFP4 / MXFP4", bpp: 0.58, kayip: "~%2", bit: "~4 bit", kalite: 97,
    ne: "4-bit blok kayan nokta — mikro ölçekli blok başına ayrı çarpan taşır.",
    arti: "Belleği dörtte bire yakın düşürür; Blackwell/CDNA4'te donanım hızlandırmalı, kalitesi düz Q4'ten belirgin iyi. gpt-oss ve Kimi K3 doğrudan bu formatta eğitildi.",
    eksi: "Donanım hızlandırması yalnızca Blackwell (RTX 50, RTX PRO Blackwell, B200, GB10/GB300, Thor) ve AMD CDNA4'te. Diğerlerinde yazılımla açılır — yer kazancı kalır, hız kazancı gitmez.",
    nezaman: "Blackwell donanımın varsa en iyi bellek/kalite dengesi.",
  },
  {
    id: "q8", ad: "Q8_0 (GGUF)", bpp: 1.09, kayip: "~%0,5", bit: "8 bit", kalite: 99.5,
    ne: "llama.cpp'nin 8-bit tam sayı şeması, blok başına tek ölçek.",
    arti: "BF16'dan pratikte ayırt edilemez, yarı yer kaplar ve her donanımda (Apple, AMD, Intel, CPU) çalışır.",
    eksi: "FP8 gibi donanımda hızlandırılmaz; hız kazancı yalnızca bant genişliğinden gelir.",
    nezaman: "Apple/AMD/Intel donanımında kaliteyi hiç düşürmeden yarı yer isteniyorsa.",
  },
  {
    id: "q6", ad: "Q6_K (GGUF)", bpp: 0.82, kayip: "~%1", bit: "~6 bit", kalite: 98.5,
    ne: "6-bit K-quant; Q8 ile Q4 arasında kalan ara basamak.",
    arti: "Q4'ten belirgin daha iyi kalite, Q8'den belirgin daha az yer. Kalite kaybına duyarlı işlerde tatlı nokta.",
    eksi: "Q4'e göre ~%35 daha çok bellek; her modelde hazır sürümü bulunmayabilir.",
    nezaman: "Q4 kaliteyi hissettiriyorsa ilk çıkılacak basamak.",
  },
  {
    id: "q4", ad: "Q4_K_M (GGUF)", bpp: 0.6, kayip: "~%3-5", bit: "~4 bit", kalite: 95,
    ne: "llama.cpp/GGUF'un en yaygın karışık 4-bit şeması.",
    arti: "CPU dahil her donanımda çalışır (Apple, AMD, Intel, NVIDIA). Belleği büyük ölçüde düşürür; yerel kullanımın fiili standardı.",
    eksi: "Kalite BF16'ya göre ölçülebilir düşer — uzun akıl yürütme ve kod üretiminde daha çok hissedilir.",
    nezaman: "Apple/AMD veya karışık donanımda pratik yerel varsayılan.",
  },
  {
    id: "q4qat", ad: "Q4 QAT", bpp: 0.6, kayip: "~%1", bit: "~4 bit", kalite: 98,
    ne: "Kuantizasyona duyarlı eğitilmiş (QAT) 4-bit ağırlık — model bu bit derinliğine göre ayarlanmış.",
    arti: "Q4 boyutunda ama kalite kaybı çok daha az. Gemma 4 ve Kimi K3 resmi QAT sürümleri sunuyor.",
    eksi: "Yalnızca üreticinin QAT sürümü yayımladığı modellerde bulunur — her model için yok.",
    nezaman: "Model bir QAT sürümü sunuyorsa düz Q4 yerine DAİMA bunu seç.",
  },
  {
    id: "awq", ad: "AWQ / GPTQ 4-bit", bpp: 0.63, kayip: "~%2-4", bit: "4 bit", kalite: 96,
    ne: "Kalibrasyon verisiyle önemli ağırlıkları koruyan GPU-yerel 4-bit şemalar.",
    arti: "vLLM/SGLang'de yüksek verimle çalışır; toplu (batch) servis için GGUF'tan hızlıdır.",
    eksi: "Kalibrasyona bağlı; her model için hazır sürüm olmayabilir ve CPU'ya taşınmaz.",
    nezaman: "vLLM ile çok kullanıcılı servis verirken ve FP8 belleğe sığmıyorsa.",
  },
  {
    id: "q3", ad: "Q3_K_M (agresif)", bpp: 0.46, kayip: "~%8+", bit: "~3 bit", kalite: 88,
    ne: "3-bit sıkıştırma — sınırı zorlayan agresif kuantizasyon.",
    arti: "En düşük bellek; çok büyük bir modeli küçük donanıma sığdırabilir.",
    eksi: "Kalite gözle görülür düşer: tutarsızlık, tekrar ve akıl yürütme hataları artar. Kod üretiminde özellikle riskli.",
    nezaman: "Yalnızca model başka türlü hiç sığmıyorsa, son çare. Genelde bir küçük modelin Q6'sı daha iyidir.",
  },
];

export const QUANT_HARITA = Object.fromEntries(QUANTS.map((q) => [q.id, q]));

/* ------------------------------------------------------------------ */
/*  KV CACHE KUANTİZASYONU                                             */
/* ------------------------------------------------------------------ */
export const KVQUANTS = [
  { id: "fp16", ad: "FP16 (tam)", f: 1.0, not: "Tam hassasiyet KV cache. En güvenli, en çok yer kaplar." },
  { id: "fp8",  ad: "FP8 / q8_0",  f: 0.5, not: "KV cache'i yarıya indirir; kalite etkisi çoğu işte ölçülemeyecek kadar küçük. Uzun bağlamda ilk yapılacak iyileştirme." },
  { id: "q4",   ad: "Q4",          f: 0.28, not: "KV cache'i yaklaşık dörtte bire indirir; çok uzun bağlamda hatırlama doğruluğu düşebilir. Ağırlık kuantizasyonundan önce buna bakılmalı." },
];

export const KVQUANT_HARITA = Object.fromEntries(KVQUANTS.map((q) => [q.id, q]));

/* Bellek sıkışınca bir sonraki adım için öneri zinciri */
export const DUSUK_QUANT_ONER = {
  bf16: "FP8 veya Q8", fp8: "NVFP4 veya Q4", q8: "Q6", q6: "Q4_K_M",
  nvfp4: "Q4", awq: "Q4", q4: "Q3", q4qat: "Q3", q3: "daha fazla cihaz",
};
