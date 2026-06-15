import type { ReactNode } from "react";
import clsx from "clsx";

export function Toolbar({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-wrap items-end gap-3 rounded-xl border bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-950/50 dark:ring-slate-800/50",
        className
      )}
    >
      {children}
    </div>
  );
}

