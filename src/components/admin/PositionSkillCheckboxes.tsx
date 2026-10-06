"use client";

import { useMemo, useState } from "react";

type PositionSkillOption = {
  roleLabel: string;
};

type PositionSkillCheckboxesProps = {
  compact?: boolean;
  defaultCanClose?: boolean;
  defaultCanOpen?: boolean;
  defaultSelectedRoleLabels: string[];
  options: PositionSkillOption[];
};

function splitPositionSkillGroups(options: PositionSkillOption[]) {
  return [
    {
      label: "オープン",
      options: options.filter(
        (option) =>
          option.roleLabel !== "ホールラスト" && option.roleLabel !== "D洗い場",
      ),
    },
    {
      label: "ラスト",
      options: options.filter(
        (option) =>
          option.roleLabel === "ホールラスト" || option.roleLabel === "D洗い場",
      ),
    },
  ];
}

export function PositionSkillCheckboxes({
  compact = false,
  defaultCanClose = false,
  defaultCanOpen = false,
  defaultSelectedRoleLabels,
  options,
}: PositionSkillCheckboxesProps) {
  const [canOpen, setCanOpen] = useState(defaultCanOpen);
  const [canClose, setCanClose] = useState(defaultCanClose);
  const [selectedRoleLabels, setSelectedRoleLabels] = useState(
    () => new Set(defaultSelectedRoleLabels),
  );
  const positionSkillGroups = useMemo(
    () => splitPositionSkillGroups(options),
    [options],
  );
  const openRoleLabels = positionSkillGroups[0]?.options.map(
    (option) => option.roleLabel,
  ) ?? [];
  const closeRoleLabels = positionSkillGroups[1]?.options.map(
    (option) => option.roleLabel,
  ) ?? [];

  function toggleRoleLabel(roleLabel: string) {
    setSelectedRoleLabels((currentRoleLabels) => {
      const nextRoleLabels = new Set(currentRoleLabels);

      if (nextRoleLabels.has(roleLabel)) {
        nextRoleLabels.delete(roleLabel);
      } else {
        nextRoleLabels.add(roleLabel);
      }

      setCanOpen(openRoleLabels.some((openRoleLabel) => nextRoleLabels.has(openRoleLabel)));
      setCanClose(
        closeRoleLabels.some((closeRoleLabel) => nextRoleLabels.has(closeRoleLabel)),
      );

      return nextRoleLabels;
    });
  }

  function selectGroup(roleLabels: string[], groupLabel: string) {
    setSelectedRoleLabels((currentRoleLabels) => {
      const nextRoleLabels = new Set(currentRoleLabels);

      for (const roleLabel of roleLabels) {
        nextRoleLabels.add(roleLabel);
      }

      return nextRoleLabels;
    });

    if (groupLabel === "オープン") {
      setCanOpen(true);
    }

    if (groupLabel === "ラスト") {
      setCanClose(true);
    }
  }

  function clearGroup(roleLabels: string[], groupLabel: string) {
    setSelectedRoleLabels((currentRoleLabels) => {
      const nextRoleLabels = new Set(currentRoleLabels);

      for (const roleLabel of roleLabels) {
        nextRoleLabels.delete(roleLabel);
      }

      return nextRoleLabels;
    });

    if (groupLabel === "オープン") {
      setCanOpen(false);
    }

    if (groupLabel === "ラスト") {
      setCanClose(false);
    }
  }

  function toggleGroupByCheckbox(
    checked: boolean,
    roleLabels: string[],
    groupLabel: string,
  ) {
    if (checked) {
      selectGroup(roleLabels, groupLabel);
    } else {
      clearGroup(roleLabels, groupLabel);
    }
  }

  const checkboxGroups = (
    <div className="space-y-3">
      {canOpen ? <input name="canOpen" type="hidden" value="on" /> : null}
      {canClose ? <input name="canClose" type="hidden" value="on" /> : null}
      <div className="grid gap-2 border-b border-slate-200 pb-3">
        {[
          {
            label: "オープン",
            roleLabels: openRoleLabels,
            selected: canOpen,
            selectedText: "オープン系を選択中",
          },
          {
            label: "ラスト",
            roleLabels: closeRoleLabels,
            selected: canClose,
            selectedText: "ラスト系を選択中",
          },
        ].map((group) => {
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-2"
              key={group.label}
            >
              <label className="inline-flex items-center gap-2 whitespace-nowrap">
                <input
                  checked={group.selected}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                  onChange={(event) =>
                    toggleGroupByCheckbox(
                      event.target.checked,
                      group.roleLabels,
                      group.label,
                    )
                  }
                  type="checkbox"
                />
                <span className="text-sm font-medium text-slate-700">
                  {group.label}
                </span>
              </label>
              <p className="text-xs text-slate-500">
                {group.selected ? group.selectedText : "未選択"}
              </p>
            </div>
          );
        })}
      </div>
      {positionSkillGroups.map((group) => {
        return (
          <div key={group.label}>
            <p className="text-xs font-medium text-slate-500">{group.label}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {group.options.map((option) => (
                <label
                  className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-700"
                  key={option.roleLabel}
                >
                  <input
                    checked={selectedRoleLabels.has(option.roleLabel)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700"
                    name="positionSkills"
                    onChange={() => toggleRoleLabel(option.roleLabel)}
                    type="checkbox"
                    value={option.roleLabel}
                  />
                  {option.roleLabel}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <details className="rounded-md border border-slate-200 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          対応可能ポジション {selectedRoleLabels.size}件
        </summary>
        <div className="mt-3">{checkboxGroups}</div>
      </details>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-700">対応可能ポジション</p>
      <div className="mt-3">{checkboxGroups}</div>
    </div>
  );
}
