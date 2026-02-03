<script setup lang="ts">
import { computed, defineEmits, defineExpose, defineProps, ref } from "vue";

import BandsLayer from "./BandsLayer.vue";
import EventBars from "./EventBars.vue";
import TimelineLegend from "./TimelineLegend.vue";
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
      <BandsLayer
        :lane-bands="laneBands"
        :section-bands="sectionBands"
        :container-style="{ width: `${totalWidth}px`, height: `${trackHeight}px`, zIndex: 1 }"
      />
      <TimelineLegend
        :day-labels="dayLabels"
        :day-backgrounds="dayBackgrounds"
        :hour-markers="hourMarkers"
        :total-width="totalWidth"
        :track-height="trackHeight"
        :hour-width="hourWidth"
        :is-dark="isDark"
      />
      <EventBars
        :event-bars="eventBars"
        :lane-height="laneHeight"
        :legend-stack-height="legendStackHeight"
        :bar-offset="barOffset"
        :row-top-by-key="rowTopByKey"
        :track-height="trackHeight"
        :is-dark="isDark"
      />
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
</style>
