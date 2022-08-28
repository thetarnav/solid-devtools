import { style } from "@vanilla-extract/css"
import { CSSPropertiesWithVars } from "@vanilla-extract/css/dist/declarations/src/types"
import { centerChild, color, spacing, theme } from "~/theme"
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

const valueRowHighlight = createHighlightStyles()

export const ValueRow = {
  container: style([
    valueRowHighlight.container,
    {
      width: "100%",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-start",
      cursor: "pointer",
      vars: {
        [valueRowHighlight.bgColorVar]: color.gray[300],
        [valueRowHighlight.bgOpacityVar]: "0",
      },
    },
  ]),
  containerFocused: style({
    vars: {
      [valueRowHighlight.bgOpacityVar]: "0.2",
    },
  }),
  containerHovered: style({
    vars: { [valueRowHighlight.bgOpacityVar]: "0.3" },
  }),
  highlight: style([
    valueRowHighlight.highlight,
    {
      border: `1px solid ${color.gray[400]}`,
    },
  ]),
}

export const ValueName = {
  container: style({
    display: "flex",
    alignItems: "center",
    height: RowHeight,
  }),
  iconWrapper: style({
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
  icon: style({
    height: spacing[4],
    width: spacing[4],
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

const elHighlight = createHighlightStyles()

export const ValueElement = {
  container: style([
    baseValue,
    elHighlight.container,
    {
      color: color.amber[600],
      textTransform: "lowercase",
      vars: {
        [elHighlight.bgColorVar]: color.gray[300],
        [elHighlight.bgOpacityVar]: "0",
      },
      ":hover": {
        vars: {
          [elHighlight.bgOpacityVar]: "0.6",
        },
      },
      ":before": {
        color: color.disabled,
        content: `<`,
      },
      ":after": {
        color: color.disabled,
        content: "/>",
      },
    },
  ]),
  highlight: elHighlight.highlight,
}
