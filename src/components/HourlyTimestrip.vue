<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { DateTime } from "luxon";
import { iter, isEvent, toDateRange } from "@markwhen/parser";
import { useMarkwhenStore } from "../markwhenStore";
import Canvas from "./Canvas.vue";
import Sidebar from "./Sidebar.vue";
import type {
  DayLabel,
  HourMarker,
  SectionBand,
  VisibleEventBar,
} from "./types";

const markwhenStore = useMarkwhenStore();

const HOUR_WIDTH = 60;
const MARKER_HOURS = 2;
const LABEL_HEIGHT = 24;
const LEGEND_GAP = 25;
const BAR_OFFSET = 12;
const LANE_HEIGHT = 20;
const DEFAULT_LANE_GAP = 6;
const MIN_BAR_WIDTH = 6;
const DEFAULT_SECTION_GAP = 12;
const PASTEL_PALETTE = [
  "#A5D8FF",
  "#B8F2E6",
  "#FFD6A5",
  "#FFCAD4",
  "#CDB4DB",
  "#FFE5A3",
  "#BDE0FE",
  "#CDEAC0",
  "#FBC4AB",
  "#D7E3FC",
  "#E2F0CB",
  "#FDE2E4",
];
const TARGET_BAR_COLOR = "#A5D8FF";
const ACTUAL_BAR_COLOR = "#CDEAC0";

interface DailyHourRange {
  startMinutes: number;
  endMinutes: number;
}

const hourWidth = computed(() => {
  const header = headerOptions.value;
  if (!header) return HOUR_WIDTH;
  const raw = header.scale;
  if (raw === undefined || raw === null) return HOUR_WIDTH;
  const value = Number(raw);
  if (!Number.isFinite(value)) return HOUR_WIDTH;
  return Math.min(200, Math.max(1, value));
});

const timeRange = computed(() => {
  const transformed = markwhenStore.markwhen?.transformed;
  if (!transformed) {
    return null;
  }

  let earliestTime = DateTime.now().plus({ years: 10 });
  let latestTime = DateTime.now().minus({ years: 10 });

  for (const { eventy } of iter(transformed)) {
    if (isEvent(eventy)) {
      const dr = toDateRange(eventy.dateRangeIso);
      if (+dr.fromDateTime < +earliestTime) {
        earliestTime = dr.fromDateTime as DateTime<true>;
      }
      if (+dr.toDateTime > +latestTime) {
        latestTime = dr.toDateTime as DateTime<true>;
      }
    }
  }

  if (+earliestTime > +latestTime) {
    return null;
  }

  return {
    start: earliestTime,
    end: latestTime,
  };
});

const headerOptions = computed(() => {
  const header =
    markwhenStore.markwhen?.parsed?.header ??
    markwhenStore.markwhen?.transformed?.header;
  return header && typeof header === "object"
    ? (header as Record<string, unknown>)
    : undefined;
});

const readNumericHeader = (key: string, fallback: number, min: number, max: number) =>
  computed(() => {
    const header = headerOptions.value;
    if (!header) return fallback;
    const value = Number(header[key]);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  });

const readStringHeader = (key: string, fallback: string) =>
  computed(() => {
    const raw = headerOptions.value?.[key];
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : fallback;
  });

const laneHeight = readNumericHeader("laneHeight", LANE_HEIGHT, 8, 60);
const laneGap = readNumericHeader("laneGap", DEFAULT_LANE_GAP, 0, 32);
const barRadius = readNumericHeader("barRadius", 6, 0, 24);
const sectionOpacity = readNumericHeader("sectionBandOpacity", 0.12, 0, 1);
const laneBandOpacity = readNumericHeader("laneBandOpacity", 0.08, 0, 1);
const sectionTitleFontSize = readNumericHeader("sectionTitleFontSize", 12, 8, 32);
const sectionGap = readNumericHeader("sectionGap", DEFAULT_SECTION_GAP, 0, 96);
const dateLegendHeight = readNumericHeader("dateLegendHeight", 18, 10, 80);
const hourLegendHeight = readNumericHeader("hourLegendHeight", 36, 16, 120);

