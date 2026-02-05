import type { DateTime } from "luxon";

export interface HourMarker {
  dateTime: DateTime;
  label: string;
  isStartOfDay: boolean;
  isFirstDayStart: boolean;
  spanHours: number;
}

export interface DayLabel {
  label: string;
  left: number;
  width: number;
}

export interface BandRegion {
  label: string;
  topOffset: number;
  height: number;
  backgroundColor: string;
  borderColor: string;
  splitOffset?: number;
}

export interface RenderedEventBar {
  label: string;
  leftOffset: number;
  barWidth: number;
  laneIndex: number;
  timeRangeLabel: string;
  fillColor: string;
  borderColor: string;
  durationHoursLabel: string;
  groupKey: string;
  sublaneIndex: number;
  isTargetEvent: boolean;
  sectionName?: string;
  cornerRadius: number;
  isMilestone: boolean;
}
