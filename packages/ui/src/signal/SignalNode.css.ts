import { style } from "@vanilla-extract/css"
import { color, spacing, theme } from "../theme"
import { CSSPropertiesWithVars } from "@vanilla-extract/css/dist/declarations/src/types"

export const Signals = {
  container: style({
    display: "flex",
    flexDirection: "column",
    gap: spacing[0.5],
  }),
}

export const SignalNode = {
  container: style({
    display: "flex",
    alignItems: "center",
    height: spacing[4.5],
  }),
  name: style({
    minWidth: spacing[24],
    color: color.gray[800],
    fontWeight: 600,
    fontFamily: theme.font.mono,
  }),
}

export const ValuePreview = style({
  minWidth: spacing[4],
  height: spacing[4.5],
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
