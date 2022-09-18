import { style } from "@vanilla-extract/css"
import { centerChild, color, rounded, theme, transition } from "@/ui/theme"

export const toggleButton = style({
  ...centerChild,
  color: color.gray[500],
  backgroundColor: "transparent",
  border: `1px solid ${color.gray[200]}`,
  ...transition(["color", "backgroundColor", "borderColor"], theme.duration[200]),
  ...rounded("md"),
  ":hover": {
    color: color.gray[700],
    backgroundColor: color.gray[200],
    borderColor: color.gray[300],
  },
  selectors: {
    '&[aria-selected="true"]': {
      color: color.cyan[700],
    },
  },
})
