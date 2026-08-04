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

## GitHub Pages dağıtımı

`.github/workflows/deploy.yml` iş akışı; `claude/llm-capacity-simulator-3hy4gm`
veya `main` dalına yapılan her push'ta projeyi derleyip GitHub Pages'e dağıtır.
İş akışı Pages'i otomatik etkinleştirir (`configure-pages` ile `enablement: true`),
ayrıca depo ayarlarından bir şey açmaya gerek yoktur.

> Not: İlk dağıtımın çalışması için depo **Settings → Pages → Build and deployment →
> Source** ayarının **GitHub Actions** olması gerekir. İş akışı bunu otomatik yapmayı
> dener; eğer izin nedeniyle yapılamazsa bu ayarı bir kez elle seçmen yeterlidir.
