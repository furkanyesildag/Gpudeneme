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
- **44 donanım** — Türkiye'de raftan alınabilen tüketici kartlarından (RTX 5090/5080/
  5070 Ti/5060 Ti, RX 9070 XT, RX 7900 XTX, Arc B580) iş istasyonu kartlarına
  (RTX PRO Blackwell serisi, Arc Pro B60), hazır kutulara (Mac Studio, DGX Spark,
  Strix Halo mini PC'ler) ve veri merkezi hızlandırıcılarına kadar. Her birinde
  **Türkiye tedarik durumu ve TL fiyatı**.
- **Gerçek KV cache hesabı** — model başına uydurma bir "KB/token" değil; her modelin
  HuggingFace `config.json` dosyasından okunan katman geometrisi. Kaç katman KV
  tutuyor, kaçı sliding window kullanan, MLA mı GQA mı, hangi katmanlar linear attention
  kullanıyor. Bu sayede Qwen3.5+, GLM-5.3-Flash, Nemotron-H gibi hibrit modellerin
  uzun bağlamdaki gerçek avantajı doğru görünür.
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
  (ve sen bu sürede asıl cevabı görmezsin), sonra yanıt akar. Düşünmenin cevabın ilk
  harfini kaç saniye ötelediğini görmenin en hızlı yolu bu.
- **Satın alma bantları** — "bu para bandında ne alınır, nerede tıkanır" sorusunun
  cevabı. Beş banda ayrılmış gerçek yapılandırmalar; her kartta simülatörün kendi
  hesabı ve simülatörün göremediği şeyler (stok, garanti, PCIe hattı, platform büyüme
  yolu) yan yana. Tek tıkla simülatöre yüklenir.
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
```

## Proje yapısı

```
src/
  data/models.js     102 model — parametre, bağlam, lisans, KV geometrisi
  data/devices.js    44 donanım — bellek, bant genişliği, TL fiyat, TR tedarik
  data/quants.js     9 ağırlık + 3 KV kuantizasyon şeması
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
- Katman sayısı, dikkat başlıkları, KV geometrisi, bağlam → `config.json`
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

## Seyrek MoE cezası

Dense bir modelde ağırlıklar her adımda baştan sona sırayla okunur. Seyrek bir MoE'de
her token **farklı** uzmanları uyandırır; erişim dağınık olur ve gerçekleşen bant
genişliği teorik değerin altına düşer. Etkinin şiddeti bellek tipine bağlıdır:
LPDDR birleşik bellekte ağır, HBM'de hafiftir.

Katsayı, DGX Spark üzerinde yayımlanmış iki ölçümden kalibre edildi — biri dense
(Qwen3.6-27B NVFP4, 12,63 tok/s) biri çok seyrek (Qwen3.8-Flash-Next NVFP4, %3 aktif,
16,8 tok/s). Dense ölçüm cihazın bant genişliği kullanımını, seyrek ölçüm de cezayı
belirledi; simülatör şu an iki noktayı da %1 içinde tutturuyor.

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
