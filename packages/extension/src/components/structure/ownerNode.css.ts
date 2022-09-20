import { createVar, style } from "@vanilla-extract/css"
import { CSSVarFunction } from "@vanilla-extract/private"
import { color, hexToRgb, insetX, insetY, rounded, spacing, theme, transition } from "@/ui/theme"
import { ROW_HEIGHT_IN_REM } from "./structure.css"
import { Property } from "csstype"

const shadowOpacity: CSSVarFunction = createVar()
export const levelVar: CSSVarFunction = createVar()

const rowHeight = `${ROW_HEIGHT_IN_REM}rem`

export const contailer = style({
  height: rowHeight,
  position: "relative",
  display: "flex",
  alignItems: "center",
  paddingRight: spacing[2],
  cursor: "pointer",
  color: color.black,
  vars: { [shadowOpacity]: "0" },
  ...transition("color"),
  selectors: {
    '&[data-hovered="true"]': {
      vars: { [shadowOpacity]: "0.2" },
    },
    '&[data-selected="true"]': {
      color: color.white,
      vars: { [shadowOpacity]: "1" },
    },
  },
})

export const selection = style({
  position: "absolute",
  zIndex: -1,
  ...insetY(0),
  ...insetX(1),
  ...rounded(),
  backgroundColor: hexToRgb(color.gray[900], 0.8),
  opacity: shadowOpacity,
  ...transition("opacity", theme.duration[100]),
})

const paddingMask: Property.MaskImage = `linear-gradient(to right, rgba(0,0,0, 0.4), black ${spacing[48]})`
const remMinusPx = `calc(1rem - 1px)`

export const levelPadding = style({
  position: "relative",
  zIndex: -2,
  width: `calc(${levelVar} * ${spacing[4]})`,
  height: rowHeight,
  // background: `linear-gradient(90deg, ${color.white}, ${color.gray[100]}) ${color.gray[100]}`,
  background: `repeating-linear-gradient(to right, transparent, transparent ${remMinusPx}, ${color.gray[200]} ${remMinusPx}, ${color.gray[200]} 1rem)`,
  maskImage: paddingMask,
  WebkitMaskImage: paddingMask,
})

export const nameContainer = style({
  marginLeft: spacing[3],
  display: "flex",
  alignItems: "center",
  minWidth: spacing[36],
})

export const name = style({
  paddingBottom: "0.0625rem",
})

export const highlight = style({
  // fontStyle: "italic",
  fontWeight: 500,
})

export const type = style({
  marginLeft: spacing[2],
  fontSize: 10,
  opacity: 0.4,
  userSelect: "none",
  paddingBottom: "0.0625rem",
})
