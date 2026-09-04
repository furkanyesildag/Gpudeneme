import React from "react";
import { C, MONO, SANS } from "../theme.js";
import Markdown from "../components/Markdown.jsx";
import { sistemPrompt, HAZIR_SORULAR } from "./prompt.js";
import { sohbetAkisi, agHatasi, proxyModu, MODELLER, anahtarGecerliMi } from "./api.js";
import { repolariBul, modeliAnalizEt } from "../hf.js";
import { hesapla, kvKBperToken, ctxYazi, gb, sureYazi } from "../engine.js";

const DEPO_MESAJ = "llm_danisman_gecmis";
const DEPO_ANAHTAR = "ds_key";
const DEPO_MODEL = "llm_danisman_model";

const KARSILAMA = {
  role: "assistant",
  content:
    "Merhaba. Yerel LLM altyapısı konusunda ne sorarsan sor — donanım seçimi, kaç adet gerekir, " +
    "kuantizasyon, bellek ve hız hesabı, vLLM ayarları, Türkiye'de tedarik, maliyet, lisans.\n\n" +
    "**Bir HuggingFace linki yapıştır**, o modeli canlı çekip senin seçtiğin donanımda çalışıp " +
    "çalışmayacağını gerçek `config.json` verisiyle hesaplarım.\n\n" +
    "Soldaki simülatörde ne seçtiysen ben de onu görüyorum.",
};

/* ------------------------------------------------------------------ */
/*  HF analizini hem kullanıcıya hem modele okunur biçimde anlat       */
/* ------------------------------------------------------------------ */

