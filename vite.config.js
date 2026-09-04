import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Göreli taban (./) kullanıyoruz: proje hangi alt yolda sunulursa sunulsun
// (GitHub Pages'te /Gpudeneme/) varlık yolları doğru çözülür.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    // Grafik kütüphanesini ayrı parçaya al: veri güncellendiğinde
    // ziyaretçi 400 KB'lık recharts'ı yeniden indirmesin.
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ["recharts"],
          react: ["react", "react-dom"],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
