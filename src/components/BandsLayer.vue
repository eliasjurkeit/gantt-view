<script setup lang="ts">
import { computed, defineProps } from "vue";

import type { SectionBand } from "./types";

const props = defineProps<{
  laneBands: SectionBand[];
  sectionBands: SectionBand[];
  containerStyle?: Record<string, string | number>;
  showSectionLabels?: boolean;
  sectionTitleFontSize?: number;
  isDark?: boolean;
}>();

const rootStyle = computed(() => props.containerStyle ?? {});
</script>

<template>
  <div class="bands-layer" :class="{ dark: isDark }" :style="rootStyle">
    <div
      v-for="(lane, index) in laneBands"
      :key="`lane-${index}`"
      class="band-lane"
      :style="{
        top: `${lane.top}px`,
        height: `${lane.height}px`,
        background: lane.fill,
        borderTop: `1px solid ${lane.border}`,
        borderBottom: `1px solid ${lane.border}`,
      }"
      :title="lane.title"
    >
      <div
        v-if="lane.split !== undefined"
        class="band-lane-split"
        :style="{
          top: `${lane.split - lane.top}px`,
          borderTop: `1px dashed ${lane.border}`,
        }"
      ></div>
    </div>
    <div
      v-for="(section, index) in sectionBands"
      :key="index"
      class="band-section"
      :style="{
        top: `${section.top}px`,
        height: `${section.height}px`,
        background: section.fill,
        borderTop: `1px solid ${section.border}`,
        borderBottom: `1px solid ${section.border}`,
      }"
      :title="section.title"
    >
      <span
        v-if="showSectionLabels"
        class="band-section-label"
        :style="{ fontSize: `${sectionTitleFontSize ?? 12}px` }"
      >
        {{ section.title }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.bands-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.band-lane {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
}

.band-lane-split {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  box-sizing: border-box;
  pointer-events: none;
}

.band-section {
  position: absolute;
  left: 0;
  right: 0;
  box-sizing: border-box;
  padding: 6px 8px;
  z-index: 0;
}

.band-section-label {
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
  position: absolute;
  top: 4px;
  left: 6px;
  z-index: 2;
  pointer-events: none;
}

.bands-layer.dark .band-section-label {
  color: #e2e8f0;
}
</style>
