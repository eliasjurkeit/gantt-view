<script setup lang="ts">
import { computed, defineProps } from "vue";

import type { BandRegion } from "./types";

const props = defineProps<{
  laneRegions: BandRegion[];
  sectionRegions: BandRegion[];
  containerStyleOverrides?: Record<string, string | number>;
  showSectionTitles?: boolean;
  sectionTitleSize?: number;
  isDarkTheme?: boolean;
}>();

const bandLayerStyle = computed(() => props.containerStyleOverrides ?? {});
</script>

<template>
  <div
    class="band-overlays-layer"
    :class="{ dark: isDarkTheme }"
    :style="bandLayerStyle"
  >
    <div
      v-for="(laneRegion, index) in laneRegions"
      :key="`lane-${index}`"
      class="lane-region"
      :style="{
        top: `${laneRegion.topOffset}px`,
        height: `${laneRegion.height}px`,
        background: laneRegion.backgroundColor,
        borderTop: `1px solid ${laneRegion.borderColor}`,
        borderBottom: `1px solid ${laneRegion.borderColor}`,
      }"
      :title="laneRegion.label"
    >
      <div
        v-if="laneRegion.splitOffset !== undefined"
        class="lane-region-split"
        :style="{
          top: `${laneRegion.splitOffset - laneRegion.topOffset}px`,
          borderTop: `1px dashed ${laneRegion.borderColor}`,
        }"
      ></div>
    </div>
    <div
      v-for="(sectionRegion, index) in sectionRegions"
      :key="index"
      class="section-region"
      :style="{
        top: `${sectionRegion.topOffset}px`,
        height: `${sectionRegion.height}px`,
        background: sectionRegion.backgroundColor,
        borderTop: `1px solid ${sectionRegion.borderColor}`,
        borderBottom: `1px solid ${sectionRegion.borderColor}`,
      }"
      :title="sectionRegion.label"
    >
      <span
        v-if="showSectionTitles"
        class="section-region-label"
        :style="{ fontSize: `${sectionTitleSize ?? 12}px` }"
      >
        {{ sectionRegion.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.band-overlays-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.lane-region {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  z-index: 2;
}

.lane-region-split {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  box-sizing: border-box;
  pointer-events: none;
}

.section-region {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  padding: 6px 8px;
  z-index: 1;
}

.section-region-label {
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
  position: absolute;
  top: 4px;
  left: 6px;
  z-index: 2;
  pointer-events: none;
}

.band-overlays-layer.dark .section-region-label {
  color: #e2e8f0;
}
</style>
