import { style } from "@vanilla-extract/css"
import { theme, spacing, color } from "@solid-devtools/ui/theme"

export const app = style({
  height: "100vh",
  width: "100vw",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: `${spacing[16]} 1fr`,
})

export const header = style({
  padding: spacing[4],
  backgroundColor: color.gray[100],
})

export const content = style({
  overflow: "hidden",
})
