import { color, hexToRgbValue, rounded, spacing } from "@/ui/theme"
import { style } from "@vanilla-extract/css"

export const sources = {
  container: style({
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    height: spacing[3],
    width: "max-content",
    padding: `${spacing[0.5]} ${spacing[1]}`,
    ...rounded(),
    rowGap: spacing[0.5],
    backgroundColor: `rgb(${hexToRgbValue(color.amber[500])} / 0.1)`,
  }),
  row: style({
    display: "flex",
    columnGap: spacing[0.5],
  }),
  dot: style({
    width: spacing[1],
    height: spacing[1],
    ...rounded("full"),
    backgroundColor: color.amber[500],
    filter: "blur(0.1px)",
    opacity: 0.8,
  }),
}
