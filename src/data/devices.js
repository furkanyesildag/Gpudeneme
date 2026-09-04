/* ------------------------------------------------------------------ */
/*  DONANIM VERİTABANI                                                 */
/*  Son doğrulama: 4 Eylül 2026 · USD/TRY ≈ 48,4                       */
/*                                                                     */
/*  mem   birleşik RAM / VRAM (GB)                                     */
/*  bw    bellek bant genişliği (GB/s) — token hızını ASIL bu belirler */
/*  tf    yoğun (sparsity'siz) FP8 TFLOPS; FP8'i olmayan donanımda     */
/*        FP16 değeri — yalnızca ilk-token tahmininde kullanılır       */
/*  w     kart/kutu TDP (W)                                            */
/*  usd   yaklaşık ABD sokak fiyatı                                    */
/*  try   Türkiye'de gözlenen yaklaşık perakende fiyat (TL) — bilinen  */
/*        modellerde; yoksa usd üzerinden ithalat katsayısıyla tahmin  */
/*  tur   "kart" (ayrık GPU) | "kutu" (hazır sistem / birleşik bellek) */
/*  link  çoklu kullanımda interconnect: nvlink | pcie | net           */
/*  mbu   ölçülen bant genişliği kullanım oranı (Model Bandwidth Util.)*/
/*  tr    Türkiye tedarik durumu                                       */
/*  mim   mimari — kuantizasyon donanım desteğini belirler             */
/*  slot  kaç PCIe slotu kaplıyor (kart tipinde; şasi planlaması için) */
/* ------------------------------------------------------------------ */

