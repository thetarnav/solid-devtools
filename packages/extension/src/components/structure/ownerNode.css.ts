import { createVar, style } from "@vanilla-extract/css"
import { CSSVarFunction } from "@vanilla-extract/private"
import {
  centerChild,
  color,
  inset,
  insetX,
  insetY,
  rounded,
  spacing,
  theme,
  transition,
} from "@/ui/theme"
import { ROW_HEIGHT_IN_REM } from "./structure.css"
import { Property } from "csstype"

export const levelVar: CSSVarFunction = createVar()

const rowHeight = `${ROW_HEIGHT_IN_REM}rem`

export const contailer = style({
  height: rowHeight,
  position: "relative",
  display: "flex",
  alignItems: "center",
  paddingRight: spacing[4],
  cursor: "pointer",
  color: color.black,
})

export const selection = style({
  position: "absolute",
  zIndex: -1,
  ...insetY(0),
  ...insetX(1),
  ...rounded(),
  backgroundColor: color.gray[400],
  opacity: 0,
  ...transition(["opacity"], theme.duration[100]),
  selectors: {
    [`${contailer}[data-hovered="true"] &`]: {
      opacity: 0.2,
    },
    [`${contailer}[data-selected="true"] &`]: {
      opacity: 0.6,
    },
  },
})

const paddingMask: Property.MaskImage = `linear-gradient(to right, rgba(0,0,0, 0.4), black ${spacing[48]})`
const remMinusPx = `calc(1rem - 1px)`

export const levelPadding = style({
  position: "relative",
  zIndex: -2,
  marginLeft: spacing[3],
  width: `calc(${levelVar} * ${spacing[4]} + ${spacing[2.5]})`,
  height: rowHeight,
  // background: `linear-gradient(90deg, ${color.white}, ${color.gray[100]}) ${color.gray[100]}`,
  background: `repeating-linear-gradient(to right, transparent, transparent ${remMinusPx}, ${color.gray[200]} ${remMinusPx}, ${color.gray[200]} 1rem)`,
  maskImage: paddingMask,
  WebkitMaskImage: paddingMask,
})

export const nameContainer = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  columnGap: spacing[2],
  minWidth: spacing[36],
})

export const collapse = style({
  position: "absolute",
  height: rowHeight,
  width: rowHeight,
  left: `-${rowHeight}`,
  ...centerChild,
  opacity: 0,
  ...transition("background-color"),
  ":before": {
    content: "",
    position: "absolute",
    zIndex: -2,
    ...inset(0.5),
    ...rounded("full"),
    backgroundColor: color.white,
    ...transition("background-color"),
  },
  selectors: {
    [`${contailer}[data-hovered="true"] &`]: {
      opacity: 1,
    },
    "&:hover:before": {
      backgroundColor: color.gray[200],
    },
    '&[aria-selected="true"]': {
      opacity: 1,
    },
  },
})
export const collapseIcon = style({
  width: spacing[2],
  height: spacing[2],
  color: color.gray[600],
  transform: "rotate(180deg)",
  opacity: 0.5,
  ...transition(["transform", "opacity"]),
  selectors: {
    [`${collapse}[aria-selected="true"] &`]: {
      transform: "rotate(90deg)",
      opacity: 1,
    },
  },
})

export const name = style({
  paddingBottom: "0.0625rem",
})

export const highlight = style({
  // fontStyle: "italic",
  fontWeight: 500,
})

export const type = style({
  fontSize: 10,
  opacity: 0.4,
  userSelect: "none",
  paddingBottom: "0.0625rem",
})
