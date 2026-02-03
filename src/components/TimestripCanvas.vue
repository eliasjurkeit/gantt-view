<script setup lang="ts">
import { computed, defineEmits, defineExpose, defineProps, ref } from "vue";

import type { DayLabel, HourMarker, SectionBand, VisibleEventBar } from "./types";

const props = defineProps<{
  totalWidth: number;
  trackHeight: number;
  dateLegendHeight: number;
  hourMarkers: HourMarker[];
  dayLabels: DayLabel[];
  dayBackgrounds: Array<DayLabel & { isShaded: boolean }>;
  legendStackHeight: number;
  barOffset: number;
  laneBands: SectionBand[];
  sectionBands: SectionBand[];
  eventBars: VisibleEventBar[];
  laneHeight: number;
  rowTopByKey: Record<string, number>;
  hourWidth: number;
  isDark: boolean;
}>();

const emit = defineEmits<{
  scroll: [];
}>();

const scrollRef = ref<HTMLDivElement | null>(null);

const timestripStyle = computed(() => ({
  width: `${props.totalWidth}px`,
  height: `${props.trackHeight}px`,
  "--day-legend-height": `${props.dateLegendHeight}px`,
  "--hour-label-top": `${props.dateLegendHeight + 4}px`,
}));

const onScroll = () => emit("scroll");

defineExpose({
  getScrollTop: () => scrollRef.value?.scrollTop ?? 0,
  setScrollTop: (value: number) => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = value;
    }
  },
  getClientHeight: () => scrollRef.value?.clientHeight ?? 0,
});
</script>

<template>
  <div
    ref="scrollRef"
    class="timestrip-container"
    :class="{ dark: isDark }"
    @scroll="onScroll"
  >
    <div class="timestrip" :style="timestripStyle">
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
        >
          <div
            v-if="lane.split !== undefined"
            class="lane-split"
            :style="{
              top: `${lane.split - lane.top}px`,
              borderTop: `1px dashed ${lane.border}`,
            }"
          ></div>
        </div>
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
      </div>
      <div class="events-spacer" :style="{ height: `${trackHeight}px` }"></div>
    </div>
  </div>
</template>

<style scoped>
.timestrip-container {
  flex: 1;
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

.timestrip-container.dark .day-background.shaded {
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

.lane-split {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  box-sizing: border-box;
  pointer-events: none;
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

.timestrip-container.dark .day-label {
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

.timestrip-container.dark .hour-marker {
  border-left-color: #52525b;
}

.hour-marker.day-start {
  border-left: 2px solid #94a3b8;
}

.timestrip-container.dark .hour-marker.day-start {
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

.timestrip-container.dark .hour-label {
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

.timestrip-container.dark .event-bar {
  box-shadow: 0 1px 2px rgba(2, 6, 23, 0.4);
}

.event-duration {
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}

.timestrip-container.dark .event-duration {
  color: #e2e8f0;
}

.events-spacer {
  flex-shrink: 0;
  width: 1px;
  opacity: 0;
}
</style>
