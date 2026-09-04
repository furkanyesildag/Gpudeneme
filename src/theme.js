/* ------------------------------------------------------------------ */
/*  TASARIM JETONLARI                                                  */
/*  Tek kaynak: renkler CSS değişkeni olarak yazılır, JS'te de aynı    */
/*  isimle okunur. Böylece açık/koyu tema tek yerden döner.            */
/* ------------------------------------------------------------------ */

export const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
export const SANS =
  '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/* JS tarafında kullanılan renk isimleri → CSS değişkenleri.
   Değerler index.html içindeki :root / [data-theme] bloklarında tanımlı. */
export const C = {
  ink: "var(--ink)",
  ink2: "var(--ink2)",
  ink3: "var(--ink3)",
  line: "var(--line)",
  line2: "var(--line2)",
  paper: "var(--paper)",
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
  acc: "var(--acc)",
};

/* Recharts SVG'de CSS değişkeni çözemediği yerler için sabit yedekler.
   Grafik renkleri temadan bağımsız olarak her iki zeminde de okunur. */
export const CHART = {
  steel: "#2E6E96",
  kv: "#C2703D",
  bad: "#C4423F",
  ok: "#12897A",
  grid: "#8A9AA5",
  axis: "#8A9AA5",
};
