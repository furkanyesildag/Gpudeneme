#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  TARAYICI SMOKE TEST                                                */
/*                                                                     */
/*  `npm run dogrula` veriyi ve motoru sınar ama arayüze hiç bakmaz.   */
/*  Derleme de yardımcı olmuyor: tanımsız bir değişken (offloadGB gibi)*/
/*  Vite'ı geçer, ancak tarayıcıda patlar. Bu betik uygulamayı gerçek  */
/*  bir Chrome'da açıp şunları kontrol eder:                           */
/*                                                                     */
/*    · sayfa render oluyor mu (hata sınırına düşmüş mü?)              */
/*    · konsolda istisna/hata var mı                                   */
/*    · temel kontroller yerinde mi                                    */
/*    · her sekme açılıyor mu                                          */
/*    · dar ekranda yatay taşma veya içeriği kesen kap var mı          */
/*                                                                     */
/*  Kullanım:  npm run smoke                                           */
/*  Gereken:   google-chrome (veya chromium) PATH'te                   */
/* ------------------------------------------------------------------ */

import { spawn, execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.SMOKE_PORT || 5173);
const CDP = Number(process.env.SMOKE_CDP || 9333);
const URL = `http://localhost:${PORT}`;

const hatalar = [];
const hata = (m) => { hatalar.push(m); console.log("  ✗ " + m); };
const gecti = (m) => console.log("  ✓ " + m);
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

function chromeYolu() {
  for (const c of ["google-chrome", "chromium", "chromium-browser", "google-chrome-stable"]) {
    try { execSync(`command -v ${c}`, { stdio: "ignore" }); return c; } catch { /* sonrakine bak */ }
  }
  return null;
}

/* ---- basit CDP istemcisi ---- */
async function baglan() {
  for (let i = 0; i < 50; i++) {
    try {
      const t = (await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()).find((x) => x.type === "page");
      if (t?.webSocketDebuggerUrl) return t.webSocketDebuggerUrl;
    } catch { /* henüz açılmadı */ }
    await bekle(300);
  }
  throw new Error("Chrome hata ayıklama portuna bağlanılamadı");
}

