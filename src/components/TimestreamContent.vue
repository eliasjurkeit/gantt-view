<script setup lang="ts">
import { defineProps } from "vue";

import Band from "./Band.vue";
import Bar from "./Bar.vue";
import type { BandRegion, RenderedEventBar } from "./types";

defineProps<{
  timelineWidth: number;
  timelineHeight: number;
  headerStackHeight: number;
  contentVerticalOffset: number;
  laneRegions: BandRegion[];
  sectionRegions: BandRegion[];
  visibleEventBars: RenderedEventBar[];
  laneRowHeight: number;
  laneTopOffsetByKey: Record<string, number>;
  isDarkTheme: boolean;
}>();
</script>

<template>
  <Band
    :lane-regions="laneRegions"
    :section-regions="sectionRegions"
    :container-style-overrides="{ width: `${timelineWidth}px`, height: `${timelineHeight}px`, zIndex: 1 }"
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
</template>
