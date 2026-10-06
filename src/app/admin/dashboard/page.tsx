import Link from "next/link";
import { auth } from "@/auth";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-slate-50">
      <AdminHeader currentPath="/admin/dashboard" title="ダッシュボード" />

      <div className="mx-auto grid max-w-6xl gap-5 px-6 py-6 md:grid-cols-[1fr_280px]">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-950">
            フェーズ4の状態
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            従業員、シフト期間、固定シフト、希望提出URL、希望回収、手動割当、自動割当、Excel出力を管理できる状態です。
            自動割当は提出済みの希望と従業員条件を使い、未割当の枠を補完します。
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/admin/employees"
            >
              従業員管理
            </Link>
            <Link
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/admin/shift-periods"
            >
              シフト期間管理
            </Link>
            <Link
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href="/api/health/db"
            >
              DB接続確認API
            </Link>
          </div>
        </section>

        <aside className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-950">ログイン中</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">名前</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {session?.user?.name ?? "不明"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">メール</dt>
              <dd className="mt-1 break-all font-medium text-slate-900">
                {session?.user?.email ?? "不明"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">権限</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {session?.user?.role ?? "不明"}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
