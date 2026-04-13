"use client";

interface WeightSliderProps {
  brandingWeight: number; // 0-1
  onChange: (brandingWeight: number, conversionWeight: number) => void;
}

export function WeightSlider({ brandingWeight, onChange }: WeightSliderProps) {
  const brandingPct = Math.round(brandingWeight * 100);
  const conversionPct = 100 - brandingPct;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onChange(val / 100, (100 - val) / 100);
  };

  const getBrandingColor = () => {
    if (brandingPct >= 70) return "#00D4FF";
    if (brandingPct >= 40) return "#8B9CF4";
    return "#F59E0B";
  };

  const getConversionColor = () => {
    if (conversionPct >= 70) return "#F59E0B";
    if (conversionPct >= 40) return "#8B9CF4";
    return "#00D4FF";
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: "#12121A",
        border: "1px solid #1E1E2E",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: "#E8EAF0" }}>
          Score Weights
        </span>
        <button
          onClick={() => onChange(0.5, 0.5)}
          className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
          style={{
            color: "#6B7280",
            border: "1px solid #1E1E2E",
          }}
        >
          Reset 50/50
        </button>
      </div>

      {/* Weight display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getBrandingColor() }}
          />
          <span className="text-xs" style={{ color: getBrandingColor() }}>
            Branding{" "}
            <span className="font-mono font-bold">{brandingPct}%</span>
          </span>
        </div>
        <span className="text-xs" style={{ color: "#374151" }}>/</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: getConversionColor() }}>
            Conversion{" "}
            <span className="font-mono font-bold">{conversionPct}%</span>
          </span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getConversionColor() }}
          />
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          value={brandingPct}
          onChange={handleChange}
          className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${getBrandingColor()} 0%, ${getBrandingColor()} ${brandingPct}%, ${getConversionColor()} ${brandingPct}%, ${getConversionColor()} 100%)`,
            accentColor: "#00D4FF",
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[9px] uppercase tracking-wider" style={{ color: "#374151" }}>
        <span>100% Branding</span>
        <span>Balanced</span>
        <span>100% Conversion</span>
      </div>
    </div>
  );
}