const sectionPadding = computed(() => {
  const header = headerOptions.value;
  const minPadding = sectionTitleFontSize.value + 6;
  if (!header) return minPadding;
  const raw = header.sectionPadding;
  const value = Number(raw);
  if (!Number.isFinite(value)) return minPadding;
  return Math.min(64, Math.max(minPadding, value));
});

const targetLabel = readStringHeader("targetLabel", "Target");
const actualLabel = readStringHeader("actualLabel", "Actual");
const totalLabel = readStringHeader("totalLabel", "Total");

const skippedDays = computed(() => {
  const header = headerOptions.value;
  if (!header) return new Set<string>();
  const raw = header.skipDates;
  if (!Array.isArray(raw)) return new Set<string>();

  const values = raw
    .map((value) => String(value))
    .join(",")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const result = new Set<string>();
  values.forEach((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const parsed = DateTime.fromISO(value);
    if (!parsed.isValid) return;
    const isoDate = parsed.toISODate();
    if (isoDate) result.add(isoDate);
  });

  return result;
});

const isSkippedDay = (dateTime: DateTime) => skippedDays.value.has(dateTime.toISODate());

const parseTimePart = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [hoursRaw, minutesRaw] = trimmed.split(":");
    if (hoursRaw.length !== 2 || minutesRaw.length !== 2) return null;
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    return hours * 60 + minutes;
  }
  if (trimmed.length === 4 && /^\d{4}$/.test(trimmed)) {
    const hours = Number(trimmed.slice(0, 2));
    const minutes = Number(trimmed.slice(2, 4));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    return hours * 60 + minutes;
  }
  return null;
};

const parseTimePartWithColon = (value: string) => {
  if (!value.includes(":")) return null;
  return parseTimePart(value);
};

const parseHourRange = (
  raw: unknown,
  parsePart: (value: string) => number | null
) => {
  if (typeof raw === "string") {
    const parts = raw.split(/-|–|—/).map((part) => part.trim());
    if (parts.length !== 2) return null;
    const startMinutes = parsePart(parts[0]);
    const endMinutes = parsePart(parts[1]);
    if (startMinutes === null || endMinutes === null) return null;
    if (endMinutes <= startMinutes) return null;
    return { startMinutes, endMinutes };
  }

  if (Array.isArray(raw) && raw.length === 2) {
    const startMinutes = parsePart(String(raw[0]));
    const endMinutes = parsePart(String(raw[1]));
    if (startMinutes === null || endMinutes === null) return null;
    if (endMinutes <= startMinutes) return null;
    return { startMinutes, endMinutes };
  }

  return null;
};

const dailyHourRange = computed<DailyHourRange | null>(() => {
  const header = headerOptions.value;
  if (!header) return null;
  const raw = header.hours;
  return parseHourRange(raw, parseTimePartWithColon);
});

const skipHourRange = computed<DailyHourRange | null>(() => {
  const header = headerOptions.value;
  if (!header) return null;
  const raw = header.skipHours;
  return parseHourRange(raw, parseTimePartWithColon);
});

const sidebarWidth = ref(220);
const isResizing = ref(false);
let resizeStartX = 0;
let resizeStartWidth = 0;

const onResizeMove = (event: MouseEvent) => {
  if (!isResizing.value) return;
  const nextWidth = resizeStartWidth + (event.clientX - resizeStartX);
  sidebarWidth.value = Math.min(480, Math.max(140, nextWidth));
};

const onResizeEnd = () => {
  isResizing.value = false;
  window.removeEventListener("mousemove", onResizeMove);
  window.removeEventListener("mouseup", onResizeEnd);
};

