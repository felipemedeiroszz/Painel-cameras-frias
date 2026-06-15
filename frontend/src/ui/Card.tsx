import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  title,
  children,
  className
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-lg border bg-white/70 p-4 shadow-sm dark:bg-slate-900/40", className)}>
      {title ? <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</div> : null}
      {children}
    </div>
  );
}
