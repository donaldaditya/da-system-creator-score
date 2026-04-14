"use client";

import { useState, useEffect } from "react";
import type { LeadData } from "@/types/creator";

const GATE_KEY = "roi_gate_passed";
const LEADS_KEY = "roi_leads";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LeadGate({ children }: { children: React.ReactNode }) {
  const [passed, setPassed] = useState(true); // optimistic — avoids flash
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string; company?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const gated = sessionStorage.getItem(GATE_KEY);
    if (!gated) setPassed(false);
  }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim())           e.name    = "Full name is required";
    if (!form.email.trim())          e.email   = "Email is required";
    else if (!validateEmail(form.email)) e.email = "Enter a valid email address";
    if (!form.company.trim())        e.company = "Company is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    const lead: LeadData = { ...form, timestamp: Date.now() };

    // Always save to localStorage as fallback
    try {
      const existing: LeadData[] = JSON.parse(localStorage.getItem(LEADS_KEY) ?? "[]");
      existing.push(lead);
      localStorage.setItem(LEADS_KEY, JSON.stringify(existing));
    } catch { /* quota or SSR */ }

    // Send to Google Sheets via API route (fire-and-forget, don't block UX)
    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    }).catch(() => { /* silently ignore — localStorage is the fallback */ });

    sessionStorage.setItem(GATE_KEY, "1");
    setPassed(true);
    setSubmitting(false);
  };

  // Don't render anything until mounted (avoids SSR flash)
  if (!mounted) return <>{children}</>;
  if (passed)   return <>{children}</>;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#0A0A0F",
    border: "1px solid #1E1E2E",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#E8EAF0",
    fontSize: "14px",
    outline: "none",
  };

  const errStyle: React.CSSProperties = { color: "#EF4444", fontSize: "11px", marginTop: "4px" };

  return (
    <div style={{ position: "relative" }}>
      {/* App behind dim */}
      <div style={{ pointerEvents: "none", userSelect: "none", filter: "blur(3px) brightness(0.4)" }}>
        {children}
      </div>

      {/* Modal overlay */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(10, 10, 15, 0.85)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div
          style={{
            backgroundColor: "#12121A",
            border: "1px solid #1E1E2E",
            borderRadius: "16px",
            padding: "40px",
            width: "100%",
            maxWidth: "420px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "8px",
                backgroundColor: "rgba(0, 212, 255, 0.12)",
                border: "1px solid rgba(0, 212, 255, 0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px",
              }}>📊</div>
              <span style={{ color: "#00D4FF", fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em" }}>
                DA System: Creator Score
              </span>
            </div>
            <h2 style={{ color: "#E8EAF0", fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
              Get Access
            </h2>
            <p style={{ color: "#6B7280", fontSize: "13px", lineHeight: 1.5 }}>
              Score and rank TikTok, Instagram, and Shopee creators for affiliate campaigns.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: "#9CA3AF", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Donald Aditya"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                style={{ ...inputStyle, borderColor: errors.name ? "#EF4444" : "#1E1E2E" }}
              />
              {errors.name && <p style={errStyle}>{errors.name}</p>}
            </div>

            <div>
              <label style={{ display: "block", color: "#9CA3AF", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                Work Email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                style={{ ...inputStyle, borderColor: errors.email ? "#EF4444" : "#1E1E2E" }}
              />
              {errors.email && <p style={errStyle}>{errors.email}</p>}
            </div>

            <div>
              <label style={{ display: "block", color: "#9CA3AF", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                Company
              </label>
              <input
                type="text"
                placeholder="Emtek / Sinemart / Agency name"
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                style={{ ...inputStyle, borderColor: errors.company ? "#EF4444" : "#1E1E2E" }}
              />
              {errors.company && <p style={errStyle}>{errors.company}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: "8px",
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                backgroundColor: "#00D4FF",
                color: "#0A0A0F",
                fontWeight: 700,
                fontSize: "15px",
                border: "none",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {submitting ? "Submitting..." : "Get Access →"}
            </button>
          </form>

          <p style={{
            marginTop: "16px", textAlign: "center",
            color: "#4B5563", fontSize: "11px", lineHeight: 1.5,
          }}>
            Your data is used only to contact you about this tool.
          </p>
        </div>
      </div>
    </div>
  );
}
