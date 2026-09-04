import React from "react";

/* Beklenmedik bir hatada boş beyaz sayfa yerine ne olduğunu göster ve
   kurtulma yolu sun. Hatalı bir URL durumu ile gelinmişse temizlemek
   çoğu zaman yeter. */
export default class HataSiniri extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hata: null };
  }

  static getDerivedStateFromError(hata) {
    return { hata };
  }

  componentDidCatch(hata, bilgi) {
    console.error("Simülatörde hata:", hata, bilgi);
  }

  render() {
    if (!this.state.hata) return this.props.children;
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 32, maxWidth: 680, margin: "0 auto", color: "var(--ink)" }}>
        <h1 style={{ fontSize: 20, fontWeight: 500 }}>Bir şeyler ters gitti</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink2)" }}>
          Simülatör beklenmedik bir hataya düştü. Çoğu zaman bunun sebebi adres çubuğundaki
          eski bir kurulum bağlantısıdır — aşağıdaki düğme onu temizleyip baştan başlatır.
        </p>
        <pre style={{ fontSize: 11.5, background: "var(--wash)", border: "1px solid var(--line)", borderRadius: 4, padding: 12, overflowX: "auto", color: "var(--ink2)" }}>
          {String(this.state.hata?.message || this.state.hata)}
        </pre>
        <button
          onClick={() => { location.hash = ""; location.reload(); }}
          style={{ background: "var(--steel)", color: "#fff", border: "none", borderRadius: 4, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
        >
          Sıfırla ve yeniden yükle
        </button>
      </div>
    );
  }
}
