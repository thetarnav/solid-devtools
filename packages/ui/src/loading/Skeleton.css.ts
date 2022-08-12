import { style } from "@vanilla-extract/css"
import { centerChild, color } from "../theme"

export const skeleton = style({
  ...centerChild,
  width: "100%",
  height: "100%",
  backgroundColor: color.gray[200],
  color: color.gray[600],
})
