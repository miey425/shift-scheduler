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

      <div className="mx-auto grid max-w-6xl gap-5 px-6 py-6 lg:grid-cols-[340px_1fr]">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-950">従業員を追加</h2>
          <form action={createEmployeeAction} className="mt-5 space-y-4">
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
            <button className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700" type="submit">
              追加
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {params?.created ? <StatusMessage>従業員を追加しました。</StatusMessage> : null}
          {params?.updated ? <StatusMessage>従業員を更新しました。</StatusMessage> : null}
          {params?.deleted ? <StatusMessage>従業員を削除しました。</StatusMessage> : null}
          {params?.error ? <StatusMessage tone="error">入力内容またはDB接続を確認してください。</StatusMessage> : null}

          <div className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">従業員一覧</h2>
            </div>
            <div className="divide-y divide-slate-200">
              {employees.map((employee) => (
                <form action={updateEmployeeAction} className="grid gap-2 px-5 py-3 hover:bg-slate-50 xl:grid-cols-[minmax(320px,1fr)_150px_130px]" key={employee.id}>
                  <input name="employeeId" type="hidden" value={employee.id} />
                  <input name="maxHoursPerDay" type="hidden" value={employee.maxHoursPerDay} />
                  <input name="maxHoursPerWeek" type="hidden" value={employee.maxHoursPerWeek} />
                  <input name="minDaysPerPeriod" type="hidden" value={employee.minDaysPerPeriod} />
                  <input name="maxDaysPerPeriod" type="hidden" value={employee.maxDaysPerPeriod} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className="h-8 rounded-md border border-slate-300 px-2 text-sm" defaultValue={employee.name} name="name" />
                    <input className="h-8 rounded-md border border-slate-300 px-2 text-sm" defaultValue={employee.displayName} name="displayName" />
                    <select className="h-8 rounded-md border border-slate-300 px-2 text-sm" defaultValue={employee.employmentType} name="employmentType">
                      {Object.entries(employmentTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input className="h-8 rounded-md border border-slate-300 px-2 text-sm" defaultValue={employee.memo ?? ""} name="memo" placeholder="メモ" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <FormCheckbox defaultChecked={employee.isHighSchoolStudent} label="18歳未満・高校生" name="isHighSchoolStudent" />
                  </div>
                  <PositionSkillCheckboxes
                    compact
                    defaultCanClose={employee.canClose}
                    defaultCanOpen={employee.canOpen}
                    defaultSelectedRoleLabels={employee.positionSkills}
                    options={positionSkillOptions}
                  />
                  <div className="flex flex-col gap-2">
                    <span className={`rounded-md px-2 py-1 text-center text-xs font-medium ${employee.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {employee.isActive ? "有効" : "無効"}
                    </span>
                    <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700" type="submit">
                      保存
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-950">有効/無効</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {employees.map((employee) => (
                <form action={setEmployeeActiveAction} key={employee.id}>
                  <input name="employeeId" type="hidden" value={employee.id} />
                  <input name="isActive" type="hidden" value={employee.isActive ? "false" : "true"} />
                  <button className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100" type="submit">
                    {employee.displayName}: {employee.isActive ? "無効化" : "有効化"}
                  </button>
                </form>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-red-200 bg-white p-5">
            <h2 className="text-base font-semibold text-red-700">従業員を削除</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              削除すると、この従業員に紐づく希望提出、専用URLトークン、シフト割当も削除されます。
              一時的に使わないだけなら、削除ではなく無効化を使ってください。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {employees.map((employee) => (
                <form action={deleteEmployeeAction} key={employee.id}>
                  <input name="employeeId" type="hidden" value={employee.id} />
                  <button className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50" type="submit">
                    {employee.displayName}を削除
                  </button>
                </form>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
