import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../ui/Button";
import { useRealtime } from "../realtime/useRealtime";
import { useEffect, useState } from "react";
import { GlobalAlert } from "../components/GlobalAlert";

function Icon({
  name,
  className
}: {
  name: "dashboard" | "stores" | "cameras" | "device" | "settings" | "moon" | "sun";
  className?: string;
}) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  if (name === "dashboard") {
    return (
      <svg {...common}>
        <path
          d="M4 13.5V6.5C4 5.4 4.9 4.5 6 4.5H10C11.1 4.5 12 5.4 12 6.5V13.5C12 14.6 11.1 15.5 10 15.5H6C4.9 15.5 4 14.6 4 13.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 17.5V10.5C12 9.4 12.9 8.5 14 8.5H18C19.1 8.5 20 9.4 20 10.5V17.5C20 18.6 19.1 19.5 18 19.5H14C12.9 19.5 12 18.6 12 17.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (name === "stores") {
    return (
      <svg {...common}>
        <path
          d="M4 8.5L6 4.5H18L20 8.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 8.5V19.5H19V8.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M9 19.5V13.5H15V19.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "cameras") {
    return (
      <svg {...common}>
        <path
          d="M4.5 9.5C4.5 8.4 5.4 7.5 6.5 7.5H14.5C15.6 7.5 16.5 8.4 16.5 9.5V15.5C16.5 16.6 15.6 17.5 14.5 17.5H6.5C5.4 17.5 4.5 16.6 4.5 15.5V9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M16.5 10.5L19.5 9V16L16.5 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.5 12.5H11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "device") {
    return (
      <svg {...common}>
        <path
          d="M8 4.5H16C17.1 4.5 18 5.4 18 6.5V17.5C18 18.6 17.1 19.5 16 19.5H8C6.9 19.5 6 18.6 6 17.5V6.5C6 5.4 6.9 4.5 8 4.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M10 16.5H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg {...common}>
        <path
          d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19.5 12C19.5 12.6 19.1 13.1 18.5 13.2L17.6 13.4C17.4 14 17.1 14.5 16.8 15L17.3 15.8C17.6 16.3 17.5 17 17 17.3L15.3 18.4C14.8 18.7 14.1 18.6 13.8 18.1L13.3 17.3C12.9 17.4 12.4 17.5 12 17.5C11.6 17.5 11.1 17.4 10.7 17.3L10.2 18.1C9.9 18.6 9.2 18.7 8.7 18.4L7 17.3C6.5 17 6.4 16.3 6.7 15.8L7.2 15C6.9 14.5 6.6 14 6.4 13.4L5.5 13.2C4.9 13.1 4.5 12.6 4.5 12C4.5 11.4 4.9 10.9 5.5 10.8L6.4 10.6C6.6 10 6.9 9.5 7.2 9L6.7 8.2C6.4 7.7 6.5 7 7 6.7L8.7 5.6C9.2 5.3 9.9 5.4 10.2 5.9L10.7 6.7C11.1 6.6 11.6 6.5 12 6.5C12.4 6.5 12.9 6.6 13.3 6.7L13.8 5.9C14.1 5.4 14.8 5.3 15.3 5.6L17 6.7C17.5 7 17.6 7.7 17.3 8.2L16.8 9C17.1 9.5 17.4 10 17.6 10.6L18.5 10.8C19.1 10.9 19.5 11.4 19.5 12Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "sun") {
    return (
      <svg {...common}>
        <path
          d="M12 16.5C14.485 16.5 16.5 14.485 16.5 12C16.5 9.515 14.485 7.5 12 7.5C9.515 7.5 7.5 9.515 7.5 12C7.5 14.485 9.515 16.5 12 16.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M12 3.5V5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 18.5V20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M3.5 12H5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M18.5 12H20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5.4 5.4L6.8 6.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17.2 17.2L18.6 18.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M18.6 5.4L17.2 6.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6.8 17.2L5.4 18.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path
        d="M21 14.5C19.9 16.2 17.9 17.5 15.5 17.5C12.2 17.5 9.5 14.8 9.5 11.5C9.5 9.1 10.8 7.1 12.5 6C12.2 7 12.1 8.2 12.4 9.4C13 12 15.1 14 17.6 14.6C18.8 14.9 20 14.8 21 14.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AppLayout() {
  const { logout, email, lojaId } = useAuth();
  useRealtime();
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("sensor:theme") !== "light";
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("sensor:sidebarCollapsed") === "true";
  });
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sensor:theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sensor:theme", "light");
    }
  }, [dark]);
  useEffect(() => {
    localStorage.setItem("sensor:sidebarCollapsed", collapsed ? "true" : "false");
  }, [collapsed]);

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-950">
      <div
        className={clsx(
          "mx-auto grid max-w-7xl grid-cols-1 transition-[grid-template-columns]",
          collapsed ? "md:grid-cols-[88px_1fr]" : "md:grid-cols-[280px_1fr]"
        )}
      >
        <aside className="relative border-b bg-white/70 p-3 backdrop-blur md:min-h-full md:border-b-0 md:border-r dark:bg-slate-950/60">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_45%)] dark:bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.12),transparent_45%)]" />

          <NavLink to="/dashboard" className="relative flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
              <span className="text-sm font-black tracking-tight">PC</span>
            </div>
            {!collapsed ? (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                Painel Câmaras
              </div>
              <div className="truncate text-xs text-slate-600 dark:text-slate-400">
                Monitoramento & Eventos
              </div>
            </div>
            ) : null}
            <button
              className="ml-auto hidden rounded-lg border bg-white px-2 py-1 text-xs text-slate-800 shadow-sm hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 md:inline-flex"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
              type="button"
            >
              {collapsed ? "»" : "«"}
            </button>
          </NavLink>

          <nav className="relative mt-5 space-y-1">
            <SideLink to="/dashboard" label="Dashboard" icon={<Icon name="dashboard" className="h-5 w-5" />} collapsed={collapsed} />
            <SideLink to="/lojas" label="Lojas" icon={<Icon name="stores" className="h-5 w-5" />} collapsed={collapsed} />
            <SideLink to="/dispositivos" label="Dispositivos" icon={<Icon name="device" className="h-5 w-5" />} collapsed={collapsed} />
            <SideLink to="/dispositivos/novo" label="Novo dispositivo" icon={<Icon name="device" className="h-5 w-5" />} collapsed={collapsed} />
            <SideLink to="/configuracao" label="Configuração" icon={<Icon name="settings" className="h-5 w-5" />} collapsed={collapsed} />
          </nav>

          <div className="relative mt-6 space-y-2">
            <div className="rounded-xl border bg-white/70 p-3 dark:bg-slate-950/40">
              <div className="flex items-center justify-between gap-2">
                {!collapsed ? (
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-600 dark:text-slate-400">Conta</div>
                    <div className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                      {email ?? "—"}
                    </div>
                    <div className="truncate text-xs text-slate-600 dark:text-slate-400">
                      {lojaId ? `Loja ${lojaId}` : "Admin"}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Conta</div>
                )}
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white text-slate-800 shadow-sm hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                  onClick={() => setDark((v) => !v)}
                  aria-label="Alternar tema"
                  type="button"
                >
                  <Icon name={dark ? "moon" : "sun"} className="h-5 w-5" />
                </button>
              </div>
            </div>
            <Button onClick={logout} className="w-full">
              Sair
            </Button>
          </div>
        </aside>

        <main className="px-4 py-5">
          <div className="mx-auto w-full max-w-5xl">
            <GlobalAlert />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SideLink({ to, label, icon, collapsed }: { to: string; label: string; icon: React.ReactNode; collapsed?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
          isActive
            ? "border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-950 dark:hover:text-slate-100"
        ].join(" ")
      }
    >
      <span className="text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100">
        {icon}
      </span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-ok-500 opacity-0 group-aria-[current=page]:opacity-100" />
    </NavLink>
  );
}
