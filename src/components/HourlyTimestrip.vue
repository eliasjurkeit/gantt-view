<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { DateTime } from "luxon";
import { iter, isEvent, toDateRange } from "@markwhen/parser";
import { useMarkwhenStore } from "../Markwhen/markwhenStore";

const markwhenStore = useMarkwhenStore();

const HOUR_WIDTH = 60; // pixels per hour
const LABEL_HEIGHT = 24;
const LANE_HEIGHT = 20;
const LANE_GAP = 6;
const MIN_BAR_WIDTH = 6;
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

interface HourMarker {
  hour: number;
  dateTime: DateTime;
  label: string;
  isStartOfDay: boolean;
}

interface EventBar {
  title: string;
  left: number;
  width: number;
  lane: number;
  rangeLabel: string;
  color: string;
  borderColor: string;
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

const hourMarkers = computed((): HourMarker[] => {
  if (!timeRange.value) {
    return [];
  }

  const markers: HourMarker[] = [];
  const { start, end } = timeRange.value;

  // Floor to the start of the hour
  let current = start.startOf("hour");
  // Ceil to include the last hour
  const endCeiled = end.endOf("hour");

  while (current <= endCeiled) {
    const isStartOfDay = current.hour === 0;
    markers.push({
      hour: current.hour,
      dateTime: current,
      label: isStartOfDay
        ? current.toFormat("MMM d")
        : current.toFormat("HH:mm"),
      isStartOfDay,
    });
    current = current.plus({ hours: 1 });

    // Safety limit
    if (markers.length > 500) break;
  }

  return markers;
});

const totalWidth = computed(() => hourMarkers.value.length * HOUR_WIDTH);

const eventBars = computed((): EventBar[] => {
  const transformed = markwhenStore.markwhen?.transformed;
  if (!transformed || !timeRange.value) {
    return [];
  }

  const { start } = timeRange.value;
  const bars: Array<
    EventBar & { startTime: DateTime; endTime: DateTime }
  > = [];

  for (const { eventy } of iter(transformed)) {
    if (!isEvent(eventy)) continue;
    const dr = toDateRange(eventy.dateRangeIso);
    const startTime = dr.fromDateTime;
    const endTime = dr.toDateTime;
    const durationHours = Math.max(
      0,
      endTime.diff(startTime, "hours").hours
    );
    const left = startTime.diff(start, "hours").hours * HOUR_WIDTH;
    const width = Math.max(durationHours * HOUR_WIDTH, MIN_BAR_WIDTH);
    const title =
      eventy.firstLine?.restTrimmed ||
      eventy.firstLine?.rest ||
      "Event";
    const rangeLabel =
      startTime.hasSame(endTime, "day")
        ? `${startTime.toFormat("HH:mm")}–${endTime.toFormat("HH:mm")}`
        : `${startTime.toFormat("MMM d HH:mm")}–${endTime.toFormat(
            "MMM d HH:mm"
          )}`;
    const colorIndex =
      PASTEL_PALETTE.length === 0
        ? 0
        : hashString(`${title}-${eventy.dateRangeIso?.fromDateTimeIso ?? ""}`) %
          PASTEL_PALETTE.length;
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
      startTime,
      endTime,
    });
  }

  bars.sort((a, b) => +a.startTime - +b.startTime);
  bars.forEach((bar, index) => {
    bar.lane = index;
  });

  return bars.map(({ startTime, endTime, ...rest }) => rest);
});

const laneCount = computed(() => Math.max(1, eventBars.value.length));

const totalHeight = computed(
  () => LABEL_HEIGHT + laneCount.value * (LANE_HEIGHT + LANE_GAP) + 12
);

const isDark = computed(() => markwhenStore.app?.isDark ?? false);

const sidebarScrollRef = ref<HTMLDivElement | null>(null);
const timestripScrollRef = ref<HTMLDivElement | null>(null);
const isSyncingScroll = ref(false);

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
</script>

<template>
  <div class="gantt-root" :class="{ dark: isDark }">
    <div class="gantt-sidebar" :style="{ width: `${sidebarWidth}px` }">
      <div
        ref="sidebarScrollRef"
        class="gantt-sidebar-scroll"
        @scroll="syncScroll('sidebar')"
      >
        <div class="gantt-sidebar-content" :style="{ height: `${totalHeight}px` }">
          <div class="gantt-sidebar-header" :style="{ height: `${LABEL_HEIGHT}px` }">
            Events
          </div>
          <div
            v-for="(bar, index) in eventBars"
            :key="index"
            class="gantt-sidebar-row"
            :style="{ height: `${LANE_HEIGHT + LANE_GAP}px` }"
            :title="bar.title"
          >
            <span class="gantt-sidebar-text">{{ bar.title }}</span>
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
        :style="{ width: `${totalWidth}px` }"
      >
        <div
          v-for="(marker, index) in hourMarkers"
          :key="index"
          class="hour-marker"
          :class="{ 'day-start': marker.isStartOfDay }"
          :style="{ width: `${HOUR_WIDTH}px` }"
        >
          <span class="hour-label">{{ marker.label }}</span>
        </div>
        <div class="events-layer" :style="{ height: `${totalHeight}px` }">
          <div
            v-for="(bar, index) in eventBars"
            :key="index"
            class="event-bar"
            :style="{
              left: `${bar.left}px`,
              width: `${bar.width}px`,
              top: `${LABEL_HEIGHT + bar.lane * (LANE_HEIGHT + LANE_GAP)}px`,
              height: `${LANE_HEIGHT}px`,
              background: bar.color,
              borderColor: bar.borderColor,
            }"
            :title="`${bar.title} (${bar.rangeLabel})`"
          >
            <span class="event-title">{{ bar.title }}</span>
          </div>
        </div>
        <div class="events-spacer" :style="{ height: `${totalHeight}px` }"></div>
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
}

.gantt-sidebar-header {
  display: flex;
  align-items: center;
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

.gantt-sidebar-row {
  display: flex;
  align-items: center;
  padding: 0 12px;
  box-sizing: border-box;
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

.hour-marker {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 8px;
  border-left: 1px dashed #cbd5e1;
  padding-left: 4px;
  box-sizing: border-box;
  height: 100%;
}

.dark .hour-marker {
  border-left-color: #52525b;
}

.hour-marker.day-start {
  border-left: 2px solid #94a3b8;
  background-color: rgba(148, 163, 184, 0.1);
}

.dark .hour-marker.day-start {
  border-left-color: #a1a1aa;
  background-color: rgba(161, 161, 170, 0.1);
}

.hour-label {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  font-family: system-ui, -apple-system, sans-serif;
}

.dark .hour-label {
  color: #a1a1aa;
}

.day-start .hour-label {
  font-weight: 600;
  color: #475569;
}

.dark .day-start .hour-label {
  color: #d4d4d8;
}

.events-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  pointer-events: none;
}

.event-bar {
  position: absolute;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.15);
  padding: 2px 6px;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: auto;
}

.dark .event-bar {
  box-shadow: 0 1px 2px rgba(2, 6, 23, 0.4);
}

.event-title {
  font-size: 11px;
  line-height: 1.3;
  color: #0f172a;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: block;
}

.dark .event-title {
  color: #0f172a;
}

.events-spacer {
  flex-shrink: 0;
  width: 1px;
  opacity: 0;
}
</style>
