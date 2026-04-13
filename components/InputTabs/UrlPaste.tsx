"use client";

import { useState } from "react";
import type { Creator } from "@/types/creator";
import { Platform } from "@/types/creator";

interface UrlPasteProps {
  onParsed: (creators: Creator[]) => void;
  onSwitchToManual?: (handle: string, platform: Platform) => void;
}

type UrlStatus = "idle" | "processing" | "success" | "error";

interface UrlEntry {
  url: string;
  status: UrlStatus;
  error?: string;
  creator?: Partial<Creator>;
}

export function UrlPaste({ onParsed, onSwitchToManual }: UrlPasteProps) {
  const [textarea, setTextarea] = useState("");
  const [entries, setEntries] = useState<UrlEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const detectPlatform = (url: string): Platform => {
    if (url.includes("tiktok.com")) return Platform.TikTok;
    if (url.includes("instagram.com")) return Platform.Instagram;
    if (url.includes("shopee")) return Platform.Shopee;
    return Platform.TikTok;
  };

  const extractHandle = (url: string): string => {
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      const parts = u.pathname.split("/").filter(Boolean);
      const handle = parts[0] || "unknown";
      return handle.replace(/^@/, "");
    } catch {
      return url.trim().replace(/^@/, "") || "unknown";
    }
  };

  const processUrls = async () => {
    const urls = textarea
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) return;

    setIsProcessing(true);
    const initialEntries: UrlEntry[] = urls.map((url) => ({
      url,
      status: "processing",
    }));
    setEntries(initialEntries);

    // Simulate processing — in production this would call a scraping API
    const processed: UrlEntry[] = [];
    const successCreators: Creator[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

      const platform = detectPlatform(url);
      const handle = extractHandle(url);
      const isValidUrl =
        url.includes("tiktok.com") ||
        url.includes("instagram.com") ||
        url.includes("shopee") ||
        url.startsWith("@") ||
        url.length > 3;

      if (isValidUrl) {
        const creator: Creator = {
          id: `url-${i}-${Date.now()}`,
          handle,
          platform,
          profileUrl: url.startsWith("http") ? url : undefined,
        };

        successCreators.push(creator);
        processed.push({ url, status: "success", creator });
      } else {
        processed.push({
          url,
          status: "error",
          error: "Could not parse URL or handle",
        });
      }

      setEntries([...initialEntries.slice(0, i), ...processed, ...initialEntries.slice(i + 1)]);
    }

    setIsProcessing(false);

    // If we have a manual handoff callback, don't queue empty creators —
    // just switch to Manual Entry so the user fills in real metrics.
    // If no handoff (standalone use), queue them directly.
    if (successCreators.length > 0 && !onSwitchToManual) {
      onParsed(successCreators);
    }
    // Auto-switch to manual for the first extracted handle
    if (successCreators.length === 1 && onSwitchToManual) {
      onSwitchToManual(successCreators[0].handle, successCreators[0].platform);
    }
  };

  const statusColor = (status: UrlStatus) => {
    switch (status) {
      case "processing":
        return "#6B7280";
      case "success":
        return "#10B981";
      case "error":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const statusIcon = (status: UrlStatus) => {
    switch (status) {
      case "processing":
        return "⟳";
      case "success":
        return "✓";
      case "error":
        return "✗";
      default:
        return "·";
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label
          className="block text-xs mb-1.5 uppercase tracking-wider"
          style={{ color: "#6B7280" }}
        >
          Paste profile URLs or handles (one per line)
        </label>
        <textarea
          value={textarea}
          onChange={(e) => setTextarea(e.target.value)}
          placeholder={`https://www.tiktok.com/@creatorhandle\nhttps://www.instagram.com/creator\n@another_creator`}
          rows={6}
          className="w-full rounded-lg resize-none font-mono text-xs"
          style={{
            backgroundColor: "#0A0A0F",
            border: "1px solid #1E1E2E",
            color: "#E8EAF0",
            padding: "10px 12px",
            outline: "none",
            lineHeight: "1.6",
          }}
        />
        <p className="text-[10px] mt-1" style={{ color: "#6B7280" }}>
          TikTok/Instagram don't allow scraping — handles are extracted and you fill in metrics manually. Click <strong style={{ color: "#00D4FF" }}>+ Add metrics →</strong> after extracting.
        </p>
      </div>

      <button
        onClick={processUrls}
        disabled={!textarea.trim() || isProcessing}
        className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: "#00D4FF",
          color: "#0A0A0F",
        }}
      >
        {isProcessing ? "Processing..." : "Extract Profiles"}
      </button>

      {/* Per-URL status */}
      {entries.length > 0 && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid #1E1E2E" }}
        >
          {entries.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 text-xs"
              style={{
                borderBottom: i < entries.length - 1 ? "1px solid #1E1E2E" : "none",
                backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}
            >
              <span
                className={`font-mono text-sm ${entry.status === "processing" ? "animate-spin" : ""}`}
                style={{ color: statusColor(entry.status), minWidth: "16px" }}
              >
                {statusIcon(entry.status)}
              </span>
              <span
                className="flex-1 truncate font-mono"
                style={{ color: "#9CA3AF" }}
              >
                {entry.url}
              </span>
              {entry.status === "success" && entry.creator && (
                <div className="flex items-center gap-2">
                  <span style={{ color: "#10B981" }}>
                    @{entry.creator.handle}
                  </span>
                  {onSwitchToManual && (
                    <button
                      onClick={() =>
                        onSwitchToManual(
                          entry.creator!.handle!,
                          entry.creator!.platform ?? Platform.TikTok
                        )
                      }
                      className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
                      style={{
                        backgroundColor: "rgba(0, 212, 255, 0.12)",
                        color: "#00D4FF",
                        border: "1px solid rgba(0, 212, 255, 0.3)",
                      }}
                    >
                      + Add metrics →
                    </button>
                  )}
                </div>
              )}
              {entry.status === "error" && (
                <span style={{ color: "#EF4444" }}>{entry.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
