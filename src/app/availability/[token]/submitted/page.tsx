import Link from "next/link";
import { notFound } from "next/navigation";
import { employeeAccessTokenSchema } from "@/lib/validators/shift";
import { findAvailabilitySubmission } from "@/repositories/availabilityRepository";
import { findValidEmployeeAccessToken } from "@/repositories/employeeAccessTokenRepository";

type AvailabilitySubmittedPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function AvailabilitySubmittedPage({
  params,
}: AvailabilitySubmittedPageProps) {
  const { token } = await params;
  const parsedToken = employeeAccessTokenSchema.safeParse(token);

  if (!parsedToken.success) {
    notFound();
  }

  const accessToken = await findValidEmployeeAccessToken(parsedToken.data);

  if (!accessToken) {
    notFound();
  }

  const submission = await findAvailabilitySubmission({
    employeeId: accessToken.employeeId,
    shiftPeriodId: accessToken.shiftPeriodId,
  });

  if (!submission?.submittedAt) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-xl items-center">
        <section className="w-full rounded-md border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-emerald-700">
            希望シフトを送信しました
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-950">
            提出完了
          </h1>
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm leading-6 text-slate-700">
            <p>名前: {accessToken.employeeDisplayName}</p>
            <p>期間: {accessToken.periodName}</p>
            <p>
              対象日: {accessToken.periodStartDate} から{" "}
              {accessToken.periodEndDate}
            </p>
            <p>
              提出日時: {submission.submittedAt.toLocaleString("ja-JP")}
            </p>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            内容を変更したい場合は、もう一度提出すると前回の内容が上書きされます。
          </p>
          <Link
            className="mt-5 inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            href={`/availability/${parsedToken.data}`}
          >
            提出内容を修正する
          </Link>
        </section>
      </div>
    </main>
  );
}
