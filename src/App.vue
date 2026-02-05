<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { DateTime } from "luxon";
import { iter, isEvent, toDateRange } from "@markwhen/parser";
import { useMarkwhenStore } from "./markwhenStore";
import Sidebar from "./components/Sidebar.vue";
import Timestream from "./components/Timestream.vue";
import type {
  BandRegion,
  DayLabel,
  HourMarker,
  RenderedEventBar,
} from "./components/types";

const markwhenStore = useMarkwhenStore();

const HOUR_WIDTH = 60;
const MARKER_HOURS = 2;
const LABEL_HEIGHT = 24;
const DAY_LEGEND_CONTENT_HEIGHT = 16;
const HOUR_LEGEND_CONTENT_HEIGHT = 16;
const LANE_VERTICAL_PADDING_DEFAULT = 12;
const LANE_ROW_HEIGHT = 20;
const DEFAULT_LANE_ROW_GAP = 6;
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

const laneRowHeight = readNumericHeader("laneHeight", LANE_ROW_HEIGHT, 8, 60);
const laneRowGap = readNumericHeader("laneGap", DEFAULT_LANE_ROW_GAP, 0, 32);
const barRadius = readNumericHeader("barRadius", 6, 0, 24);
const sectionOpacity = readNumericHeader("sectionBandOpacity", 0.12, 0, 1);
const laneBandOpacity = readNumericHeader("laneBandOpacity", 0.08, 0, 1);
const labelColumnPaddingLeft = readNumericHeader("labelPaddingLeft", 12, 0, 200);
const labelColumnPaddingTop = readNumericHeader("labelPaddingTop", 8, 0, 200);
const sectionTitleFontSize = readNumericHeader("sectionTitleFontSize", 12, 8, 32);
const sectionGap = readNumericHeader("sectionGap", DEFAULT_SECTION_GAP, 0, 96);
const dayLegendVerticalPadding = readNumericHeader("dateLegendVerticalPadding", 6, 0, 120);
const hourLegendVerticalPadding = readNumericHeader("hourLegendVerticalPadding", 12, 0, 160);
const laneVerticalPadding = readNumericHeader("laneVerticalPadding", LANE_VERTICAL_PADDING_DEFAULT, 0, 200);

const sectionPadding = computed(() => {
  const header = headerOptions.value;
  const minPadding = sectionTitleFontSize.value + 6;
  if (!header) return minPadding;
  const raw = header.sectionPadding;
  const value = Number(raw);
  if (!Number.isFinite(value)) return minPadding;
  return Math.min(64, Math.max(minPadding, value));
});

const dayLegendBlockHeight = computed(
  () => DAY_LEGEND_CONTENT_HEIGHT + dayLegendVerticalPadding.value * 2
);

const hourLegendBlockHeight = computed(
  () => HOUR_LEGEND_CONTENT_HEIGHT + hourLegendVerticalPadding.value * 2
);

const targetLabel = readStringHeader("targetLabel", "Target");
const actualLabel = readStringHeader("actualLabel", "Actual");
const totalLabel = readStringHeader("totalLabel", "Total");
const legendNotice = readStringHeader("legendNotice", "");

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
  let hasFirstDayStart = false;
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
        const isStartOfDay = minutes === firstSegmentStart;
        const isFirstDayStart = isStartOfDay && !hasFirstDayStart;
        markers.push({
          dateTime: markerTime,
          label: `${markerTime.toFormat("HH:mm")} - ${markerEnd.toFormat("HH:mm")}`,
          isStartOfDay,
          isFirstDayStart,
          spanHours,
        });
        if (isFirstDayStart) {
          hasFirstDayStart = true;
        }
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

