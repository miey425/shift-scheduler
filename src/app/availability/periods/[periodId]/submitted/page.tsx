import Link from "next/link";
import { notFound } from "next/navigation";
import { employeeIdSchema } from "@/lib/validators/employee";
import { shiftPeriodIdSchema } from "@/lib/validators/shift";
import { listActiveEmployees } from "@/repositories/employeeRepository";
import { findAvailabilitySubmission } from "@/repositories/availabilityRepository";
import { findShiftPeriodById } from "@/repositories/shiftPeriodRepository";

type SharedAvailabilitySubmittedPageProps = {
  params: Promise<{
    periodId: string;
  }>;
  searchParams?: Promise<{
    employeeId?: string;
  }>;
};

export default async function SharedAvailabilitySubmittedPage({
  params,
  searchParams,
}: SharedAvailabilitySubmittedPageProps) {
  const [{ periodId }, query] = await Promise.all([params, searchParams]);
  const parsedPeriodId = shiftPeriodIdSchema.safeParse(periodId);
  const parsedEmployeeId = employeeIdSchema.safeParse(query?.employeeId);

  if (!parsedPeriodId.success || !parsedEmployeeId.success) {
    notFound();
  }

  const [period, employees, submission] = await Promise.all([
    findShiftPeriodById(parsedPeriodId.data),
    listActiveEmployees(),
    findAvailabilitySubmission({
      employeeId: parsedEmployeeId.data,
      shiftPeriodId: parsedPeriodId.data,
    }),
  ]);
  const employee = employees.find((item) => item.id === parsedEmployeeId.data);

  if (!period || !employee || !submission?.submittedAt) {
    notFound();
  }

  const editUrl = `/availability/periods/${period.id}?employeeId=${encodeURIComponent(employee.id)}`;

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
            <p>名前: {employee.displayName}</p>
            <p>期間: {period.name}</p>
            <p>
              対象日: {period.startDate} から {period.endDate}
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
            href={editUrl}
          >
            提出内容を修正する
          </Link>
        </section>
      </div>
    </main>
  );
}
