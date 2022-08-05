import { style, styleVariants, createVar } from "@vanilla-extract/css"
import { CSSVarFunction } from "@vanilla-extract/private"
import { centerChild, color, spacing } from "../theme"

const minWidth = spacing[36]
const splitWidth = spacing[0.5]

const containerBase = style({
  display: "grid",
  gridAutoFlow: "row",
  height: "100%",
  width: "100%",
})

export const progress: CSSVarFunction = createVar()

export const container = styleVariants({
  open: [
    containerBase,
    {
      gridTemplateColumns: `minmax(${minWidth}, ${progress}) ${splitWidth} minmax(${minWidth}, 1fr)`,
    },
  ],
  closed: [
    containerBase,
    {
      gridTemplateColumns: `1fr`,
    },
  ],
})

export const split = style({
  position: "relative",
  backgroundColor: color.gray[600],
})

export const splitHandle = style({
  position: "absolute",
  top: 0,
  left: -1,
  right: -1,
  bottom: 0,
  cursor: "col-resize",
  userSelect: "none",
})

export const toggle = style({
  position: "absolute",
  top: 0,
  right: splitWidth,
  width: spacing[6],
  height: spacing[6],
  backgroundColor: color.gray[600],
  ...centerChild,
  color: color.white,
  userSelect: "none",
})
