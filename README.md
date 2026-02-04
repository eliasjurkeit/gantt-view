# Install Dependencies
```bash
npm i
```

# Start Server
```bash
npm run dev
```
or
```bash
npm run build
```

# Output
Option 1: https://meridiem.markwhen.com/, adding this view by specifying the port it's running at.
Option 2: [mw CLI](https://github.com/mark-when/mw), see its README.md for instructions.

# Tasks & Phases
Define target time from 19.01.2026 08:00 to 19.01.2026 09:00 and actual time from 19.01.2026 08:00 to 19.01.2026 10:00 for task "Dokumentation aufsetzen". [EDTF Date Ranges](https://www.loc.gov/standards/datetime/) must be used.
```mw
2026-01-19 08:00 / 2026-01-19 09:00:
id: Dokumentation aufsetzen
2026-01-19 08:00 / 2026-01-19 10:00:
for: Dokumentation aufsetzen
```
To put a task into a section just wrap the task with `section mySectionName` and `endSection`.

# Header Options (Optionals Have Default Values)
* `hours`: required, e.g. `08:00-17:00`
* `skipHours`: required, e.g. `12:00-13:00`
* `scale`: required, e..g `10`
* `skipDates`: optional, e.g. `[2026-01-21, 2026-01-22, 2026-01-23, 2026-01-24]`
* `targetLabel`: optional, e.g. `Geplant`
* `actualLabel`: optional, e.g. `Effektiv`
* `legendNotice`: optional, e.g. `Alle Angaben in Stunden`
* `laneHeight`: optional, e.g. `14`
* `laneGap`: optional, e.g. `10`
* `laneVerticalPadding`: optional, e.g. `90`
* `laneBandOpacity`: optional, e.g. `0.2`
* `sectionPadding`: optional, e.g. `25`
* `sectionGap`: optional, e.g `10`
* `sectionBandOpacity`: optional, e.g. `0.2`
* `barRadius`: optional, e.g `2`
* `sectionTitleFontSize`: optional, e.g. `12`
* `labelPaddingTop`: optional, e.g. `28`
* `hourLegendVerticalPadding`: optional, e.g. `4 `
