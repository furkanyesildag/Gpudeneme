# Yerel LLM Kapasite Simülasyonu

Açık ağırlıklı LLM'leri **yerel donanımda** çalıştırmayı planlamak için bir simülasyon
ve danışmanlık aracı. Model, kuantizasyon, bağlam uzunluğu ve eşzamanlı kullanıcı
sayısını seçersin; araç bellek bütçesini, token hızını, ilk token gecikmesini,
Türkiye fiyatını ve elektrik maliyetini çıkarır.

**Canlı sürüm:** https://furkanyesildag.github.io/Gpudeneme/

---

## Ne yapar

- **102 açık ağırlıklı model** — Qwen3.8, DeepSeek-V4, GLM-5.3, Kimi K3, Ornith-1.5,
  K2-Horizon, Ling-3.0, Hy4, MiniMax, Llama 4, Mistral Small 4, gpt-oss, Gemma 4,
  Nemotron 3, Granite 4.2, Phi-4, Olmo 3, ve Türkçe modeller (Kumru, Trendyol).
- **40 donanım, hepsi sıfır alınabilir** — Türkiye'de raftan alınan tüketici
  kartlarından (RTX 5090/5080/5070 Ti/5060 Ti, RX 9070 XT, RX 7900 XTX, Arc B580)
  iş istasyonu kartlarına (RTX PRO Blackwell serisi, Arc Pro B60), hazır kutulara
  (Mac Studio, DGX Spark, Strix Halo mini PC) ve veri merkezi hızlandırıcılarına
  kadar. Her birinde **Türkiye tedarik durumu ve TL fiyatı**. İkinci el piyasasına
  bağlı kartlar listede yok: fiyatları ve bulunurlukları planlanamayacak kadar oynak.
- **Gerçek KV cache hesabı** — model başına uydurma bir "KB/token" değil; her modelin
  HuggingFace `config.json` dosyasından okunan katman geometrisi. Kaç katman KV
  tutuyor, kaçı sliding window kullanan, MLA mı GQA mı, hangi katmanlar linear attention
  kullanıyor. Bu sayede Qwen3.5+, GLM-5.3-Flash, Nemotron-H gibi hibrit modellerin
  uzun bağlamdaki gerçek avantajı doğru görünür.
- **17 kuantizasyon şeması** — BF16'dan IQ1_M'e kadar tüm llama.cpp ailesi dahil
  **IQ (importance-matrix)** şemaları. Kritik nokta: IQ'lar aynı boyutta klasik
  K-quant'lardan daha iyidir — IQ4_XS hem Q4_K_M'den küçük hem daha iyi, IQ3_M hem
  Q3_K_M'den küçük hem daha iyi. Bedeli dequant maliyeti; araç bunu da hesaba katar.
- **Var olmayan kuantizasyonu seçtirmez** — model seçilince HuggingFace'te o modelin
  GGUF depoları aranır, dosya adlarından hangi şemaların gerçekten yayımlandığı
  çıkarılır. Bulunmayanlar listeden gizlenir (bir onay kutusuyla geri getirilebilir).
- **Otomatik offload** — VRAM'e sığmayan ağırlıkların bir kısmı host RAM'de tutulabilir
  (llama.cpp `-ngl`, vLLM `--cpu-offload-gb`). Kaç GB taşınacağını sen seçmezsin:
  taşınan her bayt yavaşlattığı için doğru cevap **sığdırmaya yetecek en az miktardır**
  ve araç bunu kendisi hesaplar. Tek anlamlı tercih offload'ın kullanılıp
  kullanılmayacağıdır. Dense modelde bedel ağır, MoE'de yaşanabilir — 24 GB'lık bir
  RTX 3090, gpt-oss-120b'yi otomatik offload'la 22 tok/s'de çalıştırır.
- **Speculative decoding (MTP)** — modelin kendi MTP head'i açıldığında her adımda bir
  taslak token daha üretilir. Hangi modelde head olduğu `config.json`'dan okundu, tahmin
  edilmedi: 109 modelin 48'inde var.
- **İş yükü profilleri** — "ortalama istemim kaç K token?" sorusunu kimse
  cevaplayamaz, ama herkes ne inşa ettiğini bilir. Dokuz profil (kısa sohbet, uzun
  sohbet, RAG, doküman analizi, kod ajanı, IDE kod tamamlama, toplu işleme, çeviri,
  sesli asistan) beş iş yükü kaydırağını **ve** dört performans hedefini birden
  doldurur. İkisi tek karardır: IDE tamamlamada 300 ms şarttır, gece çalışan toplu
  işte 60 saniye bile umursanmaz. Her profil neden o değerleri aldığını açıklar.
