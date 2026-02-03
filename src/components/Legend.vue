<script setup lang="ts">
import { defineProps } from "vue";

import type { DayLabel, HourMarker } from "./types";

const props = defineProps<{
  dayLabels: DayLabel[];
  dayBackgrounds: Array<DayLabel & { isShaded: boolean }>;
  hourMarkers: HourMarker[];
  totalWidth: number;
  trackHeight: number;
  hourWidth: number;
  isDark: boolean;
}>();
</script>

<template>
  <div
    class="day-backgrounds"
    :style="{ width: `${totalWidth}px`, height: `${trackHeight}px` }"
  >
    <div
      v-for="(day, index) in dayBackgrounds"
      :key="index"
      class="day-background"
      :class="{ shaded: day.isShaded, dark: isDark }"
      :style="{ left: `${day.left}px`, width: `${day.width}px` }"
    ></div>
  </div>
  <div class="day-labels" :style="{ width: `${totalWidth}px` }">
    <div
      v-for="(label, index) in dayLabels"
      :key="index"
      class="day-label"
      :class="{ dark: isDark }"
      :style="{ left: `${label.left}px`, width: `${label.width}px` }"
    >
      {{ label.label }}
    </div>
  </div>
  <div
    v-for="(marker, index) in hourMarkers"
    :key="index"
    class="hour-marker"
    :class="{ 'day-start': marker.isStartOfDay, dark: isDark }"
    :style="{ width: `${marker.spanHours * hourWidth}px` }"
  >
    <span class="hour-label">{{ marker.label }}</span>
  </div>
</template>

<style scoped>
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

.day-background.dark.shaded {
  background: rgba(255, 255, 255, 0.04);
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

.day-label.dark {
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

.hour-marker.dark {
  border-left-color: #52525b;
}

.hour-marker.day-start {
  border-left: 2px solid #94a3b8;
}

.hour-marker.dark.day-start {
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

.hour-marker.dark .hour-label {
  color: #a1a1aa;
}
</style>
