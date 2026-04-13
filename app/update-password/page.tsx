"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const updatePassword = async () => {
    if (loading) return;

    setMsg("");
    setIsError(false);

    if (password.length < 6 || password.length > 16) {
      setIsError(true);
      setMsg("パスワードは6文字以上16文字以下で設定してください");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setIsError(true);
      setMsg(error.message);
      setLoading(false);
      return;
    }

    setIsError(false);
    setMsg("パスワードを更新しました。ログイン画面へ移動してください。");
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      updatePassword();
    }
  };

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>新しいパスワード設定</h2>

        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>新しいパスワード</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="6文字以上16文字以下"
            disabled={loading}
            style={{
              ...inputStyle,
              border: focused ? "2px solid #3b82f6" : "1px solid #ccc",
              backgroundColor: loading ? "#f5f5f5" : "#fff",
            }}
          />
        </div>

        <button
          type="button"
          onClick={updatePassword}
          disabled={loading}
          style={{
            ...buttonStyle,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "更新中..." : "パスワードを更新"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          style={backButtonStyle}
        >
          ログイン画面へ
        </button>

        {msg && (
          <div
            style={{
              marginTop: 14,
              fontSize: 14,
              color: isError ? "crimson" : "#2563eb",
              lineHeight: 1.6,
            }}
          >
            {msg}
          </div>
        )}
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

const backButtonStyle: React.CSSProperties = {
  marginTop: 12,
  width: "100%",
  padding: "12px",
  background: "#fff",
  color: "#111",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};