export const DEVICES = [
  /* ---------- Tüketici kartları: Türkiye'de raftan alınabilir ---------- */
  { id: "5090", ad: "GeForce RTX 5090", grup: "Tüketici kartı", mem: 32, bw: 1792, tf: 838, w: 575, usd: 3150, try: 152000, tur: "kart", link: "pcie", mbu: 0.63, tr: "kolay", mim: "blackwell", slot: 3,
    not: "Türkiye'de en yüksek VRAM/TL oranına sahip raf ürünü. 575 W — güç kaynağı ve kasa havalandırması ciddi planlanmalı." },
  { id: "5080", ad: "GeForce RTX 5080", grup: "Tüketici kartı", mem: 16, bw: 960, tf: 415, w: 360, usd: 1780, try: 86000, tur: "kart", link: "pcie", mbu: 0.63, tr: "kolay", mim: "blackwell", slot: 2 },
  { id: "5070ti", ad: "GeForce RTX 5070 Ti", grup: "Tüketici kartı", mem: 16, bw: 896, tf: 345, w: 300, usd: 1080, try: 52000, tur: "kart", link: "pcie", mbu: 0.63, tr: "kolay", mim: "blackwell", slot: 2,
    not: "16 GB sınıfında TL başına en iyi bant genişliği. 2×5070 Ti = 32 GB, tek 5090'ın yarı fiyatına." },
  { id: "5070", ad: "GeForce RTX 5070", grup: "Tüketici kartı", mem: 12, bw: 672, tf: 237, w: 250, usd: 790, try: 38000, tur: "kart", link: "pcie", mbu: 0.62, tr: "kolay", mim: "blackwell", slot: 2 },
  { id: "5060ti16", ad: "GeForce RTX 5060 Ti 16 GB", grup: "Tüketici kartı", mem: 16, bw: 448, tf: 178, w: 180, usd: 540, try: 26000, tur: "kart", link: "pcie", mbu: 0.62, tr: "kolay", mim: "blackwell", slot: 2,
    not: "En ucuz 16 GB Blackwell. Bant genişliği düşük — küçük modeller ve tek kullanıcı için mantıklı giriş kartı." },
  { id: "4090", ad: "GeForce RTX 4090 (üretimi bitti)", grup: "Tüketici kartı", mem: 24, bw: 1008, tf: 660, w: 450, usd: 2300, try: 112000, tur: "kart", link: "pcie", mbu: 0.63, tr: "sinirli", mim: "ada", slot: 3,
    not: "Üretimi durdu; Türkiye'de kalan stok ve ikinci elden bulunur. 24 GB + 1 TB/s hâlâ çok dengeli." },
  { id: "4080s", ad: "GeForce RTX 4080 Super (2. el)", grup: "Tüketici kartı", mem: 16, bw: 736, tf: 412, w: 320, usd: 1150, try: 56000, tur: "kart", link: "pcie", mbu: 0.63, tr: "kolay", mim: "ada", slot: 3 },
  { id: "3090", ad: "GeForce RTX 3090 (2. el)", grup: "Tüketici kartı", mem: 24, bw: 936, tf: 142, w: 350, usd: 800, try: 39000, tur: "kart", link: "pcie", mbu: 0.60, tr: "kolay", mim: "ampere", slot: 3,
    not: "Yerel LLM için klasik ikinci el tercih: 24 GB + 936 GB/s, TL başına en iyi bellek. NVLink köprüsüyle ikili çalışır. FP8 yok." },
  { id: "3060_12", ad: "GeForce RTX 3060 12 GB (2. el)", grup: "Tüketici kartı", mem: 12, bw: 360, tf: 51, w: 170, usd: 270, try: 13000, tur: "kart", link: "pcie", mbu: 0.58, tr: "kolay", mim: "ampere", slot: 2,
    not: "En ucuz 12 GB. 8-14B modelleri Q4'te rahat çalıştırır; öğrenmek ve prototip için yeterli." },
  { id: "9070xt", ad: "AMD Radeon RX 9070 XT", grup: "Tüketici kartı", mem: 16, bw: 640, tf: 195, w: 304, usd: 700, try: 33600, tur: "kart", link: "pcie", mbu: 0.55, tr: "kolay", mim: "rdna4", slot: 2,
    not: "Türkiye'de 16 GB'ın en ucuzu. ROCm/Vulkan ile llama.cpp iyi çalışır; vLLM tarafı NVIDIA kadar oturmuş değil." },
  { id: "7900xtx", ad: "AMD Radeon RX 7900 XTX", grup: "Tüketici kartı", mem: 24, bw: 960, tf: 123, w: 355, usd: 990, try: 48000, tur: "kart", link: "pcie", mbu: 0.55, tr: "kolay", mim: "rdna3", slot: 3,
    not: "24 GB + 960 GB/s; NVIDIA dışı en iyi TL/GB oranlarından. Yazılım tarafı llama.cpp/Ollama'da sorunsuz." },
  { id: "7900xt", ad: "AMD Radeon RX 7900 XT", grup: "Tüketici kartı", mem: 20, bw: 800, tf: 103, w: 315, usd: 780, try: 37500, tur: "kart", link: "pcie", mbu: 0.55, tr: "kolay", mim: "rdna3", slot: 3 },
  { id: "arcb580", ad: "Intel Arc B580 12 GB", grup: "Tüketici kartı", mem: 12, bw: 456, tf: 114, w: 190, usd: 270, try: 13000, tur: "kart", link: "pcie", mbu: 0.52, tr: "kolay", mim: "intel", slot: 2,
    not: "Çok ucuz 12 GB. IPEX-LLM ve llama.cpp SYCL ile çalışır; ekosistem NVIDIA/AMD'den geride." },

  /* ---------- İş istasyonu kartları ---------- */
  { id: "pro6000", ad: "NVIDIA RTX PRO 6000 Blackwell 96 GB", grup: "İş istasyonu kartı", mem: 96, bw: 1792, tf: 1000, w: 600, usd: 8500, try: 790000, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "blackwell", slot: 2,
    not: "Tek kartta 96 GB — 100B sınıfı MoE'leri tek slotta çalıştıran en pratik çözüm. Türkiye'de yetkili satıcılardan siparişle." },
  { id: "pro5000_72", ad: "NVIDIA RTX PRO 5000 Blackwell 72 GB", grup: "İş istasyonu kartı", mem: 72, bw: 1344, tf: 535, w: 300, usd: 7000, try: 400000, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "blackwell", slot: 2 },
  { id: "pro5000_48", ad: "NVIDIA RTX PRO 5000 Blackwell 48 GB", grup: "İş istasyonu kartı", mem: 48, bw: 1344, tf: 535, w: 300, usd: 4500, try: 260000, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "blackwell", slot: 2 },
  { id: "pro4500", ad: "NVIDIA RTX PRO 4500 Blackwell 32 GB", grup: "İş istasyonu kartı", mem: 32, bw: 896, tf: 405, w: 200, usd: 2600, try: 150000, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "blackwell", slot: 2 },
  { id: "pro4000", ad: "NVIDIA RTX PRO 4000 Blackwell 24 GB", grup: "İş istasyonu kartı", mem: 24, bw: 672, tf: 290, w: 140, usd: 1500, try: 88000, tur: "kart", link: "pcie", mbu: 0.64, tr: "sinirli", mim: "blackwell", slot: 1,
    not: "Tek slot, 140 W — normal masaüstü kasasına 2-4 adet sığar, ek güç kablosu derdi az." },
  { id: "rtx4000ada", ad: "NVIDIA RTX 4000 Ada 20 GB", grup: "İş istasyonu kartı", mem: 20, bw: 360, tf: 213, w: 130, usd: 1250, try: 74000, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "ada", slot: 1 },
  { id: "l40s", ad: "NVIDIA L40S 48 GB", grup: "İş istasyonu kartı", mem: 48, bw: 864, tf: 733, w: 350, usd: 8000, try: 430000, tur: "kurumsal", mim: "ada", tur_: 0, link: "pcie", mbu: 0.65, slot: 2 },
  { id: "a6000ada", ad: "NVIDIA RTX 6000 Ada 48 GB", grup: "İş istasyonu kartı", mem: 48, bw: 960, tf: 728, w: 300, usd: 6800, try: 380000, tur: "kart", link: "pcie", mbu: 0.65, tr: "sinirli", mim: "ada", slot: 2 },
  { id: "a6000", ad: "NVIDIA RTX A6000 48 GB (2. el)", grup: "İş istasyonu kartı", mem: 48, bw: 768, tf: 155, w: 300, usd: 3500, try: 190000, tur: "kart", link: "pcie", mbu: 0.62, tr: "ithal", mim: "ampere", slot: 2,
    not: "İkinci elde 48 GB'ın en ucuz yolu. FP8 yok; Q4/Q8 GGUF ile kullanılır." },
  { id: "r9700", ad: "AMD Radeon AI PRO R9700 32 GB", grup: "İş istasyonu kartı", mem: 32, bw: 640, tf: 383, w: 300, usd: 1300, try: 72000, tur: "kart", link: "pcie", mbu: 0.58, tr: "ithal", mim: "rdna4", slot: 2,
    not: "32 GB'ı en ucuza veren yeni kart. ROCm gerektirir; Türkiye'de raf ürünü değil." },
  { id: "arcprob60", ad: "Intel Arc Pro B60 24 GB", grup: "İş istasyonu kartı", mem: 24, bw: 456, tf: 114, w: 200, usd: 650, try: 40000, tur: "kart", link: "pcie", mbu: 0.52, tr: "ithal", mim: "intel", slot: 2,
    not: "24 GB'ı ~$650'ye veren tek kart. Bant genişliği düşük ama TL/GB rakipsiz; ekosistem olgunlaşıyor." },
  { id: "arcprob50", ad: "Intel Arc Pro B50 16 GB", grup: "İş istasyonu kartı", mem: 16, bw: 224, tf: 68, w: 70, usd: 380, try: 23000, tur: "kart", link: "pcie", mbu: 0.50, tr: "ithal", mim: "intel", slot: 1,
    not: "70 W, tek slot, 16 GB — küçük ofis sunucusuna ek güç kablosu olmadan takılır." },

  /* ---------- Hazır kutular / birleşik bellek ---------- */
  { id: "spark", ad: "NVIDIA DGX Spark (GB10)", grup: "Hazır kutu", mem: 128, bw: 273, tf: 125, w: 240, usd: 4699, try: 260000, tur: "kutu", link: "net", mbu: 0.70, tr: "sinirli", mim: "gb10",
    not: "128 GB birleşik bellek — büyük modeli SIĞDIRIR ama 273 GB/s bant genişliği hızı sınırlar. Prototip/geliştirme için, çok kullanıcılı servis için değil." },
  { id: "gx10", ad: "ASUS Ascent GX10 (GB10)", grup: "Hazır kutu", mem: 128, bw: 276, tf: 125, w: 240, usd: 2999, try: 172000, tur: "sinirli", tur2: 0, link: "net", mbu: 0.70, mim: "gb10" },
  { id: "station", ad: "DGX Station / MSI WS300 (GB300)", grup: "Hazır kutu", mem: 748, bw: 2000, tf: 4000, w: 1600, usd: 85000, try: 4500000, tur: "kutu", link: "nvlink", mbu: 0.70, tr: "kurumsal", mim: "gb300",
    not: "Katmanlı bellek: 496 GB LPDDR5X + 252 GB HBM3e. Buradaki tek bant genişliği değeri ortalama bir yaklaşıktır." },
  { id: "m3u", ad: "Mac Studio M3 Ultra (96 GB)", grup: "Hazır kutu", mem: 96, bw: 819, tf: 110, w: 270, usd: 3999, try: 210000, tur: "kutu", link: "net", mbu: 0.52, tr: "kolay", mim: "apple",
    not: "819 GB/s birleşik bellek — Apple tarafında yerel LLM için en dengeli seçenek. MLX veya llama.cpp; FP8/FP4 donanım hızlandırması yok." },
  { id: "m4max", ad: "Mac Studio M4 Max (128 GB)", grup: "Hazır kutu", mem: 128, bw: 546, tf: 70, w: 160, usd: 3699, try: 195000, tur: "kutu", link: "net", mbu: 0.52, tr: "kolay", mim: "apple" },
  { id: "m4pro", ad: "Mac mini M4 Pro (64 GB)", grup: "Hazır kutu", mem: 64, bw: 273, tf: 35, w: 90, usd: 2199, try: 115000, tur: "kutu", link: "net", mbu: 0.50, tr: "kolay", mim: "apple",
    not: "Türkiye'de kolay bulunan, sessiz ve 90 W çeken 64 GB'lık kutu. 30B sınıfı modelleri tek kullanıcı için makul hızda çalıştırır." },
  { id: "strix", ad: "Framework Desktop (Ryzen AI Max+ 395)", grup: "Hazır kutu", mem: 128, bw: 256, tf: 60, w: 120, usd: 2200, try: 128000, tur: "kutu", link: "net", mbu: 0.50, tr: "ithal", mim: "amdapu" },
  { id: "evox2", ad: "GMKtec EVO-X2 (Ryzen AI Max+ 395)", grup: "Hazır kutu", mem: 128, bw: 256, tf: 60, w: 120, usd: 1999, try: 116000, tur: "kutu", link: "net", mbu: 0.50, tr: "ithal", mim: "amdapu",
    not: "128 GB birleşik belleği en ucuza veren mini PC. Bant genişliği düşük — büyük MoE'leri sığdırır ama yavaş çalıştırır." },

  /* ---------- Veri merkezi ---------- */
  { id: "b200", ad: "NVIDIA B200 192 GB", grup: "Veri merkezi", mem: 192, bw: 8000, tf: 4500, w: 1000, usd: 40000, try: 2100000, tur: "kart", link: "nvlink", mbu: 0.74, tr: "kurumsal", mim: "blackwell" },
  { id: "h200", ad: "NVIDIA H200 SXM 141 GB", grup: "Veri merkezi", mem: 141, bw: 4800, tf: 1979, w: 700, usd: 32000, try: 1700000, tur: "kart", link: "nvlink", mbu: 0.72, tr: "kurumsal", mim: "hopper" },
  { id: "h100s", ad: "NVIDIA H100 SXM 80 GB", grup: "Veri merkezi", mem: 80, bw: 3350, tf: 1979, w: 700, usd: 27000, try: 1450000, tur: "kart", link: "nvlink", mbu: 0.72, tr: "kurumsal", mim: "hopper" },
  { id: "a100", ad: "NVIDIA A100 SXM 80 GB", grup: "Veri merkezi", mem: 80, bw: 2039, tf: 312, w: 400, usd: 15000, try: 800000, tur: "kart", link: "nvlink", mbu: 0.70, tr: "kurumsal", mim: "ampere",
    not: "FP8 yoktur — buradaki TFLOPS FP16 değeridir. İkinci el kurumsal pazarda fiyatı hızla düşüyor." },
  { id: "mi355x", ad: "AMD Instinct MI355X 288 GB", grup: "Veri merkezi", mem: 288, bw: 8000, tf: 5000, w: 1400, usd: 30000, try: 1600000, tur: "kart", link: "nvlink", mbu: 0.72, tr: "kurumsal", mim: "cdna4" },
  { id: "mi325x", ad: "AMD Instinct MI325X 256 GB", grup: "Veri merkezi", mem: 256, bw: 6000, tf: 2610, w: 1000, usd: 20000, try: 1080000, tur: "kart", link: "nvlink", mbu: 0.70, tr: "kurumsal", mim: "cdna3" },
  { id: "mi300x", ad: "AMD Instinct MI300X 192 GB", grup: "Veri merkezi", mem: 192, bw: 5300, tf: 2610, w: 750, usd: 15000, try: 810000, tur: "kart", link: "nvlink", mbu: 0.70, tr: "kurumsal", mim: "cdna3" },
  { id: "gaudi3", ad: "Intel Gaudi 3 128 GB", grup: "Veri merkezi", mem: 128, bw: 3700, tf: 1835, w: 900, usd: 15000, try: 810000, tur: "kart", link: "nvlink", mbu: 0.68, tr: "kurumsal", mim: "gaudi" },

  /* ---------- Uç / saha ---------- */
  { id: "thor", ad: "Jetson AGX Thor 128 GB", grup: "Uç / saha", mem: 128, bw: 273, tf: 400, w: 130, usd: 3499, try: 200000, tur: "kutu", link: "net", mbu: 0.55, tr: "sinirli", mim: "thor" },
  { id: "agxorin", ad: "Jetson AGX Orin 64 GB", grup: "Uç / saha", mem: 64, bw: 204, tf: 138, w: 60, usd: 1999, try: 118000, tur: "kutu", link: "net", mbu: 0.55, tr: "sinirli", mim: "ampere" },
  { id: "orinnano", ad: "Jetson Orin Nano Super 8 GB", grup: "Uç / saha", mem: 8, bw: 102, tf: 33, w: 25, usd: 249, try: 15000, tur: "kutu", link: "net", mbu: 0.55, tr: "sinirli", mim: "ampere" },
];

