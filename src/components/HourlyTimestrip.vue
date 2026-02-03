<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { DateTime } from "luxon";
import { iter, isEvent, toDateRange } from "@markwhen/parser";
import { useMarkwhenStore } from "../Markwhen/markwhenStore";

const markwhenStore = useMarkwhenStore();

const HOUR_WIDTH = 60; // default pixels per hour
const MARKER_HOURS = 2;
const hourWidth = computed(() => {
  const header = headerOptions.value;
  if (!header) return HOUR_WIDTH;
  const raw = header.scale;
  if (raw === undefined || raw === null) return HOUR_WIDTH;
  const value = Number(raw);
  if (!Number.isFinite(value)) return HOUR_WIDTH;
  return Math.min(200, Math.max(1, value));
});
const LABEL_HEIGHT = 24;
const LEGEND_GAP = 25;
const BAR_OFFSET = 12;
const LANE_HEIGHT = 20;
const DEFAULT_LANE_GAP = 6;
const SUBLANE_GAP = 0;
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

interface HourMarker {
  hour: number;
  dateTime: DateTime;
  label: string;
  isStartOfDay: boolean;
  spanHours: number;
}

interface DayLabel {
  label: string;
  left: number;
  width: number;
}

interface EventBar {
  title: string;
  left: number;
  width: number;
  lane: number;
  rangeLabel: string;
  color: string;
  borderColor: string;
  durationHours: string;
  groupKey: string;
  sublane: number;
  isIdEvent: boolean;
  sectionName?: string;
}

interface DailyHourRange {
  startMinutes: number;
  endMinutes: number;
}

interface SectionBand {
  title: string;
  top: number;
  height: number;
  fill: string;
  border: string;
}

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

  // Check if we found any events
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

const laneHeight = computed(() => {
  const header = headerOptions.value;
  if (!header) return LANE_HEIGHT;
  const raw = header.laneHeight;
  const value = Number(raw);
  if (!Number.isFinite(value)) return LANE_HEIGHT;
  return Math.min(60, Math.max(8, value));
});

const laneGap = computed(() => {
  const header = headerOptions.value;
  if (!header) return DEFAULT_LANE_GAP;
  const raw = header.laneGap;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_LANE_GAP;
  return Math.min(32, Math.max(0, value));
});

const barRadius = computed(() => {
  const header = headerOptions.value;
  if (!header) return 6;
  const raw = header.barRadius;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 6;
  return Math.min(24, Math.max(0, value));
});

const clampFontSize = (raw: unknown, fallback: number) => {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(32, Math.max(8, value));
};

const sectionOpacity = computed(() => {
  const header = headerOptions.value;
  if (!header) return 0.12;
  const raw = header.sectionBandOpacity;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0.12;
  return Math.min(1, Math.max(0, value));
});

const laneBandOpacity = computed(() => {
  const header = headerOptions.value;
  if (!header) return 0.08;
  const raw = header.laneBandOpacity;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 0.08;
  return Math.min(1, Math.max(0, value));
});

const sectionTitleFontSize = computed(() =>
  clampFontSize(headerOptions.value?.sectionTitleFontSize, 12)
);

// Padding inside a section between its outer lanes and the section border.
const sectionPadding = computed(() => {
  const header = headerOptions.value;
  const minPadding = sectionTitleFontSize.value + 6;
  if (!header) return minPadding;
  const raw = header.sectionPadding;
  const value = Number(raw);
  if (!Number.isFinite(value)) return minPadding;
  return Math.min(64, Math.max(minPadding, value));
});

// Extra gap applied only between different sections (measured from the section border).
const sectionGap = computed(() => {
  const header = headerOptions.value;
  if (!header) return DEFAULT_SECTION_GAP;
  const raw = header.sectionGap;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_SECTION_GAP;
  return Math.min(96, Math.max(0, value));
});

const targetLabel = computed(() => {
  const header = headerOptions.value;
  const raw = header?.targetLabel;
  return typeof raw === "string" && raw.trim().length > 0
    ? raw.trim()
    : "Target";
});

const actualLabel = computed(() => {
  const header = headerOptions.value;
  const raw = header?.actualLabel;
  return typeof raw === "string" && raw.trim().length > 0
    ? raw.trim()
    : "Actual";
});

const totalLabel = computed(() => {
  const header = headerOptions.value;
  const raw = header?.totalLabel;
  return typeof raw === "string" && raw.trim().length > 0
    ? raw.trim()
    : "Total";
});

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

