import React from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Area, ComposedChart,
} from "recharts";
import { C, CHART, MONO, SANS, S, T, RADIUS } from "../theme.js";
import { Bolum, MiniSecim, Aciklama } from "../components/ui.jsx";
import { hesapla, ctxYazi } from "../engine.js";

const X_ETIKET = { kullanici: "kullanıcı", baglam: "bağlam", adet: "cihaz" };

export default function Grafik({ ortak, model, cihaz, adet, girdiK, hedef }) {
  const [xEksen, setXEksen] = React.useState("kullanici");
  const [yEksen, setYEksen] = React.useState("hiz");

  const egri = React.useMemo(() => {
    let xler;
    if (xEksen === "kullanici") xler = Array.from({ length: 32 }, (_, i) => i + 1);
    else if (xEksen === "adet") xler = Array.from({ length: 16 }, (_, i) => i + 1);
    else xler = [4, 8, 16, 32, 64, 128, 192, 256, 384, 512, 768, 1024];

    return xler.map((x) => {
      const args = { ...ortak, model, cihaz, adet };
      if (xEksen === "kullanici") args.kullanici = x;
      else if (xEksen === "adet") args.adet = x;
      else { args.ctxK = x; args.girdiK = Math.min(girdiK, x); }
      const h = hesapla(args);
      return {
        x,
        kisiBasi: h.sigar ? Number(h.kullaniciTokS.toFixed(1)) : null,
        toplam: h.sigar ? Number(h.toplamTokS.toFixed(0)) : null,
        ttft: h.sigar ? Number((h.ttftYogun * 1000).toFixed(0)) : null,
        agirlik: Number(((h.agirlikGB / h.toplamBellek) * 100).toFixed(1)),
        kv: Number(((h.kvGB / h.toplamBellek) * 100).toFixed(1)),
      };
    });
  }, [ortak, model, cihaz, adet, xEksen, girdiK]);

  const bos = yEksen !== "bellek" && egri.every((p) => p.kisiBasi === null);

  return (
    <Bolum
      baslik="Nerede tıkanıyor?"
      aciklama="Bir değişkeni gezdirip diğerlerinin nasıl tepki verdiğini gör."
      sag={
        <>
          <MiniSecim etiket="Dikey eksen" deger={yEksen} onChange={setYEksen}>
            <option value="hiz">Dikey: token hızı</option>
            <option value="ttft">Dikey: ilk token</option>
            <option value="bellek">Dikey: bellek dökümü</option>
          </MiniSecim>
          <MiniSecim etiket="Yatay eksen" deger={xEksen} onChange={setXEksen}>
            <option value="kullanici">Yatay: kullanıcı</option>
            <option value="baglam">Yatay: bağlam</option>
            <option value="adet">Yatay: cihaz adedi</option>
          </MiniSecim>
        </>
      }
    >
      <div style={{ height: 250, position: "relative" }}>
        {bos && (
          <div
            style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", textAlign: "center", padding: S.xl, zIndex: 2,
              background: `${C.paper}E8`, borderRadius: RADIUS.sm, ...T.kucuk, color: C.ink2,
            }}
          >
            <div style={{ maxWidth: 420 }}>
              <b style={{ color: C.bad }}>Bu eksende çizilecek nokta yok.</b>
              <br />
              Model bu ayarlarla hiçbir {X_ETIKET[xEksen]} değerinde belleğe sığmıyor, dolayısıyla
              hız tanımsız. Kuantizasyonu düşür, bağlamı kısalt ya da cihaz ekle — veya dikey
              ekseni <b>bellek dökümü</b> yapıp ne kadar taştığını gör.
            </div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={egri} margin={{ top: 8, right: 8, left: -14, bottom: 2 }}>
            <CartesianGrid stroke={CHART.grid} strokeOpacity={0.2} vertical={false} />
            <XAxis
              dataKey="x" tick={{ fontSize: 10.5, fill: CHART.axis, fontFamily: MONO }}
              stroke={CHART.axis} strokeOpacity={0.35}
              tickFormatter={(v) => (xEksen === "baglam" ? ctxYazi(v) : v)}
            />
            {yEksen === "hiz" ? (
              <>
                <YAxis yAxisId="l" tick={{ fontSize: 10.5, fill: CHART.axis, fontFamily: MONO }} stroke={CHART.axis} strokeOpacity={0.35} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10.5, fill: CHART.axis, fontFamily: MONO }} stroke={CHART.axis} strokeOpacity={0.35} />
              </>
            ) : (
              <YAxis
                yAxisId="l" domain={yEksen === "bellek" ? [0, 250] : [0, "auto"]}
                tick={{ fontSize: 10.5, fill: CHART.axis, fontFamily: MONO }}
                stroke={CHART.axis} strokeOpacity={0.35}
                tickFormatter={(v) => (yEksen === "bellek" ? `%${v}` : yEksen === "ttft" ? `${v}` : v)}
              />
            )}
            <Tooltip
              contentStyle={{
                fontFamily: MONO, fontSize: 11.5, border: `1px solid ${C.line}`,
                borderRadius: RADIUS.sm, background: C.paper, color: C.ink,
              }}
              labelFormatter={(v) => `${xEksen === "baglam" ? ctxYazi(v) : v} ${X_ETIKET[xEksen]}`}
              formatter={(v, n) => [yEksen === "bellek" ? `%${v}` : yEksen === "ttft" ? `${v} ms` : v, n]}
            />
            <Legend wrapperStyle={{ fontSize: 11.5, fontFamily: SANS }} />
            {yEksen === "hiz" && (
              <>
                <Line yAxisId="l" type="monotone" dataKey="kisiBasi" name="Kullanıcı başına tok/s" stroke={CHART.steel} strokeWidth={2} dot={false} connectNulls={false} />
                <Line yAxisId="r" type="monotone" dataKey="toplam" name="Toplam tok/s" stroke={CHART.kv} strokeWidth={2} dot={false} connectNulls={false} />
                <ReferenceLine yAxisId="l" y={hedef.tps} stroke={CHART.ok} strokeDasharray="4 4"
                  label={{ value: `hedef ${hedef.tps}`, fontSize: 10, fill: CHART.ok, position: "insideBottomLeft" }} />
              </>
            )}
            {yEksen === "ttft" && (
              <>
                <Line yAxisId="l" type="monotone" dataKey="ttft" name="İlk token (ms)" stroke={CHART.bad} strokeWidth={2} dot={false} connectNulls={false} />
                <ReferenceLine yAxisId="l" y={hedef.ttftMs} stroke={CHART.ok} strokeDasharray="4 4"
                  label={{ value: `hedef ${hedef.ttftMs} ms`, fontSize: 10, fill: CHART.ok, position: "insideTopLeft" }} />
              </>
            )}
            {yEksen === "bellek" && (
              <>
                <Area yAxisId="l" type="monotone" dataKey="agirlik" name="Ağırlıklar %" stackId="1" stroke={CHART.steel} fill={CHART.steel} fillOpacity={0.5} />
                <Area yAxisId="l" type="monotone" dataKey="kv" name="KV cache %" stackId="1" stroke={CHART.kv} fill={CHART.kv} fillOpacity={0.5} />
                <ReferenceLine yAxisId="l" y={100} stroke={CHART.bad} strokeDasharray="4 4"
                  label={{ value: "bellek sınırı", fontSize: 10, fill: CHART.bad, position: "insideTopLeft" }} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Aciklama>
        {yEksen === "hiz" && "Çizgi kesiliyorsa orada belleğe sığmıyor. Toplam verim yükselirken kişi başına hızın düşmesi normaldir; önemli olan yeşil hedef çizgisinin altına inmemesi."}
        {yEksen === "ttft" && "İlk token gecikmesi istem uzunluğu ve kalabalıkla büyür. Yeşil çizgi senin hedefin."}
        {yEksen === "bellek" && "Ağırlıklar sabit kalırken KV cache'in nasıl büyüdüğünü gösterir. Kırmızı çizgiyi geçen noktalarda model o ayarla belleğe sığmaz."}
      </Aciklama>
    </Bolum>
  );
}
