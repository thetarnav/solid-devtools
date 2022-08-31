import { style } from "@vanilla-extract/css"
import { centerChild, color, rounded, theme, transition } from "~/theme"

export const toggleButton = style({
  ...centerChild,
  color: color.gray[500],
  backgroundColor: "transparent",
  border: "transparent",
  ...transition(["color", "backgroundColor", "border"], theme.duration[200]),
  ...rounded("md"),
  ":hover": {
    color: color.gray[700],
    backgroundColor: color.gray[200],
    border: `1px solid ${color.gray[300]}`,
  },
  selectors: {
    '&[aria-selected="true"]': {
      color: color.cyan[700],
    },
  },
})
