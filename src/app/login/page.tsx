import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (!error) {
    return null;
  }

  if (error === "InvalidInput") {
    return "メールアドレスとパスワードを確認してください。";
  }

  return "メールアドレスまたはパスワードが正しくありません。";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/admin/dashboard");
  }

  const params = await searchParams;
  const errorMessage = getErrorMessage(params?.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-6">
        <div className="mb-6">
          <p className="text-xs font-medium text-slate-500">管理者ログイン</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-950">
            シフト管理にログイン
          </h1>
        </div>

        {errorMessage ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              メールアドレス
            </span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">パスワード</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            type="submit"
          >
            ログイン
          </button>
        </form>
      </section>
    </main>
  );
}
