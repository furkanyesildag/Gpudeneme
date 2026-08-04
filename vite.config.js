import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages, projeyi https://<kullanici>.github.io/Gpudeneme/ altında sunar.
// Bu yüzden base yolu depo adıyla eşleşmelidir.
// Göreli taban (./) kullanıyoruz: proje hangi alt yolda sunulursa sunulsun
// varlık yolları doğru çözülür; olası taban-yolu/önbellek sorunlarını eler.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
