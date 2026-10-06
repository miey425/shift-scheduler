type ExportPeriod = {
  startDate: string;
  endDate: string;
};

export function buildShiftExportBaseName(period: ExportPeriod) {
  return `shift_${period.startDate.replaceAll("-", "")}_${period.endDate.replaceAll("-", "")}`;
}
