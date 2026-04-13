"use client";

import { useEffect, useRef, useState } from "react";

interface ScoreBarProps {
  value: number; // 0-100
  color?: string;
  height?: number;
  showValue?: boolean;
  animate?: boolean;
  label?: string;
}

function getDefaultColor(value: number): string {
  if (value >= 75) return "#00D4FF";
  if (value >= 50) return "#10B981";
  if (value >= 25) return "#F59E0B";
  return "#EF4444";
}

export function ScoreBar({
  value,
  color,
  height = 4,
  showValue = true,
  animate = true,
  label,
}: ScoreBarProps) {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);
  const [barWidth, setBarWidth] = useState(animate ? 0 : value);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const duration = 600; // ms

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      setBarWidth(value);
      return;
    }

    const startValue = 0;
    const endValue = value;

    function step(timestamp: number) {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);

      setDisplayValue(current);
      setBarWidth(startValue + (endValue - startValue) * eased);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    }

    // Small delay so component is mounted before animation starts
    const timeout = setTimeout(() => {
      animationRef.current = requestAnimationFrame(step);
    }, 50);

    return () => {
      clearTimeout(timeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      startTimeRef.current = null;
    };
  }, [value, animate]);

  const barColor = color ?? getDefaultColor(value);

  return (
    <div className="flex flex-col gap-0.5 w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">{label}</span>
          )}
          {showValue && (
            <span
              className="text-xs font-mono font-semibold count-up-animate"
              style={{ color: barColor }}
            >
              {displayValue}
            </span>
          )}
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          height: `${height}px`,
          backgroundColor: "rgba(30, 30, 46, 0.8)",
        }}
      >
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${barWidth}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 6px ${barColor}60`,
          }}
        />
      </div>
    </div>
  );
}
