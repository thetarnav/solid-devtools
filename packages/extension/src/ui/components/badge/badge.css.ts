import { style } from "@vanilla-extract/css"
import { color, hexToRgbValue, rounded, spacing } from "@/ui/theme"

const colorValues = hexToRgbValue(color.cyan[600])

export const badge = style({
  display: "inline-block",
  paddingRight: spacing[1],
  paddingLeft: spacing[1],
  backgroundColor: `rgb(${colorValues} / 0.2)`,
  ...rounded(),
  color: `rgb(${colorValues})`,
  textTransform: "uppercase",
  fontWeight: 700,
  fontSize: spacing[2.5],
  userSelect: "none",
})
