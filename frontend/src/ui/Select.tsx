import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
