<script setup lang="ts">
import { computed, defineProps, defineEmits, defineExpose, ref } from "vue";

import Band from "./Band.vue";
import type { BandRegion } from "./types";

const props = defineProps<{
  sidebarWidth: number;
  timelineHeight: number;
  rowAreaOffset: number;
  labelAreaHeight: number;
  laneRegions: BandRegion[];
  sectionRegions: BandRegion[];
  sectionTitleSize: number;
  sidebarRows: Array<{
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
  paddingTop: `${props.rowAreaOffset + props.labelAreaHeight}px`,
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
          v-for="(row, index) in sidebarRows"
          :key="row.key"
          class="gantt-sidebar-row"
          :style="{
            height: `${row.height}px`,
            marginBottom: index === sidebarRows.length - 1 ? '0px' : `${row.nextGap}px`,
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
        <div class="gantt-sidebar-total-row">
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
    <div class="gantt-sidebar-resizer" @mousedown="emit('resizeStart', $event)"></div>
  </div>
</template>

<style scoped>
.gantt-sidebar {
  position: relative;
  height: 100%;
  border-right: 1px solid rgba(148, 163, 184, 0.4);
  background-color: rgba(226, 232, 240, 0.65);
  min-width: 140px;
  max-width: 480px;
}

.gantt-sidebar.dark {
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

.gantt-sidebar-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.15);
  position: relative;
  z-index: 1;
}

.gantt-sidebar.dark .gantt-sidebar-total-row {
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
</style>