- **Performans hedefleri ve kullanıcı kapasitesi** — "kaç kişi kaldırır?" sorusunun
  tek doğru cevabı yoktur; neyin kabul edilebilir sayıldığına bağlıdır. Dört değeri
  (en yüksek ilk token, en düşük token hızı, sohbet ve ajan kullanım çarpanları) sen
  belirlersin; her satırın **Maks. C**, **sohbet kapasitesi** ve **ajan kapasitesi**
  değeri buna göre yeniden hesaplanır. Bu hedefler hiçbir satırı gizlemez — sayıların
  ne anlama geldiğini değiştirir.
- **"İlk sohbetinde ne göreceksin"** — 18 tok/s'nin ne demek olduğunu kimse sezgisel
  bilmez. Seçtiğin model ve donanımla gerçek bir sohbet turu canlandırılır: istek gider,
  ilk token gecikmesi kadar beklersin, **düşünme modu açıksa** model önce düşünce üretir
  (ve sen bu sürede asıl cevabı görmezsin), sonra yanıt akar. Düşünme, modern
  modellerdeki gibi **seviye** olarak ayarlanır — kapalı / düşük / orta / yüksek.
  RTX 5090 + gpt-oss-20b'de "yüksek" seçilince 9,3 saniyelik yanıtın 8,8 saniyesi
  düşünmeye gidiyor; bu farkı hiçbir tablo sütunu göstermiyor.
- **11 satın alma bandı** — "bu para bandında ne alınır, nerede tıkanır" sorusunun
  cevabı. 210 bin ₺'lik Mac Studio'dan 3,3 milyonluk 4× RTX PRO 6000'e kadar gerçek
  yapılandırmalar; her kartta simülatörün kendi hesabı ve simülatörün göremediği
  şeyler (stok, garanti, PCIe hattı, platform büyüme yolu, yazılım ekosistemi
  riski) yan yana. Tek tıkla simülatöre yüklenir.

  Fiyatların **temeli etiketli**: *perakende* (raftan hazır ürün), *bileşen*
  (kart + platform toplamı), *anahtar teslim* (entegratörden kurulu, garantili
  sistem). Aynı donanım için anahtar teslim fiyat bileşen toplamının 1,5-2 katına
  çıkabilir — bunları karıştırmak listeyi yanıltıcı yapardı.
- **LLM Altyapı Danışmanı** — DeepSeek destekli sohbet. Bir HuggingFace linki
  yapıştırdığında modeli **canlı çeker**, `config.json`'ından bellek ve hız hesabını
  yapar ve senin seçtiğin donanımda çalışıp çalışmayacağını söyler. Performans
  hedeflerini de görür ve tavsiyelerini onlara göre verir.

