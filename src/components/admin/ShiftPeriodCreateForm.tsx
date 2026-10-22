"use client";

import { useActionState, useState } from "react";
import {
  createShiftPeriodAction,
  type CreateShiftPeriodState,
} from "@/app/admin/shift-periods/actions";
import { ShiftPeriodDateRangePicker } from "@/components/admin/ShiftPeriodDateRangePicker";

const initialState: CreateShiftPeriodState = {
  error: null,
  values: {
    name: "",
    startDate: "",
    endDate: "",
    memo: "",
  },
};

function getPeriodName(startDate: string, endDate: string) {
  if (!startDate) return "";
  const format = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    return { year, label: `${month}月${day}日` };
  };
  const start = format(startDate);

  if (!endDate || startDate === endDate) {
    return `${start.year}年${start.label}`;
  }

  const end = format(endDate);
  const endLabel = end.year === start.year
    ? end.label
    : `${end.year}年${end.label}`;
  return `${start.year}年${start.label}〜${endLabel}`;
}

export function ShiftPeriodCreateForm() {
  const [state, formAction, isPending] = useActionState(
    createShiftPeriodAction,
    initialState,
  );

  return (
    <ShiftPeriodCreateFields
      action={formAction}
      error={state.error}
      initialValues={state.values}
      isPending={isPending}
      key={state.error ? JSON.stringify(state.values) : "initial"}
    />
  );
}

type ShiftPeriodCreateFieldsProps = {
  action: (formData: FormData) => void;
  error: string | null;
  initialValues: CreateShiftPeriodState["values"];
  isPending: boolean;
};

function ShiftPeriodCreateFields({
  action,
  error,
  initialValues,
  isPending,
}: ShiftPeriodCreateFieldsProps) {
  const [values, setValues] = useState(initialValues);
  const [isNameEdited, setIsNameEdited] = useState(
    Boolean(initialValues.name && initialValues.name !== getPeriodName(initialValues.startDate, initialValues.endDate)),
  );

  function updateValue(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  const validRange = Boolean(values.startDate && values.endDate) && values.startDate <= values.endDate;

  return (
    <form action={action} className="mt-5 space-y-4">
      <input name="status" type="hidden" value="open" />
      <label className="block">
        <span className="text-sm font-medium text-slate-700">期間名</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          name="name"
          onChange={(event) => {
            setIsNameEdited(true);
            updateValue("name", event.currentTarget.value);
          }}
          placeholder="日付を選ぶと自動入力されます"
          required
          value={values.name}
        />
      </label>
      <input name="startDate" type="hidden" value={values.startDate} />
      <input name="endDate" type="hidden" value={values.endDate} />
      <ShiftPeriodDateRangePicker
        endDate={values.endDate}
        onSelectRange={(startDate, endDate) => {
          setValues((current) => ({
            ...current,
            startDate,
            endDate,
            name: isNameEdited ? current.name : getPeriodName(startDate, endDate),
          }));
        }}
        startDate={values.startDate}
      />
      <p className="text-sm text-slate-600">提出期限は終了日の翌日0:00に設定し、その時刻に自動で受付を締め切ります。</p>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">メモ</span>
        <textarea
          className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
          name="memo"
          onChange={(event) => updateValue("memo", event.currentTarget.value)}
          value={values.memo}
        />
      </label>
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
        disabled={isPending || !validRange}
        type="submit"
      >
        {isPending ? "作成中..." : "作成"}
      </button>
    </form>
  );
}