/* Bellek tipi — MoE erişim cezası ve gerçekçi bant genişliği için gerekli.
   Mimari adı bunu belirlemez: B200 ve RTX 5090 ikisi de "Blackwell" ama
   biri HBM3e biri GDDR7 kullanır. */
const HBM = new Set(["b200", "h200", "h100s", "a100", "mi355x", "mi325x", "mi300x", "gaudi3", "l40s"]);
const LPDDR = new Set(["spark", "gx10", "station", "m3u", "m4max", "m4pro", "strix", "evox2", "thor", "agxorin", "orinnano"]);

/* Yukarıdaki kayıtlarda gözden kaçan alanları tamamla / normalize et. */
for (const d of DEVICES) {
  d.bellekTipi = HBM.has(d.id) ? "hbm" : LPDDR.has(d.id) ? "lpddr" : "gddr";
  if (!d.tur || (d.tur !== "kart" && d.tur !== "kutu")) {
    d.tur = d.grup === "Hazır kutu" || d.grup === "Uç / saha" ? "kutu" : "kart";
  }
  if (!d.tr) d.tr = "sinirli";
  if (!d.slot) d.slot = d.tur === "kart" ? 2 : 0;
  // Fiyat: uygulamanın tamamı USD üzerinden hesap yapar, TL gösterim içindir.
  if (!d.try) d.try = Math.round(d.usd * 48.4 * 1.35); // ithalat + KDV kabaca
  d.fiyat = d.usd;
  delete d.tur_;
  delete d.tur2;
}