const timelineWidth = computed(() =>
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

const dayBackgroundRows = computed(() =>
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

const renderedEventBars = computed((): RenderedEventBar[] => {
  const transformed = markwhenStore.markwhen?.transformed;
  if (!transformed || !timeRange.value) {
    return [];
  }

  const { start } = timeRange.value;
  const eventSection = sectionsInfo.value.eventSection;
  const bars: Array<
    RenderedEventBar & {
      startTime: DateTime;
      endTime: DateTime;
      durationMinutes: number;
      isMilestoneCandidate: boolean;
      hasMilestoneTag: boolean;
    }
  > = [];
  const milestoneGroups = new Set<string>();

  for (const { eventy, path } of iter(transformed)) {
    if (!isEvent(eventy)) continue;
    const dr = toDateRange(eventy.dateRangeIso);
    const startTime = dr.fromDateTime;
    const endTime = dr.toDateTime;
    const durationMinutes = visibleMinutesBetween(startTime, endTime);
    const label = eventy.firstLine?.restTrimmed || eventy.firstLine?.rest || "Event";
    const hasId = !!eventy.properties?.id;
    const groupKeyRaw =
      (eventy.properties?.id as string | undefined) ??
      (eventy.properties?.for as string | undefined) ??
      eventy.id ??
      label;
    const groupKey = String(groupKeyRaw);
    const hasTimeComponent =
      !!eventy.firstLine?.datePart?.includes(":") || !!eventy.firstLine?.datePart?.includes("T");
    const isMilestoneCandidate = +startTime === +endTime && hasTimeComponent;
    const hasMilestoneTag = eventy.tags?.some((tag) => tag.toLowerCase() === "milestone") ?? false;
    if (durationMinutes <= 0 && !(hasMilestoneTag && isMilestoneCandidate)) continue;
    if (hasMilestoneTag && isMilestoneCandidate) {
      milestoneGroups.add(groupKey);
    }
    const leftOffset = (visibleMinutesBetween(start, startTime) / 60) * hourWidth.value;
    const barWidth = Math.max((durationMinutes / 60) * hourWidth.value, MIN_BAR_WIDTH);
    const sectionName = Array.isArray(path) ? eventSection.get(path.join(".")) : undefined;
    const timeRangeLabel =
      startTime.hasSame(endTime, "day")
        ? `${startTime.toFormat("HH:mm")}–${endTime.toFormat("HH:mm")}`
        : `${startTime.toFormat("MMM d HH:mm")}–${endTime.toFormat("MMM d HH:mm")}`;
    const fillColor = hasId ? TARGET_BAR_COLOR : ACTUAL_BAR_COLOR;
    const borderColor = darkenHex(fillColor, 24);

    bars.push({
      label,
      leftOffset,
      barWidth,
      laneIndex: 0,
      timeRangeLabel,
      fillColor,
      borderColor,
      durationHoursLabel: formatHours(durationMinutes / 60),
      groupKey,
      sublaneIndex: 0,
      isTargetEvent: hasId,
      sectionName,
      startTime,
      endTime,
      cornerRadius: barRadius.value,
      durationMinutes,
      isMilestoneCandidate,
      hasMilestoneTag,
      isMilestone: false,
    });
  }

  const milestoneSize = Math.max(laneRowHeight.value, MIN_BAR_WIDTH);

  bars.forEach((bar) => {
    const isMilestone =
      bar.isMilestoneCandidate && (bar.hasMilestoneTag || milestoneGroups.has(bar.groupKey));
    bar.isMilestone = isMilestone;
    const baseLeft = (visibleMinutesBetween(start, bar.startTime) / 60) * hourWidth.value;
    const effectiveWidth = isMilestone
      ? milestoneSize
      : Math.max((bar.durationMinutes / 60) * hourWidth.value, MIN_BAR_WIDTH);
    bar.barWidth = effectiveWidth;
    bar.leftOffset = isMilestone ? Math.max(0, baseLeft - effectiveWidth / 2) : baseLeft;
    bar.cornerRadius = isMilestone ? 0 : barRadius.value;
    bar.durationHoursLabel = isMilestone ? "" : formatHours(bar.durationMinutes / 60);
    bar.timeRangeLabel = isMilestone
      ? bar.startTime.toFormat("MMM d HH:mm")
      : bar.startTime.hasSame(bar.endTime, "day")
        ? `${bar.startTime.toFormat("HH:mm")}–${bar.endTime.toFormat("HH:mm")}`
        : `${bar.startTime.toFormat("MMM d HH:mm")}–${bar.endTime.toFormat("MMM d HH:mm")}`;
  });

  bars.sort((a, b) => +a.startTime - +b.startTime);
  const groupInfo = new Map<
    string,
    { bars: Array<RenderedEventBar & { startTime: DateTime; endTime: DateTime }>; earliest: DateTime }
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
    const idBars = groupBars.filter((bar) => bar.isTargetEvent);
    const nonIdBars = groupBars.filter((bar) => !bar.isTargetEvent);

    const assignSublanes = (
      barsToAssign: Array<RenderedEventBar & { startTime: DateTime; endTime: DateTime }>,
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
        bar.sublaneIndex = sublaneIndex;
      }
    };

    const idSublaneEnds: DateTime[] = [];
    assignSublanes(idBars, idSublaneEnds);

    const nonIdSublaneEnds: DateTime[] = [];
    assignSublanes(nonIdBars, nonIdSublaneEnds);

    const idSublaneCount = idSublaneEnds.length;
    nonIdBars.forEach((bar) => {
      bar.sublaneIndex += idSublaneCount;
    });

    for (const bar of groupBars) {
      bar.laneIndex = groupIndex;
    }
  });

  return bars.map(
    ({ startTime, endTime, durationMinutes, isMilestoneCandidate, hasMilestoneTag, ...rest }) =>
      rest
  );
});

