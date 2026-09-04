/* ------------------------------------------------------------------ */
/*  TASARIM JETONLARI                                                  */
/*                                                                     */
/*  Renkler CSS değişkeni olarak tanımlıdır (index.html), JS'te aynı   */
/*  isimle okunur — açık/koyu tema tek yerden döner.                   */
/*  Boşluk ve tipografi ölçekleri burada; bileşenlerde serbest sayı    */
/*  yazmak yerine bunları kullan, sayfa böylece tek bir ritim tutar.   */
/* ------------------------------------------------------------------ */

export const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
export const SANS =
  '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const C = {
  ink: "var(--ink)",
  ink2: "var(--ink2)",
  ink3: "var(--ink3)",
  line: "var(--line)",
  line2: "var(--line2)",
  paper: "var(--paper)",
  paper2: "var(--paper2)",
  wash: "var(--wash)",
  steel: "var(--steel)",
  steelSoft: "var(--steel-soft)",
  ok: "var(--ok)",
  okSoft: "var(--ok-soft)",
  warn: "var(--warn)",
  warnSoft: "var(--warn-soft)",
  bad: "var(--bad)",
  badSoft: "var(--bad-soft)",
  kv: "var(--kv)",
  ovh: "var(--ovh)",
};

/* 4 px tabanlı boşluk ölçeği. */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 };

/* Tipografi ölçeği — her seviyenin tek bir tanımı var. */
export const T = {
  dev: { fontSize: 30, fontWeight: 500, letterSpacing: "-0.025em", lineHeight: 1.15 },
  baslik: { fontSize: 19, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.3 },
  altBaslik: { fontSize: 15, fontWeight: 600, lineHeight: 1.35 },
  govde: { fontSize: 13.5, lineHeight: 1.65 },
  kucuk: { fontSize: 12.5, lineHeight: 1.6 },
  mini: { fontSize: 11.5, lineHeight: 1.5 },
  /* Bölüm etiketi: seyrek kullan — her yerde büyük harf gürültü yapar. */
  etiket: {
    fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.1em",
    textTransform: "uppercase", fontWeight: 500,
  },
  sayi: { fontFamily: MONO, fontWeight: 500, letterSpacing: "-0.01em" },
};

export const RADIUS = { sm: 4, md: 6, lg: 10, hap: 999 };

export const GOLGE = {
  yok: "none",
  hafif: "0 1px 2px rgba(0,0,0,0.05)",
  orta: "0 2px 8px rgba(0,0,0,0.07)",
  yuksek: "0 12px 40px rgba(0,0,0,0.22)",
};

/* Recharts SVG'de CSS değişkeni her yerde çözülmediği için sabit yedekler.
   Grafik renkleri iki zeminde de okunacak biçimde seçildi. */
export const CHART = {
  steel: "#3E86B4",
  kv: "#D07E45",
  bad: "#D25550",
  ok: "#18A08C",
  grid: "#8A9AA5",
  axis: "#8A9AA5",
};

/* Durum → renk çifti (metin, zemin). Bildirim ve rozetlerde ortak. */
export const DURUM = {
  bilgi: [C.steel, C.steelSoft],
  olumlu: [C.ok, C.okSoft],
  uyari: [C.warn, C.warnSoft],
  tehlike: [C.bad, C.badSoft],
};
