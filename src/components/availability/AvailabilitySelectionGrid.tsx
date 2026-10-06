"use client";

import { useState } from "react";

type AvailabilityStatus = "available" | "unavailable";

export type AvailabilitySelectionGroup = {
  formName: string;
  label: string;
  defaultStatus: AvailabilityStatus;
};

export type AvailabilitySelectionDay = {
  date: string;
  label: string;
  isHolidaySchedule: boolean;
  groups: AvailabilitySelectionGroup[];
};

type AvailabilitySelectionGridProps = {
  days: AvailabilitySelectionDay[];
};

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function getWeekStartKey(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());

  return date.toISOString().slice(0, 10);
}

function getDayOfWeek(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function buildCalendarWeeks(days: AvailabilitySelectionDay[]) {
  const weeksByStartDate = new Map<string, Array<AvailabilitySelectionDay | null>>();

  for (const day of days) {
    const weekStartKey = getWeekStartKey(day.date);
    const weekDays =
      weeksByStartDate.get(weekStartKey) ??
      Array.from<AvailabilitySelectionDay | null>({ length: 7 }).fill(null);

    weekDays[getDayOfWeek(day.date)] = day;
    weeksByStartDate.set(weekStartKey, weekDays);
  }

  return [...weeksByStartDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStartKey, weekDays]) => ({ weekStartKey, weekDays }));
}

function buildInitialStatuses(days: AvailabilitySelectionDay[]) {
  const statuses: Record<string, AvailabilityStatus> = {};

  for (const day of days) {
    for (const group of day.groups) {
      statuses[group.formName] = group.defaultStatus;
    }
  }

  return statuses;
}

export function AvailabilitySelectionGrid({
  days,
}: AvailabilitySelectionGridProps) {
  const [statuses, setStatuses] = useState(() => buildInitialStatuses(days));

  function toggleStatus(formName: string) {
    setStatuses((currentStatuses) => ({
      ...currentStatuses,
      [formName]:
        currentStatuses[formName] === "available"
          ? "unavailable"
          : "available",
    }));
  }

  return (
    <div className="space-y-4">
      {buildCalendarWeeks(days).map(({ weekStartKey, weekDays }) => (
        <div
          className="overflow-x-auto rounded-md border border-slate-200 bg-white"
          key={weekStartKey}
        >
          <div className="grid min-w-[720px] grid-cols-7 border-b border-slate-200 bg-slate-100">
            {weekdayLabels.map((label) => (
              <div
                className="border-r border-slate-200 px-3 py-1.5 text-center text-xs font-semibold text-slate-600 last:border-r-0"
                key={label}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid min-w-[720px] grid-cols-7 border-b border-slate-200 bg-slate-50">
            {weekDays.map((day, index) => (
              <div
                className="border-r border-slate-200 px-3 py-2 text-center last:border-r-0"
                key={day?.date ?? `${weekStartKey}-empty-header-${index}`}
              >
                {day ? (
                  <p
                    className={`text-sm font-semibold ${
                      day.isHolidaySchedule ? "text-red-600" : "text-slate-950"
                    }`}
                  >
                    {day.label}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="grid min-w-[720px] grid-cols-7">
            {weekDays.map((day, index) => (
              <div
                className="space-y-2 border-r border-slate-200 p-2 last:border-r-0"
                key={day?.date ?? `${weekStartKey}-empty-body-${index}`}
              >
                {day
                  ? day.groups.map((group) => {
                      const status =
                        statuses[group.formName] ?? group.defaultStatus;
                      const isAvailable = status === "available";

                      return (
                        <div key={group.formName}>
                          <input
                            name={group.formName}
                            type="hidden"
                            value={status}
                          />
                          <button
                            aria-pressed={isAvailable}
                            className={`h-14 w-full rounded-md border px-2 text-sm font-medium transition ${
                              isAvailable
                                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                            }`}
                            onClick={() => toggleStatus(group.formName)}
                            type="button"
                          >
                            <span className="block">{group.label}</span>
                            <span className="mt-1 block text-xs font-medium">
                              {isAvailable ? "入れる" : "入らない"}
                            </span>
                          </button>
                        </div>
                      );
                    })
                  : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
