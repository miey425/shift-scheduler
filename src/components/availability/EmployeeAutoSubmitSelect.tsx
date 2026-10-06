"use client";

import { useFormStatus } from "react-dom";

type EmployeeOption = {
  id: string;
  displayName: string;
};

export function EmployeeAutoSubmitSelect({
  employees,
}: {
  employees: EmployeeOption[];
}) {
  const { pending } = useFormStatus();

  return (
    <div>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">従業員を選択</span>
        <select
          className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100"
          defaultValue=""
          disabled={pending}
          name="employeeId"
          onChange={(event) => {
            if (event.currentTarget.value) {
              event.currentTarget.form?.requestSubmit();
            }
          }}
          required
        >
          <option value="">選択してください</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.displayName}
            </option>
          ))}
        </select>
      </label>
      {pending ? (
        <p className="mt-2 text-sm text-slate-500" role="status">
          希望入力画面を開いています...
        </p>
      ) : null}
    </div>
  );
}
