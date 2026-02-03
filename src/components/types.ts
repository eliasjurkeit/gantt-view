import type { DateTime } from "luxon";

export interface HourMarker {
  dateTime: DateTime;
  label: string;
  isStartOfDay: boolean;
  spanHours: number;
}

export interface DayLabel {
  label: string;
  left: number;
  width: number;
}

export interface SectionBand {
  title: string;
  top: number;
  height: number;
  fill: string;
  border: string;
  split?: number;
}

export interface VisibleEventBar {
  title: string;
  left: number;
  width: number;
  lane: number;
  rangeLabel: string;
  color: string;
  borderColor: string;
  durationHours: string;
  groupKey: string;
  sublane: number;
  isIdEvent: boolean;
  sectionName?: string;
  barRadius: number;
}
