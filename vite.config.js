import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages, projeyi https://<kullanici>.github.io/Gpudeneme/ altında sunar.
// Bu yüzden base yolu depo adıyla eşleşmelidir.
export default defineConfig({
  base: "/Gpudeneme/",
  plugins: [react()],
});
