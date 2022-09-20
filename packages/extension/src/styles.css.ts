import { style } from "@vanilla-extract/css"
import { spacing, color, rounded } from "@/ui/theme"

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
  borderBottom: `1px solid ${color.gray[200]}`,
})

export const select = style({
  width: spacing[8],
  height: spacing[8],
})
export const selectIcon = style({
  width: spacing[5],
  height: spacing[5],
})

export const options = style({
  marginLeft: "auto",
  width: spacing[8],
  height: spacing[8],
})
export const optionsIcon = style({
  width: spacing[5],
  height: spacing[5],
})

export const optionsMenu = style({
  position: "fixed",
  zIndex: 9999,
  padding: spacing[4],
  display: "flex",
  flexDirection: "column",
  gap: spacing[4],
  ...rounded("md"),
  backgroundColor: color.gray[100],
  border: `1px solid ${color.gray[200]}`,
})

export const content = style({
  overflow: "hidden",
})
