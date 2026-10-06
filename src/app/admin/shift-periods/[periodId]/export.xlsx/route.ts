import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { buildShiftExportBaseName } from "@/lib/shifts/shiftExportFileName";
import { compareShiftSlots } from "@/lib/shifts/shiftSlotSorting";
import { shiftPeriodIdSchema } from "@/lib/validators/shift";
import { listAssignmentsByShiftPeriodId } from "@/repositories/assignmentRepository";
import {
  findShiftPeriodById,
  listShiftSlotsByPeriodId,
} from "@/repositories/shiftPeriodRepository";

type RouteContext = {
  params: Promise<{
    periodId: string;
  }>;
};

type ShiftSlot = Awaited<ReturnType<typeof listShiftSlotsByPeriodId>>[number];
type ShiftAssignment = Awaited<
  ReturnType<typeof listAssignmentsByShiftPeriodId>
>[number];

type SectionDefinition = {
  key: string;
  positions: string[];
};

type SheetCell = {
  value?: string;
  style: number;
};

type ZipEntry = {
  path: string;
  data: Uint8Array;
};

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
const scheduleStartMinutes = 8 * 60;
const scheduleEndMinutes = 23 * 60;
const textEncoder = new TextEncoder();

const styles = {
  normal: 1,
  header: 2,
  noBorder: 3,
  title: 4,
  name: 5,
  planned: 6,
  work: 7,
  break: 8,
  unavailable: 9,
} as const;

const sectionDefinitions: SectionDefinition[] = [
  {
    key: "lunch_hall",
    positions: ["ホールA", "ホールB", "ホールC", "", "店長"],
  },
  {
    key: "lunch_kitchen",
    positions: ["肉", "寿司", "サラダ", "スープ", "フリー"],
  },
  {
    key: "dinner_hall",
    positions: ["ホールDA", "ホールラスト", "ホールDC", "", "店長"],
  },
  {
    key: "dinner_kitchen",
    positions: ["キッチンDA", "キッチンDB", "キッチンDC", "キッチンDD", "D洗い場"],
  },
];

const crcTable = new Uint32Array(256);

for (let i = 0; i < 256; i += 1) {
  let value = i;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  crcTable[i] = value >>> 0;
}

function escapeXml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDateTitle(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return `${month}月${day}日（${weekdayLabels[dayOfWeek]}）`;
}

function formatTime(time?: string | null) {
  return time ? time.slice(0, 5) : "";
}

