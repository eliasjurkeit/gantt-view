<script setup lang="ts">
import { computed } from "vue";
import { DateTime } from "luxon";
import { iter, isEvent, toDateRange } from "@markwhen/parser";
import { useMarkwhenStore } from "../Markwhen/markwhenStore";

const markwhenStore = useMarkwhenStore();

const HOUR_WIDTH = 60; // pixels per hour

interface HourMarker {
  hour: number;
  dateTime: DateTime;
  label: string;
  isStartOfDay: boolean;
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
    </div>
  </div>
</template>

<style scoped>
.timestrip-container {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  background-color: #f8fafc;
}

.timestrip-container.dark {
  background-color: #27272a;
}

.timestrip {
  display: flex;
  flex-direction: row;
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
</style>