## Yerelde çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu → http://localhost:5173
npm run build    # üretim derlemesi (dist/)
npm run preview  # derlemeyi önizle
npm run dogrula  # veri bütünlüğü + motor akıl sağlığı testleri
npm run smoke    # gerçek Chrome'da arayüz smoke testi (dev sunucusu açıkken)
npm run test     # ikisi birden
npm run model-tara  # HuggingFace'te trend olup veritabanında olmayan modeller
```

`npm run smoke` uygulamayı headless Chrome'da açıp render oluyor mu, konsol temiz mi,
her sekme çalışıyor mu, dar ekranda taşma veya içeriği kesen kap var mı diye bakar.
Derleme bunları yakalayamıyor: tanımsız bir değişken Vite'ı geçer ama tarayıcıda
patlar — bu testi yazmama sebep olan hata tam olarak buydu.

### Model veritabanını taze tutmak

Model listesi elle bakılmazsa haftalar içinde eskiyor. `npm run model-tara`
HuggingFace'te trend olan metin üretimi modellerini çeker ve hangilerinin
veritabanında olmadığını listeler:

```bash
npm run model-tara                    # eksikleri listele
npm run model-tara -- --limit 100     # daha geniş tara
npm run model-tara -- --uret Qwen/X   # o depo için hazır kayıt üret
npm run model-tara -- --uret-hepsi    # listedekilerin hepsi için
```

Üretilen kayıt parametre sayısını, KV geometrisini, bağlamı, lisansı ve MTP
head'ini `config.json` ile safetensors üstverisinden çıkarır. `ad`, `aile` ve
`not` alanları elle gözden geçirilmelidir — bunlar editoryal karardır ve
otomatikleştirilmemelidir. Veri çıkarılamayan depolarda betik uydurmak yerine
sebebini yazıp geçer.

## Proje yapısı

```
src/
  data/models.js     102 model — parametre, bağlam, lisans, KV geometrisi
  data/devices.js    44 donanım — bellek, bant genişliği, TL fiyat, TR tedarik
  data/quants.js     17 ağırlık + 4 KV kuantizasyon şeması (IQ ailesi dahil)
  quantBul.js        HF'te hangi kuantizasyonun gerçekten yayımlandığını arar
  data/concepts.js   kavram sözlüğü ve hazır senaryolar
  data/bantlar.js    satın alma bantları (fiyat, kime uygun, nerede tıkanır)
  data/isYukleri.js  iş yükü profilleri (kaydıraklar + performans hedefleri)
  engine.js          hesap motoru (bellek, hız, TTFT, kapasite, maliyet, elektrik)
  hf.js              HuggingFace analizörü — link → config.json → model kaydı
  chat/prompt.js     danışmanın sistem promptu + bilgi tabanı
  chat/api.js        DeepSeek istemcisi (akışlı)
  chat/ChatBot.jsx   danışman arayüzü
  components/        arayüz parçaları, markdown gösterici, hedef paneli,
                     sohbet turu canlandırması
  sections/          sayfa bölümleri (sonuç, bantlar, tablolar, grafik, bilgi)
  App.jsx            ana ekran
```

## Veri nereden geliyor

Model verileri **programatik olarak** huggingface.co API'sinden ve her deponun
`config.json` dosyasından çekilip doğrulandı (son doğrulama: 4 Eylül 2026):

- Parametre sayıları → safetensors üstverisi
- Katman sayısı, attention head sayısı, KV geometrisi, bağlam → `config.json`
- Lisans → model kartı üstverisi

Donanım belirtimleri üreticiden; bant genişlikleri veri yolu genişliği × bellek
hızından çapraz doğrulandı. TL fiyatları Eylül 2026 Türkiye perakende gözlemidir
(USD/TRY ≈ 48,4) ve **kurla, stokla, satıcıyla değişir** — satın alma öncesi canlı
teklif alın.

Uygulamanın içindeki "Veri güveni" bölümü hangi sayının nereden geldiğini ve hangi
sayıların mühendislik tahmini olduğunu ayrı ayrı listeler.

---

## Chatbot (DeepSeek) — anahtarı güvende tutan kurulum

> **UYARI — API anahtarları hakkında**
> Bu site statik ve herkese açıktır. Bir API anahtarını koda gömersen tarayıcıdan
> saniyeler içinde okunur ve fatura sana gelir. Bu depoda anahtar **yoktur** ve
> asla olmamalıdır. Bir anahtarı yanlışlıkla paylaştıysan (mesajda, ekran
> görüntüsünde, commit'te) **hemen [platform.deepseek.com](https://platform.deepseek.com/api_keys)
> üzerinden iptal edip yenisini üret.**

Chatbot iki şekilde çalışır:

1. **Aracılı / güvenli mod (önerilen).** Küçük bir Cloudflare Worker kurarsın;
   DeepSeek anahtarı Cloudflare'de gizli kalır, tarayıcıya hiç inmez, ziyaretçi
   anahtar girmez. Depo public kalabilir.
2. **Yerel anahtar modu.** `PROXY_URL` boşsa her kullanıcı kendi DeepSeek anahtarını
   girer; anahtar yalnızca o kişinin tarayıcısında (localStorage) durur ve doğrudan
   onun tarayıcısından DeepSeek'e gider.

### Güvenli modu kurmak (Cloudflare Worker — ücretsiz, ~5 dk)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** →
   **Create** → **Create Worker**. Bir isim ver, **Deploy** de.
2. **Edit code** → açılan editöre depodaki [`worker.js`](./worker.js) içeriğini
   yapıştır → **Deploy**.
3. Worker'ın **Settings → Variables and Secrets** bölümünde **Add** → tür **Secret**,
   isim **`DEEPSEEK_KEY`**, değer olarak DeepSeek API anahtarını gir → **Save/Deploy**.
   (Anahtar yalnızca burada durur; koda veya depoya girmez.)
4. `worker.js` içindeki `IZINLI_ORIGIN` listesinde `https://furkanyesildag.github.io`
   yazdığından emin ol. Kendi alan adın varsa onu da ekle.
