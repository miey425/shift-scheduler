import { AdminHeader } from "@/components/admin/AdminHeader";
import { PositionSkillCheckboxes } from "@/components/admin/PositionSkillCheckboxes";
import { StatusMessage } from "@/components/admin/StatusMessage";
import { getPositionSkillOptions } from "@/lib/shifts/shiftTemplates";
import { listEmployees } from "@/repositories/employeeRepository";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  setEmployeeActiveAction,
  updateEmployeeAction,
} from "./actions";

type EmployeesPageProps = {
  searchParams?: Promise<{
    created?: string;
    deleted?: string;
    updated?: string;
    error?: string;
  }>;
};

const employmentTypeLabels = {
  full_time: "正社員",
  part_time: "アルバイト",
  contract: "契約",
  temporary: "短期",
};

function FormCheckbox({
  defaultChecked,
  label,
  name,
  value,
}: {
  defaultChecked?: boolean;
  label: string;
  name: string;
  value?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-700">
      <input
        className="h-4 w-4 rounded border-slate-300 text-emerald-700"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
        value={value}
      />
      {label}
    </label>
  );
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const [employees, params] = await Promise.all([listEmployees(), searchParams]);
  const positionSkillOptions = getPositionSkillOptions();

  return (
    <main className="min-h-screen bg-slate-50">
      <AdminHeader currentPath="/admin/employees" title="従業員管理" />

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6">
        <details className="rounded-md border border-slate-200 bg-white">
          <summary className="cursor-pointer px-5 py-4 text-base font-semibold text-slate-950 marker:text-slate-500 focus-visible:outline-2 focus-visible:outline-slate-900">
            従業員を追加
          </summary>
          <form action={createEmployeeAction} className="space-y-4 border-t border-slate-200 p-5 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
            <input name="maxHoursPerDay" type="hidden" value="24" />
            <input name="maxHoursPerWeek" type="hidden" value="168" />
            <input name="minDaysPerPeriod" type="hidden" value="0" />
            <input name="maxDaysPerPeriod" type="hidden" value="31" />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">氏名</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" name="name" required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">表示名</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" name="displayName" required />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">雇用区分</span>
              <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" defaultValue="part_time" name="employmentType">
                <option value="part_time">アルバイト</option>
                <option value="full_time">正社員</option>
                <option value="contract">契約</option>
                <option value="temporary">短期</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">時給（平日・円）</span>
              <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" min="0" name="hourlyWage" required type="number" defaultValue="0" />
              <span className="mt-1 block text-xs text-slate-500">土日祝は自動で100円加算します。</span>
            </label>
            <div className="space-y-2">
              <FormCheckbox label="18歳未満・高校生" name="isHighSchoolStudent" />
            </div>
            <PositionSkillCheckboxes
              defaultCanClose={false}
              defaultCanOpen={false}
              defaultSelectedRoleLabels={[]}
              options={positionSkillOptions}
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">メモ</span>
              <textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2" name="memo" />
            </label>
            <button className="w-full self-end rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 sm:col-span-2" type="submit">
              追加
            </button>
          </form>
        </details>

        <section className="space-y-4">
          {params?.created ? <StatusMessage>従業員を追加しました。</StatusMessage> : null}
          {params?.updated ? <StatusMessage>従業員を更新しました。</StatusMessage> : null}
          {params?.deleted ? <StatusMessage>従業員を削除しました。</StatusMessage> : null}
          {params?.error ? <StatusMessage tone="error">入力内容またはDB接続を確認してください。</StatusMessage> : null}

          <div className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">従業員一覧 <span className="ml-1 text-sm font-normal text-slate-500">{employees.length}名</span></h2>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
              {employees.map((employee) => (
                <details className="group min-w-0 rounded-md border border-slate-200 bg-white open:col-span-full" key={employee.id}>
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 py-3 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-900 [&::-webkit-details-marker]:hidden">
                    <span className={`truncate font-medium ${employee.isActive ? "text-slate-900" : "text-slate-400"}`}>{employee.displayName}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {!employee.isActive ? <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">無効</span> : null}
                      <span aria-hidden="true" className="text-xs text-slate-400 group-open:rotate-180">⌄</span>
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">{employee.displayName} の詳細</h3>
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${employee.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {employee.isActive ? "有効" : "無効"}
                      </span>
                    </div>
                    <form action={updateEmployeeAction} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <input name="employeeId" type="hidden" value={employee.id} />
                  <input name="maxHoursPerDay" type="hidden" value={employee.maxHoursPerDay} />
                  <input name="maxHoursPerWeek" type="hidden" value={employee.maxHoursPerWeek} />
                  <input name="minDaysPerPeriod" type="hidden" value={employee.minDaysPerPeriod} />
                  <input name="maxDaysPerPeriod" type="hidden" value={employee.maxDaysPerPeriod} />
                  <label className="block text-xs text-slate-600">氏名<input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={employee.name} name="name" required /></label>
                  <label className="block text-xs text-slate-600">表示名<input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={employee.displayName} name="displayName" required /></label>
                  <label className="block text-xs text-slate-600">雇用区分<select className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={employee.employmentType} name="employmentType">
                      {Object.entries(employmentTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select></label>
                  <label className="block text-xs text-slate-600">時給（平日・円）<input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={employee.hourlyWage} min="0" name="hourlyWage" required type="number" /><span className="mt-1 block">土日祝は+100円</span></label>
                  <label className="block text-xs text-slate-600">メモ<input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm" defaultValue={employee.memo ?? ""} name="memo" /></label>
                  <div className="flex flex-wrap items-center gap-4 rounded-md bg-slate-50 p-3 sm:col-span-2 xl:col-span-3">
                    <FormCheckbox defaultChecked={employee.isHighSchoolStudent} label="18歳未満・高校生" name="isHighSchoolStudent" />
                  <PositionSkillCheckboxes
                    compact
                    defaultCanClose={employee.canClose}
                    defaultCanOpen={employee.canOpen}
                    defaultSelectedRoleLabels={employee.positionSkills}
                    options={positionSkillOptions}
                  />
                  </div>
                  <button className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 sm:col-span-2 xl:col-span-3" type="submit">変更を保存</button>
                    </form>
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      <form action={setEmployeeActiveAction}>
                        <input name="employeeId" type="hidden" value={employee.id} />
                        <input name="isActive" type="hidden" value={employee.isActive ? "false" : "true"} />
                        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" type="submit">{employee.isActive ? "無効化" : "有効化"}</button>
                      </form>
                      <form action={deleteEmployeeAction}>
                        <input name="employeeId" type="hidden" value={employee.id} />
                        <button className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50" type="submit">従業員を削除</button>
                      </form>
                      <p className="text-xs text-slate-500">削除すると、希望提出やシフト割当も削除されます。</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
