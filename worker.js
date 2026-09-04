/* ------------------------------------------------------------------ */
/*  Cloudflare Worker — DeepSeek aracısı (proxy)                        */
/*                                                                      */
/*  Amaç: DeepSeek API anahtarını tarayıcıdan ve depodan UZAK tutmak.   */
/*  Anahtar burada KODDA DEĞİL; Cloudflare'de "gizli değişken" (secret) */
/*  olarak DEEPSEEK_KEY adıyla saklanır. Tarayıcı bu Worker'a konuşur,  */
/*  Worker anahtarı ekleyip DeepSeek'e iletir. Anahtar hiçbir zaman     */
/*  kullanıcıya görünmez.                                              */
/*                                                                      */
/*  Kurulum adımları README.md içinde.                                 */
/* ------------------------------------------------------------------ */

/* Yalnızca kendi siten çağırabilsin diye izinli origin listesi.
   Kendi alan adını da eklemek istersen buraya yaz. */
const IZINLI_ORIGIN = [
  "https://furkanyesildag.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

/* Yalnızca bu modellere izin ver — birisi Worker'ı bulup pahalı bir
   modeli çağırmasın. */
const IZINLI_MODELLER = new Set(["deepseek-chat", "deepseek-reasoner"]);

/* Kaba kullanım sınırı: IP başına pencere içinde en fazla N istek.
   Cloudflare KV bağlarsan (RATE adıyla) kalıcı olur; bağlamazsan
   Worker örneği ömrü boyunca bellekte tutulur (yine de çoğu kötüye
   kullanımı keser). */
const LIMIT_ADET = 30;
const LIMIT_SANIYE = 60;
const bellekSayac = new Map();

function corsBasliklari(origin, izinli) {
  return {
    "Access-Control-Allow-Origin": izinli ? origin : IZINLI_ORIGIN[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonHata(mesaj, durum, cors) {
  return new Response(JSON.stringify({ error: { message: mesaj } }), {
    status: durum,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function limitAsildiMi(ip) {
  const simdi = Date.now();
  const kayit = bellekSayac.get(ip);
  if (!kayit || simdi - kayit.bas > LIMIT_SANIYE * 1000) {
    bellekSayac.set(ip, { bas: simdi, adet: 1 });
    // Haritayı sınırsız büyütme
    if (bellekSayac.size > 5000) bellekSayac.clear();
    return false;
  }
  kayit.adet++;
  return kayit.adet > LIMIT_ADET;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const izinli = IZINLI_ORIGIN.includes(origin);
    const cors = corsBasliklari(origin, izinli);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return jsonHata("Yalnızca POST kabul edilir.", 405, cors);

    // Tarayıcı her zaman Origin gönderir; boş gelmesi tarayıcı dışı bir
    // istemci demektir — onu da reddediyoruz.
    if (!izinli) return jsonHata("Bu origin'e izin verilmiyor.", 403, cors);

    if (!env.DEEPSEEK_KEY)
      return jsonHata("Sunucuda DEEPSEEK_KEY tanımlı değil. Worker ayarlarından Secret olarak ekleyin.", 500, cors);

    const ip = request.headers.get("CF-Connecting-IP") || "bilinmeyen";
    if (limitAsildiMi(ip))
      return jsonHata(`Çok fazla istek. Dakikada en fazla ${LIMIT_ADET} istek gönderebilirsiniz.`, 429, cors);

    let gelen;
    try {
      gelen = await request.json();
    } catch {
      return jsonHata("Geçersiz JSON gövdesi.", 400, cors);
    }

    const model = IZINLI_MODELLER.has(gelen.model) ? gelen.model : "deepseek-chat";
    const mesajlar = Array.isArray(gelen.messages) ? gelen.messages.slice(-24) : [];
    if (!mesajlar.length) return jsonHata("messages boş olamaz.", 400, cors);

    // Gövdeyi biz kuruyoruz — istemci beklenmedik alan gönderemesin.
    const yuk = {
      model,
      messages: mesajlar,
      max_tokens: Math.min(Number(gelen.max_tokens) || 4000, 8000),
      stream: gelen.stream !== false,
    };
    // reasoner modelinde temperature yok sayılır
    if (model !== "deepseek-reasoner") {
      yuk.temperature = typeof gelen.temperature === "number" ? Math.max(0, Math.min(2, gelen.temperature)) : 0.3;
    }

    let yanit;
    try {
      yanit = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.DEEPSEEK_KEY}`,
        },
        body: JSON.stringify(yuk),
      });
    } catch (e) {
      return jsonHata(`DeepSeek'e ulaşılamadı: ${e.message}`, 502, cors);
    }

    // ÖNEMLİ: akışlı yanıtta gövdeyi OLDUĞU GİBİ geçir. Burada .text()
    // çağırmak akışı bozar ve kullanıcı yanıtın tamamlanmasını bekler.
    return new Response(yanit.body, {
      status: yanit.status,
      headers: {
        ...cors,
        "Content-Type": yanit.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  },
};
