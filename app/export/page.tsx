"use client";

import { useRouter } from "next/navigation";

export default function ExportPage() {
  const router = useRouter();

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>EXPORT</div>
            <h1 style={titleStyle}>予約スケジュールCSV出力</h1>
            <p style={descStyle}>
              ここにCSV出力機能を追加していきます。
            </p>
          </div>

          <button type="button" onClick={() => router.push("/")} style={buttonStyle}>
            ダッシュボードへ戻る
          </button>
        </div>

        <div style={placeholderStyle}>
          仮ページです。<br />
          今後ここに「期間指定」「企業指定」「CSVダウンロード」などを追加予定です。
        </div>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#7c3aed",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 6px",
  fontSize: 30,
  fontWeight: 800,
};

const descStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontWeight: 700,
  cursor: "pointer",
  height: "fit-content",
};

const placeholderStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 24,
  borderRadius: 16,
  background: "#faf5ff",
  border: "1px dashed #d8b4fe",
  color: "#6b21a8",
  lineHeight: 1.8,
};