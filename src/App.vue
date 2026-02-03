<script setup lang="ts">
import { useMarkwhenStore } from "./markwhenStore";
import HourlyTimestrip from "./components/HourlyTimestrip.vue";

const markwhenStore = useMarkwhenStore();
</script>

<template>
  <div class="view-container" :class="{ dark: markwhenStore.app?.isDark }">
    <HourlyTimestrip />
  </div>
</template>

<style scoped>
.view-container {
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
</style>
