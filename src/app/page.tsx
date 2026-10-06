import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
      <section className="space-y-3 border-b border-slate-200 pb-6">
        <p className="text-xs font-medium text-slate-500">Phase 4</p>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
          シフト管理アプリ
        </h1>
        <p className="max-w-2xl leading-7 text-slate-700">
          管理者ログイン、従業員管理、固定シフト作成、希望提出、手動割当、自動割当、Excel出力まで確認できます。
          自動割当は提出済みの希望と従業員条件を使って未割当の枠を補完します。
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          className="rounded-md border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
          href="/login"
        >
          <h2 className="font-medium text-slate-950">管理者ログイン</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            シードで作成した管理者アカウントを使って管理画面へ入れます。
          </p>
        </Link>
        <Link
          className="rounded-md border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
          href="/api/health/db"
        >
          <h2 className="font-medium text-slate-950">DB接続確認</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            `DATABASE_URL` を設定後、このAPIでNeonへの接続状態を確認できます。
          </p>
        </Link>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-950">次の作業</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            フェーズ5では自動割当の精度向上、祝日カレンダー、警告表示などを追加する想定です。
          </p>
        </div>
      </section>
    </main>
  );
}