const laneLayouts = computed(() => {
  const lanesMap = new Map<
    string,
    {
      laneIndex: number;
      sublaneCount: number;
      color: string;
      borderColor: string;
      totals: number[];
      sectionName?: string;
      sectionHits: Record<string, number>;
      targetSublaneCount: number;
    }
  >();

  for (const bar of renderedEventBars.value) {
    const laneColor = (() => {
      if (bar.sectionName) {
        const base = sectionsInfo.value.sectionColors.get(bar.sectionName)?.base;
        if (base) return base;
      }
      return PASTEL_PALETTE[Math.abs(hashString(bar.groupKey)) % PASTEL_PALETTE.length];
    })();
    const laneBorder = darkenHex(laneColor, 24);
    const entry = lanesMap.get(bar.groupKey) ?? {
      laneIndex: bar.laneIndex,
      sublaneCount: 0,
      color: laneColor,
      borderColor: laneBorder,
      totals: [],
      sectionName: undefined,
      sectionHits: {},
      targetSublaneCount: 0,
    };
    entry.laneIndex = bar.laneIndex;
    entry.sublaneCount = Math.max(entry.sublaneCount, bar.sublaneIndex + 1);
    if (bar.isTargetEvent) {
      entry.targetSublaneCount = Math.max(entry.targetSublaneCount, bar.sublaneIndex + 1);
    }
    while (entry.totals.length <= bar.sublaneIndex) {
      entry.totals.push(0);
    }
    const duration = Number(bar.durationHoursLabel);
    if (Number.isFinite(duration)) {
      entry.totals[bar.sublaneIndex] += duration;
    }
    if (bar.sectionName) {
      entry.sectionHits[bar.sectionName] = (entry.sectionHits[bar.sectionName] ?? 0) + 1;
      const currentCount = entry.sectionName ? entry.sectionHits[entry.sectionName] ?? 0 : 0;
      if (entry.sectionHits[bar.sectionName] > currentCount) {
        entry.sectionName = bar.sectionName;
      }
    }
    lanesMap.set(bar.groupKey, entry);
  }

  const lanes = Array.from(lanesMap.entries())
    .map(([key, value]) => {
      const targetTotalValue =
        value.targetSublaneCount > 0
          ? value.totals.slice(0, value.targetSublaneCount).reduce((sum, total) => sum + total, 0)
          : 0;
      const actualTotalValue =
        value.targetSublaneCount > 0
          ? value.totals.slice(value.targetSublaneCount).reduce((sum, total) => sum + total, 0)
          : value.totals.reduce((sum, total) => sum + total, 0);

      return {
        key,
        label: key,
        laneIndex: value.laneIndex,
        sublaneCount: value.sublaneCount,
        color: value.color,
        borderColor: value.borderColor,
        sectionName: value.sectionName,
        targetSublaneCount: value.targetSublaneCount,
        targetTotalValue,
        actualTotalValue,
        targetTotal: formatHours(targetTotalValue),
        actualTotal: formatHours(actualTotalValue),
      };
    })
    .sort((a, b) => a.laneIndex - b.laneIndex);

  let offset = 0;
  const layout = lanes.map((lane, index) => {
    const height = lane.sublaneCount * laneRowHeight.value;
    const top = offset;
    const gapToNext =
      index === lanes.length - 1
        ? 0
        : laneRowGap.value +
          (lane.sectionName === lanes[index + 1].sectionName ? 0 : sectionGap.value + sectionPadding.value * 2);
    offset += height + gapToNext;
    return { ...lane, top, height, nextGap: gapToNext };
  });

  const tailGap =
    lanes.length && lanes[lanes.length - 1].sectionName ? sectionPadding.value + sectionGap.value : 0;

  const contentHeight = offset + tailGap;

  return { lanes: layout, contentHeight };
});

