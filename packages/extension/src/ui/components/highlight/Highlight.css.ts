import { style } from "@vanilla-extract/css"
import { createHighlightStyles } from "@/ui/mixins"
import { color } from "@/ui/theme"

export const { container, highlight, bgColorVar, bgOpacityVar } = createHighlightStyles()

export const setColor = style({
  color: color.black,
})
