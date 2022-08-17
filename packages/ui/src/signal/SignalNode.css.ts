import { style } from "@vanilla-extract/css"
import { centerChild, color, hexToRgbValue, spacing, theme } from "../theme"
import { CSSPropertiesWithVars } from "@vanilla-extract/css/dist/declarations/src/types"
import { createHighlightStyles } from "~/mixins"

export const Signals = {
  container: style({
    display: "flex",
    flexDirection: "column",
    gap: spacing[0.5],
  }),
}

const { container, highlight, bgColorVar, bgOpacityVar } = createHighlightStyles()

export const SignalNode = {
  container: style([
    container,
    {
      width: "100%",
      display: "flex",
      alignItems: "center",
      height: spacing[4.5],
      cursor: "pointer",
      vars: {
        [bgColorVar]: hexToRgbValue(color.gray[200]),
      },
      ":hover": {
        vars: { [bgOpacityVar]: "1" },
      },
    },
  ]),
  highlight: style([highlight, {}]),
  icon: style({
    height: "100%",
    width: spacing[4.5],
    marginRight: spacing[1],
    ...centerChild,
  }),
  signalDot: style({
    width: spacing[1],
    height: spacing[1],
    borderRadius: "50%",
    backgroundColor: color.amber[400],
  }),
  name: style({
    height: "100%",
    minWidth: spacing[24],
    color: color.gray[800],
    fontWeight: 600,
    fontFamily: theme.font.mono,
    ":after": {
      content: ":",
      color: color.disabled,
    },
  }),
}

export const ValuePreview = style({
  minWidth: spacing[4],
  height: "100%",
  display: "flex",
  alignItems: "center",
  color: color.gray[800],
  fontFamily: theme.font.mono,
  fontWeight: 600,
})

export const ValueString = style({
  color: color.green,
})
export const ValueNumber = style({
  color: color.cyan[600],
})
export const ValueBoolean = style({
  // the checkbox is not clickable now
  pointerEvents: "none",
})

const bracketsStyles: CSSPropertiesWithVars = {
  fontWeight: 800,
  color: color.gray[800],
}
export const ValueObject = style({
  color: color.disabled,
  ":before": {
    ...bracketsStyles,
    content: `{`,
  },
  ":after": {
    ...bracketsStyles,
    content: "}",
  },
})

export const EmptyArray = style({
  color: color.disabled,
})

export const ValueFunction = style({
  fontStyle: "italic",
})

export const Nullable = style({
  color: color.disabled,
})

export const ValueElement = style({
  color: color.amber[600],
  textTransform: "lowercase",
  ":before": {
    color: color.disabled,
    content: `<`,
  },
  ":after": {
    color: color.disabled,
    content: "/>",
  },
})
