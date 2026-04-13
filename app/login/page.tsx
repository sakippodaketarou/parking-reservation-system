"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (loading) return;

    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      login();
    }
  };

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>ログイン</h2>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>メール</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
            style={{
              ...inputStyle,
              border: focused === "email" ? "2px solid #3b82f6" : "1px solid #ccc",
              backgroundColor: loading ? "#f5f5f5" : "#fff",
            }}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>パスワード</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6文字以上"
            style={{
              ...inputStyle,
              border: focused === "password" ? "2px solid #3b82f6" : "1px solid #ccc",
              backgroundColor: loading ? "#f5f5f5" : "#fff",
            }}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>

        <button
          onClick={login}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          disabled={loading}
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/forgot-password")}
          style={linkButtonStyle}
        >
          パスワードを忘れた方はこちら
        </button>

        {msg && <div style={messageStyle}>{msg}</div>}
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f6f7f9",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
  padding: 28,
  boxSizing: "border-box",
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  margin: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  transition: "0.2s",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  marginTop: 24,
  width: "100%",
  padding: "12px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14,
};

const linkButtonStyle: React.CSSProperties = {
  marginTop: 14,
  width: "100%",
  padding: "10px",
  background: "#fff",
  color: "#2563eb",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const messageStyle: React.CSSProperties = {
  color: "crimson",
  marginTop: 14,
  fontSize: 14,
};