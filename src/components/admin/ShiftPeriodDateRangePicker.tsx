"use client";

import { useState } from "react";

type ShiftPeriodDateRangePickerProps = {
  startDate: string;
  endDate: string;
  onSelectRange: (startDate: string, endDate: string) => void;
};

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function getMonthStart(date: string) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function formatDate(date: string) {
  return date.replaceAll("-", "/");
}

export function getInclusiveDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function CalendarMonth({
  month,
  startDate,
  endDate,
  onSelectDate,
}: {
  month: Date;
  startDate: string;
  endDate: string;
  onSelectDate: (date: string) => void;
}) {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const monthNumber = monthIndex + 1;
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7);

  return (
    <section aria-label={`${year}年${monthNumber}月`}>
      <h3 className="mb-3 text-center text-base font-semibold text-slate-900">
        {year}年{monthNumber}月
      </h3>
      <div aria-hidden="true" className="grid grid-cols-7 text-center text-sm text-slate-500">
        {weekdayLabels.map((label) => <span className="py-2" key={label}>{label}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: weekCount * 7 }, (_, cellIndex) => {
          const day = cellIndex - firstWeekday + 1;
          if (day < 1 || day > daysInMonth) {
            return <span aria-hidden="true" className="aspect-square min-h-12" key={`blank-${cellIndex}`} />;
          }

          const date = `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isStart = date === startDate;
          const isEnd = date === endDate;
          const isInRange = Boolean(startDate && endDate && date >= startDate && date <= endDate);
          const accessibleDate = `${year}年${monthNumber}月${day}日`;
          const selectionLabel = isStart ? "開始日" : isEnd ? "終了日" : isInRange ? "選択期間内" : "";

          return (
            <button
              aria-label={`${accessibleDate}${selectionLabel ? `、${selectionLabel}` : ""}`}
              aria-pressed={isStart || isEnd}
              className={`aspect-square min-h-12 w-full text-base transition-colors focus-visible:z-10 focus-visible:relative focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-slate-900 ${
                isStart || isEnd
                  ? "z-[1] rounded-full bg-slate-900 font-semibold text-white"
                  : isInRange
                    ? "rounded-none bg-slate-100 font-medium text-slate-900"
                    : "rounded-full text-slate-700 hover:bg-slate-100"
              }`}
              key={date}
              onClick={() => onSelectDate(date)}
              type="button"
            >
              {day}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ShiftPeriodDateRangePicker({
  startDate,
  endDate,
  onSelectRange,
}: ShiftPeriodDateRangePickerProps) {
  const initialDate = startDate || new Date().toISOString().slice(0, 10);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(initialDate));
  const selectedDays = startDate && endDate ? getInclusiveDays(startDate, endDate) : 0;

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth() + offset,
      1,
    )));
  }

  function selectDate(date: string) {
    if (!startDate || endDate) {
      onSelectRange(date, "");
      return;
    }

    if (date < startDate) {
      onSelectRange(date, "");
      return;
    }

    onSelectRange(startDate, date);
  }

  function selectShortcut(days: number) {
    if (startDate) {
      onSelectRange(startDate, addDays(startDate, days - 1));
    }
  }

  const nextMonth = new Date(Date.UTC(
    visibleMonth.getUTCFullYear(),
    visibleMonth.getUTCMonth() + 1,
    1,
  ));

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            aria-label="前月"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-slate-900"
            onClick={() => changeMonth(-1)}
            type="button"
          >
            前月
          </button>
          <span className="text-xs text-slate-500">日付を2回選んで期間を指定</span>
          <button
            aria-label="翌月"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-slate-900"
            onClick={() => changeMonth(1)}
            type="button"
          >
            翌月
          </button>
        </div>
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
          <CalendarMonth
            endDate={endDate}
            month={visibleMonth}
            onSelectDate={selectDate}
            startDate={startDate}
          />
          <div className="hidden lg:block">
            <CalendarMonth
              endDate={endDate}
              month={nextMonth}
              onSelectDate={selectDate}
              startDate={startDate}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!startDate}
          onClick={() => selectShortcut(7)}
          type="button"
        >
          1週間
        </button>
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!startDate}
          onClick={() => selectShortcut(14)}
          type="button"
        >
          2週間
        </button>
      </div>

      <div aria-live="polite" className="grid grid-cols-3 gap-2 rounded-md bg-slate-50 px-3 py-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">開始日</p>
          <p className="mt-1 font-medium text-slate-900">{startDate ? formatDate(startDate) : "未選択"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">終了日</p>
          <p className="mt-1 font-medium text-slate-900">{endDate ? formatDate(endDate) : "未選択"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">期間</p>
          <p className="mt-1 font-medium text-slate-900">{selectedDays ? `${selectedDays}日間` : "未確定"}</p>
        </div>
      </div>
      {startDate && !endDate ? (
        <p className="text-sm text-slate-600">終了日を選択してください。</p>
      ) : null}
    </div>
  );
}