const sidebarLanes = computed(() => laneLayouts.value.lanes);
const sidebarTotals = computed(() => {
  let target = 0;
  let actual = 0;
  laneLayouts.value.lanes.forEach((lane) => {
    target += lane.targetTotalValue;
    actual += lane.actualTotalValue;
  });
  return {
    target: formatHours(target),
    actual: formatHours(actual),
  };
});

const laneTopOffsetByKey = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {};
  laneLayouts.value.lanes.forEach((lane) => {
    map[lane.key] = lane.top;
  });
  return map;
});

const buildSectionRegions = (laneAreaOffset: number): BandRegion[] => {
  const bands = new Map<
    string,
    { label: string; minTop: number; maxBottom: number; backgroundColor: string; borderColor: string }
  >();
  const bandAreaBottom =
    laneAreaOffset + Math.max(0, laneLayouts.value.contentHeight - (sectionPadding.value + sectionGap.value));

  laneLayouts.value.lanes.forEach((lane) => {
    if (!lane.sectionName) return;
    const colors = sectionsInfo.value.sectionColors.get(lane.sectionName);
    const backgroundColor = colors?.fill ?? "rgba(148, 163, 184, 0.12)";
    const borderColor = colors?.border ?? "rgba(148, 163, 184, 0.4)";
    const top = laneAreaOffset + lane.top;
    const bottom = top + lane.height;
    const existing = bands.get(lane.sectionName);
    if (!existing) {
      bands.set(lane.sectionName, {
        label: lane.sectionName,
        minTop: top,
        maxBottom: bottom,
        backgroundColor,
        borderColor,
      });
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
        label: band.label,
        topOffset: top,
        height: Math.max(0, bottom - top),
        backgroundColor: band.backgroundColor,
        borderColor: band.borderColor,
      };
    })
    .sort((a, b) => a.topOffset - b.topOffset);
};

const buildLaneRegions = (laneAreaOffset: number): BandRegion[] => {
  const opacity = laneBandOpacity.value;
  return laneLayouts.value.lanes.map((lane) => {
    const rgb = hexToRgb(lane.color) ?? { r: 148, g: 163, b: 184 };
    const split =
      lane.targetSublaneCount > 0 && lane.targetSublaneCount < lane.sublaneCount
        ? laneAreaOffset + lane.top + lane.targetSublaneCount * laneRowHeight.value - 1
        : undefined;
    return {
      label: lane.label,
      topOffset: laneAreaOffset + lane.top,
      height: lane.height,
      backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
      borderColor: lane.borderColor,
      splitOffset: split,
    };
  });
};

const headerStackHeight = computed(
  () => dayLegendBlockHeight.value + hourLegendBlockHeight.value
);
const sectionRegions = computed<BandRegion[]>(() =>
  buildSectionRegions(headerStackHeight.value + laneVerticalPadding.value)
);
const laneRegions = computed<BandRegion[]>(() => buildLaneRegions(headerStackHeight.value + laneVerticalPadding.value));
const sidebarLaneAreaOffset = computed(() =>
  Math.max(0, headerStackHeight.value + laneVerticalPadding.value - LABEL_HEIGHT)
);
const sidebarSectionRegions = computed<BandRegion[]>(() =>
  buildSectionRegions(sidebarLaneAreaOffset.value + LABEL_HEIGHT)
);
const sidebarLaneRegions = computed<BandRegion[]>(() =>
  buildLaneRegions(sidebarLaneAreaOffset.value + LABEL_HEIGHT)
);