const onResizeStart = (event: MouseEvent) => {
  isResizing.value = true;
  resizeStartX = event.clientX;
  resizeStartWidth = sidebarWidth.value;
  window.addEventListener("mousemove", onResizeMove);
  window.addEventListener("mouseup", onResizeEnd);
};

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onResizeMove);
  window.removeEventListener("mouseup", onResizeEnd);
});

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const darkenHex = (hex: string, amount: number) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return hex;
  const num = parseInt(normalized, 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${[r, g, b]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const num = parseInt(normalized, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return { r, g, b };
};

const getDailySegments = () => {
  const base = dailyHourRange.value ?? { startMinutes: 0, endMinutes: 24 * 60 };
  const skip = skipHourRange.value;
  if (!skip) return [base];

  if (skip.endMinutes <= base.startMinutes || skip.startMinutes >= base.endMinutes) {
    return [base];
  }

  const segments: DailyHourRange[] = [];
  const firstEnd = Math.min(skip.startMinutes, base.endMinutes);
  if (firstEnd > base.startMinutes) {
    segments.push({ startMinutes: base.startMinutes, endMinutes: firstEnd });
  }
  const secondStart = Math.max(skip.endMinutes, base.startMinutes);
  if (base.endMinutes > secondStart) {
    segments.push({ startMinutes: secondStart, endMinutes: base.endMinutes });
  }
  return segments;
};

const visibleMinutesBetween = (start: DateTime, end: DateTime) => {
  if (+end <= +start) return 0;
  let minutes = 0;
  let day = start.startOf("day");
  const lastDay = end.startOf("day");
  const segments = getDailySegments();

  while (day <= lastDay) {
    if (isSkippedDay(day)) {
      day = day.plus({ days: 1 });
      continue;
    }
    for (const segment of segments) {
      const dayStart = day.plus({ minutes: segment.startMinutes });
      const dayEnd = day.plus({ minutes: segment.endMinutes });
      const segmentStart = DateTime.max(start, dayStart);
      const segmentEnd = DateTime.min(end, dayEnd);
      if (+segmentEnd > +segmentStart) {
        minutes += segmentEnd.diff(segmentStart, "minutes").minutes;
      }
    }
    day = day.plus({ days: 1 });
  }
  return minutes;
};

const hourMarkers = computed((): HourMarker[] => {
  if (!timeRange.value) {
    return [];
  }

  const markers: HourMarker[] = [];
  const { start, end } = timeRange.value;
  const startBound = start.startOf("hour");
  const endBound = end.endOf("hour");

  let day = start.startOf("day");
  const lastDay = end.startOf("day");
  const segments = getDailySegments();
  if (segments.length === 0) return markers;
  while (day <= lastDay) {
    if (isSkippedDay(day)) {
      day = day.plus({ days: 1 });
      continue;
    }
    const firstSegmentStart = segments[0].startMinutes;
    for (const segment of segments) {
      let minutes = segment.startMinutes;
      while (minutes < segment.endMinutes) {
        const markerTime = day.plus({ minutes });
        if (markerTime < startBound || markerTime > endBound) {
          minutes += 60 * MARKER_HOURS;
          continue;
        }
        const nextMinutes = Math.min(minutes + 60 * MARKER_HOURS, segment.endMinutes);
        const markerEnd = DateTime.min(day.plus({ minutes: nextMinutes }), endBound);
        const spanHours = markerEnd.diff(markerTime, "hours").hours;
        if (spanHours <= 0) {
          minutes = nextMinutes;
          continue;
        }
        markers.push({
          dateTime: markerTime,
          label: `${markerTime.toFormat("HH:mm")} - ${markerEnd.toFormat("HH:mm")}`,
          isStartOfDay: minutes === firstSegmentStart,
          spanHours,
        });
        minutes = nextMinutes;
        if (markers.length > 500) break;
      }
      if (markers.length > 500) break;
    }
    if (markers.length > 500) break;
    day = day.plus({ days: 1 });
  }

  return markers;
});

const totalWidth = computed(() =>
  hourMarkers.value.reduce((sum, marker) => sum + marker.spanHours * hourWidth.value, 0)
);

const dayLabels = computed((): DayLabel[] => {
  const labels: DayLabel[] = [];
  if (hourMarkers.value.length === 0) return labels;

  let currentLabel: string | null = null;
  let currentStart = 0;
  let offset = 0;

  for (const marker of hourMarkers.value) {
    if (marker.isStartOfDay) {
      if (currentLabel !== null) {
        labels.push({
          label: currentLabel,
          left: currentStart,
          width: offset - currentStart,
        });
      }
      currentLabel = marker.dateTime.toFormat("MM.dd.yyyy");
      currentStart = offset;
    }
    offset += marker.spanHours * hourWidth.value;
  }

  if (currentLabel !== null) {
    labels.push({
      label: currentLabel,
      left: currentStart,
      width: offset - currentStart,
    });
  }

  return labels;
});

const dayBackgrounds = computed(() =>
  dayLabels.value.map((label, index) => ({
    ...label,
    isShaded: index % 2 === 1,
  }))
);

const sectionsInfo = computed(() => {
  const transformed = markwhenStore.markwhen?.transformed;
  const opacity = sectionOpacity.value;
  if (!transformed) {
    return {
      eventSection: new Map<string, string>(),
      sectionColors: new Map<string, { fill: string; border: string; base: string }>(),
    };
  }

  const eventSection = new Map<string, string>();
  const sectionColors = new Map<string, { fill: string; border: string; base: string }>();
  const sectionOrder: string[] = [];

  const registerSection = (name: string) => {
    if (sectionColors.has(name)) return sectionColors.get(name)!;
    const base = PASTEL_PALETTE[sectionOrder.length % PASTEL_PALETTE.length];
    const rgb = hexToRgb(base) ?? { r: 148, g: 163, b: 184 };
    const fill = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    const border = darkenHex(base, 28);
    const entry = { fill, border, base };
    sectionColors.set(name, entry);
    sectionOrder.push(name);
    return entry;
  };

  const walk = (node: any, path: number[], currentSection?: string) => {
    if (!node) return;
    const isSection = !isEvent(node) && node.style === "section";
    const sectionName = isSection ? node.title || "Section" : currentSection;

    if (isEvent(node)) {
      if (sectionName) {
        eventSection.set(path.join("."), sectionName);
        registerSection(sectionName);
      }
      return;
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((child: any, idx: number) => walk(child, [...path, idx], sectionName));
    }
  };

  walk(transformed, []);

  return { eventSection, sectionColors };
});

const formatHours = (value: number) =>
  Math.round(value * 10) % 10 === 0 ? `${Math.round(value)}` : value.toFixed(1);

const eventBars = computed((): VisibleEventBar[] => {
  const transformed = markwhenStore.markwhen?.transformed;
  if (!transformed || !timeRange.value) {
    return [];
  }

  const { start } = timeRange.value;
  const eventSection = sectionsInfo.value.eventSection;
  const bars: Array<VisibleEventBar & { startTime: DateTime; endTime: DateTime }> = [];

  for (const { eventy, path } of iter(transformed)) {
    if (!isEvent(eventy)) continue;
    const dr = toDateRange(eventy.dateRangeIso);
    const startTime = dr.fromDateTime;
    const endTime = dr.toDateTime;
    const durationMinutes = visibleMinutesBetween(startTime, endTime);
    if (durationMinutes <= 0) continue;
    const durationHours = formatHours(durationMinutes / 60);
    const left = (visibleMinutesBetween(start, startTime) / 60) * hourWidth.value;
    const width = Math.max((durationMinutes / 60) * hourWidth.value, MIN_BAR_WIDTH);
    const title = eventy.firstLine?.restTrimmed || eventy.firstLine?.rest || "Event";
    const hasId = !!eventy.properties?.id;
    const groupKeyRaw =
      (eventy.properties?.id as string | undefined) ??
      (eventy.properties?.for as string | undefined) ??
      eventy.id ??
      title;
    const groupKey = String(groupKeyRaw);
    const sectionName = Array.isArray(path) ? eventSection.get(path.join(".")) : undefined;
    const rangeLabel =
      startTime.hasSame(endTime, "day")
        ? `${startTime.toFormat("HH:mm")}–${endTime.toFormat("HH:mm")}`
        : `${startTime.toFormat("MMM d HH:mm")}–${endTime.toFormat("MMM d HH:mm")}`;
    const color = hasId ? TARGET_BAR_COLOR : ACTUAL_BAR_COLOR;
    const borderColor = darkenHex(color, 24);

    bars.push({
      title,
      left,
      width,
      lane: 0,
      rangeLabel,
      color,
      borderColor,
      durationHours,
      groupKey,
      sublane: 0,
      isIdEvent: hasId,
      sectionName,
      startTime,
      endTime,
      barRadius: barRadius.value,
    });
  }

  bars.sort((a, b) => +a.startTime - +b.startTime);
  const groupInfo = new Map<
    string,
    { bars: Array<VisibleEventBar & { startTime: DateTime; endTime: DateTime }>; earliest: DateTime }
  >();

  for (const bar of bars) {
    const entry = groupInfo.get(bar.groupKey) ?? { bars: [], earliest: bar.startTime };
    entry.bars.push(bar);
    if (+bar.startTime < +entry.earliest) entry.earliest = bar.startTime;
    groupInfo.set(bar.groupKey, entry);
  }

  const groupOrder = Array.from(groupInfo.entries()).sort((a, b) => +a[1].earliest - +b[1].earliest);

  groupOrder.forEach(([_, info], groupIndex) => {
    const groupBars = info.bars.sort((a, b) => +a.startTime - +b.startTime);
    const idBars = groupBars.filter((bar) => bar.isIdEvent);
    const nonIdBars = groupBars.filter((bar) => !bar.isIdEvent);

    const assignSublanes = (
      barsToAssign: Array<VisibleEventBar & { startTime: DateTime; endTime: DateTime }>,
      sublaneEnds: DateTime[]
    ) => {
      for (const bar of barsToAssign) {
        let sublaneIndex = sublaneEnds.findIndex((endTime) => +bar.startTime >= +endTime);
        if (sublaneIndex === -1) {
          sublaneIndex = sublaneEnds.length;
          sublaneEnds.push(bar.endTime);
        } else {
          sublaneEnds[sublaneIndex] = bar.endTime;
        }
        bar.sublane = sublaneIndex;
      }
    };

    const idSublaneEnds: DateTime[] = [];
    assignSublanes(idBars, idSublaneEnds);

    const nonIdSublaneEnds: DateTime[] = [];
    assignSublanes(nonIdBars, nonIdSublaneEnds);

    const idSublaneCount = idSublaneEnds.length;
    nonIdBars.forEach((bar) => {
      bar.sublane += idSublaneCount;
    });

    for (const bar of groupBars) {
      bar.lane = groupIndex;
    }
  });

  return bars.map(({ startTime, endTime, ...rest }) => rest);
});

const rowLayouts = computed(() => {
  const rowsMap = new Map<
    string,
    {
      lane: number;
      sublaneCount: number;
      color: string;
      borderColor: string;
      totals: number[];
      sectionName?: string;
      sectionHits: Record<string, number>;
      targetSublaneCount: number;
    }
  >();

  for (const bar of eventBars.value) {
    const laneColor = (() => {
      if (bar.sectionName) {
        const base = sectionsInfo.value.sectionColors.get(bar.sectionName)?.base;
        if (base) return base;
      }
      return PASTEL_PALETTE[Math.abs(hashString(bar.groupKey)) % PASTEL_PALETTE.length];
    })();
    const laneBorder = darkenHex(laneColor, 24);
    const entry = rowsMap.get(bar.groupKey) ?? {
      lane: bar.lane,
      sublaneCount: 0,
      color: laneColor,
      borderColor: laneBorder,
      totals: [],
      sectionName: undefined,
      sectionHits: {},
      targetSublaneCount: 0,
    };
    entry.lane = bar.lane;
    entry.sublaneCount = Math.max(entry.sublaneCount, bar.sublane + 1);
    if (bar.isIdEvent) {
      entry.targetSublaneCount = Math.max(entry.targetSublaneCount, bar.sublane + 1);
    }
    while (entry.totals.length <= bar.sublane) {
      entry.totals.push(0);
    }
    const duration = Number(bar.durationHours);
    if (Number.isFinite(duration)) {
      entry.totals[bar.sublane] += duration;
    }
    if (bar.sectionName) {
      entry.sectionHits[bar.sectionName] = (entry.sectionHits[bar.sectionName] ?? 0) + 1;
      const currentCount = entry.sectionName ? entry.sectionHits[entry.sectionName] ?? 0 : 0;
      if (entry.sectionHits[bar.sectionName] > currentCount) {
        entry.sectionName = bar.sectionName;
      }
    }
    rowsMap.set(bar.groupKey, entry);
  }

  const rows = Array.from(rowsMap.entries())
    .map(([key, value]) => ({
      key,
      label: key,
      lane: value.lane,
      sublaneCount: value.sublaneCount,
      color: value.color,
      borderColor: value.borderColor,
      sectionName: value.sectionName,
      targetSublaneCount: value.targetSublaneCount,
      totals: value.totals.map(formatHours),
    }))
    .sort((a, b) => a.lane - b.lane);

  let offset = 0;
  const layout = rows.map((row, index) => {
    const height = row.sublaneCount * laneHeight.value;
    const top = offset;
    const gapToNext =
      index === rows.length - 1
        ? 0
        : laneGap.value +
          (row.sectionName === rows[index + 1].sectionName ? 0 : sectionGap.value + sectionPadding.value * 2);
    offset += height + gapToNext;
    return { ...row, top, height, nextGap: gapToNext };
  });

  const tailGap =
    rows.length && rows[rows.length - 1].sectionName ? sectionPadding.value + sectionGap.value : 0;

  const contentHeight = offset + tailGap;

  return { rows: layout, contentHeight };
});

const sidebarRows = computed(() => rowLayouts.value.rows);
const sidebarTotals = computed(() => {
  const totals: number[] = [];
  rowLayouts.value.rows.forEach((row) => {
    row.totals.forEach((value, idx) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return;
      if (totals[idx] === undefined) totals[idx] = 0;
      totals[idx] += numeric;
    });
  });
  return totals.map(formatHours);
});

const rowTopByKey = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  rowLayouts.value.rows.forEach((row) => {
    map[row.key] = row.top;
  });
  return map;
});

