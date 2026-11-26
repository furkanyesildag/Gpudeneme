/* ------------------------------------------------------------------ */
/*  TASARIM JETONLARI                                                  */
/*                                                                     */
/*  Renkler CSS değişkeni olarak tanımlıdır (index.html), JS'te aynı   */
/*  isimle okunur — açık/koyu tema tek yerden döner.                   */
/*  Boşluk ve tipografi ölçekleri burada; bileşenlerde serbest sayı    */
/*  yazmak yerine bunları kullan, sayfa böylece tek bir ritim tutar.   */
/*                                                                     */
/*  Sayılar eş aralıklı yazı tipiyle değil, Inter'in tablo rakamlarıyla */
/*  yazılır: hizalı kalır ama "terminal" gibi görünmez. MONO yalnızca  */
/*  kod, komut ve dosya adı içindir.                                   */
/* ------------------------------------------------------------------ */

export const MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
export const SANS =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

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
  onAccent: "var(--on-accent)",
  koyu: "var(--koyu)",
};

/* 4 px tabanlı boşluk ölçeği. */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 };

const RAKAM = { fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' };

/* Tipografi ölçeği — her seviyenin tek bir tanımı var. */
export const T = {
  dev: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15 },
  baslik: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.3 },
  altBaslik: { fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.005em", lineHeight: 1.35 },
  govde: { fontSize: 14, lineHeight: 1.6 },
  kucuk: { fontSize: 13, lineHeight: 1.55 },
  mini: { fontSize: 12, lineHeight: 1.5 },
  /* Bölüm/ölçüm etiketi: küçük, orta kalınlıkta, büyük harfe çevrilmez. */
  etiket: { fontFamily: SANS, fontSize: 12, fontWeight: 500, letterSpacing: "0", lineHeight: 1.4 },
  sayi: { fontFamily: SANS, fontWeight: 600, letterSpacing: "-0.02em", ...RAKAM },
};

export const RAKAMLAR = RAKAM;

export const RADIUS = { sm: 6, md: 8, lg: 12, xl: 16, hap: 999 };

export const GOLGE = {
  yok: "none",
  hafif: "var(--golge-1)",
  orta: "var(--golge-2)",
  yuksek: "var(--golge-3)",
};

/* Recharts SVG'de CSS değişkeni her yerde çözülmediği için sabit yedekler.
   Grafik renkleri iki zeminde de okunacak biçimde seçildi. */
export const CHART = {
  steel: "#6366F1",
  kv: "#EA8A3A",
  bad: "#E05252",
  ok: "#14A874",
  grid: "#9AA0AD",
  axis: "#8A90A0",
};

/* Durum → renk çifti (metin, zemin). Bildirim ve rozetlerde ortak. */
export const DURUM = {
  bilgi: [C.steel, C.steelSoft],
  olumlu: [C.ok, C.okSoft],
  uyari: [C.warn, C.warnSoft],
  tehlike: [C.bad, C.badSoft],
};
