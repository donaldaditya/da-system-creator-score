"use client";

import { useState } from "react";
import { CsvUpload } from "./CsvUpload";
import { ManualEntry } from "./ManualEntry";
import { UrlPaste } from "./UrlPaste";
import type { Creator } from "@/types/creator";
import { Platform } from "@/types/creator";

interface InputTabsProps {
  onCreatorsParsed: (creators: Creator[]) => void;
  creatorCount: number;
}

type Tab = "csv" | "manual" | "url";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "csv", label: "Upload CSV / Excel", icon: "⬆" },
  { id: "manual", label: "Manual Entry", icon: "✏" },
  { id: "url", label: "Paste URLs", icon: "🔗" },
];

export function InputTabs({ onCreatorsParsed, creatorCount }: InputTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("csv");
  const [prefillHandle, setPrefillHandle] = useState<string>("");
  const [prefillPlatform, setPrefillPlatform] = useState<Platform>(Platform.TikTok);

  const handleSwitchToManual = (handle: string, platform: Platform) => {
    setPrefillHandle(handle);
    setPrefillPlatform(platform);
    setActiveTab("manual");
  };

  const handleManualParsed = (creators: Creator[]) => {
    onCreatorsParsed(creators);
    // Clear prefill after use
    setPrefillHandle("");
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "#12121A",
        border: "1px solid #1E1E2E",
      }}
    >
      {/* Tab Headers */}
      <div
        className="flex"
        style={{ borderBottom: "1px solid #1E1E2E" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === tab.id ? "rgba(0, 212, 255, 0.08)" : "transparent",
              color: activeTab === tab.id ? "#00D4FF" : "#6B7280",
              borderBottom: activeTab === tab.id ? "2px solid #00D4FF" : "2px solid transparent",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "csv" && (
          <CsvUpload onParsed={onCreatorsParsed} />
        )}
        {activeTab === "manual" && (
          <ManualEntry
            onParsed={handleManualParsed}
            prefillHandle={prefillHandle}
            prefillPlatform={prefillHandle ? prefillPlatform : undefined}
          />
        )}
        {activeTab === "url" && (
          <UrlPaste
            onParsed={onCreatorsParsed}
            onSwitchToManual={handleSwitchToManual}
          />
        )}
      </div>

      {/* Creator count badge */}
      {creatorCount > 0 && (
        <div
          className="px-4 py-2 flex items-center gap-2 text-xs"
          style={{ borderTop: "1px solid #1E1E2E" }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "#10B981" }}
          />
          <span style={{ color: "#6B7280" }}>
            <span style={{ color: "#10B981", fontWeight: 600 }}>{creatorCount}</span>{" "}
            creator{creatorCount !== 1 ? "s" : ""} queued for scoring
          </span>
        </div>
      )}
    </div>
  );
}
