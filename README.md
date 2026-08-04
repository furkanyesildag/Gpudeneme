# Yerel LLM Kapasite Simülasyonu

Açık ağırlıklı LLM'leri yerel donanımda çalıştırmayı planlamak için bir simülasyon aracı.
Model, kuantizasyon, bağlam uzunluğu ve eşzamanlı kullanıcı sayısını seçtiğinde; bellek
bütçesini, token hızını, ilk token gecikmesini, maliyeti ve güç tüketimini çıkarır.

**Canlı sürüm:** https://furkanyesildag.github.io/Gpudeneme/

## Yerelde çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # üretim derlemesi (dist/)
npm run preview  # derlemeyi önizle
```

## Teknoloji

- React 18 + Vite
- Recharts (grafikler)

## Chatbot (DeepSeek) — anahtarı güvende tutan kurulum

Chatbot iki şekilde çalışır:

1. **Anahtarsız / güvenli mod (önerilen):** Küçük bir Cloudflare Worker aracısı
   kurarsın; DeepSeek anahtarı Cloudflare'de gizli kalır, tarayıcıya hiç inmez,
   kullanıcı anahtar girmez. Repo public kalabilir.
2. **Yerel anahtar modu:** `PROXY_URL` boşsa, her kullanıcı kendi DeepSeek
   anahtarını tarayıcıya girer (yalnızca kendi cihazında saklanır).

### Güvenli modu kurmak (Cloudflare Worker — ücretsiz, ~5 dk)

Neden gerekli: statik site herkese açıktır; anahtarı JS'e gömersen tarayıcıdan
okunur ve sızar. Worker, anahtarı sunucu tarafında tutarak bunu çözer.

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** →
   **Create** → **Create Worker**. Bir isim ver, **Deploy** de.
2. **Edit code** → açılan editöre depodaki [`worker.js`](./worker.js) içeriğini
   yapıştır → **Deploy**.
3. Worker'ın **Settings → Variables and Secrets** bölümünde **Add** →
   tür **Secret**, isim **`DEEPSEEK_KEY`**, değer olarak DeepSeek API anahtarını
   gir → **Save/Deploy**. (Anahtar yalnızca burada durur; koda/depoya girmez.)
4. Worker'ın adresini kopyala (ör. `https://xxx.workers.dev`). `worker.js`
   içindeki `IZINLI_ORIGIN` listesinde `https://furkanyesildag.github.io`
   yazdığından emin ol.
5. `src/App.jsx` içindeki `const PROXY_URL = "";` satırına bu adresi yaz:
   `const PROXY_URL = "https://xxx.workers.dev";` → commit et. GitHub Actions
   otomatik yeniden dağıtır.

Artık chatbot anahtar istemeden çalışır ve anahtar hiçbir zaman tarayıcıda
görünmez. (Worker yalnızca izinli origin'den gelen istekleri kabul eder ve
sadece sohbet uç noktasına, sabit modele izin verir.)

## GitHub Pages dağıtımı

`.github/workflows/deploy.yml` iş akışı; `claude/llm-capacity-simulator-3hy4gm`
veya `main` dalına yapılan her push'ta projeyi derleyip GitHub Pages'e dağıtır.
İş akışı Pages'i otomatik etkinleştirir (`configure-pages` ile `enablement: true`),
ayrıca depo ayarlarından bir şey açmaya gerek yoktur.

> Not: İlk dağıtımın çalışması için depo **Settings → Pages → Build and deployment →
> Source** ayarının **GitHub Actions** olması gerekir. İş akışı bunu otomatik yapmayı
> dener; eğer izin nedeniyle yapılamazsa bu ayarı bir kez elle seçmen yeterlidir.