const makeSectionBands = (rowAreaOffset: number): SectionBand[] => {
  const bands = new Map<
    string,
    { title: string; minTop: number; maxBottom: number; fill: string; border: string }
  >();
  const bandAreaBottom =
    rowAreaOffset + Math.max(0, rowLayouts.value.contentHeight - (sectionPadding.value + sectionGap.value));

  rowLayouts.value.rows.forEach((row) => {
    if (!row.sectionName) return;
    const colors = sectionsInfo.value.sectionColors.get(row.sectionName);
    const fill = colors?.fill ?? "rgba(148, 163, 184, 0.12)";
    const border = colors?.border ?? "rgba(148, 163, 184, 0.4)";
    const top = rowAreaOffset + row.top;
    const bottom = top + row.height;
    const existing = bands.get(row.sectionName);
    if (!existing) {
      bands.set(row.sectionName, { title: row.sectionName, minTop: top, maxBottom: bottom, fill, border });
    } else {
      existing.minTop = Math.min(existing.minTop, top);
      existing.maxBottom = Math.max(existing.maxBottom, bottom);
    }
  });

  return Array.from(bands.values())
    .map((band) => {
      const paddedTop = band.minTop - sectionPadding.value;
      const paddedBottom = band.maxBottom + sectionPadding.value;
      const top = Math.max(0, paddedTop);
      const bottom = Math.min(bandAreaBottom, paddedBottom);
      return {
        title: band.title,
        top,
        height: Math.max(0, bottom - top),
        fill: band.fill,
        border: band.border,
      };
    })
    .sort((a, b) => a.top - b.top);
};

