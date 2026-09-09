/* ------------------------------------------------------------------ */
/*  KENDİ ÖLÇÜMÜNLE KALİBRASYON                                        */
/*                                                                     */
/*  Modelin en zayıf tarafı MBU (gerçekleşen bant genişliği kullanımı) */
/*  tahminleridir. Elimizde yalnızca iki ölçüm noktası var ve ikisi de */
/*  tek bir cihazdan (DGX Spark). Diğer 39 cihazın MBU değeri          */
/*  mühendislik tahminidir.                                            */
/*                                                                     */
/*  Gerçek dünyadaki dağılım geniş: aynı kartta llama.cpp ile vLLM,    */
/*  farklı sürücü, farklı derleme bayrakları belirgin fark yaratır.    */
/*  Tek bir sayı bunu taşıyamaz.                                       */
/*                                                                     */
/*  Çözüm: kullanıcı kendi kurulumunda ölçtüğü tok/s'yi girer, biz de  */
/*  o sonucu üretecek MBU'yu geri hesaplayıp o cihaz için saklarız.    */
/*  Bir kez ölç, sonra aynı kartla diğer modelleri güvenle tahmin et.  */
/* ------------------------------------------------------------------ */

const DEPO = "mbu_kalibrasyon";

/** { cihazId: {mbu, olculen, model, quant, tarih} } */
export function kalibrasyonlariOku() {
  try {
    const h = JSON.parse(localStorage.getItem(DEPO) || "{}");
    return h && typeof h === "object" ? h : {};
  } catch {
    return {};
  }
}

function yaz(hepsi) {
  try { localStorage.setItem(DEPO, JSON.stringify(hepsi)); } catch { /* kota dolu olabilir */ }
}

/**
 * Ölçülen hızdan MBU'yu geri hesapla.
 *
 * Motor şunu hesaplıyor:
 *   tok/s = mtpHızlanma × quantHız × (BW × MBU × moeVerim) / adımBayt
 * Buradan MBU'yu çekmek için, aynı kurulumu bilinen MBU ile bir kez
 * hesaplayıp oranı kullanmak yeterli — böylece offload, MTP ve MoE gibi
 * bütün diğer terimler kendiliğinden sadeleşir.
 *
 * @param simHiz     mevcut MBU ile hesaplanan tok/s
 * @param olculenHiz kullanıcının gerçekte ölçtüğü tok/s
 * @param simdikiMbu o hesapta kullanılan MBU
 */
export function mbuGeriHesapla(simHiz, olculenHiz, simdikiMbu) {
  if (!(simHiz > 0) || !(olculenHiz > 0)) return null;
  const yeni = simdikiMbu * (olculenHiz / simHiz);
  // Fiziksel sınırlar: %15'in altı ölçüm hatası, %98'in üstü imkânsız.
  if (yeni < 0.15 || yeni > 0.98) return { mbu: Math.max(0.15, Math.min(0.98, yeni)), sinirda: true };
  return { mbu: yeni, sinirda: false };
}

export function kalibrasyonKaydet(cihazId, veri) {
  const hepsi = kalibrasyonlariOku();
  hepsi[cihazId] = { ...veri, tarih: new Date().toISOString().slice(0, 10) };
  yaz(hepsi);
  return hepsi;
}

export function kalibrasyonSil(cihazId) {
  const hepsi = kalibrasyonlariOku();
  delete hepsi[cihazId];
  yaz(hepsi);
  return hepsi;
}

/** Cihazı, varsa kullanıcının kendi kalibrasyonuyla değiştir. */
export function kalibreCihaz(cihaz, kalibrasyonlar) {
  const k = kalibrasyonlar?.[cihaz.id];
  return k?.mbu ? { ...cihaz, mbu: k.mbu, mbuKalibre: true } : cihaz;
}
