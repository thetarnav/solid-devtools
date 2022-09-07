import { style } from "@vanilla-extract/css"
import { createHighlightStyles } from "@/ui/mixins"
import { centerChild, color, rounded, spacing, theme } from "@/ui/theme"

export const container = style({
  display: "flex",
  flexWrap: "wrap",
  fontSize: spacing[2.5],
  lineHeight: spacing[3],
  fontFamily: theme.font.mono,
})

export const divider = style({
  width: spacing[3],
  height: spacing[3],
  marginRight: spacing[1],
  ...centerChild,
})

export const carret = style({
  width: spacing[2],
  height: spacing[2],
})

const highlights = createHighlightStyles()

export const item = style([
  highlights.container,
  {
    marginRight: spacing[1],
    ":last-child": {
      marginRight: 0,
    },
    cursor: "pointer",
    vars: {
      [highlights.bgColorVar]: color.gray[300],
      [highlights.bgOpacityVar]: "0",
    },
    ":hover": {
      vars: { [highlights.bgOpacityVar]: "0.3" },
    },
  },
])

export const highlight = style([
  highlights.highlight,
  {
    border: `1px solid ${color.gray[400]}`,
    ...rounded("sm"),
  },
])

export const notFound = style({})