async function surucu(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const bek = new Map(); const olay = [];
  let id = 0;
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && bek.has(m.id)) { bek.get(m.id)(m); bek.delete(m.id); } else olay.push(m);
  };
  const g = (method, params = {}) =>
    new Promise((res) => { const i = ++id; bek.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (ifade) => {
    const r = await g("Runtime.evaluate", { expression: ifade, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "eval hatası");
    return r.result?.result?.value;
  };
  return { g, js, olay, kapat: () => ws.close() };
}

/* ---- ana akış ---- */
const chrome = chromeYolu();
if (!chrome) {
  console.log("google-chrome/chromium bulunamadı — smoke test atlanıyor.");
  process.exit(0);
}

const profil = mkdtempSync(join(tmpdir(), "gpudeneme-smoke-"));
const cp = spawn(chrome, [
  "--headless=new", `--remote-debugging-port=${CDP}`, "--no-sandbox",
  "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${profil}`, "about:blank",
], { stdio: "ignore" });

let s;
try {
  s = await surucu(await baglan());
  await s.g("Page.enable");
  await s.g("Runtime.enable");
  await s.g("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false });
  await s.g("Page.navigate", { url: URL });
  await s.g("Page.reload", { ignoreCache: true });
  await bekle(4500);

  console.log("\nSayfa:");
  const govde = (await s.js("document.body.innerText")) || "";
  if (/Bir şeyler ters gitti/.test(govde)) {
    hata("uygulama hata sınırına düştü — aşağıdaki istisnalara bak");
  } else if (govde.length < 400) {
    hata(`sayfa neredeyse boş (${govde.length} karakter)`);
  } else gecti(`render oldu (${govde.length} karakter)`);

  if (await s.js(`!!document.querySelector('h1')`)) gecti("başlık var");
  else hata("h1 başlığı yok");

  /* Varsayılan açılış YÖNETİCİ ÖZETİ — karar verici için sade ekran.
     Önce onu sına, sonra detaylı analize geçip mühendis ekranını sına. */
  console.log("\nYönetici özeti (varsayılan açılış):");
  for (const [ad, ifade] of [
    ["ekip büyüklüğü seçimi", `[...document.querySelectorAll('button')].some(b=>/^\\d+ kişi$/.test(b.textContent.trim()))`],
    ["kullanım profili seçimi", `[...document.querySelectorAll('button')].some(b=>/Kod yazma ve ajanlar/.test(b.textContent))`],
    /* Etiket CSS ile büyük harfe çevriliyor ve Türkçe "İ" (U+0130) JS'te
       "i"ye küçülmüyor — /i bayrağı burada işe yaramaz. Bu yüzden büyük
       harfe çevrilmeyen başlık cümlesine bakıyoruz. */
    ["karar cümlesi", `/ucuz — üstelik|ödenebilir bir fark|pahalıya geliyor|yeterli değil/.test(document.body.innerText)`],
    ["bulut karşılaştırması", `/Buluttan alsak — yılda|Aynı işi buluttan/.test(document.body.innerText)`],
    ["riskler görünür", `/Karar verirken bilinmesi gerekenler|tek kutu yeterli değil/.test(document.body.innerText)`],
    ["kaydırak YOK", `document.querySelectorAll('input[type=range]').length === 0`],
  ]) {
    if (await s.js(ifade)) gecti(ad); else hata(`yönetici özeti: ${ad} başarısız`);
  }

  // Ekip büyüklüğünü değiştirmek kararı gerçekten yeniden hesaplamalı
  const oncekiKarar = await s.js("document.body.innerText");
  await s.js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='100 kişi')?.click()`);
  await bekle(800);
  if ((await s.js("document.body.innerText")) === oncekiKarar)
    hata("yönetici özeti: ekip büyüklüğü değişince sonuç değişmedi");
  else gecti("ekip büyüklüğü sonucu değiştiriyor");

  console.log("\nDetaylı analize geçiş:");
  await s.js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Detaylı analiz')?.click()`);
  await bekle(1200);
  if (await s.js(`document.querySelectorAll('input[type=range]').length >= 5`)) gecti("detaylı analiz açıldı");
  else hata("detaylı analize geçilemedi");

  console.log("\nTemel kontroller:");
  for (const [ad, ifade] of [
    ["model seçici", `[...document.querySelectorAll('select')].some(x=>x.options.length>50)`],
    ["kuantizasyon seçici", `[...document.querySelectorAll('select')].some(s=>[...s.options].some(o=>/Q4_K_M/.test(o.textContent)))`],
    ["iş yükü kaydırakları", `document.querySelectorAll('input[type=range]').length >= 5`],
    ["sonuç kararı", `/Rahat çalışır|Sınırda çalışır|Belleğe sığmıyor/.test(document.body.innerText)`],
    ["bellek dökümü", `/BELLEK BÜTÇESİ/i.test(document.body.innerText)`],
    ["sohbet önizlemesi", `[...document.querySelectorAll('button')].some(b=>/Sohbeti başlat/.test(b.textContent))`],
    ["düşünme seviyeleri", `['Kapalı','Düşük','Orta','Yüksek'].every(t=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===t))`],
    ["danışman düğmesi", `[...document.querySelectorAll('button')].some(b=>/Danışman/.test(b.textContent))`],
  ]) {
    if (await s.js(ifade)) gecti(ad); else hata(`${ad} bulunamadı`);
  }

  console.log("\nSekmeler:");
  const sekmeler = await s.js(`[...document.querySelectorAll('[role=tab]')].map(t=>t.textContent)`);
  if (!sekmeler?.length) hata("hiç sekme yok");
  for (let i = 0; i < (sekmeler?.length || 0); i++) {
    await s.js(`document.querySelectorAll('[role=tab]')[${i}].click()`);
    await bekle(600);
    const uzunluk = (await s.js("document.body.innerText")).length;
    if (uzunluk < 400) hata(`sekme "${sekmeler[i]}" boş açıldı`);
    else gecti(`sekme "${sekmeler[i].slice(0, 28)}" (${uzunluk} karakter)`);
  }

  console.log("\nDüzen (dar ekran dahil):");
  for (const [g_, y, ad] of [[1500, 1000, "masaüstü"], [768, 1024, "tablet"], [390, 844, "telefon"]]) {
    await s.g("Emulation.setDeviceMetricsOverride", { width: g_, height: y, deviceScaleFactor: 1, mobile: g_ < 800 });
    await bekle(700);
    const tasma = await s.js("document.documentElement.scrollWidth - document.documentElement.clientWidth");
    if (tasma > 2) hata(`${ad} (${g_}px): ${tasma}px yatay taşma`);
    // İçeriğini kesen kap: kasıtlı kaydırma alanları (tablo, sohbet) hariç
    const kirpan = await s.js(`(()=>{const s=[];document.querySelectorAll('main *').forEach(el=>{
      const st=getComputedStyle(el);
      if(!/auto|scroll/.test(st.overflowY)) return;
      if(el.scrollHeight-el.clientHeight<=4) return;
      if(el.closest('table')||el.querySelector('table')||el.getAttribute('aria-live')) return;
      s.push(el.tagName+' '+(el.innerText||'').slice(0,30).replace(/\\n/g,' '));});return s;})()`);
    if (kirpan.length) hata(`${ad}: içeriğini kesen ${kirpan.length} kap — ${kirpan[0]}`);
    if (tasma <= 2 && !kirpan.length) gecti(`${ad} (${g_}px) temiz`);
  }

  console.log("\nKonsol:");
  const istisna = s.olay.filter((o) => o.method === "Runtime.exceptionThrown")
    .map((o) => (o.params.exceptionDetails?.exception?.description || o.params.exceptionDetails?.text || "").split("\n")[0]);
  const konsolHata = s.olay.filter((o) => o.method === "Runtime.consoleAPICalled" && o.params?.type === "error")
    .map((o) => (o.params.args || []).map((a) => a.value || a.description || "").join(" "));
  const tekil = [...new Set([...istisna, ...konsolHata])];
  if (tekil.length) tekil.forEach((h) => hata(`konsol: ${h.slice(0, 160)}`));
  else gecti("istisna veya hata yok");
} catch (e) {
  hata(`test çalıştırılamadı: ${e.message}`);
} finally {
  s?.kapat();
  cp.kill();
  try { rmSync(profil, { recursive: true, force: true }); } catch { /* yoksay */ }
}

console.log(hatalar.length ? `\n${hatalar.length} SORUN bulundu.` : "\n✓ Smoke test geçti.");
process.exit(hatalar.length ? 1 : 0);
