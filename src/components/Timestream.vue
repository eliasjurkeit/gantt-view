<script setup lang="ts">
import { computed, defineEmits, defineExpose, defineProps, ref } from "vue";

import Band from "./Band.vue";
import Bar from "./Bar.vue";
import TimestreamLegend from "./TimestreamLegend.vue";
import type { BandRegion, DayLabel, HourMarker, RenderedEventBar } from "./types";

const props = defineProps<{
  timelineWidth: number;
  timelineHeight: number;
  dayLegendHeight: number;
  hourMarkers: HourMarker[];
  dayLabels: DayLabel[];
  dayBackgroundRows: Array<DayLabel & { isShaded: boolean }>;
  headerStackHeight: number;
  contentVerticalOffset: number;
  laneRegions: BandRegion[];
  sectionRegions: BandRegion[];
  visibleEventBars: RenderedEventBar[];
  laneRowHeight: number;
  laneTopOffsetByKey: Record<string, number>;
  hourWidth: number;
  isDarkTheme: boolean;
}>();

const emit = defineEmits<{
  scroll: [];
}>();

const scrollContainerRef = ref<HTMLDivElement | null>(null);

const timelineSizing = computed(() => ({
  width: `${props.timelineWidth}px`,
  height: `${props.timelineHeight}px`,
  "--day-legend-height": `${props.dayLegendHeight}px`,
  "--hour-label-top": `${props.dayLegendHeight + 4}px`,
}));

const onScroll = () => emit("scroll");

defineExpose({
  getScrollTop: () => scrollContainerRef.value?.scrollTop ?? 0,
  setScrollTop: (value: number) => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = value;
    }
  },
  getClientHeight: () => scrollContainerRef.value?.clientHeight ?? 0,
});
</script>

<template>
  <div
    ref="scrollContainerRef"
    class="timeline-scroll-container"
    :class="{ dark: isDarkTheme }"
    @scroll="onScroll"
  >
    <div class="timeline-stage" :style="timelineSizing">
      <Band
        :lane-regions="laneRegions"
        :section-regions="sectionRegions"
        :container-style-overrides="{ width: `${timelineWidth}px`, height: `${timelineHeight}px`, zIndex: 1 }"
        :is-dark-theme="isDarkTheme"
      />
      <TimestreamLegend
        :day-labels="dayLabels"
        :day-background-rows="dayBackgroundRows"
        :hour-markers="hourMarkers"
        :timeline-width="timelineWidth"
        :timeline-height="timelineHeight"
        :hour-width="hourWidth"
        :is-dark-theme="isDarkTheme"
      />
      <Bar
        :visible-event-bars="visibleEventBars"
        :lane-row-height="laneRowHeight"
        :header-stack-height="headerStackHeight"
        :content-vertical-offset="contentVerticalOffset"
        :lane-top-offset-by-key="laneTopOffsetByKey"
        :timeline-height="timelineHeight"
        :is-dark-theme="isDarkTheme"
      />
    </div>
  </div>
</template>

<style scoped>
.timeline-scroll-container {
  flex: 1;
  height: 100%;
  overflow: auto;
  background-color: #f8fafc;
}

.timeline-scroll-container.dark {
  background-color: #27272a;
}

.timeline-stage {
  display: flex;
  flex-direction: row;
  position: relative;
  height: 100%;
}
</style>
