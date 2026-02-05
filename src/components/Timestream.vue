<script setup lang="ts">
import { computed, defineProps } from "vue";

import Band from "./Band.vue";
import type { BandRegion, DayLabel, HourMarker, RenderedEventBar } from "./types";

const props = defineProps<{
  dayLabels: DayLabel[];
  dayBackgroundRows: Array<DayLabel & { isShaded: boolean }>;
  hourMarkers: HourMarker[];
  timelineWidth: number;
  timelineHeight: number;
  hourWidth: number;
  headerStackHeight: number;
  laneVerticalPadding: number;
  laneRegions: BandRegion[];
  sectionRegions: BandRegion[];
  visibleEventBars: RenderedEventBar[];
  laneRowHeight: number;
  laneTopOffsetByKey: Record<string, number>;
  dayLegendBlockHeight: number;
  dayLegendPadding: number;
  hourLegendPadding: number;
  isDarkTheme: boolean;
}>();

const containerStyle = computed(() => ({
  width: `${props.timelineWidth}px`,
  height: `${props.timelineHeight}px`,
  "--day-legend-height": `${props.dayLegendBlockHeight}px`,
  "--day-legend-padding": `${props.dayLegendPadding}px`,
  "--hour-legend-padding": `${props.hourLegendPadding}px`,
  "--hour-label-top": `${props.dayLegendBlockHeight + props.hourLegendPadding}px`,
}));
</script>

<template>
  <div class="timestream" :class="{ dark: isDarkTheme }" :style="containerStyle">
    <div
      class="day-background-layer"
      :style="{ width: `${timelineWidth}px`, height: `${timelineHeight}px` }"
    >
      <div
        v-for="(day, index) in dayBackgroundRows"
        :key="index"
        class="day-background-slot"
        :class="{ shaded: day.isShaded, dark: isDarkTheme }"
        :style="{ left: `${day.left}px`, width: `${day.width}px` }"
      ></div>
    </div>
    <div class="day-labels" :style="{ width: `${timelineWidth}px` }">
      <div
        v-for="(label, index) in dayLabels"
        :key="index"
        class="day-label"
        :class="{ dark: isDarkTheme }"
        :style="{ left: `${label.left}px`, width: `${label.width}px` }"
      >
        {{ label.label }}
      </div>
    </div>
    <div
      v-for="(marker, index) in hourMarkers"
      :key="index"
      class="hour-marker"
      :class="{
        'day-start': marker.isStartOfDay,
        'first-day-start': marker.isFirstDayStart,
        dark: isDarkTheme,
      }"
      :style="{ width: `${marker.spanHours * hourWidth}px` }"
    >
      <span class="hour-label">{{ marker.label }}</span>
    </div>
    <Band
      :lane-regions="laneRegions"
      :section-regions="sectionRegions"
      :container-style-overrides="{ width: `${timelineWidth}px`, height: `${timelineHeight}px`, zIndex: 1 }"
      :is-dark-theme="isDarkTheme"
    />
    <div class="event-bars-layer" :style="{ height: `${timelineHeight}px` }">
      <div
        v-for="(bar, index) in visibleEventBars"
        :key="index"
        class="timeline-event-bar"
        :class="{ dark: isDarkTheme, milestone: bar.isMilestone }"
        :style="{
          left: `${bar.leftOffset}px`,
          width: `${bar.barWidth}px`,
          top: `${
            headerStackHeight +
            laneVerticalPadding +
            (laneTopOffsetByKey[bar.groupKey] ?? 0) +
            bar.sublaneIndex * laneRowHeight
          }px`,
          height: `${laneRowHeight}px`,
          background: bar.isMilestone ? 'transparent' : bar.fillColor,
          borderColor: bar.isMilestone ? 'transparent' : bar.borderColor,
          borderRadius: bar.isMilestone ? '0px' : `${bar.cornerRadius}px`,
        }"
        :title="`${bar.label} (${bar.timeRangeLabel})`"
      >
        <div
          v-if="bar.isMilestone"
          class="milestone-shape"
          :style="{ width: `${bar.barWidth}px`, height: `${bar.barWidth}px`, background: bar.borderColor }"
        >
          <div class="milestone-shape__fill" :style="{ background: bar.fillColor }"></div>
        </div>
        <span v-else class="event-duration-label">{{ bar.durationHoursLabel }}</span>
      </div>
      <div class="event-layer-spacer" :style="{ height: `${timelineHeight}px` }"></div>
    </div>
  </div>
</template>

<style scoped>
.timestream {
  display: flex;
  flex-direction: row;
  position: relative;
  height: 100%;
}

.day-background-layer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.day-background-slot {
  position: absolute;
  top: 0;
  height: 100%;
}

.day-background-slot.shaded {
  background: rgba(148, 163, 184, 0.08);
}

.day-background-slot.dark.shaded {
  background: rgba(255, 255, 255, 0.04);
}

.day-labels {
  position: absolute;
  top: 0;
  left: 0;
  height: var(--day-legend-height, 18px);
  padding-top: var(--day-legend-padding, 0px);
  padding-bottom: var(--day-legend-padding, 0px);
  box-sizing: border-box;
  pointer-events: none;
  z-index: 2;
}

.day-label {
  position: absolute;
  top: var(--day-legend-padding, 0px);
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  line-height: 16px;
}

.day-label.dark {
  color: #e2e8f0;
}

.hour-marker {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  border-left: 1px dashed #cbd5e1;
  padding-left: 4px;
  box-sizing: border-box;
  height: 100%;
  position: relative;
  overflow: visible;
  z-index: 0;
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

.hour-marker.first-day-start {
  border-left-color: transparent;
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

.timeline-event-bar.milestone {
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.milestone-shape {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.15);
}

.timeline-event-bar.dark .milestone-shape {
  box-shadow: 0 1px 2px rgba(2, 6, 23, 0.4);
}

.milestone-shape__fill {
  position: absolute;
  inset: 2px;
  clip-path: inherit;
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
