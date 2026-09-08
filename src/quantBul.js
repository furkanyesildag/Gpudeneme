/* ------------------------------------------------------------------ */
/*  KUANTİZASYON BULUNURLUĞU                                           */
/*                                                                     */
/*  Bir modelin her kuantizasyonu hazır bulunmaz. Kullanıcıya var      */
/*  olmayan bir seçenek sunmak, sonra "indirilebilir dosya yok" diye   */
/*  bulmasına sebep olur. Bu modül HuggingFace'te o modelin GGUF       */
/*  depolarını arayıp dosya adlarından hangi şemaların GERÇEKTEN       */
/*  yayımlandığını çıkarır.                                           */
/*                                                                     */
/*  DÜRÜSTLÜK NOTU: arama eksiksiz değildir. Depo adı modele           */
/*  benzemiyorsa, depo yeniyse ya da dosyalar tek parça değilse        */
/*  kaçırabilir. Bu yüzden "bulunamadı" ≠ "yok". Arayüz bunu           */
/*  bulunanları öne çıkararak ama diğerlerini de erişilebilir          */
/*  bırakarak ifade eder — hem yanlış yönlendirme hem yanlış           */
/*  engelleme olmasın.                                                 */
/* ------------------------------------------------------------------ */

import { QUANTS } from "./data/quants.js";

const API = "https://huggingface.co/api/models";

/* Aynı model için tekrar tekrar ağa çıkmayalım. */
const onbellek = new Map();

/* Dosya adında geçebilecek kuantizasyon etiketi.
   Uzundan kısaya sıralı: "Q4_K_M" önce eşleşsin, "Q4_K" sonra. */
const ETIKET = /(IQ\d_[A-Z]{1,3}|IQ\d|Q\d_K_[A-Z]{1,3}|Q\d_K|Q\d_\d|BF16|F16|F32)/i;

const jget = async (u, sinyal) => {
  const r = await fetch(u, { signal: sinyal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

/** Depo adı gerçekten bu modelin bir türevi mi? Arama gürültüsünü eler. */
function ilgiliMi(repoAdi, modelAdi) {
  const sadelestir = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  return sadelestir(repoAdi).includes(sadelestir(modelAdi));
}

/**
 * Bir model için HuggingFace'te bulunan GGUF kuantizasyon etiketlerini topla.
 * @returns {Promise<{etiketler:Set<string>, depolar:Array, eksik:boolean}>}
 */
export async function ggufEtiketleriniBul(hfRepo, sinyal) {
  if (onbellek.has(hfRepo)) return onbellek.get(hfRepo);

  const modelAdi = hfRepo.split("/")[1];
  const sonuc = { etiketler: new Set(), depolar: [], eksik: false };

  try {
    const arama = await jget(
      `${API}?search=${encodeURIComponent(modelAdi)}&filter=gguf&limit=10&sort=downloads&direction=-1`,
      sinyal
    );
    const adaylar = arama.filter((m) => ilgiliMi(m.id, modelAdi)).slice(0, 5);

    // Depoları paralel çek — sırayla beklemek arayüzü gereksiz yavaşlatır.
    const detaylar = await Promise.all(
      adaylar.map((m) =>
        jget(`${API}/${m.id}?expand[]=siblings&expand[]=downloads`, sinyal).catch(() => null)
      )
    );

    for (const d of detaylar) {
      if (!d) { sonuc.eksik = true; continue; }
      const dosyalar = (d.siblings || [])
        .map((s) => s.rfilename || "")
        .filter((f) => f.toLowerCase().endsWith(".gguf"));
      if (!dosyalar.length) continue;
      const buDepo = new Set();
      for (const f of dosyalar) {
        const m = f.match(ETIKET);
        if (m) buDepo.add(m[1].toUpperCase());
      }
      if (buDepo.size) {
        buDepo.forEach((e) => sonuc.etiketler.add(e));
        sonuc.depolar.push({ id: d.id, indirme: d.downloads || 0, sayi: dosyalar.length });
      }
    }
  } catch (e) {
    if (e.name === "AbortError") throw e;
    sonuc.eksik = true; // ağ hatası: "yok" değil, "bakılamadı"
  }

  onbellek.set(hfRepo, sonuc);
  return sonuc;
}

/**
 * Bulunan etiketleri simülatörün kuantizasyon listesine eşle.
 * @returns {{durum: Record<string,"var"|"yok">, bilinmiyor: boolean}}
 */
export function quantDurumu(bulunan) {
  const durum = {};
  // Arama hiç sonuç vermediyse hiçbir şey söyleyemeyiz.
  const bilinmiyor = !bulunan || bulunan.etiketler.size === 0;
  for (const q of QUANTS) {
    if (bilinmiyor) { durum[q.id] = "bilinmiyor"; continue; }
    if (!q.gguf.length) {
      // GGUF olmayan formatlar (FP8, NVFP4, AWQ) bu aramayla ölçülemez.
      durum[q.id] = "bilinmiyor";
      continue;
    }
    durum[q.id] = q.gguf.some((e) => bulunan.etiketler.has(e)) ? "var" : "yok";
  }
  return { durum, bilinmiyor };
}
