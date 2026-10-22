"use client";

import { useState } from "react";
import { assignEmployeeAction } from "@/app/admin/shift-periods/actions";

type EmployeeOption = {
  id: string;
  displayName: string;
};

type ShiftAssignmentPickerProps = {
  shiftPeriodId: string;
  shiftSlotId: string;
  selectedDate: string | null;
  employees: EmployeeOption[];
  initialSelectCount: number;
};

export function ShiftAssignmentPicker({
  shiftPeriodId,
  shiftSlotId,
  selectedDate,
  employees,
  initialSelectCount,
}: ShiftAssignmentPickerProps) {
  const [selectCount, setSelectCount] = useState(initialSelectCount);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  function updateSelection(index: number, employeeId: string) {
    setSelectedEmployeeIds((current) => {
      const next = [...current];
      next[index] = employeeId;
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {Array.from({ length: selectCount }, (_, index) => {
          const availableOptions = employees.filter((employee) =>
            !selectedEmployeeIds.some(
              (selectedId, selectedIndex) => selectedIndex !== index && selectedId === employee.id,
            ),
          );

          return (
            <form action={assignEmployeeAction} key={index}>
              <input name="shiftPeriodId" type="hidden" value={shiftPeriodId} />
              <input name="shiftSlotId" type="hidden" value={shiftSlotId} />
              <input name="selectorCount" type="hidden" value={selectCount} />
              {selectedDate ? (
                <input name="selectedDate" type="hidden" value={selectedDate} />
              ) : null}
              <select
                className="h-10 w-full min-w-0 rounded-md border border-slate-300 px-2 text-sm focus-visible:outline-2 focus-visible:outline-slate-900"
                name="employeeId"
                onChange={(event) => {
                  const employeeId = event.currentTarget.value;
                  updateSelection(index, employeeId);
                  if (employeeId) event.currentTarget.form?.requestSubmit();
                }}
                required
                value={selectedEmployeeIds[index] ?? ""}
              >
                <option value="">従業員を選択</option>
                {availableOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.displayName}
                  </option>
                ))}
              </select>
            </form>
          );
        })}
      </div>
      <button
        aria-label="従業員の選択欄を追加"
        className="inline-flex min-h-10 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-900"
        onClick={() => setSelectCount((count) => count + 1)}
        type="button"
      >
        <span aria-hidden="true" className="text-lg leading-none">＋</span>
        選択欄を追加
      </button>
    </div>
  );
}