const timelineContentHeight = computed(
  () => headerStackHeight.value + laneVerticalPadding.value * 2 + laneLayouts.value.contentHeight
);

const isDark = computed(() => markwhenStore.app?.isDark ?? false);

const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null);
const timelineScrollRef = ref<HTMLDivElement | null>(null);
const isSyncingScroll = ref(false);
const viewportHeight = ref(0);
const timelineHeight = computed(() => Math.max(timelineContentHeight.value, viewportHeight.value));

const syncScroll = (source: "sidebar" | "timeline") => {
  if (isSyncingScroll.value) return;
  isSyncingScroll.value = true;
  const sidebar = sidebarRef.value;
  const timeline = timelineScrollRef.value;
  if (sidebar && timeline) {
    if (source === "sidebar") {
      timeline.scrollTop = sidebar.getScrollTop();
    } else {
      sidebar.setScrollTop(timeline.scrollTop ?? 0);
    }
  }
  requestAnimationFrame(() => {
    isSyncingScroll.value = false;
  });
};

const updateViewportHeight = () => {
  viewportHeight.value = timelineScrollRef.value?.clientHeight ?? 0;
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
  <div class="view-container" :class="{ dark: isDark }">
    <div class="gantt-root" :class="{ dark: isDark }">
      <Sidebar
        ref="sidebarRef"
        :sidebar-width="sidebarWidth"
        :timeline-height="timelineHeight"
        :lane-area-offset="sidebarLaneAreaOffset"
        :label-area-height="LABEL_HEIGHT"
        :lane-regions="sidebarLaneRegions"
        :section-regions="sidebarSectionRegions"
        :section-title-size="sectionTitleFontSize"
        :sidebar-lanes="sidebarLanes"
        :lane-row-height="laneRowHeight"
        :target-label="targetLabel"
        :actual-label="actualLabel"
        :total-label="totalLabel"
        :legend-notice="legendNotice"
        :sidebar-totals="sidebarTotals"
        :target-color="TARGET_BAR_COLOR"
        :actual-color="ACTUAL_BAR_COLOR"
        :is-dark-theme="isDark"
        :label-column-padding-left="labelColumnPaddingLeft"
        :label-column-padding-top="labelColumnPaddingTop"
        @scroll="syncScroll('sidebar')"
        @resize-start="onResizeStart"
      />
      <div
        ref="timelineScrollRef"
        class="timeline-scroll-container"
        :class="{ dark: isDark }"
        @scroll="syncScroll('timeline')"
      >
        <Timestream
          :day-labels="dayLabels"
          :day-background-rows="dayBackgroundRows"
          :hour-markers="hourMarkers"
          :timeline-width="timelineWidth"
          :timeline-height="timelineHeight"
          :hour-width="hourWidth"
          :header-stack-height="headerStackHeight"
          :lane-vertical-padding="laneVerticalPadding"
          :lane-regions="laneRegions"
          :section-regions="sectionRegions"
          :visible-event-bars="renderedEventBars"
          :lane-row-height="laneRowHeight"
          :lane-top-offset-by-key="laneTopOffsetByKey"
          :day-legend-block-height="dayLegendBlockHeight"
          :day-legend-padding="dayLegendVerticalPadding"
          :hour-legend-padding="hourLegendVerticalPadding"
          :is-dark-theme="isDark"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  height: 100vh;
  width: 100%;
  box-sizing: border-box;
  border: 4px solid #94a3b8;
  overflow: hidden;
}

.view-container.dark {
  background-color: #27272a;
  border-color: #a1a1aa;
}

.gantt-root {
  width: 100%;
  height: 100%;
  display: flex;
  background-color: #f8fafc;
}

.gantt-root.dark {
  background-color: #27272a;
}

.timeline-scroll-container {
  flex: 1;
  height: 100%;
  overflow: auto;
  background-color: #f8fafc;
}

.timeline-scroll-container.dark {
  background-color: #27272a;
}
</style>
