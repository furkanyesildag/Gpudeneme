/* ------------------------------------------------------------------ */
/*  URL DURUMU                                                         */
/*  Seçimler adres çubuğunun hash kısmında tutulur; böylece bir        */
/*  kurulum linki paylaşılabilir ve sayfa yenilenince kaybolmaz.       */
/* ------------------------------------------------------------------ */

const ALANLAR = {
  m: "modelId", c: "cihazId", n: "adet", q: "quant", k: "kvq",
  x: "ctxK", g: "girdiK", u: "kullanici", o: "cikti", d: "kvOran", i: "indirGibi",
};
const SAYI = new Set(["adet", "ctxK", "girdiK", "kullanici", "cikti", "kvOran"]);

export function durumuOku(varsayilan) {
  try {
    const h = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    if (![...h.keys()].length) return varsayilan;
    const d = { ...varsayilan };
    for (const [kisa, ad] of Object.entries(ALANLAR)) {
      if (!h.has(kisa)) continue;
      const v = h.get(kisa);
      if (ad === "indirGibi") d[ad] = v === "1";
      else if (SAYI.has(ad)) {
        const n = Number(v);
        if (Number.isFinite(n)) d[ad] = n;
      } else d[ad] = v;
    }
    return d;
  } catch {
    return varsayilan;
  }
}

export function durumuYaz(durum) {
  try {
    const p = new URLSearchParams();
    for (const [kisa, ad] of Object.entries(ALANLAR)) {
      const v = durum[ad];
      if (v === undefined || v === null) continue;
      p.set(kisa, ad === "indirGibi" ? (v ? "1" : "0") : String(v));
    }
    const yeni = `#${p.toString()}`;
    if (yeni !== location.hash) history.replaceState(null, "", yeni);
  } catch {
    /* hash yazılamıyorsa (gömülü çerçeve vb.) sessizce geç */
  }
}
