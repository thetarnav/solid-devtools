import { createVar, style, styleVariants } from "@vanilla-extract/css"
import { CSSVarFunction } from "@vanilla-extract/private"
import { hexToRgb, inset, insetX, insetY, rounded, theme, transition } from "../theme"

const { spacing, color } = theme

export const container = style({
  paddingTop: spacing[1],
  paddingLeft: spacing[1],
  backgroundColor: hexToRgb(color.cyan[200], 0.05),
  color: color.black,
  borderColor: hexToRgb(color.cyan[900], 0.3),
  borderStyle: "solid",
  borderWidth: 0,
  borderTopWidth: 1,
  borderLeftWidth: 1,
  outline: 1,
})

const opacityVar: CSSVarFunction = createVar()

const headerContainerBase = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  paddingRight: spacing[2],
  paddingLeft: spacing[1],
  cursor: "pointer",
  vars: { [opacityVar]: "0" },
  ...transition("color"),
})

export const header = {
  contailer: styleVariants({
    base: [headerContainerBase],
    focused: [
      headerContainerBase,
      {
        color: color.white,
        vars: { [opacityVar]: "1" },
      },
    ],
  }),
  containerShadow: style({
    position: "absolute",
    ...insetY(`-${spacing[0.5]}`),
    ...insetX(`-${spacing[2]}`),
    ...rounded(),
    backgroundColor: hexToRgb(color.gray[900], 0.8),
    opacity: opacityVar,
    ...transition("opacity"),
  }),
  nameContainer: style({
    display: "flex",
    alignItems: "center",
    width: spacing[36],
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
  }),
}

export const childrenContainer = style({
  paddingLeft: spacing[4],
  paddingTop: spacing[1],
  ...transition("opacity", theme.duration[500]),
})
