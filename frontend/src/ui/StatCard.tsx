import type { ReactNode } from "react";
import clsx from "clsx";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad";
  className?: string;
}) {
  const ring: Record<string, string> = {
    neutral: "ring-slate-200/70 dark:ring-slate-800/70",
    ok: "ring-emerald-200/70 dark:ring-emerald-500/20",
    warn: "ring-amber-200/70 dark:ring-amber-500/20",
    bad: "ring-rose-200/70 dark:ring-rose-500/20"
  };
  const glow: Record<string, string> = {
    neutral: "bg-white/70 dark:bg-slate-900/40",
    ok: "bg-white/70 dark:bg-emerald-500/5",
    warn: "bg-white/70 dark:bg-amber-500/5",
    bad: "bg-white/70 dark:bg-rose-500/5"
  };

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border bg-white/80 p-4 shadow-sm ring-1 backdrop-blur dark:border-slate-800",
        ring[tone],
        glow[tone],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {value}
          </div>
          {hint ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{hint}</div> : null}
        </div>
        {icon ? (
          <div className="rounded-lg border bg-white/70 p-2 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-slate-200/50 blur-2xl dark:bg-slate-700/30" />
    </div>
  );
}

