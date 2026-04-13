"use client";

import { useActionState, useState } from "react";
import { registerCompanyAction } from "@/app/actions/companyRegistrationActions";
import { useRouter } from "next/navigation";

const initialState = {
  ok: false,
  message: "",
};

export default function RegisterPage() {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    registerCompanyAction,
    initialState
  );

  const [focused, setFocused] = useState<
    | "companyName"
    | "companyType"
    | "userName"
    | "contactEmail"
    | "phoneNumber"
    | "password"
    | null
  >(null);

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>ONE FUKUOKA BLDG企業登録</h2>
        <p style={descStyle}>
          企業アカウントを新規作成します。初期登録ユーザーは一般ユーザーで作成されます。
        </p>

        <form action={formAction}>
          <div style={{ marginTop: 16 }}>
            <div style={labelStyle}>会社名</div>
            <input
              name="company_name"
              placeholder="○○株式会社"
              disabled={isPending}
              onFocus={() => setFocused("companyName")}
              onBlur={() => setFocused(null)}
              style={{
                ...inputStyle,
                border:
                  focused === "companyName"
                    ? "2px solid #3b82f6"
                    : "1px solid #ccc",
                backgroundColor: isPending ? "#f5f5f5" : "#fff",
              }}
              required
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={labelStyle}>会社種別</div>
            <select
              name="company_type"
              disabled={isPending}
              onFocus={() => setFocused("companyType")}
              onBlur={() => setFocused(null)}
              defaultValue="tenant"
              style={{
                ...inputStyle,
                border:
                  focused === "companyType"
                    ? "2px solid #3b82f6"
                    : "1px solid #ccc",
                backgroundColor: isPending ? "#f5f5f5" : "#fff",
              }}
              required
            >
              <option value="tenant">テナント</option>
              <option value="contractor">工事業者</option>
              <option value="delivery">搬入業者</option>
              <option value="admin_company">管理会社</option>
            </select>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={labelStyle}>担当者名</div>
            <input
              name="user_name"
              placeholder="工藤 薫也"
              disabled={isPending}
              onFocus={() => setFocused("userName")}
              onBlur={() => setFocused(null)}
              style={{
                ...inputStyle,
                border:
                  focused === "userName"
                    ? "2px solid #3b82f6"
                    : "1px solid #ccc",
                backgroundColor: isPending ? "#f5f5f5" : "#fff",
              }}
              required
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={labelStyle}>連絡先メール（ログイン用）</div>
            <input
              name="contact_email"
              type="email"
              placeholder="contact@company.com"
              disabled={isPending}
              onFocus={() => setFocused("contactEmail")}
              onBlur={() => setFocused(null)}
              style={{
                ...inputStyle,
                border:
                  focused === "contactEmail"
                    ? "2px solid #3b82f6"
                    : "1px solid #ccc",
                backgroundColor: isPending ? "#f5f5f5" : "#fff",
              }}
              required
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={labelStyle}>電話番号</div>
            <input
              name="phone_number"
              placeholder="090-1234-5678"
              disabled={isPending}
              onFocus={() => setFocused("phoneNumber")}
              onBlur={() => setFocused(null)}
              style={{
                ...inputStyle,
                border:
                  focused === "phoneNumber"
                    ? "2px solid #3b82f6"
                    : "1px solid #ccc",
                backgroundColor: isPending ? "#f5f5f5" : "#fff",
              }}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={labelStyle}>パスワード</div>
            <input
              name="password"
              type="password"
              placeholder="8文字以上で入力"
              disabled={isPending}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              style={{
                ...inputStyle,
                border:
                  focused === "password"
                    ? "2px solid #3b82f6"
                    : "1px solid #ccc",
                backgroundColor: isPending ? "#f5f5f5" : "#fff",
              }}
              minLength={8}
              required
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
              パスワードは8文字以上で設定してください。
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            style={{
              ...buttonStyle,
              opacity: isPending ? 0.7 : 1,
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "登録中..." : "企業登録"}
          </button>
        </form>

        {state.message ? (
          <div
            style={{
              marginTop: 14,
              fontSize: 14,
              color: state.ok ? "#2563eb" : "crimson",
              lineHeight: 1.6,
            }}
          >
            {state.message}
          </div>
        ) : null}

        {state.ok ? (
          <button
            type="button"
            onClick={() => router.push("/login")}
            style={secondaryButtonStyle}
          >
            ログイン画面へ
          </button>
        ) : null}
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
  maxWidth: 460,
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

const descStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 14,
  lineHeight: 1.6,
  color: "#666",
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

const secondaryButtonStyle: React.CSSProperties = {
  marginTop: 14,
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