5. Worker'ın adresini kopyala (ör. `https://xxx.workers.dev`) ve
   `src/chat/api.js` içindeki `export const PROXY_URL = "";` satırına yaz:
   ```js
   export const PROXY_URL = "https://xxx.workers.dev";
   ```
   Commit et — GitHub Actions otomatik yeniden dağıtır.

Worker şunları yapar: yalnızca izinli origin'den gelen isteği kabul eder, yalnızca
sohbet uç noktasına ve iki modele izin verir, IP başına dakikada 30 istekle sınırlar,
ve akışlı (streaming) yanıtı olduğu gibi geçirir.

## GitHub Pages dağıtımı

`.github/workflows/deploy.yml`; `claude/llm-capacity-simulator-3hy4gm` veya `main`
dalına yapılan her push'ta projeyi derleyip GitHub Pages'e dağıtır. İş akışı Pages'i
`configure-pages` ile otomatik etkinleştirmeye çalışır.

> İlk dağıtım için depo **Settings → Pages → Build and deployment → Source**
> ayarının **GitHub Actions** olması gerekir. İş akışı bunu otomatik yapmayı dener;
> izin nedeniyle yapamazsa bu ayarı bir kez elle seçmek yeterlidir.

## IQ şemaları neden önemli

llama.cpp'nin IQ (importance-matrix) şemaları, hangi ağırlığın önemli olduğunu
kalibrasyon verisinden ölçüp korur. Sonuç: **aynı boyutta daha iyi kalite.**

| Şema | Bit/ağırlık | Kalite | Not |
| --- | --- | --- | --- |
| Q4_K_M | 4,8 | ~95,5 | Yaygın standart |
| **IQ4_XS** | **4,25** | **~96** | Hem küçük hem daha iyi |
| Q3_K_M | 3,9 | ~91 | |
| **IQ3_M** | **3,7** | **~93** | Hem küçük hem daha iyi |

Bedeli dequant maliyetidir: IQ çekirdekleri daha karmaşıktır ve özellikle CPU ile eski
GPU'larda decode'u %5-12 yavaşlatır. Araç bunu `hizCarpani` ile hesaba katar.

**Bulunurluk kontrolü:** model seçilince HuggingFace'te o modelin GGUF depoları
aranır ve dosya adlarından hangi şemaların yayımlandığı çıkarılır. Bulunmayanlar
listeden gizlenir. Arama eksiksiz değildir (depo adı modele benzemiyorsa kaçırabilir),
bu yüzden gizlenenler bir onay kutusuyla geri getirilebilir ve seçilirse uyarı çıkar —
yanlış yönlendirme ile yanlış engelleme arasındaki denge budur.

## Ağırlık vs KV cache kuantizasyonu — aynı şey değil

En sık karışan nokta bu, o yüzden araç ikisini ayrı seçtiriyor:

| | Ağırlık kuantizasyonu | KV cache kuantizasyonu |
| --- | --- | --- |
| Nerede? | **İndirdiğin dosyanın içinde** | Dosyada yok — **çalışma anında** |
| Nasıl seçilir? | Hangi dosyayı indirdiğinle | Sunucuyu başlatırken bayrakla |
| Neden? | Ağırlıklar dosyada durur | KV cache indirme anında var olmayan bir şeydir; sen konuşmaya başlayınca token'larından üretilir |

```bash
vllm serve <model> --kv-cache-dtype fp8
llama-server -m model.gguf -fa --cache-type-k q8_0 --cache-type-v q8_0
```

