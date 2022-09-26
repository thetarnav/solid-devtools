import { color, insetX, spacing } from "@/ui/theme"
import { createVar, style } from "@vanilla-extract/css"

export const ROW_HEIGHT_IN_REM = 1.25

export const panelWrapper = style({
  height: "100%",
  width: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
})

export const treeLength = createVar()
export const startIndex = createVar()

export const scrolledOuter = style({
  // position: "relative",
  height: `calc(${treeLength} * ${ROW_HEIGHT_IN_REM}rem)`,
})
export const scrolledInner = style({
  // position: "absolute",
  // top: 0,
  // ...insetX(0),
  paddingTop: `calc(${startIndex} * ${ROW_HEIGHT_IN_REM}rem)`,
  // transform: `translateY(calc(${startIndex} * ${ROW_HEIGHT_IN_REM}rem))`,
})

export const path = style({
  flexShrink: 0,
  height: spacing[4],
  width: "100%",
  position: "relative",
})
export const pathInner = style({
  position: "absolute",
  zIndex: 1,
  bottom: 0,
  ...insetX(0),
  minHeight: spacing[4],
  width: "100%",
  display: "flex",
  alignItems: "center",
  padding: `${spacing[0.5]} ${spacing[2]}`,
  borderTop: `1px solid ${color.gray[200]}`,
  backgroundColor: color.gray[50],
})
