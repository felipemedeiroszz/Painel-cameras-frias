import type { ReactNode } from "react";
import clsx from "clsx";

export function Page({
  title,
  subtitle,
  actions,
  children
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Section({
  title,
  subtitle,
  children,
  className
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("space-y-3", className)}>
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        {subtitle ? <div className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

