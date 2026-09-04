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
  tutuyor, kaçı kayan pencereli, MLA mı GQA mı, hangi katmanlar lineer dikkat
  kullanıyor. Bu sayede Qwen3.5+, GLM-5.3-Flash, Nemotron-H gibi hibrit modellerin
  uzun bağlamdaki gerçek avantajı doğru görünür.
- **LLM Altyapı Danışmanı** — DeepSeek destekli sohbet. Bir HuggingFace linki
  yapıştırdığında modeli **canlı çeker**, `config.json`'ından bellek ve hız hesabını
  yapar ve senin seçtiğin donanımda çalışıp çalışmayacağını söyler.

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
  engine.js          hesap motoru (bellek, hız, TTFT, maliyet, elektrik)
  hf.js              HuggingFace analizörü — link → config.json → model kaydı
  chat/prompt.js     danışmanın sistem promptu + bilgi tabanı
  chat/api.js        DeepSeek istemcisi (akışlı)
  chat/ChatBot.jsx   danışman arayüzü
  components/        yeniden kullanılan arayüz parçaları + markdown gösterici
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

## Teknoloji

React 18 · Vite 5 · Recharts. Başka çalışma zamanı bağımlılığı yok — markdown
gösterici ve HuggingFace analizörü proje içinde yazıldı.

## Sorumluluk reddi

Bu bir **planlama aracıdır, ölçüm değildir.** Sonuçlar büyüklük mertebesini ve
donanımlar arası göreli farkı doğru gösterir; satın alma öncesinde seçilen kurulumun
gerçek modelle ve gerçek yükle bir kez doğrulanması gerekir.
