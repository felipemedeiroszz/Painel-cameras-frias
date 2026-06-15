import clsx from "clsx";

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
    warn: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    bad: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