**Otomatik açılmaz.** Her yığının varsayılanı tam hassasiyettir (vLLM `auto` =
modelin dtype'ı, llama.cpp `f16`, Ollama `f16`). Bayrağı vermezsen KV kuantize
edilmez ve buradaki bellek hesabı tutmaz — arayüz seçtiğin şemanın komutunu bu
yüzden doğrudan gösteriyor.

Tek istisna: `compressed-tensors` biçimi, checkpoint'in kendi
`quantization_config`'inde bir `kv_cache_scheme` ilan etmesine izin verir ve öyle
bir model yüklenirse vLLM bunu kendiliğinden uygular. Pratikte neredeyse kimse
yayımlamıyor — bu veritabanındaki 109 modelin config'ini taradım, alanı taşıyan
4 modelde de değer `null`.

İkisi bağımsızdır: BF16 ağırlık + FP8 KV ya da Q4 ağırlık + FP16 KV tamamen
geçerli birleşimlerdir.

## Offload nasıl hesaplanır

VRAM'e sığmayan ağırlıkların bir kısmı sistem RAM'inde tutulabilir. **Miktar otomatik:**
offload edilen her bayt PCIe üzerinden okunacağı için yavaşlatır, dolayısıyla en iyi
miktar sığdırmaya yetecek en azdır (bellek %96'da tutulur — tam tepeye oturmak çalışma
zamanında taşmaya yol açar). Adım süresi iki okumanın toplamıdır:

```
süre = VRAM'den_okunan_bayt / (VRAM_bant_genişliği × MBU × MoE_verimi)
     + RAM'den_okunan_bayt  / PCIe_bant_genişliği
```

PCIe 5.0 ×16 teorik 63 GB/s, gerçekleşen ~47 GB/s (protokol yükü ve kesik erişim);
bir RTX 5090'ın VRAM'i 1792 GB/s. Aradaki ~38 kat fark, offload'ın neden yavaşlattığını
açıklar. Host RAM bant genişliği de sınırlayıcı olabilir; hangisi darsa o belirler.
Tüketici anakartta ikinci kart PCIe x8'e düştüğü için kart başına hat sayısı da hesaba
katılır — platform sınıfı hem kart sayısından hem seçilen RAM kapasitesinden çıkarılır
(384 GB ECC RDIMM tüketici anakartına takılmaz, maliyeti de ona göre yazılır). **Ama MoE'de bedel çok daha hafiftir:**
her adımda toplam ağırlığın yalnızca aktif kısmı okunur, dolayısıyla PCIe üzerinden
çekilen bayt da o oranda azdır.

| Kurulum | Offload yok | 50 GB offload |
| --- | --- | --- |
| Qwen3.8-27B BF16 (dense) · RTX 3090 | sığmaz | 1,6 tok/s |
| gpt-oss-120b NVFP4 (5,1B aktif) · RTX 3090 | sığmaz | **22 tok/s** |

KV cache offload edilmez: her adımda tamamı taranır, PCIe üzerinden okumak kabul
edilemez derecede yavaş olurdu.

> Simülatör **kör** (katman bazlı) offload varsayar: RAM'e taşınan ağırlıklar her
> adımda payları oranında okunur. Gerçekte akıllı yerleştirme — sık kullanılan
> katmanları VRAM'de tutmak, seyrek erişilen embedding tablosunu RAM'e atmak —
> daha iyi sonuç verir. Bu yüzden buradaki hız bir **alt sınırdır**.

## Speculative decoding (MTP)

MTP head'i olan modeller her adımda bir taslak token daha üretir; doğrulama aynı
ağırlık okumasıyla yapıldığı için kabul edilen taslak neredeyse bedavaya gelir.

```
hızlanma = 1 + kabul_oranı        (varsayılan kabul 0,5 → 1,5×)
```

Kalite etkilenmez (taslak doğrulanır, yanlışsa atılır). Hangi modelde head olduğu
`config.json`'daki `num_nextn_predict_layers` ve eşdeğeri alanlardan okundu —
109 modelin 48'inde var.

### MTP bedava değil

[dev.to/rosgluk'un MTP karşılaştırması](https://dev.to/rosgluk/qwen-36-27b-and-35b-mtp-vs-standard-on-16gb-gpu-42jd)
aynı kartta MTP'li ve MTP'siz ölçüm veriyor, ve iki maliyet çıkıyor:

| | standart | MTP | |
|---|---|---|---|
| prefill (27B q8) | 200 t/s | 148 t/s | **0,75×** |
| prefill (27B q5) | 191 t/s | 145 t/s | 0,76× |
| prefill (35B q8) | 368 t/s | 277 t/s | 0,75× |
| prefill (35B q5) | 343 t/s | 264 t/s | 0,77× |
| maks. bağlam (27B q8) | 100 K | 60 K | **0,60×** |
| maks. bağlam (27B q5) | 160 K | 100 K | 0,63× |
| maks. bağlam (35B q8) | 150 K | 80 K | 0,53× |
| maks. bağlam (35B q5) | 200 K | 120 K | 0,60× |

Yani MTP decode'u hızlandırırken **ilk token'ı geciktiriyor** ve **sığan bağlamı
daraltıyor**. Prefill çarpanı dört ölçümde de 0,75; bağlam farkından geri
hesaplanan ek VRAM modele göre 0,5-1,2 GiB (ortası, 1 GiB alındı). İkisi de
artık hesaba dahil. (Önceki sürümde "prefill etkilenmez" yazıyordu — ölçüm bunu
çürüttü.)

### Hızlanma tek bir sayı değil

| model | seyreklik | standart | MTP | hızlanma |
|---|---|---|---|---|
| Qwen3.6 27B (dense) | %100 aktif | 45 | 75 | 1,67× |
| Qwen3.6 35B-A3B | %8 aktif | 146 | 189 | 1,29× |
| Qwen3.8-Flash-Next (Spark) | %3 aktif | 16,8 | 24,6 | 1,46× |

Ölçülen aralık **1,24× - 1,67×**. Yığın, taslak derinliği (`--spec-draft-n-max`)
ve metnin kendisi belirliyor; varsayılan 1,5× bu aralığın ortasıdır. Tek bir
model için kesin sayı vermez — büyüklük mertebesi doğrudur.

## Token hızına ne kadar güvenmeli — ve kendi ölçümünle kalibre etmek

Hız modeli, yayımlanmış **16 gerçek ölçüme** karşı kalibre edildi — üç ayrı
kaynaktan, üç ayrı cihazdan ve üçü de farklı bellek tipinden:

| kaynak | cihaz | bellek | ölçüm |
|---|---|---|---|
| [hardware-corner.net](https://www.hardware-corner.net/guides/rtx-5090-llm-benchmarks/) | RTX 5090 | GDDR7 | 4 nokta, llama-bench TG@4K |
| [dev.to/rosgluk](https://dev.to/rosgluk/16-gb-vram-llm-benchmarks-with-llamacpp-speed-and-context-3hgg) | RTX 4080 16 GB | GDDR6X | 10 nokta, 19K ve 64K bağlam, 6'sı offload'lı |
| OpenZeka | DGX Spark | LPDDR5X | 2 nokta, NVFP4 |

Buradan çıkan üç sabit — tavan MBU **%80**, token başına sabit ek yük **1,5 ms**,
MoE okuma büyütmesi **seyreklik^-0,36** — `npm run kalibrasyon` ile her değişiklikte
yeniden sınanıyor. Betik formülü yeniden yazmaz, doğrudan `hesapla()`yı çağırır;
yani motor bozulursa kalibrasyon da kırmızıya döner. Şu anki durum: **ortalama
mutlak sapma %7,3**, 16 noktanın 14'ü %15 içinde. Sapmalar iki yönlü — sistematik
bir eğilim kalmadı.

Yine de en zayıf halka hâlâ **MBU**: kalibre edilen üç cihaz dışındaki 37 cihazın
değeri, bu üçünden yığın ve bellek tipine göre ölçeklenmiş bir tahmindir. Gerçek
dağılım da geniş: aynı kartta llama.cpp ile vLLM, farklı sürücü sürümü ve derleme
bayrakları belirgin fark yaratıyor. Yayımlanmış llama.cpp ölçümleri bazı kartlarda
buradaki tahminden **düşük**, iyi ayarlanmış vLLM kurulumları **yüksek** çıkabiliyor.
Tek bir sayı bu yelpazeyi taşıyamaz.

Bu yüzden Donanım panelinde **"Kendi ölçümünle kalibre et"** var:

1. Seçtiğin kurulumu kendi kartında çalıştır, tek istekle, sohbetin başında
2. Ölçtüğün **decode** hızını gir (llama.cpp'de `eval time`, vLLM'de `output toks/s`
   — prefill/prompt işleme hızını değil)
3. Araç o kartın MBU'sunu geri hesaplayıp saklar

Bundan sonra o kartla yaptığın **tüm** tahminler senin gerçeğine oturur. Kalibrasyon
karta bağlıdır: aynı kartın diğer modellerine geçer, başka karta geçmez. Tarayıcında
saklanır.

Sayılara güvenmeden önce bunu bir kez yapman, aracı tahmin olmaktan çıkarıp ölçüme
dayandırır.

## Seyrek MoE cezası

Dense bir modelde ağırlıklar her adımda baştan sona sırayla okunur. Seyrek bir MoE'de
her token **farklı** uzmanları uyandırır; erişim dağınık olur ve gerçekleşen bant
genişliği teorik değerin altına düşer. Etkinin şiddeti bellek tipine bağlıdır:
LPDDR birleşik bellekte ağır, HBM'de hafiftir.

Büyütme katsayısı `seyreklik^-0,36`, üç cihazdaki 9 offload'sız ölçüme birlikte fit
edildi. İlginç sonuç: **bellek tipi fark etmiyor.** Aynı üs hem RTX 5090'ın GDDR7'sine
hem DGX Spark'ın LPDDR5X'ine oturuyor — yani ceza bellek teknolojisinden değil,
seyrek erişim deseninin kendisinden geliyor. (Önceki sürümde bunu bellek tipine
bağlamıştım; ölçümler bunu desteklemedi.)

Pratik sonucu şu: aynı kutuda 180B'lik seyrek bir model, 27B'lik dense bir modelden
hızlı koşabilir (aktif parametresi çok daha az), ama teorik bant genişliğinin ancak
üçte birini kullanır.

## İş yükü profilleri neden hedefleri de değiştirir

Aynı donanım ve aynı model, iş yüküne göre bambaşka sonuç verir. Örnek:
Qwen3.8-27B (Q4) + tek RTX 5090 →

| İş yükü | KV cache | İlk token | Sohbet kapasitesi |
| --- | --- | --- | --- |
| Kısa sohbet / soru-cevap | 1,7 GB | 0,9 sn | 42 kişi |
| Doküman özetleme | 7,2 GB | 25 sn | 4 kişi |
| Toplu işleme | 6,4 GB | 20 sn | 48 kişi |

25 saniyelik ilk token doküman analizinde **yeşildir** — kullanıcı dosyayı yükleyip
beklemektedir. Aynı süre IDE kod tamamlamada felakettir. Bu yüzden profil, kaydıraklarla
birlikte hedefleri de ayarlar; yoksa kapasite sayıları anlamsız kalır.

Profil bir başlangıç noktasıdır, kilit değil: herhangi bir kaydırağı oynattığın an
seçim "Özel"e döner.

## Kapasite nasıl hesaplanır

**Eşzamanlılık (C) kullanıcı sayısı değildir.** C, modelin aynı anda işlediği istek
sayısıdır. Sohbet eden biri zamanının çoğunu okuyarak ve yazarak geçirir, modeli
sürekli meşgul etmez — bu yüzden bir yuva birden çok kişiye yeter. Ajanlar arka
arkaya istek atıp araç çağırdığı için yuvayı çok daha yoğun kullanır.

```
Maks. C          = hem hız (≥ hedef tok/s) hem ilk token (≤ hedef ms) hedefinin
                   hâlâ tutulduğu en yüksek eşzamanlı istek sayısı
Sohbet kapasitesi = Maks. C × sohbet çarpanı   (varsayılan ×4)
Ajan kapasitesi   = Maks. C × ajan çarpanı     (varsayılan ×1,5)
```

Çarpanlar bir davranış varsayımıdır, ölçüm değil. Seyrek kullanılan iç araçlarda
sohbet çarpanı 8-10'a çıkabilir; sürekli çalışan otonom ajanlarda ajan çarpanı 1'e
yaklaşır. Kendi kullanım desenini biliyorsan değiştir — tüm tablo yeniden hesaplanır.

Bir kurulum C=1'de bile hedefleri karşılamıyorsa kapasitesi sıfırdır ve arayüz
sebebini söyler: belleğe sığmıyor mu, hız mı yetmiyor, yoksa ilk token mi uzun.

> Hedef paneli ve kapasite sütunlarının biçimi
> [OpenZeka LLM Benchmark Table](https://openzeka.com/)'dan esinlenmiştir;
> buradaki sayılar OpenZeka'nın ölçümleri değil, bu aracın kendi modelidir.

## Teknoloji

React 18 · Vite 5 · Recharts. Başka çalışma zamanı bağımlılığı yok — markdown
gösterici ve HuggingFace analizörü proje içinde yazıldı.

## Sorumluluk reddi

Bu bir **planlama aracıdır, ölçüm değildir.** Sonuçlar büyüklük mertebesini ve
donanımlar arası göreli farkı doğru gösterir; satın alma öncesinde seçilen kurulumun
gerçek modelle ve gerçek yükle bir kez doğrulanması gerekir.
