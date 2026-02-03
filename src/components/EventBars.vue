<script setup lang="ts">
import { defineProps } from "vue";

import type { VisibleEventBar } from "./types";

const props = defineProps<{
  eventBars: VisibleEventBar[];
  laneHeight: number;
  legendStackHeight: number;
  barOffset: number;
  rowTopByKey: Record<string, number>;
  trackHeight: number;
  isDark: boolean;
}>();
</script>

<template>
  <div class="events-layer" :style="{ height: `${trackHeight}px` }">
    <div
      v-for="(bar, index) in eventBars"
      :key="index"
      class="event-bar"
      :class="{ dark: isDark }"
      :style="{
        left: `${bar.left}px`,
        width: `${bar.width}px`,
        top: `${
          legendStackHeight +
          barOffset +
          (rowTopByKey[bar.groupKey] ?? 0) +
          bar.sublane * laneHeight
        }px`,
        height: `${laneHeight}px`,
        background: bar.color,
        borderColor: bar.borderColor,
        borderRadius: `${bar.barRadius}px`,
      }"
      :title="`${bar.title} (${bar.rangeLabel})`"
    >
      <span class="event-duration">{{ bar.durationHours }}</span>
    </div>
    <div class="events-spacer" :style="{ height: `${trackHeight}px` }"></div>
  </div>
</template>

<style scoped>
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

.event-bar.dark {
  box-shadow: 0 1px 2px rgba(2, 6, 23, 0.4);
}

.event-duration {
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}

.event-bar.dark .event-duration {
  color: #e2e8f0;
}

.events-spacer {
  flex-shrink: 0;
  width: 1px;
  opacity: 0;
}
</style>