function parseTimeToMinutes(time?: string | null) {
  if (!time) {
    return null;
  }

  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function formatPlannedTime(slot?: ShiftSlot) {
  if (!slot) {
    return "";
  }

  const breakStart = formatTime(slot.breakStartTime);
  const breakEnd = formatTime(slot.breakEndTime);
  const breakText =
    breakStart && breakEnd ? `\n休憩 ${breakStart}-${breakEnd}` : "";

  return `${formatTime(slot.startTime)}-${formatTime(slot.endTime)}${breakText}`;
}

function isLunchSlot(slot: ShiftSlot) {
  return slot.presetGroup === "weekday_lunch" || slot.presetGroup === "holiday_lunch";
}

function getSectionKey(slot: ShiftSlot) {
  const roleLabel = slot.roleLabel ?? "";

  if (isLunchSlot(slot)) {
    return roleLabel.startsWith("ホール") ? "lunch_hall" : "lunch_kitchen";
  }

  return roleLabel.startsWith("ホール") ? "dinner_hall" : "dinner_kitchen";
}

function buildAssignmentsBySlotId(assignments: ShiftAssignment[]) {
  const assignmentsBySlotId = new Map<string, ShiftAssignment[]>();

  for (const assignment of assignments) {
    const slotAssignments = assignmentsBySlotId.get(assignment.shiftSlotId) ?? [];
    slotAssignments.push(assignment);
    assignmentsBySlotId.set(assignment.shiftSlotId, slotAssignments);
  }

  return assignmentsBySlotId;
}

function buildSlotMap(slots: ShiftSlot[]) {
  const slotsByKey = new Map<string, ShiftSlot>();

  for (const slot of [...slots].sort(compareShiftSlots)) {
    const sectionKey = getSectionKey(slot);
    const key = `${slot.workDate}|${sectionKey}|${slot.roleLabel ?? ""}`;

    if (!slotsByKey.has(key)) {
      slotsByKey.set(key, slot);
    }
  }

  return slotsByKey;
}

function buildTimeHeaderCells() {
  const cells: SheetCell[] = [];

  for (
    let minutes = scheduleStartMinutes;
    minutes <= scheduleEndMinutes;
    minutes += 30
  ) {
    const hours = Math.floor(minutes / 60);
    const currentMinutes = minutes % 60;

    cells.push({
      style: styles.header,
      value: currentMinutes === 0 ? `${hours}:00` : "",
    });
  }

  return cells;
}

function buildTimeGridCells(slot?: ShiftSlot) {
  const startMinutes = parseTimeToMinutes(slot?.startTime);
  const endMinutes = parseTimeToMinutes(slot?.endTime);
  const breakStartMinutes = parseTimeToMinutes(slot?.breakStartTime);
  const breakEndMinutes = parseTimeToMinutes(slot?.breakEndTime);
  const cells: SheetCell[] = [];

  for (
    let minutes = scheduleStartMinutes;
    minutes <= scheduleEndMinutes;
    minutes += 30
  ) {
    const isWorkTime =
      startMinutes !== null &&
      endMinutes !== null &&
      startMinutes <= minutes &&
      minutes < endMinutes;
    const isBreakTime =
      breakStartMinutes !== null &&
      breakEndMinutes !== null &&
      breakStartMinutes <= minutes &&
      minutes < breakEndMinutes;

    if (isWorkTime && isBreakTime) {
      cells.push({ style: styles.break, value: "" });
    } else if (isWorkTime) {
      cells.push({ style: styles.work, value: "" });
    } else {
      cells.push({ style: styles.normal, value: "" });
    }
  }

  return cells;
}

function buildScheduleHeaderRow() {
  return [
    { style: styles.noBorder, value: "" },
    { style: styles.header, value: "氏名" },
    { style: styles.header, value: "ポジション" },
    { style: styles.header, value: "予定時間" },
    { style: styles.header, value: "出勤" },
    { style: styles.header, value: "退勤" },
    ...buildTimeHeaderCells(),
  ];
}

function buildScheduleRow(input: {
  assignmentsBySlotId: Map<string, ShiftAssignment[]>;
  date: string;
  position: string;
  section: SectionDefinition;
  slotsByKey: Map<string, ShiftSlot>;
}) {
  const slot = input.slotsByKey.get(
    `${input.date}|${input.section.key}|${input.position}`,
  );
  const slotAssignments = slot
    ? (input.assignmentsBySlotId.get(slot.id) ?? [])
    : [];
  const hasMissingAssignment = slot
    ? slotAssignments.length < slot.requiredEmployees
    : false;
  const warningStyle = hasMissingAssignment ? styles.unavailable : styles.normal;
  const names = slotAssignments
    .map((assignment) => assignment.employeeDisplayName)
    .join(" / ");

  return [
    { style: styles.noBorder, value: "" },
    { style: styles.name, value: names },
    { style: warningStyle, value: input.position },
    {
      style: hasMissingAssignment ? styles.unavailable : styles.planned,
      value: formatPlannedTime(slot),
    },
    { style: warningStyle, value: formatTime(slot?.startTime) },
    { style: warningStyle, value: formatTime(slot?.endTime) },
    ...buildTimeGridCells(slot),
  ];
}

function buildSheetRows(
  slots: ShiftSlot[],
  assignments: ShiftAssignment[],
) {
  const slotsByKey = buildSlotMap(slots);
  const assignmentsBySlotId = buildAssignmentsBySlotId(assignments);
  const dates = Array.from(new Set(slots.map((slot) => slot.workDate))).sort();
  const rows: SheetCell[][] = [];
  const mergeRefs: string[] = [];
  const pageBreakRows: number[] = [];

  dates.forEach((date, dateIndex) => {
    const titleRowNumber = rows.length + 1;
    rows.push([
      { style: styles.noBorder, value: "" },
      { style: styles.title, value: formatDateTitle(date) },
      ...Array.from({ length: 35 }, () => ({
        style: styles.noBorder,
        value: "",
      })),
    ]);
    mergeRefs.push(`B${titleRowNumber}:F${titleRowNumber}`);

    for (const section of sectionDefinitions) {
      rows.push(buildScheduleHeaderRow());

      for (const position of section.positions) {
        rows.push(
          buildScheduleRow({
            assignmentsBySlotId,
            date,
            position,
            section,
            slotsByKey,
          }),
        );
      }
    }

    rows.push(
      Array.from({ length: 37 }, () => ({
        style: styles.noBorder,
        value: "",
      })),
    );
    if (dateIndex < dates.length - 1) {
      pageBreakRows.push(rows.length);
    }
  });

  return {
    rows,
    mergeRefs,
    pageBreakRows,
    verticalPageCount: Math.max(1, dates.length),
  };
}

function columnName(index: number) {
  let value = index;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function toSheetCellXml(cell: SheetCell, rowIndex: number, columnIndex: number) {
  const ref = `${columnName(columnIndex)}${rowIndex}`;

  if (!cell.value) {
    return `<c r="${ref}" s="${cell.style}"/>`;
  }

  return `<c r="${ref}" s="${cell.style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
    cell.value,
  )}</t></is></c>`;
}

function toWorksheetXml(
  rows: SheetCell[][],
  mergeRefs: string[],
  pageBreakRows: number[],
  verticalPageCount: number,
) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const height = row.every((cell) => cell.style === styles.noBorder) ? 18 : 28;
      const cells = row
        .map((cell, columnIndex) =>
          toSheetCellXml(cell, rowNumber, columnIndex + 1),
        )
        .join("");

      return `<row r="${rowNumber}" ht="${height}" customHeight="1">${cells}</row>`;
    })
    .join("");
  const mergeXml =
    mergeRefs.length > 0
      ? `<mergeCells count="${mergeRefs.length}">${mergeRefs
          .map((ref) => `<mergeCell ref="${ref}"/>`)
          .join("")}</mergeCells>`
      : "";
  const rowBreaksXml =
    pageBreakRows.length > 0
      ? `<rowBreaks count="${pageBreakRows.length}" manualBreakCount="${pageBreakRows.length}">${pageBreakRows
          .map((rowNumber) => `<brk id="${rowNumber}" max="16383" man="1"/>`)
          .join("")}</rowBreaks>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr>
    <pageSetUpPr fitToPage="1"/>
  </sheetPr>
  <cols>
    <col min="1" max="1" width="3" customWidth="1"/>
    <col min="2" max="2" width="16" customWidth="1"/>
    <col min="3" max="3" width="12" customWidth="1"/>
    <col min="4" max="4" width="18" customWidth="1"/>
    <col min="5" max="6" width="8" customWidth="1"/>
    <col min="7" max="37" width="3.5" customWidth="1"/>
  </cols>
  <sheetData>${rowXml}</sheetData>
  ${mergeXml}
  <printOptions horizontalCentered="1"/>
  <pageMargins left="0.2" right="0.2" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="${verticalPageCount}"/>
  ${rowBreaksXml}
</worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><name val="Arial"/></font>
    <font><b/><color rgb="FF7F1D1D"/><sz val="11"/><name val="Arial"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF9EC5FE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFF9999"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>
    <border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="medium"><color rgb="FF000000"/></top><bottom style="medium"><color rgb="FF000000"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="49" fontId="1" fillId="2" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="49" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="49" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="49" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="49" fontId="2" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function workbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="シフト" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function workbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime() {
  return { date: 33, time: 0 };
}

function writeUInt16(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
}

function writeUInt32(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
  buffer[offset + 2] = (value >>> 16) & 0xff;
  buffer[offset + 3] = (value >>> 24) & 0xff;
}

function concatUint8Arrays(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function createZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const { date, time } = dosDateTime();
  let offset = 0;

  for (const entry of entries) {
    const path = textEncoder.encode(entry.path);
    const checksum = crc32(entry.data);
    const localHeader = new Uint8Array(30 + path.length);

    writeUInt32(localHeader, 0, 0x04034b50);
    writeUInt16(localHeader, 4, 20);
    writeUInt16(localHeader, 6, 0);
    writeUInt16(localHeader, 8, 0);
    writeUInt16(localHeader, 10, time);
    writeUInt16(localHeader, 12, date);
    writeUInt32(localHeader, 14, checksum);
    writeUInt32(localHeader, 18, entry.data.length);
    writeUInt32(localHeader, 22, entry.data.length);
    writeUInt16(localHeader, 26, path.length);
    writeUInt16(localHeader, 28, 0);
    localHeader.set(path, 30);

    localParts.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + path.length);

    writeUInt32(centralHeader, 0, 0x02014b50);
    writeUInt16(centralHeader, 4, 20);
    writeUInt16(centralHeader, 6, 20);
    writeUInt16(centralHeader, 8, 0);
    writeUInt16(centralHeader, 10, 0);
    writeUInt16(centralHeader, 12, time);
    writeUInt16(centralHeader, 14, date);
    writeUInt32(centralHeader, 16, checksum);
    writeUInt32(centralHeader, 20, entry.data.length);
    writeUInt32(centralHeader, 24, entry.data.length);
    writeUInt16(centralHeader, 28, path.length);
    writeUInt16(centralHeader, 30, 0);
    writeUInt16(centralHeader, 32, 0);
    writeUInt16(centralHeader, 34, 0);
    writeUInt16(centralHeader, 36, 0);
    writeUInt32(centralHeader, 38, 0);
    writeUInt32(centralHeader, 42, offset);
    centralHeader.set(path, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  }

  const centralDirectory = concatUint8Arrays(centralParts);
  const endRecord = new Uint8Array(22);

  writeUInt32(endRecord, 0, 0x06054b50);
  writeUInt16(endRecord, 4, 0);
  writeUInt16(endRecord, 6, 0);
  writeUInt16(endRecord, 8, entries.length);
  writeUInt16(endRecord, 10, entries.length);
  writeUInt32(endRecord, 12, centralDirectory.length);
  writeUInt32(endRecord, 16, offset);
  writeUInt16(endRecord, 20, 0);

  return concatUint8Arrays([...localParts, centralDirectory, endRecord]);
}

function toEntry(path: string, xml: string): ZipEntry {
  return {
    path,
    data: textEncoder.encode(xml),
  };
}

function buildXlsx(input: {
  assignments: ShiftAssignment[];
  slots: ShiftSlot[];
}) {
  const { rows, mergeRefs, pageBreakRows, verticalPageCount } = buildSheetRows(
    input.slots,
    input.assignments,
  );

  return createZip([
    toEntry("[Content_Types].xml", contentTypesXml()),
    toEntry("_rels/.rels", rootRelsXml()),
    toEntry("xl/workbook.xml", workbookXml()),
    toEntry("xl/_rels/workbook.xml.rels", workbookRelsXml()),
    toEntry("xl/styles.xml", stylesXml()),
    toEntry(
      "xl/worksheets/sheet1.xml",
      toWorksheetXml(rows, mergeRefs, pageBreakRows, verticalPageCount),
    ),
  ]);
}

export async function GET(_request: Request, { params }: RouteContext) {
  await requireAdmin();

  const { periodId } = await params;
  const parsedPeriodId = shiftPeriodIdSchema.safeParse(periodId);

  if (!parsedPeriodId.success) {
    notFound();
  }

  const [period, slots, assignments] = await Promise.all([
    findShiftPeriodById(parsedPeriodId.data),
    listShiftSlotsByPeriodId(parsedPeriodId.data),
    listAssignmentsByShiftPeriodId(parsedPeriodId.data),
  ]);

  if (!period) {
    notFound();
  }

  const xlsx = buildXlsx({ assignments, slots });
  const fileName = `${buildShiftExportBaseName(period)}.xlsx`;

  return new Response(xlsx, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