const isSkippedDay = (dateTime: DateTime) =>
  skippedDays.value.has(dateTime.toISODate());

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

const getDailySegments = (day: DateTime) => {
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

  while (day <= lastDay) {
    if (isSkippedDay(day)) {
      day = day.plus({ days: 1 });
      continue;
    }

    const segments = getDailySegments(day);
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
  while (day <= lastDay) {
    if (isSkippedDay(day)) {
      day = day.plus({ days: 1 });
      continue;
    }
    const segments = getDailySegments(day);
    if (segments.length === 0) {
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
        const nextMinutes = Math.min(
          minutes + 60 * MARKER_HOURS,
          segment.endMinutes
        );
        const markerEnd = DateTime.min(
          day.plus({ minutes: nextMinutes }),
          endBound
        );
        const spanHours = markerEnd.diff(markerTime, "hours").hours;
        if (spanHours <= 0) {
          minutes = nextMinutes;
          continue;
        }
        markers.push({
          hour: markerTime.hour,
          dateTime: markerTime,
          label: `${markerTime.toFormat("HH:mm")} - ${markerEnd.toFormat(
            "HH:mm"
          )}`,
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
  hourMarkers.value.reduce(
    (sum, marker) => sum + marker.spanHours * hourWidth.value,
    0
  )
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
  const opacity = sectionOpacity.value; // dependency to recompute fills
  if (!transformed) {
    return {
      eventSection: new Map<string, string>(),
      sectionColors: new Map<string, { fill: string; border: string; base: string }>(),
      sectionOrder: [] as string[],
    };
  }

  const eventSection = new Map<string, string>();
  const sectionColors = new Map<
    string,
    { fill: string; border: string; base: string }
  >();
  const sectionOrder: string[] = [];

  const registerSection = (name: string) => {
    if (sectionColors.has(name)) return sectionColors.get(name)!;
    const colorIndex =
      PASTEL_PALETTE.length === 0
        ? 0
        : sectionOrder.length % PASTEL_PALETTE.length;
    const base = PASTEL_PALETTE[colorIndex] ?? "#A5D8FF";
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
      node.children.forEach((child: any, idx: number) =>
        walk(child, [...path, idx], sectionName)
      );
    }
  };

  walk(transformed, []);

  return { eventSection, sectionColors, sectionOrder };
});

const eventBars = computed((): EventBar[] => {
  const transformed = markwhenStore.markwhen?.transformed;
  if (!transformed || !timeRange.value) {
    return [];
  }

  const { start } = timeRange.value;
  const eventSection = sectionsInfo.value.eventSection;
  const sectionColors = sectionsInfo.value.sectionColors;
  const sectionOrder = sectionsInfo.value.sectionOrder;
  const bars: Array<
    EventBar & { startTime: DateTime; endTime: DateTime }
  > = [];

  for (const { eventy, path } of iter(transformed)) {
    if (!isEvent(eventy)) continue;
    const dr = toDateRange(eventy.dateRangeIso);
    const startTime = dr.fromDateTime;
    const endTime = dr.toDateTime;
    const durationMinutes = visibleMinutesBetween(startTime, endTime);
    if (durationMinutes <= 0) continue;
    const durationHoursValue = durationMinutes / 60;
    const durationHours =
      Math.round(durationHoursValue * 10) % 10 === 0
        ? `${Math.round(durationHoursValue)}`
        : durationHoursValue.toFixed(1);
    const left =
      (visibleMinutesBetween(start, startTime) / 60) * hourWidth.value;
    const width = Math.max(
      (durationMinutes / 60) * hourWidth.value,
      MIN_BAR_WIDTH
    );
    const title =
      eventy.firstLine?.restTrimmed ||
      eventy.firstLine?.rest ||
      "Event";
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
        : `${startTime.toFormat("MMM d HH:mm")}–${endTime.toFormat(
            "MMM d HH:mm"
          )}`;
    const colorIndex =
      PASTEL_PALETTE.length === 0
        ? 0
        : hashString(groupKey) % PASTEL_PALETTE.length;
    const color = PASTEL_PALETTE[colorIndex] ?? "#A5D8FF";
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
    });
  }

  bars.sort((a, b) => +a.startTime - +b.startTime);
  const groupInfo = new Map<
    string,
    {
      bars: Array<
        EventBar & { startTime: DateTime; endTime: DateTime }
      >;
      earliest: DateTime;
      sublaneCount: number;
    }
  >();

  for (const bar of bars) {
    const entry = groupInfo.get(bar.groupKey) ?? {
      bars: [],
      earliest: bar.startTime,
      sublaneCount: 0,
    };
    entry.bars.push(bar);
    if (+bar.startTime < +entry.earliest) entry.earliest = bar.startTime;
    groupInfo.set(bar.groupKey, entry);
  }

  const groupOrder = Array.from(groupInfo.entries()).sort(
    (a, b) => +a[1].earliest - +b[1].earliest
  );

  const lanesBySection = new Map<string, Set<number>>();

  groupOrder.forEach(([groupKey, info], groupIndex) => {
    const groupBars = info.bars.sort(
      (a, b) => +a.startTime - +b.startTime
    );
    const idBars = groupBars.filter((bar) => bar.isIdEvent);
    const nonIdBars = groupBars.filter((bar) => !bar.isIdEvent);

    const assignSublanes = (
      barsToAssign: Array<EventBar & { startTime: DateTime; endTime: DateTime }>,
      sublaneEnds: DateTime[]
    ) => {
      for (const bar of barsToAssign) {
        let sublaneIndex = sublaneEnds.findIndex(
          (endTime) => +bar.startTime >= +endTime
        );
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

    info.sublaneCount = idSublaneCount + nonIdSublaneEnds.length;
    for (const bar of groupBars) {
      bar.lane = groupIndex;
      const key = bar.sectionName ?? `__orphan_lane_${groupIndex}`;
      const set = lanesBySection.get(key) ?? new Set<number>();
      set.add(groupIndex);
      lanesBySection.set(key, set);
    }
    groupInfo.set(groupKey, info);
  });

  return bars.map(({ startTime, endTime, lane, ...rest }) => {
    const baseColor = rest.isIdEvent ? TARGET_BAR_COLOR : ACTUAL_BAR_COLOR;
    return {
      ...rest,
      lane,
      color: baseColor,
      borderColor: darkenHex(baseColor, 24),
    };
  });
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
    }
  >();

  for (const bar of eventBars.value) {
    const laneColor = (() => {
      if (bar.sectionName) {
        const base = sectionsInfo.value.sectionColors.get(bar.sectionName)?.base;
        if (base) return base;
      }
      const paletteIndex =
        PASTEL_PALETTE.length === 0
          ? 0
          : Math.abs(hashString(bar.groupKey)) % PASTEL_PALETTE.length;
      return PASTEL_PALETTE[paletteIndex] ?? "#A5D8FF";
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
    };
    entry.lane = bar.lane;
    entry.sublaneCount = Math.max(entry.sublaneCount, bar.sublane + 1);
    while (entry.totals.length <= bar.sublane) {
      entry.totals.push(0);
    }
    const duration = Number(bar.durationHours);
    if (Number.isFinite(duration)) {
      entry.totals[bar.sublane] += duration;
    }
    if (bar.sectionName) {
      entry.sectionHits[bar.sectionName] =
        (entry.sectionHits[bar.sectionName] ?? 0) + 1;
      const currentCount = entry.sectionName
        ? entry.sectionHits[entry.sectionName] ?? 0
        : 0;
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
      totals: value.totals.map((total) =>
        Math.round(total * 10) % 10 === 0
          ? `${Math.round(total)}`
          : total.toFixed(1)
     ),
   }))
    .sort((a, b) => a.lane - b.lane);

  let offset = 0;
  const layout = rows.map((row, index) => {
    const height =
      row.sublaneCount * (laneHeight.value + SUBLANE_GAP) - SUBLANE_GAP;
    const top = offset;
    const gapToNext =
      index === rows.length - 1
        ? 0
        : laneGap.value +
          (row.sectionName === rows[index + 1].sectionName
            ? 0
            : sectionGap.value + sectionPadding.value * 2);
    offset += height + gapToNext;
    return { ...row, top, height, nextGap: gapToNext };
  });

  const tailGap =
    rows.length && rows[rows.length - 1].sectionName
      ? sectionPadding.value + sectionGap.value
      : 0;

  const contentHeight = offset + tailGap;

  return { rows: layout, contentHeight, totals: rows, tailGap };
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
  return totals.map((total) =>
    Math.round(total * 10) % 10 === 0
      ? `${Math.round(total)}`
      : total.toFixed(1)
  );
});

const rowTopByKey = computed(() => {
  const map = new Map<string, number>();
  rowLayouts.value.rows.forEach((row) => {
    map.set(row.key, row.top);
  });
  return map;
});

const sectionBands = computed<SectionBand[]>(() => {
  const bands = new Map<
    string,
    { title: string; minTop: number; maxBottom: number; fill: string; border: string }
  >();
  const rowAreaOffset = legendStackHeight.value + BAR_OFFSET;
  const bandAreaBottom =
    rowAreaOffset +
    Math.max(0, rowLayouts.value.contentHeight - (sectionPadding.value + sectionGap.value));

  rowLayouts.value.rows.forEach((row) => {
    if (!row.sectionName) return;
    const colors = sectionsInfo.value.sectionColors.get(row.sectionName);
    const fill = colors?.fill ?? "rgba(148, 163, 184, 0.12)";
    const border = colors?.border ?? "rgba(148, 163, 184, 0.4)";
    const top = rowAreaOffset + row.top;
    const bottom = top + row.height;
    const existing = bands.get(row.sectionName);
    if (!existing) {
      bands.set(row.sectionName, {
        title: row.sectionName,
        minTop: top,
        maxBottom: bottom,
        fill,
        border,
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
        title: band.title,
        top,
        height: Math.max(0, bottom - top),
        fill: band.fill,
        border: band.border,
      };
    })
    .sort((a, b) => a.top - b.top);
});

const laneBands = computed<SectionBand[]>(() => {
  const bands: SectionBand[] = [];
  const rowAreaOffset = legendStackHeight.value + BAR_OFFSET;
  const opacity = laneBandOpacity.value; // dependency for fill
  rowLayouts.value.rows.forEach((row) => {
    const rgb = hexToRgb(row.color) ?? { r: 148, g: 163, b: 184 };
    bands.push({
      title: row.label,
      top: rowAreaOffset + row.top,
      height: row.height,
      fill: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
      border: row.borderColor,
    });
  });
  return bands;
});

const totalRowTopOffset = computed(() => 0);

const sidebarSectionBands = computed<SectionBand[]>(() => {
  const bands = new Map<
    string,
    { title: string; minTop: number; maxBottom: number; fill: string; border: string }
  >();
  const rowAreaOffset = sidebarRowsOffset.value + LABEL_HEIGHT;
  const bandAreaBottom =
    rowAreaOffset +
    Math.max(0, rowLayouts.value.contentHeight - (sectionPadding.value + sectionGap.value));

  rowLayouts.value.rows.forEach((row) => {
    if (!row.sectionName) return;
    const colors = sectionsInfo.value.sectionColors.get(row.sectionName);
    const fill = colors?.fill ?? "rgba(148, 163, 184, 0.12)";
    const border = colors?.border ?? "rgba(148, 163, 184, 0.4)";
    const top = rowAreaOffset + row.top;
    const bottom = top + row.height;
    const existing = bands.get(row.sectionName);
    if (!existing) {
      bands.set(row.sectionName, {
        title: row.sectionName,
        minTop: top,
        maxBottom: bottom,
        fill,
        border,
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
        title: band.title,
        top,
        height: Math.max(0, bottom - top),
        fill: band.fill,
        border: band.border,
      };
    })
    .sort((a, b) => a.top - b.top);
});

const sidebarLaneBands = computed<SectionBand[]>(() => {
  const bands: SectionBand[] = [];
  const rowAreaOffset = sidebarRowsOffset.value + LABEL_HEIGHT;
  const opacity = laneBandOpacity.value; // dependency for fill
  rowLayouts.value.rows.forEach((row) => {
    const rgb = hexToRgb(row.color) ?? { r: 148, g: 163, b: 184 };
    bands.push({
      title: row.label,
      top: rowAreaOffset + row.top,
      height: row.height,
      fill: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`,
      border: row.borderColor,
    });
  });
  return bands;
});

const dateLegendHeight = computed(() => {
  const header = headerOptions.value;
  if (!header) return 18;
  const raw = header.dateLegendHeight;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 18;
  return Math.min(80, Math.max(10, value));
});

const hourLegendHeight = computed(() => {
  const header = headerOptions.value;
  if (!header) return 36;
  const raw = header.hourLegendHeight;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 36;
  return Math.min(120, Math.max(16, value));
});

const legendStackHeight = computed(
  () => dateLegendHeight.value + hourLegendHeight.value + LEGEND_GAP
);

const sidebarRowsOffset = computed(() =>
  Math.max(0, legendStackHeight.value + BAR_OFFSET - LABEL_HEIGHT)
);

const totalHeight = computed(
  () =>
    legendStackHeight.value +
    BAR_OFFSET +
    rowLayouts.value.contentHeight +
    12
);

const isDark = computed(() => markwhenStore.app?.isDark ?? false);

const sidebarScrollRef = ref<HTMLDivElement | null>(null);
const timestripScrollRef = ref<HTMLDivElement | null>(null);
const isSyncingScroll = ref(false);
const viewportHeight = ref(0);
const trackHeight = computed(() =>
  Math.max(totalHeight.value, viewportHeight.value)
);

const syncScroll = (source: "sidebar" | "timestrip") => {
  if (isSyncingScroll.value) return;
  isSyncingScroll.value = true;
  const sidebar = sidebarScrollRef.value;
  const timestrip = timestripScrollRef.value;
  if (!sidebar || !timestrip) {
    isSyncingScroll.value = false;
    return;
  }
  if (source === "sidebar") {
    timestrip.scrollTop = sidebar.scrollTop;
  } else {
    sidebar.scrollTop = timestrip.scrollTop;
  }
  requestAnimationFrame(() => {
    isSyncingScroll.value = false;
  });
};

const updateViewportHeight = () => {
  viewportHeight.value = timestripScrollRef.value?.clientHeight ?? 0;
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
    <div class="gantt-sidebar" :style="{ width: `${sidebarWidth}px` }">
      <div
        ref="sidebarScrollRef"
        class="gantt-sidebar-scroll"
        @scroll="syncScroll('sidebar')"
      >
        <div
          class="gantt-sidebar-content"
          :style="{
            height: `${totalHeight}px`,
            paddingTop: `${sidebarRowsOffset + LABEL_HEIGHT}px`,
          }"
        >
          <div
            class="gantt-sidebar-sections"
            :style="{ height: `${totalHeight}px` }"
          >
            <div
              v-for="(lane, index) in sidebarLaneBands"
              :key="`lane-${index}`"
              class="gantt-sidebar-lane-band"
              :style="{
                top: `${lane.top}px`,
                height: `${lane.height}px`,
                background: lane.fill,
                borderTop: `1px solid ${lane.border}`,
                borderBottom: `1px solid ${lane.border}`,
              }"
            ></div>
            <div
              v-for="(section, index) in sidebarSectionBands"
              :key="index"
              class="gantt-sidebar-section-band"
              :style="{
                top: `${section.top}px`,
                height: `${section.height}px`,
                background: section.fill,
                borderTop: `1px solid ${section.border}`,
                borderBottom: `1px solid ${section.border}`,
              }"
            >
              <span
                class="gantt-sidebar-section-label"
                :style="{
                  fontSize: `${sectionTitleFontSize}px`,
                }"
              >
                {{ section.title }}
              </span>
            </div>
          </div>
          <div
            v-for="(row, index) in sidebarRows"
            :key="row.key"
            class="gantt-sidebar-row"
            :style="{
              height: `${row.height}px`,
              marginBottom:
                index === sidebarRows.length - 1 ? '0px' : `${row.nextGap}px`,
            }"
            :title="row.label"
          >
            <div
              class="gantt-sidebar-rect"
            :style="{
              height: `${row.height}px`,
              background: row.color,
              borderTopColor: row.borderColor,
              borderBottomColor: row.borderColor,
            }"
          >
              <span class="gantt-sidebar-text">{{ row.label }}</span>
              <div class="gantt-sidebar-totals">
                <div
                  v-for="(total, idx) in row.totals"
                  :key="idx"
                  class="gantt-sidebar-total"
                  :style="{ height: `${laneHeight}px` }"
                >
                  <span class="gantt-sidebar-total-label">
                    {{ idx === 0 ? targetLabel : actualLabel }}
                  </span>
                  <span class="gantt-sidebar-total-value">{{ total }}</span>
                </div>
              </div>
            </div>
          </div>
          <div
            class="gantt-sidebar-total-row"
            :style="{ marginTop: `${totalRowTopOffset}px` }"
          >
            <span class="gantt-sidebar-total-label">
              {{ totalLabel }}
            </span>
            <div class="gantt-sidebar-totals">
              <div
                v-for="(total, idx) in sidebarTotals"
                :key="idx"
                class="gantt-sidebar-total"
              >
                <span class="gantt-sidebar-total-label">
                  {{ idx === 0 ? targetLabel : actualLabel }}
                </span>
                <span class="gantt-sidebar-total-value">{{ total }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="gantt-sidebar-resizer" @mousedown="onResizeStart"></div>
    </div>
    <div
      ref="timestripScrollRef"
      class="timestrip-container"
      @scroll="syncScroll('timestrip')"
    >
      <div
        class="timestrip"
        :style="{
          width: `${totalWidth}px`,
          height: `${trackHeight}px`,
          '--day-legend-height': `${dateLegendHeight}px`,
          '--hour-label-top': `${dateLegendHeight + 4}px`,
        }"
      >
        <div
          class="section-layer"
          :style="{ width: `${totalWidth}px`, height: `${trackHeight}px` }"
        >
          <div
            v-for="(lane, index) in laneBands"
            :key="`lane-${index}`"
            class="lane-block"
            :style="{
              top: `${lane.top}px`,
              height: `${lane.height}px`,
              width: `${totalWidth}px`,
              background: lane.fill,
              borderTop: `1px solid ${lane.border}`,
              borderBottom: `1px solid ${lane.border}`,
            }"
            :title="lane.title"
          ></div>
          <div
            v-for="(section, index) in sectionBands"
            :key="index"
            class="section-block"
            :style="{
              top: `${section.top}px`,
              height: `${section.height}px`,
              width: `${totalWidth}px`,
              background: section.fill,
              borderTop: `1px solid ${section.border}`,
              borderBottom: `1px solid ${section.border}`,
            }"
            :title="section.title"
          ></div>
        </div>
        <div
          class="day-backgrounds"
          :style="{ width: `${totalWidth}px`, height: `${trackHeight}px` }"
        >
          <div
            v-for="(day, index) in dayBackgrounds"
            :key="index"
            class="day-background"
            :class="{ shaded: day.isShaded }"
            :style="{ left: `${day.left}px`, width: `${day.width}px` }"
          ></div>
        </div>
        <div class="day-labels" :style="{ width: `${totalWidth}px` }">
          <div
            v-for="(label, index) in dayLabels"
            :key="index"
            class="day-label"
            :style="{ left: `${label.left}px`, width: `${label.width}px` }"
          >
            {{ label.label }}
          </div>
        </div>
        <div
          v-for="(marker, index) in hourMarkers"
          :key="index"
          class="hour-marker"
          :class="{ 'day-start': marker.isStartOfDay }"
          :style="{ width: `${marker.spanHours * hourWidth}px` }"
        >
          <span class="hour-label">{{ marker.label }}</span>
        </div>
        <div class="events-layer" :style="{ height: `${trackHeight}px` }">
          <div
            v-for="(bar, index) in eventBars"
            :key="index"
            class="event-bar"
            :style="{
              left: `${bar.left}px`,
              width: `${bar.width}px`,
              top: `${
                legendStackHeight +
                BAR_OFFSET +
                (rowTopByKey.get(bar.groupKey) ?? 0) +
                bar.sublane * (laneHeight + SUBLANE_GAP)
              }px`,
              height: `${laneHeight}px`,
              background: bar.color,
              borderColor: bar.borderColor,
              opacity: 1,
              borderRadius: `${barRadius}px`,
              outline: 'none',
              backgroundImage: 'none',
            }"
            :title="`${bar.title} (${bar.rangeLabel})`"
          >
            <span class="event-duration">{{ bar.durationHours }}</span>
          </div>
        </div>
        <div class="events-spacer" :style="{ height: `${trackHeight}px` }"></div>
      </div>
    </div>
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

.gantt-sidebar {
  position: relative;
  height: 100%;
  border-right: 1px solid rgba(148, 163, 184, 0.4);
  background-color: rgba(226, 232, 240, 0.65);
  min-width: 140px;
  max-width: 480px;
}

.gantt-root.dark .gantt-sidebar {
  border-right-color: rgba(148, 163, 184, 0.2);
  background-color: rgba(24, 24, 27, 0.7);
}

.gantt-sidebar-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.gantt-sidebar-content {
  width: 100%;
  position: relative;
}

.gantt-sidebar-sections {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.gantt-sidebar-lane-band {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
}

.gantt-sidebar-section-band {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  padding: 6px 8px;
  z-index: 0;
}

.gantt-sidebar-section-label {
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
  position: absolute;
  top: 4px;
  left: 6px;
  z-index: 2;
  pointer-events: none;
}

.gantt-root.dark .gantt-sidebar-section-label {
  color: #e2e8f0;
}

.gantt-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  border-bottom: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(241, 245, 249, 0.9);
  position: sticky;
  top: 0;
  z-index: 2;
}

.gantt-root.dark .gantt-sidebar-header {
  color: #e2e8f0;
  background: rgba(39, 39, 42, 0.95);
  border-bottom-color: rgba(148, 163, 184, 0.2);
}

.gantt-sidebar-smallprint {
  font-size: 10px;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.gantt-root.dark .gantt-sidebar-smallprint {
  color: #94a3b8;
}

.gantt-sidebar-row {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
}

.gantt-sidebar-rect {
  display: flex;
  align-items: center;
  padding: 0 12px;
  box-sizing: border-box;
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  border-left: 0;
  border-right: 0;
  border-radius: 0;
  width: 100%;
  justify-content: space-between;
}

.gantt-sidebar-text {
  font-size: 12px;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gantt-root.dark .gantt-sidebar-text {
  color: #e2e8f0;
}

.gantt-sidebar-totals {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-left: 12px;
  text-align: left;
}

.gantt-sidebar-total {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.gantt-sidebar-total-label {
  font-size: 11px;
  color: #1f2937;
  text-transform: capitalize;
}

.gantt-root.dark .gantt-sidebar-total-label {
  color: #e2e8f0;
}

.gantt-sidebar-total-value {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  margin-left: auto;
  text-align: right;
  min-width: 2ch;
}

.gantt-root.dark .gantt-sidebar-total-value {
  color: #e2e8f0;
}

.gantt-sidebar-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.15);
  position: relative;
  z-index: 1;
}

.gantt-root.dark .gantt-sidebar-total-row {
  border-top-color: rgba(226, 232, 240, 0.2);
}

.gantt-sidebar-resizer {
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
}

.timestrip-container {
  flex: 1;
  height: 100%;
  overflow: auto;
  background-color: #f8fafc;
}

.gantt-root.dark .timestrip-container {
  background-color: #27272a;
}

.timestrip {
  display: flex;
  flex-direction: row;
  position: relative;
  height: 100%;
}

.day-backgrounds {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.day-background {
  position: absolute;
  top: 0;
  height: 100%;
}

.day-background.shaded {
  background: rgba(148, 163, 184, 0.08);
}

.gantt-root.dark .day-background.shaded {
  background: rgba(255, 255, 255, 0.04);
}

.section-layer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.lane-block {
  position: absolute;
  left: 0;
  height: 100%;
  box-sizing: border-box;
}

.section-block {
  position: absolute;
  left: 0;
  height: 100%;
  box-sizing: border-box;
}

.day-labels {
  position: absolute;
  top: 4px;
  left: 0;
  height: var(--day-legend-height, 18px);
  pointer-events: none;
  z-index: 2;
}

.day-label {
  position: absolute;
  top: 0;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.gantt-root.dark .day-label {
  color: #e2e8f0;
}

.hour-marker {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 8px;
  border-left: 1px dashed #cbd5e1;
  padding-left: 4px;
  box-sizing: border-box;
  height: 100%;
  position: relative;
  overflow: visible;
  z-index: 1;
}

.dark .hour-marker {
  border-left-color: #52525b;
}

.hour-marker.day-start {
  border-left: 2px solid #94a3b8;
}

.dark .hour-marker.day-start {
  border-left-color: #a1a1aa;
}

.hour-label {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  font-family: system-ui, -apple-system, sans-serif;
  position: absolute;
  top: var(--hour-label-top, 4px);
  left: 50%;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  display: inline-block;
  transform: translateX(-50%);
}

.dark .hour-label {
  color: #a1a1aa;
}


.events-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  pointer-events: none;
  z-index: 3;
}

.event-bar {
  position: absolute;
  background: transparent;
  border: 1px solid transparent;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.15);
  padding: 2px 6px;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .event-bar {
  box-shadow: 0 1px 2px rgba(2, 6, 23, 0.4);
}

.event-duration {
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}


.events-spacer {
  flex-shrink: 0;
  width: 1px;
  opacity: 0;
}
</style>
