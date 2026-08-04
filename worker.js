/* ------------------------------------------------------------------ */
/*  Cloudflare Worker — DeepSeek aracı (proxy)                          */
/*                                                                     */
/*  Amaç: DeepSeek API anahtarını tarayıcıdan ve depodan UZAK tutmak.  */
/*  Anahtar burada KOD'DA DEĞİL; Cloudflare'de "gizli değişken"        */
/*  (secret) olarak DEEPSEEK_KEY adıyla saklanır. Tarayıcı bu Worker'a */
/*  konuşur, Worker anahtarı ekleyip DeepSeek'e iletir. Böylece anahtar */
/*  hiçbir zaman kullanıcıya görünmez.                                 */
/*                                                                     */
/*  Kurulum adımları README.md içinde.                                 */
/* ------------------------------------------------------------------ */

// Yalnızca kendi siten çağırabilsin diye izinli origin listesi.
// Kendi alan adını eklemek istersen buraya yaz.
const IZINLI_ORIGIN = [
  "https://furkanyesildag.github.io",
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const izinli = IZINLI_ORIGIN.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": izinli ? origin : IZINLI_ORIGIN[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "POST") {
      return new Response("Yalnızca POST", { status: 405, headers: cors });
    }
    // Başka sitelerden kötüye kullanımı sınırla (tarayıcı origin gönderir).
    if (origin && !izinli) {
      return new Response("İzinsiz origin", { status: 403, headers: cors });
    }
    if (!env.DEEPSEEK_KEY) {
      return new Response(JSON.stringify({ error: "Sunucuda DEEPSEEK_KEY tanımlı değil" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let gelen;
    try {
      gelen = await request.json();
    } catch {
      return new Response("Geçersiz JSON", { status: 400, headers: cors });
    }

    // Sadece sohbet tamamlamaya izin ver, modeli ve mesaj sayısını sınırla.
    const payload = {
      model: "deepseek-chat",
      temperature: typeof gelen.temperature === "number" ? gelen.temperature : 0.3,
      messages: Array.isArray(gelen.messages) ? gelen.messages.slice(-24) : [],
    };

    const yanit = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DEEPSEEK_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const metin = await yanit.text();
    return new Response(metin, {
      status: yanit.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
