import { style } from "@vanilla-extract/css"
import { centerChild, color, spacing, theme } from "../theme"
import { CSSPropertiesWithVars } from "@vanilla-extract/css/dist/declarations/src/types"
import { createHighlightStyles } from "~/mixins"

const RowHeight = spacing[4.5]
const RowGap = spacing[0.5]

export const Signals = {
  container: style({
    display: "flex",
    flexDirection: "column",
    gap: RowGap,
    fontFamily: theme.font.mono,
    color: color.gray[800],
    fontWeight: 600,
  }),
}

const { container, highlight, bgColorVar, bgOpacityVar } = createHighlightStyles("background-color")

export const SignalNode = {
  container: style([
    container,
    {
      width: "100%",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-start",
      // height: spacing[4.5],
      cursor: "pointer",
      vars: {
        [bgColorVar]: "transparent",
        [bgOpacityVar]: "1",
      },
      ":hover": {
        vars: { [bgColorVar]: color.gray[200] },
      },
    },
  ]),
  containerFocused: style({
    vars: {
      [bgColorVar]: color.gray[100],
    },
  }),
  highlight: style([highlight, {}]),
  name: {
    container: style({
      display: "flex",
      alignItems: "center",
      height: RowHeight,
    }),
    icon: style({
      height: RowHeight,
      width: RowHeight,
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
      height: RowHeight,
      minWidth: "5ch",
      marginRight: "2ch",
      color: color.gray[800],
      fontWeight: 600,
      fontFamily: theme.font.mono,
      ":after": {
        content: ":",
        color: color.disabled,
      },
    }),
    highlight: style({
      display: "inline-block",
    }),
  },
}

export const baseValue = style({
  height: RowHeight,
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

export const collapsable = {
  list: style({
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: RowGap,
    marginLeft: "2ch",
  }),
}

export const EmptyArray = style([
  baseValue,
  {
    color: color.disabled,
  },
])
export const ValueString = style({
  minHeight: RowHeight,
  color: color.green,
})
export const ValueNumber = style({
  minHeight: RowHeight,
  color: color.cyan[600],
})
export const ValueBoolean = style([
  baseValue,
  {
    // the checkbox is not clickable now
    // TODO: is it's not clickable—it shouldn't be able to be focused
    pointerEvents: "none",
  },
])
export const ValueFunction = style([
  baseValue,
  {
    fontStyle: "italic",
  },
])
export const Nullable = style([
  baseValue,
  {
    color: color.disabled,
  },
])
export const ValueElement = style([
  baseValue,
  {
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
  },
])
