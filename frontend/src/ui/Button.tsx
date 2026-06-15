import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
        className
      )}
      {...props}
    />
  );
}