const makeLaneBands = (rowAreaOffset: number): SectionBand[] => {
  const opacity = laneBandOpacity.value;
  return rowLayouts.value.rows.map((row) => {
    const rgb = hexToRgb(row.color) ?? { r: 148, g: 163, b: 184 };
    const split =
      row.targetSublaneCount > 0 && row.targetSublaneCount < row.sublaneCount
        ? rowAreaOffset + row.top + row.targetSublaneCount * laneHeight.value - 1
        : undefined;
    return {
      title: row.label,
      top: rowAreaOffset + row.top,
      height: row.height,
      fill: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
      border: row.borderColor,
      split,
    };
  });
};

const sectionBands = computed<SectionBand[]>(() => makeSectionBands(legendStackHeight.value + BAR_OFFSET));
const laneBands = computed<SectionBand[]>(() => makeLaneBands(legendStackHeight.value + BAR_OFFSET));
const sidebarSectionBands = computed<SectionBand[]>(() =>
  makeSectionBands(sidebarRowsOffset.value + LABEL_HEIGHT)
);
const sidebarLaneBands = computed<SectionBand[]>(() =>
  makeLaneBands(sidebarRowsOffset.value + LABEL_HEIGHT)
);

const legendStackHeight = computed(() => dateLegendHeight.value + hourLegendHeight.value + LEGEND_GAP);
const sidebarRowsOffset = computed(() => Math.max(0, legendStackHeight.value + BAR_OFFSET - LABEL_HEIGHT));

