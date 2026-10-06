"use client";

import { useFormStatus } from "react-dom";

type BusinessDaySettingSelectProps = {
  id: string;
  defaultValue: string;
};

export function BusinessDaySettingSelect({
  id,
  defaultValue,
}: BusinessDaySettingSelectProps) {
  const { pending } = useFormStatus();

  return (
    <>
      <select
        className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
        defaultValue={defaultValue}
        disabled={pending}
        id={id}
        name="setting"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="auto">自動</option>
        <option value="closed">定休日</option>
        <option value="21:00">21時まで</option>
        <option value="22:00">22時まで</option>
      </select>
      {pending ? (
        <span className="text-xs text-slate-500" role="status">保存中...</span>
      ) : null}
    </>
  );
}
