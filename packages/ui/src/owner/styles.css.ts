import { style } from "@vanilla-extract/css"
import { theme } from "../theme"

const { spacing, color } = theme

export const container = style({
  paddingTop: spacing[1],
  paddingLeft: spacing[1],
  backgroundColor: `rgba(${color.cyan[200]} / 0.05)`,
  color: color.black,
  borderColor: `rgba(${color.cyan[900]} / 0.3)`,
  borderStyle: "solid",
  borderTopWidth: 1,
  borderLeftWidth: 1,
  outline: 1,
})

export const header = {
  contailer: style({
    display: "flex",
    alignItems: "center",
    paddingRight: spacing[2],
    paddingLeft: spacing[1],
  }),
  nameContainer: style({
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    width: spacing[36],
  }),
  highlight: style({
    fontStyle: "italic",
    fontWeight: "medium",
  }),
  type: style({
    marginLeft: spacing[2],
    fontSize: 10,
    opacity: 0.4,
    userSelect: "none",
  }),
}

export const childrenContainer = style({
  paddingLeft: spacing[4],
  paddingTop: spacing[1],
  // TODO: transition-opacity, duration-500
})
