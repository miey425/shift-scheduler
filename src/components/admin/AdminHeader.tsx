import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

type AdminHeaderProps = {
  title: string;
  currentPath?: "/admin/dashboard" | "/admin/employees" | "/admin/shift-periods";
};

const navItems = [
  { href: "/admin/dashboard", label: "ダッシュボード" },
  { href: "/admin/employees", label: "従業員" },
  { href: "/admin/shift-periods", label: "シフト期間" },
] as const;

export function AdminHeader({ title, currentPath }: AdminHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">管理画面</p>
          <h1 className="mt-0.5 text-lg font-semibold text-slate-950">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  currentPath === item.href
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={logoutAction}>
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              type="submit"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
