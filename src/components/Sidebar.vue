<script setup lang="ts">
import { computed, defineProps, defineEmits, defineExpose, ref } from "vue";

import Band from "./Band.vue";
import type { BandRegion } from "./types";

const props = defineProps<{
  sidebarWidth: number;
  timelineHeight: number;
  laneAreaOffset: number;
  labelAreaHeight: number;
  laneRegions: BandRegion[];
  sectionRegions: BandRegion[];
  sectionTitleSize: number;
  sidebarLanes: Array<{
    key: string;
    label: string;
    height: number;
    nextGap: number;
    color: string;
    borderColor: string;
    totals: string[];
  }>;
  laneRowHeight: number;
  targetLabel: string;
  actualLabel: string;
  totalLabel: string;
  sidebarTotals: string[];
  targetColor: string;
  actualColor: string;
  isDarkTheme: boolean;
}>();

const emit = defineEmits<{
  scroll: [];
  resizeStart: [event: MouseEvent];
}>();

const sidebarScrollRef = ref<HTMLDivElement | null>(null);

const sidebarStyle = computed(() => ({
  width: `${props.sidebarWidth}px`,
}));

const contentStyle = computed(() => ({
  height: `${props.timelineHeight}px`,
  paddingTop: `${props.laneAreaOffset + props.labelAreaHeight}px`,
}));
const bandsStyle = computed(() => ({
  height: `${props.timelineHeight}px`,
}));

const onScroll = () => emit("scroll");

defineExpose({
  getScrollTop: () => sidebarScrollRef.value?.scrollTop ?? 0,
  setScrollTop: (value: number) => {
    if (sidebarScrollRef.value) {
      sidebarScrollRef.value.scrollTop = value;
    }
  },
});
</script>

<template>
  <div class="gantt-sidebar" :class="{ dark: isDarkTheme }" :style="sidebarStyle">
    <div ref="sidebarScrollRef" class="gantt-sidebar-scroll" @scroll="onScroll">
      <div class="gantt-sidebar-content" :style="contentStyle">
        <Band
          :lane-regions="laneRegions"
          :section-regions="sectionRegions"
          :container-style-overrides="bandsStyle"
          :show-section-titles="true"
          :section-title-size="sectionTitleSize"
          :is-dark-theme="isDarkTheme"
        />
        <div
          v-for="(lane, index) in sidebarLanes"
          :key="lane.key"
          class="gantt-sidebar-lane"
          :style="{
            height: `${lane.height}px`,
            marginBottom: index === sidebarLanes.length - 1 ? '0px' : `${lane.nextGap}px`,
          }"
          :title="lane.label"
        >
          <div
            class="gantt-sidebar-rect"
            :style="{
              height: `${lane.height}px`,
              background: lane.color,
              borderTopColor: lane.borderColor,
              borderBottomColor: lane.borderColor,
            }"
          >
            <span class="gantt-sidebar-text">{{ lane.label }}</span>
            <div class="gantt-sidebar-totals">
              <div
                v-for="(total, idx) in lane.totals"
                :key="idx"
                class="gantt-sidebar-total"
                :style="{ height: `${laneRowHeight}px` }"
              >
                <span class="gantt-sidebar-total-label">
                  {{ idx === 0 ? targetLabel : actualLabel }}
                </span>
                <span class="gantt-sidebar-total-value">{{ total }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="gantt-sidebar-total-lane">
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
        <div class="gantt-sidebar-legend">
          <div class="gantt-sidebar-legend-item">
            <span
              class="gantt-sidebar-legend-swatch"
              :style="{ backgroundColor: targetColor }"
            ></span>
            <span class="gantt-sidebar-legend-label">{{ targetLabel }}</span>
          </div>
          <div class="gantt-sidebar-legend-item">
            <span
              class="gantt-sidebar-legend-swatch"
              :style="{ backgroundColor: actualColor }"
            ></span>
            <span class="gantt-sidebar-legend-label">{{ actualLabel }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="gantt-sidebar-resizer" @mousedown="emit('resizeStart', $event)"></div>
  </div>
</template>

<style scoped>
.gantt-sidebar {
  position: relative;
  height: 100%;
  border-right: 4px solid #94a3b8;
  background-color: rgba(226, 232, 240, 0.65);
  min-width: 140px;
  max-width: 480px;
}

.gantt-sidebar.dark {
  border-right-color: #a1a1aa;
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

.gantt-sidebar-lane {
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

.gantt-sidebar.dark .gantt-sidebar-text {
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

.gantt-sidebar.dark .gantt-sidebar-total-label {
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

.gantt-sidebar.dark .gantt-sidebar-total-value {
  color: #e2e8f0;
}

.gantt-sidebar-total-lane {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.15);
  position: relative;
  z-index: 1;
}

.gantt-sidebar.dark .gantt-sidebar-total-lane {
  border-top-color: rgba(226, 232, 240, 0.2);
}

.gantt-sidebar-legend {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 12px 12px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.gantt-sidebar.dark .gantt-sidebar-legend {
  border-top-color: rgba(226, 232, 240, 0.2);
}

.gantt-sidebar-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #1f2937;
}

.gantt-sidebar.dark .gantt-sidebar-legend-item {
  color: #e2e8f0;
}

.gantt-sidebar-legend-swatch {
  width: 16px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.gantt-sidebar.dark .gantt-sidebar-legend-swatch {
  border-color: rgba(226, 232, 240, 0.3);
  box-shadow: inset 0 0 0 1px rgba(24, 24, 27, 0.2);
}

.gantt-sidebar-legend-label {
  line-height: 1.3;
}

.gantt-sidebar-resizer {
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
}
</style>