export const CIHAZ_HARITA = Object.fromEntries(DEVICES.map((d) => [d.id, d]));

/* Grup sırası — açılır listede bu sırayla. */
export const GRUP_SIRA = [
  "Tüketici kartı",
  "İş istasyonu kartı",
  "Hazır kutu",
  "Veri merkezi",
  "Uç / saha",
];

/* ---------------- Türkiye tedarik durumu ---------------- */
export const TR_DURUM = {
  kolay:     { ad: "Türkiye'de perakende satılıyor", kisa: "Satılıyor",  renk: "var(--ok)" },
  sinirli:   { ad: "Yetkili satıcı / siparişle",     kisa: "Sipariş",    renk: "var(--steel)" },
  ithal:     { ad: "İthal · gümrük + KDV",           kisa: "İthal",      renk: "var(--warn)" },
  kurumsal:  { ad: "Kurumsal / veri merkezi kanalı", kisa: "Kurumsal",   renk: "var(--bad)" },
};

export const TR_NOT = {
  kolay: "Türkiye'de perakende bulunuyor (Vatan, İncehesap, İtopya, Trendyol vb.). Fiyat kur ve stokla oynar; birden fazla satıcıdan teklif al.",
  sinirli: "Yetkili iş istasyonu / sistem satıcılarından siparişle gelir. Teslim birkaç hafta sürebilir, kurumsal fatura genelde şart.",
  ithal: "Türkiye'de raf ürünü değil. Yurt dışından ithal edilir; üstüne gümrük + %20 KDV, nakliye ve kur riski eklenir.",
  kurumsal: "Bireysel satışı pratikte yok. Veri merkezi/kurumsal kanaldan, çoğu zaman komple sunucuyla birlikte tedarik edilir.",
};

