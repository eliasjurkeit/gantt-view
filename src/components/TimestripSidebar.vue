<script setup lang="ts">
import { computed, defineProps, defineEmits, defineExpose, ref } from "vue";

import type { SectionBand } from "./types";

const props = defineProps<{
  width: number;
  totalHeight: number;
  sidebarRowsOffset: number;
  labelHeight: number;
  sidebarLaneBands: SectionBand[];
  sidebarSectionBands: SectionBand[];
  sectionTitleFontSize: number;
  sidebarRows: Array<{
    key: string;
    label: string;
    height: number;
    nextGap: number;
    color: string;
    borderColor: string;
    totals: string[];
  }>;
  laneHeight: number;
  targetLabel: string;
  actualLabel: string;
  totalLabel: string;
  sidebarTotals: string[];
  isDark: boolean;
}>();

const emit = defineEmits<{
  scroll: [];
  resizeStart: [event: MouseEvent];
}>();

const scrollRef = ref<HTMLDivElement | null>(null);

const sidebarStyle = computed(() => ({
  width: `${props.width}px`,
}));

const contentStyle = computed(() => ({
  height: `${props.totalHeight}px`,
  paddingTop: `${props.sidebarRowsOffset + props.labelHeight}px`,
}));

const sectionContainerStyle = computed(() => ({
  height: `${props.totalHeight}px`,
}));

const onScroll = () => emit("scroll");

defineExpose({
  getScrollTop: () => scrollRef.value?.scrollTop ?? 0,
  setScrollTop: (value: number) => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = value;
    }
  },
});
</script>

<template>
  <div class="gantt-sidebar" :class="{ dark: isDark }" :style="sidebarStyle">
    <div ref="scrollRef" class="gantt-sidebar-scroll" @scroll="onScroll">
      <div class="gantt-sidebar-content" :style="contentStyle">
        <div class="gantt-sidebar-sections" :style="sectionContainerStyle">
          <div
            v-for="(lane, index) in sidebarLaneBands"
            :key="`lane-${index}`"
            class="gantt-sidebar-lane-band"
            :style="{
              top: `${lane.top}px`,
              height: `${lane.height}px`,
              background: lane.fill,
              borderTop: `1px solid ${lane.border}`,
              borderBottom: `1px solid ${lane.border}`,
            }"
          >
            <div
              v-if="lane.split !== undefined"
              class="gantt-sidebar-lane-split"
              :style="{
                top: `${lane.split - lane.top}px`,
                borderTop: `1px dashed ${lane.border}`,
              }"
            ></div>
          </div>
          <div
            v-for="(section, index) in sidebarSectionBands"
            :key="index"
            class="gantt-sidebar-section-band"
            :style="{
              top: `${section.top}px`,
              height: `${section.height}px`,
              background: section.fill,
              borderTop: `1px solid ${section.border}`,
              borderBottom: `1px solid ${section.border}`,
            }"
          >
            <span
              class="gantt-sidebar-section-label"
              :style="{
                fontSize: `${sectionTitleFontSize}px`,
              }"
            >
              {{ section.title }}
            </span>
          </div>
        </div>
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
                :style="{ height: `${laneHeight}px` }"
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

.gantt-sidebar-sections {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.gantt-sidebar-lane-band {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
}

.gantt-sidebar-lane-split {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  box-sizing: border-box;
  pointer-events: none;
}

.gantt-sidebar-section-band {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  padding: 6px 8px;
  z-index: 0;
}

.gantt-sidebar-section-label {
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
  position: absolute;
  top: 4px;
  left: 6px;
  z-index: 2;
  pointer-events: none;
}

.gantt-sidebar.dark .gantt-sidebar-section-label {
  color: #e2e8f0;
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
