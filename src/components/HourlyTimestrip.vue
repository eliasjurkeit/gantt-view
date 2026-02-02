<script setup lang="ts">
import { computed } from "vue";
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

  const laneEndTimes: DateTime[] = [];
  for (const bar of bars) {
    let laneIndex = laneEndTimes.findIndex(
      (laneEnd) => +bar.startTime >= +laneEnd
    );
    if (laneIndex === -1) {
      laneIndex = laneEndTimes.length;
      laneEndTimes.push(bar.endTime);
    } else {
      laneEndTimes[laneIndex] = bar.endTime;
    }
    bar.lane = laneIndex;
  }

  return bars.map(({ startTime, endTime, ...rest }) => rest);
});

const laneCount = computed(() =>
  Math.max(1, eventBars.value.reduce((max, bar) => Math.max(max, bar.lane + 1), 0))
);

const totalHeight = computed(
  () => LABEL_HEIGHT + laneCount.value * (LANE_HEIGHT + LANE_GAP) + 12
);

const isDark = computed(() => markwhenStore.app?.isDark ?? false);
</script>

<template>
  <div
    class="timestrip-container"
    :class="{ dark: isDark }"
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
</template>

<style scoped>
.timestrip-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #f8fafc;
}

.timestrip-container.dark {
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
