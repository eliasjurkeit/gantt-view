<script setup lang="ts">
import { defineProps } from "vue";

import type { RenderedEventBar } from "./types";

const props = defineProps<{
  visibleEventBars: RenderedEventBar[];
  laneRowHeight: number;
  headerStackHeight: number;
  contentVerticalOffset: number;
  rowTopOffsetByKey: Record<string, number>;
  timelineHeight: number;
  isDarkTheme: boolean;
}>();
</script>

<template>
  <div class="event-bars-layer" :style="{ height: `${timelineHeight}px` }">
    <div
      v-for="(bar, index) in visibleEventBars"
      :key="index"
      class="timeline-event-bar"
      :class="{ dark: isDarkTheme }"
      :style="{
        left: `${bar.leftOffset}px`,
        width: `${bar.barWidth}px`,
        top: `${
          headerStackHeight +
          contentVerticalOffset +
          (rowTopOffsetByKey[bar.groupKey] ?? 0) +
          bar.sublaneIndex * laneRowHeight
        }px`,
        height: `${laneRowHeight}px`,
        background: bar.fillColor,
        borderColor: bar.borderColor,
        borderRadius: `${bar.cornerRadius}px`,
      }"
      :title="`${bar.label} (${bar.timeRangeLabel})`"
    >
      <span class="event-duration-label">{{ bar.durationHoursLabel }}</span>
    </div>
    <div class="event-layer-spacer" :style="{ height: `${timelineHeight}px` }"></div>
  </div>
</template>

<style scoped>
.event-bars-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  pointer-events: none;
  z-index: 3;
}

.timeline-event-bar {
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

.timeline-event-bar.dark {
  box-shadow: 0 1px 2px rgba(2, 6, 23, 0.4);
}

.event-duration-label {
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}

.timeline-event-bar.dark .event-duration-label {
  color: #e2e8f0;
}

.event-layer-spacer {
  flex-shrink: 0;
  width: 1px;
  opacity: 0;
}
</style>
