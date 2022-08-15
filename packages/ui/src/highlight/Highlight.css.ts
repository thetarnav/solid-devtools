import { style } from "@vanilla-extract/css"
import { insetX, insetY, rounded, spacing, transition } from "../theme"

export const span = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  ...transition("background-color"),
})

export const highlight = style({
  position: "absolute",
  zIndex: -1,
  ...insetX(`-${spacing[1]}`),
  ...insetY(0),
  ...rounded(),
  ...transition("background-color"),
})
