import { createVar, style } from "@vanilla-extract/css"
import { CSSVarFunction } from "@vanilla-extract/private"
import { hexToRgb, insetX, insetY, rounded, theme, transition } from "~/theme"

const { spacing, color } = theme

export const container = style({
  backgroundColor: hexToRgb(color.cyan[200], 0.05),
  color: color.black,
})

const shadowOpacity: CSSVarFunction = createVar()
export const levelVar: CSSVarFunction = createVar()

export const header = {
  contailer: style({
    height: spacing[5],
    position: "relative",
    display: "flex",
    alignItems: "center",
    paddingRight: spacing[2],
    cursor: "pointer",
    vars: { [shadowOpacity]: "0" },
    ...transition("color"),
    ":hover": {
      vars: { [shadowOpacity]: "0.2" },
    },
    selectors: {
      '&[data-selected="true"]': {
        color: color.white,
        vars: { [shadowOpacity]: "1" },
      },
    },
  }),
  selection: style({
    position: "absolute",
  }),
  containerShadow: style({
    position: "absolute",
    zIndex: -1,
    ...insetY(0),
    ...insetX(1),
    ...rounded(),
    backgroundColor: hexToRgb(color.gray[900], 0.8),
    opacity: shadowOpacity,
    ...transition("opacity", theme.duration[100]),
  }),
  nameContainer: style({
    marginLeft: `calc(${levelVar} * ${spacing[4]})`,
    display: "flex",
    alignItems: "center",
    minWidth: spacing[36],
  }),
  name: style({
    paddingBottom: "0.0625rem",
  }),
  highlight: style({
    fontStyle: "italic",
    fontWeight: 500,
  }),
  type: style({
    marginLeft: spacing[2],
    fontSize: 10,
    opacity: 0.4,
    userSelect: "none",
    paddingBottom: "0.0625rem",
  }),
}

export const childrenContainer = style({
  position: "relative",
  ...transition("opacity", theme.duration[500]),
  ":before": {
    content: "",
    position: "absolute",
    zIndex: -1,
    top: 0,
    bottom: 0,
    left: `calc(${levelVar} * ${spacing[4]} + ${spacing[2]})`,
    width: "1px",
    backgroundColor: color.cyan[500],
    opacity: 0.3,
  },
})
