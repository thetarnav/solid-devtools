import { style, styleVariants, createVar } from "@vanilla-extract/css"
import { CSSVarFunction } from "@vanilla-extract/private"
import { centerChild, color, spacing } from "../theme"

export const container = style({
  height: "100%",
  width: "100%",
  overflow: "auto",
  "::-webkit-scrollbar": {
    display: "none",
  },
})

export const content = style({
  overflow: "hidden",
  width: "max-content",
  height: "max-content",
})