const totalHeight = computed(
  () => legendStackHeight.value + BAR_OFFSET + rowLayouts.value.contentHeight + 12
);

const isDark = computed(() => markwhenStore.app?.isDark ?? false);

const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null);
const timestripRef = ref<InstanceType<typeof Canvas> | null>(null);
const isSyncingScroll = ref(false);
const viewportHeight = ref(0);
const trackHeight = computed(() => Math.max(totalHeight.value, viewportHeight.value));

const syncScroll = (source: "sidebar" | "timestrip") => {
  if (isSyncingScroll.value) return;
  isSyncingScroll.value = true;
  const sidebar = sidebarRef.value;
  const timestrip = timestripRef.value;
  if (sidebar && timestrip) {
    if (source === "sidebar") {
      timestrip.setScrollTop(sidebar.getScrollTop());
    } else {
      sidebar.setScrollTop(timestrip.getScrollTop());
    }
  }
  requestAnimationFrame(() => {
    isSyncingScroll.value = false;
  });
};

const updateViewportHeight = () => {
  viewportHeight.value = timestripRef.value?.getClientHeight() ?? 0;
};

onMounted(() => {
  updateViewportHeight();
  window.addEventListener("resize", updateViewportHeight);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateViewportHeight);
});
</script>

<template>
  <div class="gantt-root" :class="{ dark: isDark }">
    <Sidebar
      ref="sidebarRef"
      :width="sidebarWidth"
      :total-height="totalHeight"
      :sidebar-rows-offset="sidebarRowsOffset"
      :label-height="LABEL_HEIGHT"
      :sidebar-lane-bands="sidebarLaneBands"
      :sidebar-section-bands="sidebarSectionBands"
      :section-title-font-size="sectionTitleFontSize"
      :sidebar-rows="sidebarRows"
      :lane-height="laneHeight"
      :target-label="targetLabel"
      :actual-label="actualLabel"
      :total-label="totalLabel"
      :sidebar-totals="sidebarTotals"
      :is-dark="isDark"
      @scroll="syncScroll('sidebar')"
      @resize-start="onResizeStart"
    />
    <Canvas
      ref="timestripRef"
      :total-width="totalWidth"
      :track-height="trackHeight"
      :date-legend-height="dateLegendHeight"
      :hour-markers="hourMarkers"
      :day-labels="dayLabels"
      :day-backgrounds="dayBackgrounds"
      :legend-stack-height="legendStackHeight"
      :bar-offset="BAR_OFFSET"
      :lane-bands="laneBands"
      :section-bands="sectionBands"
      :event-bars="eventBars"
      :lane-height="laneHeight"
      :row-top-by-key="rowTopByKey"
      :hour-width="hourWidth"
      :is-dark="isDark"
      @scroll="syncScroll('timestrip')"
    />
  </div>
</template>

<style scoped>
.gantt-root {
  width: 100%;
  height: 100%;
  display: flex;
  background-color: #f8fafc;
}

.gantt-root.dark {
  background-color: #27272a;
}
</style>
