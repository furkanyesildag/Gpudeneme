/* ------------------------------------------------------------------ */
/*  DEEPSEEK İSTEMCİSİ                                                 */
/*                                                                     */
/*  İki mod:                                                           */
/*   1) Aracı (proxy) modu — PROXY_URL doluysa. Anahtar Cloudflare     */
/*      Worker'ında gizli kalır, tarayıcıya hiç inmez. ÖNERİLEN.       */
/*   2) Yerel anahtar modu — kullanıcı kendi anahtarını girer, yalnız  */
/*      kendi tarayıcısında (localStorage) durur.                      */
/*                                                                     */
/*  GÜVENLİK: API anahtarı bu depoya ASLA yazılmaz. Bu site statik ve  */
/*  herkese açık; koda gömülen anahtar 5 saniyede okunur ve sızar.     */
/* ------------------------------------------------------------------ */

/* Worker'ı kurduktan sonra adresini buraya yapıştır (bkz. README).
   Bu URL gizli değildir; depoda durması güvenlidir. */
export const PROXY_URL = "";

const DOGRUDAN = "https://api.deepseek.com/chat/completions";

export const MODELLER = [
  { id: "deepseek-chat", ad: "DeepSeek Chat", not: "Hızlı, günlük sorular için" },
  { id: "deepseek-reasoner", ad: "DeepSeek Reasoner", not: "Yavaş ama adım adım düşünür — karmaşık kapasite hesapları için" },
];

export const proxyModu = () => !!PROXY_URL;

/** Anahtarın biçimi kabaca doğru mu? (yanlış yapıştırmayı erken yakalar) */
export function anahtarGecerliMi(k) {
  return typeof k === "string" && /^sk-[A-Za-z0-9._-]{16,}$/.test(k.trim());
}

/**
 * Akışlı (streaming) sohbet tamamlama.
 * @param mesajlar  [{role, content}]
 * @param opt       { model, key, sinyal, onParca(metin), onDusunce(metin) }
 * @returns tam yanıt metni
 */
export async function sohbetAkisi(mesajlar, { model = "deepseek-chat", key, sinyal, onParca, onDusunce } = {}) {
  const proxy = proxyModu();
  if (!proxy && !key) throw new Error("ANAHTAR_YOK");

  const res = await fetch(proxy ? PROXY_URL : DOGRUDAN, {
    method: "POST",
    signal: sinyal,
    headers: proxy
      ? { "Content-Type": "application/json" }
      : { "Content-Type": "application/json", Authorization: `Bearer ${key.trim()}` },
    body: JSON.stringify({
      model,
      temperature: model === "deepseek-reasoner" ? undefined : 0.3,
      max_tokens: 4000,
      stream: true,
      messages: mesajlar,
    }),
  });

  if (!res.ok) {
    let ayrinti = "";
    try {
      const g = await res.json();
      ayrinti = g?.error?.message || "";
    } catch {
      try { ayrinti = (await res.text()).slice(0, 200); } catch { /* yoksay */ }
    }
    throw new Error(hataMetni(res.status, ayrinti));
  }
  if (!res.body) throw new Error("Sunucu akış döndürmedi.");

  const okuyucu = res.body.getReader();
  const cozucu = new TextDecoder();
  let tampon = "";
  let tam = "";

  while (true) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    tampon += cozucu.decode(value, { stream: true });

    // SSE: olaylar boş satırla ayrılır
    let sinir;
    while ((sinir = tampon.indexOf("\n")) >= 0) {
      const satir = tampon.slice(0, sinir).trim();
      tampon = tampon.slice(sinir + 1);
      if (!satir.startsWith("data:")) continue;
      const veri = satir.slice(5).trim();
      if (veri === "[DONE]") return tam;
      try {
        const j = JSON.parse(veri);
        const d = j.choices?.[0]?.delta || {};
        if (d.reasoning_content && onDusunce) onDusunce(d.reasoning_content);
        if (d.content) {
          tam += d.content;
          onParca?.(d.content);
        }
      } catch {
        /* yarım JSON parçası — bir sonraki turda tamamlanır */
      }
    }
  }
  return tam;
}

function hataMetni(durum, ayrinti) {
  const ek = ayrinti ? ` (${ayrinti})` : "";
  switch (durum) {
    case 401:
      return `Anahtar geçersiz veya süresi dolmuş (401). Ayarlardan doğru DeepSeek anahtarını gir.${ek}`;
    case 402:
      return `DeepSeek hesabında bakiye kalmamış (402). platform.deepseek.com üzerinden kredi yükle.${ek}`;
    case 429:
      return `Çok fazla istek gönderildi (429). Biraz bekleyip tekrar dene.${ek}`;
    case 400:
      return `İstek reddedildi (400). Sohbet çok uzamış olabilir — "temizle" deyip yeniden dene.${ek}`;
    case 403:
      return `Erişim reddedildi (403). Aracı Worker kuruluysa izinli origin listesini kontrol et.${ek}`;
    case 500: case 502: case 503:
      return `DeepSeek tarafında geçici sorun (${durum}). Birazdan tekrar dene.${ek}`;
    default:
      return `Sunucu hatası ${durum}.${ek}`;
  }
}

export function agHatasi(e) {
  const s = String(e?.message || e);
  if (e?.name === "AbortError") return null; // kullanıcı durdurdu
  if (s === "ANAHTAR_YOK") return "Önce DeepSeek API anahtarını gir.";
  if (/Failed to fetch|NetworkError|Load failed|TypeError/i.test(s))
    return "Bağlantı kurulamadı. Tarayıcıdan DeepSeek'e erişim engellenmiş olabilir (ağ/CORS/eklenti), ya da internet bağlantın koptu.";
  return s;
}