function analizOzeti(a, durum) {
  const satir = [];
  satir.push(`### ${a.repo}`);
  if (a.tabanRepo) satir.push(`_Mimari taban modelden alındı: ${a.tabanRepo}_`);

  const t = [];
  t.push(`| Alan | Değer |`, `| --- | --- |`);
  if (a.tp) t.push(`| Toplam parametre | ${a.tp}B${a.ap && a.ap < a.tp ? ` (token başına aktif ${a.ap}B — MoE)` : " (dense)"} |`);
  if (a.katman) t.push(`| Katman | ${a.katman}${a.uzmanSayisi ? ` · ${a.uzmanSayisi} uzman, ${a.aktifUzman} aktif` : ""} |`);
  if (a.ctxK) t.push(`| Bağlam | ${ctxYazi(a.ctxK)} token |`);
  if (a.kv) {
    t.push(`| KV cache | ${a.kv.tip} · ${kvKBperToken(a.kv, 32768).toFixed(0)} KB/token @32K, ${kvKBperToken(a.kv, 262144).toFixed(0)} KB/token @256K |`);
    t.push(`| KV tutan katman | ${a.kv.L}${a.kv.sw ? ` (${a.kv.sw}'i ${a.kv.w} pencereli)` : ""} |`);
  }
  t.push(`| Mimari | \`${a.mimari}\` |`);
  t.push(`| Lisans | ${a.lisans} |`);
  t.push(`| Popülerlik | ${a.indirme.toLocaleString("tr-TR")} indirme · ${a.begeni} beğeni${a.guncelleme ? ` · güncelleme ${a.guncelleme}` : ""} |`);
  if (a.vl) t.push(`| Giriş | metin + görsel |`);
  satir.push(t.join("\n"));

  if (durum) satir.push("", durum);
  if (a.uyarilar.length) satir.push("", ...a.uyarilar.map((u) => `> ⚠ ${u}`));
  return satir.join("\n");
}

/** Analiz edilen modeli kullanıcının şu anki donanımında çalıştır. */
function uygunlukDurumu(a, ctx) {
  if (!a.kayit || !ctx) return null;
  const r = hesapla({
    model: a.kayit, quant: ctx.quant, kvq: ctx.kvq, ctxK: Math.min(ctx.ctxK, a.kayit.ctx),
    girdiK: ctx.girdiK, kullanici: ctx.kullanici, cikti: ctx.cikti,
    cihaz: ctx.cihaz, adet: ctx.adet, kvOran: ctx.kvOran,
  });
  const don = `**${ctx.adet} × ${ctx.cihaz.ad}** (${gb(r.toplamBellek)} GB kullanılabilir), ${ctx.quantAd}, ${ctxYazi(Math.min(ctx.ctxK, a.kayit.ctx))} bağlam, ${ctx.kullanici} eşzamanlı kullanıcı:`;
  const dokum = `ağırlık ${gb(r.agirlikGB)} GB + KV ${gb(r.kvGB)} GB + çalışma ${gb(r.ekGB)} GB = **${gb(r.gerekliGB)} GB**`;

  if (r.sigar) {
    return (
      `**✓ ÇALIŞIR.** ${don}\n\n${dokum} → belleğin %${Math.round(r.doluluk * 100)}'i dolu.\n\n` +
      `Beklenen: kullanıcı başına **~${r.kullaniciTokS.toFixed(1)} tok/s**, toplam ~${Math.round(r.toplamTokS)} tok/s, ` +
      `ilk token ~${sureYazi(r.ttftYogun)}.` +
      (r.doluluk > 0.88 ? "\n\n⚠ Bellek sınırda — üretimde ani uzun istem taşırabilir." : "") +
      (r.kullaniciTokS < 10 ? "\n\n⚠ Kullanıcı başına hız okuma bandının altında." : "")
    );
  }
  const sebep =
    r.agirlikGB > r.toplamBellek
      ? `Ağırlıklar tek başına (${gb(r.agirlikGB)} GB) sığmıyor.`
      : `Ağırlıklar sığıyor; taşıran şey **KV cache (${gb(r.kvGB)} GB)** — ${ctx.kullanici} kullanıcı × ${ctxYazi(ctx.ctxK)}.`;
  return (
    `**✗ SIĞMIYOR.** ${don}\n\n${dokum} → ${gb(r.toplamBellek)} GB'a sığmıyor. ${sebep}\n\n` +
    `Çözüm: en az **${r.minAdet ? `${r.minAdet} adet` : "çok daha fazla"}** cihaz, ya da ` +
    `${ctx.kullanici > 1 ? `kullanıcıyı ${r.maxKullanici}'e / ` : ""}bağlamı ${ctxYazi(Math.floor(r.maxCtxK))}'e düşür, ` +
    `ya da daha düşük bitli kuantizasyon.`
  );
}

/* ------------------------------------------------------------------ */

export default function ChatBot({ baglam, hfCtx, acikDis, setAcikDis }) {
  const proxy = proxyModu();
  const [acikIc, setAcikIc] = React.useState(false);
  const acik = acikDis ?? acikIc;
  const setAcik = setAcikDis ?? setAcikIc;

  const [genis, setGenis] = React.useState(false);
  // Dar ekranda panel tam genişlik olur ve düğme metni kısalır.
  const [dar, setDar] = React.useState(() => (typeof window !== "undefined" ? window.innerWidth < 560 : false));
  React.useEffect(() => {
    const f = () => setDar(window.innerWidth < 560);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  const [key, setKey] = React.useState(() => { try { return localStorage.getItem(DEPO_ANAHTAR) || ""; } catch { return ""; } });
  const [keyInput, setKeyInput] = React.useState("");
  const [model, setModel] = React.useState(() => { try { return localStorage.getItem(DEPO_MODEL) || "deepseek-chat"; } catch { return "deepseek-chat"; } });
  const [ayarAcik, setAyarAcik] = React.useState(false);

  const [mesajlar, setMesajlar] = React.useState(() => {
    try {
      const k = JSON.parse(localStorage.getItem(DEPO_MESAJ) || "null");
      if (Array.isArray(k) && k.length) return k;
    } catch { /* bozuk kayıt — yoksay */ }
    return [KARSILAMA];
  });
  const [girdi, setGirdi] = React.useState("");
  const [yukleniyor, setYukleniyor] = React.useState(false);
  const [durum, setDurum] = React.useState("");
  const iptalRef = React.useRef(null);
  const kaydirRef = React.useRef(null);
  const otoKaydirRef = React.useRef(true);
  const girdiRef = React.useRef(null);

  /* Sohbeti sakla (karşılama tek başınaysa kaydetme) */
  React.useEffect(() => {
    try {
      if (mesajlar.length > 1) localStorage.setItem(DEPO_MESAJ, JSON.stringify(mesajlar.slice(-40)));
      else localStorage.removeItem(DEPO_MESAJ);
    } catch { /* kota dolu olabilir */ }
  }, [mesajlar]);

  React.useEffect(() => { try { localStorage.setItem(DEPO_MODEL, model); } catch { /* yoksay */ } }, [model]);

  /* Kullanıcı yukarı kaydırdıysa otomatik kaydırmayı bırak */
  const kaydirmaOlayi = () => {
    const el = kaydirRef.current;
    if (!el) return;
    otoKaydirRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };
  React.useEffect(() => {
    if (kaydirRef.current && otoKaydirRef.current)
      kaydirRef.current.scrollTop = kaydirRef.current.scrollHeight;
  });

  React.useEffect(() => {
    if (acik && (proxy || key)) setTimeout(() => girdiRef.current?.focus(), 60);
  }, [acik, proxy, key]);

  /* Esc ile kapat */
  React.useEffect(() => {
    if (!acik) return;
    const f = (e) => { if (e.key === "Escape" && !yukleniyor) setAcik(false); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [acik, yukleniyor, setAcik]);

  const anahtarKaydet = () => {
    const k = keyInput.trim();
    if (!k) return;
    try { localStorage.setItem(DEPO_ANAHTAR, k); } catch { /* yoksay */ }
    setKey(k);
    setKeyInput("");
  };
  const anahtarSil = () => {
    try { localStorage.removeItem(DEPO_ANAHTAR); } catch { /* yoksay */ }
    setKey("");
    setAyarAcik(false);
  };
  const temizle = () => {
    setMesajlar([KARSILAMA]);
    try { localStorage.removeItem(DEPO_MESAJ); } catch { /* yoksay */ }
  };
  const durdur = () => iptalRef.current?.abort();

  /* ---------------- gönder ---------------- */
  const gonder = async (metin) => {
    const soru = (metin ?? girdi).trim();
    if (!soru || yukleniyor) return;

    const kullaniciMesaji = { role: "user", content: soru };
    let konusma = [...mesajlar, kullaniciMesaji];
    setMesajlar(konusma);
    setGirdi("");
    setYukleniyor(true);
    otoKaydirRef.current = true;
    const kontrol = new AbortController();
    iptalRef.current = kontrol;

    /* --- 1. Adım: metinde HuggingFace deposu var mı? --- */
    let hfNot = "";
    const repolar = repolariBul(soru);
    if (repolar.length) {
      setDurum(`HuggingFace'ten çekiliyor: ${repolar.join(", ")}…`);
      const raporlar = [];
      for (const r of repolar) {
        try {
          const a = await modeliAnalizEt(r, kontrol.signal);
          const uygunluk = uygunlukDurumu(a, hfCtx);
          const ozet = analizOzeti(a, uygunluk);
          raporlar.push(ozet);
          setMesajlar((m) => [...m, { role: "analiz", content: ozet, repo: a.repo, url: a.url }]);
          konusma = [...konusma];
        } catch (e) {
          if (e.name === "AbortError") { setYukleniyor(false); setDurum(""); return; }
          const h = `**${r}** analiz edilemedi: ${e.message}`;
          raporlar.push(h);
          setMesajlar((m) => [...m, { role: "analiz", content: h }]);
        }
      }
      hfNot =
        "\n\n[SİSTEM — CANLI HUGGINGFACE ANALİZİ]\nKullanıcının mesajındaki depolar huggingface.co API + config.json'dan " +
        "AZ ÖNCE çekildi. Bu veriler senin eğitim verinden daha günceldir; yorumunu bunlara dayandır ve " +
        "kullanıcıya zaten gösterilen tabloyu tekrarlama — onun ÜZERİNE mühendislik yorumu yap:\n\n" +
        raporlar.join("\n\n");
    }

    setDurum("");
    const yerIndeksi = konusma.length;
    setMesajlar((m) => [...m, { role: "assistant", content: "", akiyor: true }]);

    try {
      const sys =
        sistemPrompt() +
        (baglam ? `\n\n[SİSTEM — KULLANICININ SİMÜLATÖRDEKİ ŞU ANKİ SEÇİMİ]\n${baglam}` : "") +
        hfNot;

      const apiMesajlari = [
        { role: "system", content: sys },
        ...konusma.filter((m) => m.role === "user" || m.role === "assistant").slice(-16)
          .map((m) => ({ role: m.role, content: m.content })),
      ];

      let biriken = "";
      await sohbetAkisi(apiMesajlari, {
        model, key, sinyal: kontrol.signal,
        onDusunce: () => setDurum("düşünüyor…"),
        onParca: (p) => {
          biriken += p;
          setDurum("");
          setMesajlar((m) => {
            const y = [...m];
            const i = y.findIndex((x, idx) => idx >= yerIndeksi && x.akiyor);
            if (i >= 0) y[i] = { role: "assistant", content: biriken, akiyor: true };
            return y;
          });
        },
      });

      setMesajlar((m) => m.map((x) => (x.akiyor ? { role: "assistant", content: biriken || "(boş yanıt)" } : x)));
    } catch (e) {
      const msg = agHatasi(e);
      setMesajlar((m) => {
        const y = m.filter((x) => !x.akiyor);
        if (msg) y.push({ role: "assistant", content: "⚠ " + msg, hata: true });
        return y;
      });
    } finally {
      setYukleniyor(false);
      setDurum("");
      iptalRef.current = null;
    }
  };

  /* ---------------- görünüm ---------------- */
  const kabarcik = (rol) => ({
    alignSelf: rol === "user" ? "flex-end" : "stretch",
    maxWidth: rol === "user" ? "88%" : "100%",
    background: rol === "user" ? C.steel : rol === "analiz" ? C.steelSoft : C.wash,
    color: rol === "user" ? "#fff" : C.ink,
    border: rol === "user" ? "none" : `1px solid ${rol === "analiz" ? "var(--steel)" : C.line2}`,
    borderLeft: rol === "analiz" ? `3px solid var(--steel)` : undefined,
    borderRadius: 8,
    padding: rol === "user" ? "9px 12px" : "10px 13px",
    fontSize: 12.5,
    lineHeight: 1.55,
    wordBreak: "break-word",
  });

  const panelG = dar
    ? "calc(100vw - 32px)"
    : genis ? "min(860px, calc(100vw - 32px))" : "min(420px, calc(100vw - 32px))";
  const panelY = dar
    ? "calc(100vh - 130px)"
    : genis ? "calc(100vh - 96px)" : "min(620px, calc(100vh - 110px))";

  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 60, fontFamily: SANS, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {acik && (
        <div
          role="dialog"
          aria-label="LLM altyapı danışmanı"
          style={{
            width: panelG, height: panelY, background: C.paper,
            border: `1px solid ${C.line}`, borderRadius: 8,
            boxShadow: "0 16px 48px rgba(0,0,0,0.28)", display: "flex",
            flexDirection: "column", marginBottom: 10, overflow: "hidden",
          }}
        >
          {/* başlık */}
          <div style={{ background: "var(--ink)", color: "#fff", padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>LLM Altyapı Danışmanı</div>
              <div style={{ fontSize: 10, color: "#AEBAC3", fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {MODELLER.find((x) => x.id === model)?.ad} · {proxy ? "güvenli aracı" : "yerel anahtar"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
              <button onClick={() => setGenis((v) => !v)} style={ikonBtn} title={genis ? "Küçült" : "Genişlet"}>
                {genis ? "⤡" : "⤢"}
              </button>
              <button onClick={() => setAyarAcik((v) => !v)} style={ikonBtn} title="Ayarlar">⚙</button>
              <button onClick={() => setAcik(false)} style={ikonBtn} title="Kapat (Esc)">✕</button>
            </div>
          </div>

          {/* ayar çekmecesi */}
          {ayarAcik && (
            <div style={{ padding: "10px 12px", background: C.wash, borderBottom: `1px solid ${C.line2}`, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, color: C.ink2 }}>Model:</span>
                <select value={model} onChange={(e) => setModel(e.target.value)} style={{ fontFamily: SANS, fontSize: 11.5, padding: "4px 6px", border: `1px solid ${C.line}`, borderRadius: 3, background: C.paper, color: C.ink }}>
                  {MODELLER.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
                </select>
                <span style={{ fontSize: 10.5, color: C.ink3 }}>{MODELLER.find((x) => x.id === model)?.not}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={temizle} style={kucukBtn}>Sohbeti temizle</button>
                {!proxy && key && <button onClick={anahtarSil} style={kucukBtn}>Anahtarı sil</button>}
              </div>
            </div>
          )}

          {!proxy && !key ? (
            <AnahtarGirisi keyInput={keyInput} setKeyInput={setKeyInput} kaydet={anahtarKaydet} />
          ) : (
            <>
              <div ref={kaydirRef} onScroll={kaydirmaOlayi} style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
                {mesajlar.map((m, i) => (
                  <div key={i} style={kabarcik(m.role)}>
                    {m.role === "user" ? (
                      <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                    ) : (
                      <>
                        {m.role === "analiz" && (
                          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.07em", color: "var(--steel)", marginBottom: 4, textTransform: "uppercase" }}>
                            canlı huggingface analizi
                          </div>
                        )}
                        <Markdown metin={m.content} />
                        {m.akiyor && <span style={imlec} />}
                        {m.url && (
                          <a href={m.url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 11, color: C.steel, display: "inline-block", marginTop: 4 }}>
                            ↗ HuggingFace'te aç
                          </a>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {durum && (
                  <div style={{ ...kabarcik("assistant"), color: C.ink3, fontStyle: "italic", fontSize: 12 }}>{durum}</div>
                )}
                {yukleniyor && !durum && !mesajlar.some((m) => m.akiyor) && (
                  <div style={{ ...kabarcik("assistant"), color: C.ink3, fontStyle: "italic", fontSize: 12 }}>yazıyor…</div>
                )}
              </div>

              {/* hazır sorular */}
              {mesajlar.length <= 1 && (
                <div style={{ padding: "0 12px 8px", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0, maxHeight: 108, overflowY: "auto" }}>
                  {HAZIR_SORULAR.map((h) => (
                    <button key={h.k} onClick={() => gonder(h.s)} style={cipBtn}>{h.k}</button>
                  ))}
                </div>
              )}

              <div style={{ borderTop: `1px solid ${C.line2}`, padding: 9, display: "flex", gap: 7, alignItems: "flex-end", flexShrink: 0 }}>
                <textarea
                  ref={girdiRef}
                  value={girdi}
                  onChange={(e) => setGirdi(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); gonder(); }
                  }}
                  rows={1}
                  placeholder="Sorunu yaz ya da bir HuggingFace linki yapıştır…"
                  aria-label="Danışmana soru"
                  style={{
                    flex: 1, resize: "none", fontFamily: SANS, fontSize: 12.5,
                    padding: "8px 10px", border: `1px solid ${C.line}`, borderRadius: 4,
                    maxHeight: 120, minHeight: 34, background: C.paper, color: C.ink,
                  }}
                />
                {yukleniyor ? (
                  <button onClick={durdur} style={{ ...gonderBtn, background: C.bad }}>Durdur</button>
                ) : (
                  <button onClick={() => gonder()} style={gonderBtn} disabled={!girdi.trim()}>Gönder</button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Dar ekranda yalnızca simge: geniş bir düğme sayfa içeriğinin
          (kaydırak değerleri gibi) üstüne binip okunmaz hale getiriyordu. */}
      <button
        onClick={() => setAcik((v) => !v)}
        aria-expanded={acik}
        aria-label={acik ? "Danışmanı kapat" : "Danışmana sor"}
        title={acik ? "Danışmanı kapat" : "Danışmana sor"}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "var(--ink)", color: "#fff", border: "none",
          borderRadius: dar && !acik ? "50%" : 24,
          width: dar && !acik ? 52 : undefined,
          height: dar && !acik ? 52 : undefined,
          padding: dar && !acik ? 0 : "11px 17px",
          fontFamily: SANS, fontSize: dar && !acik ? 21 : 13, fontWeight: 600,
          cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
        }}
      >
        {acik ? "▾ Danışmanı kapat" : dar ? "💬" : "💬 Danışmana sor"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AnahtarGirisi({ keyInput, setKeyInput, kaydet }) {
  const bicimOk = !keyInput || anahtarGecerliMi(keyInput);
  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
      <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.6 }}>
        Danışmanı kullanmak için <b>DeepSeek API anahtarını</b> gir. Anahtar yalnızca bu
        tarayıcıda (localStorage) saklanır; koda gömülmez, bu siteye veya depoya gönderilmez —
        doğrudan senin tarayıcından DeepSeek'e gider.
      </div>
      <input
        type="password"
        value={keyInput}
        onChange={(e) => setKeyInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && bicimOk && kaydet()}
        placeholder="sk-..."
        aria-label="DeepSeek API anahtarı"
        autoComplete="off"
        style={{
          fontFamily: MONO, fontSize: 12.5, padding: "9px 10px",
          border: `1px solid ${bicimOk ? C.line : C.bad}`, borderRadius: 4,
          background: C.paper, color: C.ink,
        }}
      />
      {!bicimOk && (
        <div style={{ fontSize: 11, color: C.bad }}>
          Anahtar "sk-" ile başlamalı. Yanlış bir şey yapıştırmış olabilirsin.
        </div>
      )}
      <button onClick={kaydet} style={gonderBtn} disabled={!bicimOk || !keyInput}>Kaydet ve başla</button>
      <div style={{ fontSize: 11, color: C.ink3, lineHeight: 1.6 }}>
        Anahtarı{" "}
        <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer noopener" style={{ color: C.steel }}>
          platform.deepseek.com
        </a>{" "}
        üzerinden alabilirsin. Ortak bir cihazda çalışıyorsan iş bitince "Ayarlar → Anahtarı sil" ile temizle.
        <br /><br />
        <b>Site sahibiysen:</b> depodaki <code style={{ fontFamily: MONO }}>worker.js</code> ile 5 dakikada bir
        Cloudflare Worker kurup anahtarı sunucu tarafında saklayabilirsin — o zaman ziyaretçiler anahtar
        girmeden kullanır. Ayrıntı README'de.
      </div>
    </div>
  );
}

const ikonBtn = {
  background: "transparent", border: "1px solid rgba(255,255,255,0.28)", color: "#fff",
  borderRadius: 4, padding: "3px 7px", fontFamily: MONO, fontSize: 11,
  cursor: "pointer", lineHeight: 1.3,
};
const gonderBtn = {
  background: "var(--steel)", color: "#fff", border: "none", borderRadius: 4,
  padding: "9px 14px", fontFamily: SANS, fontSize: 12.5, fontWeight: 600,
  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
};
const kucukBtn = {
  background: "var(--paper)", color: "var(--ink2)", border: "1px solid var(--line)",
  borderRadius: 3, padding: "4px 9px", fontFamily: SANS, fontSize: 11.5, cursor: "pointer",
};
const cipBtn = {
  background: "var(--paper)", color: "var(--steel)", border: "1px solid var(--line)",
  borderRadius: 14, padding: "5px 10px", fontFamily: SANS, fontSize: 11.5, cursor: "pointer",
};
const imlec = {
  display: "inline-block", width: 7, height: 13, background: "var(--steel)",
  marginLeft: 2, verticalAlign: "text-bottom", animation: "yanip 1s steps(2) infinite",
};