/* ---------------- Mimari → kuantizasyon donanım desteği ---------------- */
export const MIM_AD = {
  blackwell: "Blackwell", gb10: "GB10 (Blackwell)", gb300: "GB300 (Blackwell)",
  thor: "Thor (Blackwell)", hopper: "Hopper", ada: "Ada Lovelace", ampere: "Ampere",
  apple: "Apple Silicon", amdapu: "AMD Strix Halo (APU)", rdna3: "AMD RDNA3",
  rdna4: "AMD RDNA4", cdna3: "AMD CDNA3 (Instinct)", cdna4: "AMD CDNA4 (Instinct)",
  intel: "Intel Xe2 (Battlemage)", gaudi: "Intel Gaudi 3",
};

/* Donanımda FP4 hızlandırması olan mimariler */
export const FP4_NATIVE = new Set(["blackwell", "gb10", "gb300", "thor", "cdna4"]);
/* Donanımda FP8 hızlandırması olan mimariler */
export const FP8_NATIVE = new Set([
  "blackwell", "gb10", "gb300", "thor", "hopper", "ada", "cdna3", "cdna4", "rdna4", "gaudi",
]);

/* Hangi çalıştırma yığını (runtime) bu donanımda oturmuş?  */
export const YIGIN = {
  blackwell: ["vLLM", "SGLang", "TensorRT-LLM", "llama.cpp", "Ollama"],
  gb10: ["vLLM", "llama.cpp", "Ollama", "NIM"],
  gb300: ["vLLM", "SGLang", "TensorRT-LLM", "NIM"],
  thor: ["llama.cpp", "TensorRT-LLM", "Ollama"],
  hopper: ["vLLM", "SGLang", "TensorRT-LLM", "llama.cpp"],
  ada: ["vLLM", "SGLang", "TensorRT-LLM", "llama.cpp", "Ollama"],
  ampere: ["vLLM", "SGLang", "llama.cpp", "Ollama"],
  apple: ["MLX", "llama.cpp", "Ollama", "LM Studio"],
  amdapu: ["llama.cpp (Vulkan/ROCm)", "Ollama", "LM Studio"],
  rdna3: ["llama.cpp (ROCm/Vulkan)", "Ollama", "vLLM (ROCm, kısmi)"],
  rdna4: ["llama.cpp (ROCm/Vulkan)", "Ollama", "vLLM (ROCm, kısmi)"],
  cdna3: ["vLLM (ROCm)", "SGLang (ROCm)", "llama.cpp"],
  cdna4: ["vLLM (ROCm)", "SGLang (ROCm)"],
  intel: ["IPEX-LLM", "llama.cpp (SYCL)", "vLLM (XPU, kısmi)", "OpenVINO"],
  gaudi: ["vLLM (Gaudi)", "Optimum Habana"],
};

/* ------------------------------------------------------------------ */
/*  ANA SİSTEM (kartları çalıştıracak bilgisayar)                      */
/*  Ayrık kartlar tek başına çalışmaz; işlemci, anakart, RAM, güç      */
/*  kaynağı ve kasa gerekir. Bu maliyet kart sayısıyla basamaklıdır:   */
/*  tek karta sunucu şasisi yazmak toplam maliyeti çarpıtır.           */
/* ------------------------------------------------------------------ */
export const ANA_SISTEM = [
  { maxKart: 2, ad: "Masaüstü iş istasyonu", usd: 900, w: 150,
    not: "Standart anakart, 1000-1600 W güç kaynağı, 64 GB RAM." },
  { maxKart: 4, ad: "Çok yuvalı iş istasyonu", usd: 2600, w: 250,
    not: "Threadripper/Xeon sınıfı anakart, bol PCIe hattı, 1600-2000 W güç kaynağı, riser kabloları." },
  { maxKart: 8, ad: "Sunucu şasisi", usd: 8500, w: 400,
    not: "Rack sunucu, yedekli güç kaynağı, aktif soğutma. Gürültülü — ofis odasına konmaz." },
];
