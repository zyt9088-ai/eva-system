"use client";

import { Check, Loader2 } from "lucide-react";

interface UploadProgressBarProps {
  percent: number;
  /** Optional label shown next to the percentage (e.g. the file size). */
  hint?: string;
}

// Thin determinate bar used while attachments upload. Fills right-to-left with
// the page's RTL flow, and flips to a settled green state at 100%.
export function UploadProgressBar({ percent, hint }: UploadProgressBarProps) {
  const done = percent >= 100;

  return (
    <div className="w-full space-y-1">
      <div className="h-1.5 w-full rounded-full bg-gray-200/80 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${
            done
              ? "bg-emerald-500"
              : "bg-linear-to-l from-[#0D4435] to-[#C5A059] animate-pulse"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
        <span className={`flex items-center gap-1 ${done ? "text-emerald-600" : "text-[#0D4435]"}`}>
          {done ? (
            <>
              <Check size={11} /> تم الرفع
            </>
          ) : (
            <>
              <Loader2 size={11} className="animate-spin" /> جارِ الرفع {percent}%
            </>
          )}
        </span>
        {hint && <span className="text-gray-400 font-normal">{hint}</span>}
      </div>
    </div>
  );
}
