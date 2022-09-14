import { style } from "@vanilla-extract/css"
import { spacing, color } from "@/ui/theme"

export const app = style({
  height: "100vh",
  width: "100vw",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: `${spacing[16]} 1fr`,
})

export const header = style({
  padding: spacing[4],
  backgroundColor: color.white,
  display: "flex",
  alignItems: "center",
  columnGap: spacing[4],
})

//
// SELECT ELEMENT
//
export const select = style({
  width: spacing[8],
  height: spacing[8],
})
export const selectIcon = style({
  width: spacing[5],
  height: spacing[5],
})

export const content = style({
  overflow: "hidden",
})
