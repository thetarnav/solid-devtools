import { style } from "@vanilla-extract/css"
import { createHighlightStyles } from "~/mixins"
import { color } from "../theme"

export const { container, highlight, bgColorVar, bgOpacityVar } = createHighlightStyles()

export const setColor = style({
  color: color.black,
})
