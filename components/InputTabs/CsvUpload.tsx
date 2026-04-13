"use client";

import { useCallback, useRef, useState } from "react";
import { parseCsvFile } from "@/lib/parsers/csv";
import { parseExcelFile } from "@/lib/parsers/excel";
import type { Creator } from "@/types/creator";
import type { PartnerCenterMeta } from "@/lib/parsers/csv";

interface CsvUploadProps {
  onParsed: (creators: Creator[]) => void;
}

type UploadState = "idle" | "dragging" | "parsing" | "done" | "error";

export function CsvUpload({ onParsed }: CsvUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [rowCount, setRowCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [unrecognized, setUnrecognized] = useState<string[]>([]);
  const [pcMeta, setPcMeta] = useState<PartnerCenterMeta | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setState("parsing");
      setFileName(file.name);
      setErrors([]);
      setUnrecognized([]);

      try {
        const isExcel =
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".xls") ||
          file.type.includes("spreadsheet");

        const result = isExcel
          ? await parseExcelFile(file)
          : await parseCsvFile(file);

        setRowCount(result.creators.length);
        setErrors(result.errors.slice(0, 5));
        setUnrecognized(result.matchStats.unrecognizedHeaders);
        setPcMeta(result.isPartnerCenter ? (result.partnerCenterMeta ?? null) : null);

        if (result.creators.length > 0) {
          setState("done");
          onParsed(result.creators);
        } else {
          setState("error");
          setErrors(["No valid rows found. Check column headers match the template."]);
        }
      } catch (e) {
        setState("error");
        setErrors([e instanceof Error ? e.message : "Unknown parse error"]);
      }
    },
    [onParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState("idle");
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setState("dragging");
  };

  const handleDragLeave = () => {
    setState("idle");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDownloadTemplate = (type: "branding" | "conversion") => {
    const url = `/templates/${type}-template.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-template.csv`;
    a.click();
  };

  const borderColor =
    state === "dragging"
      ? "#00D4FF"
      : state === "done"
      ? "#10B981"
      : state === "error"
      ? "#EF4444"
      : "#1E1E2E";

  return (
    <div className="space-y-3">
      {/* Template Downloads */}
      <div className="flex items-center gap-2 text-xs">
        <span style={{ color: "#6B7280" }}>Templates:</span>
        <button
          onClick={() => handleDownloadTemplate("branding")}
          className="px-2 py-1 rounded text-xs font-medium transition-colors"
          style={{
            backgroundColor: "rgba(0, 212, 255, 0.1)",
            color: "#00D4FF",
            border: "1px solid rgba(0, 212, 255, 0.3)",
          }}
        >
          ↓ Branding CSV
        </button>
        <button
          onClick={() => handleDownloadTemplate("conversion")}
          className="px-2 py-1 rounded text-xs font-medium transition-colors"
          style={{
            backgroundColor: "rgba(0, 212, 255, 0.1)",
            color: "#00D4FF",
            border: "1px solid rgba(0, 212, 255, 0.3)",
          }}
        >
          ↓ Conversion CSV
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className="relative flex flex-col items-center justify-center gap-3 rounded-lg cursor-pointer transition-all"
        style={{
          minHeight: "160px",
          border: `2px dashed ${borderColor}`,
          backgroundColor:
            state === "dragging" ? "rgba(0, 212, 255, 0.05)" : "rgba(18, 18, 26, 0.5)",
          transition: "border-color 0.2s, background-color 0.2s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />

        {state === "parsing" ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#00D4FF", borderTopColor: "transparent" }}
            />
            <span className="text-sm" style={{ color: "#6B7280" }}>
              Parsing {fileName}...
            </span>
          </div>
        ) : state === "done" ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl">✓</span>
            <span className="text-sm font-medium" style={{ color: "#10B981" }}>
              {rowCount} creators loaded
            </span>
            <span className="text-xs" style={{ color: "#6B7280" }}>
              {fileName}
            </span>
            {pcMeta && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full mt-0.5"
                style={{
                  backgroundColor: "rgba(99, 102, 241, 0.15)",
                  color: "#818CF8",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                }}
              >
                TikTok Partner Center · {pcMeta.totalRows} orders aggregated
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setState("idle");
                setFileName("");
                setRowCount(0);
                setPcMeta(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-xs mt-1"
              style={{ color: "#6B7280", textDecoration: "underline" }}
            >
              Upload different file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 text-center">
            <div className="text-3xl opacity-40">⬆</div>
            <span className="text-sm font-medium" style={{ color: "#E8EAF0" }}>
              Drop CSV or Excel here
            </span>
            <span className="text-xs text-center" style={{ color: "#6B7280" }}>
              .csv, .xlsx, .xls — up to 500 rows
            </span>
            <span className="text-[10px] text-center" style={{ color: "#4B5563" }}>
              Supports TikTok Partner Center exports &amp; Kalodata CSVs
            </span>
            <span
              className="text-xs px-3 py-1 rounded-full"
              style={{
                backgroundColor: "rgba(0, 212, 255, 0.1)",
                color: "#00D4FF",
                border: "1px solid rgba(0, 212, 255, 0.25)",
              }}
            >
              Click to browse
            </span>
          </div>
        )}
      </div>

      {/* Partner Center info panel */}
      {pcMeta && state === "done" && (
        <div
          className="rounded-lg p-3 space-y-1.5"
          style={{
            backgroundColor: "rgba(99, 102, 241, 0.06)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
          }}
        >
          <p className="text-xs font-semibold" style={{ color: "#818CF8" }}>
            🔗 TikTok Partner Center format detected
          </p>
          <div className="grid grid-cols-3 gap-2 text-[10px]" style={{ color: "#6B7280" }}>
            <div>
              <span style={{ color: "#E8EAF0", fontWeight: 600 }}>{pcMeta.totalRows}</span> order rows
            </div>
            <div>
              <span style={{ color: "#E8EAF0", fontWeight: 600 }}>{pcMeta.creatorCount}</span> creators
            </div>
            <div>
              Ref date: <span style={{ color: "#E8EAF0" }}>{pcMeta.referenceDate.toLocaleDateString()}</span>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: "#4B5563" }}>
            GMV aggregated into 30/60/90d windows · Livestream &amp; video counts computed automatically
          </p>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div
          className="rounded-lg p-3 space-y-1"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          {errors.map((err, i) => (
            <p key={i} className="text-xs" style={{ color: "#EF4444" }}>
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Unrecognized columns */}
      {unrecognized.length > 0 && (
        <div
          className="rounded-lg p-3"
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
          }}
        >
          <p className="text-xs mb-1" style={{ color: "#F59E0B" }}>
            {unrecognized.length} unrecognized columns (ignored):
          </p>
          <p className="text-xs font-mono" style={{ color: "#6B7280" }}>
            {unrecognized.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
