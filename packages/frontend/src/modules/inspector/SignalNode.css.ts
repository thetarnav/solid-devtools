import { style, styleVariants } from '@vanilla-extract/css'
import { CSSPropertiesWithVars } from '@vanilla-extract/css/dist/declarations/src/types'
import { color, spacing, theme } from '@/ui/theme'
import { createHighlightStyles } from '@/ui/mixins'

const RowHeight = spacing[4.5]
const RowGap = spacing[0.5]

export const Signals = {
  container: style({
    display: 'flex',
    flexDirection: 'column',
    gap: RowGap,
  }),
}

const valueRowHighlight = createHighlightStyles()

export const ValueRow = {
  container: style([
    valueRowHighlight.container,
    {
      width: '100%',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      cursor: 'pointer',
      vars: {
        [valueRowHighlight.bgColorVar]: color.gray[300],
        [valueRowHighlight.bgOpacityVar]: '0',
      },
      fontFamily: theme.font.mono,
      color: color.gray[800],
      lineHeight: RowHeight,
    },
  ]),
  containerFocused: style({
    vars: {
      [valueRowHighlight.bgOpacityVar]: '0.2',
    },
  }),
  containerHovered: style({
    vars: { [valueRowHighlight.bgOpacityVar]: '0.3' },
  }),
  highlight: style([
    valueRowHighlight.highlight,
    {
      border: `1px solid ${color.gray[400]}`,
    },
  ]),
}

const ValueName_container_base = style({
  display: 'flex',
  alignItems: 'center',
  height: RowHeight,
})
const ValueName_name_base = style({
  height: RowHeight,
  minWidth: '5ch',
  marginRight: '2ch',
  ':after': {
    content: ':',
    color: color.gray[500],
  },
  '@media': {
    'screen and (prefers-color-scheme: dark)': {
      ':after': {
        color: color.gray[500],
      },
    },
  },
})
export const ValueName = {
  container: styleVariants({
    base: [ValueName_container_base, { paddingLeft: spacing[2] }],
    title: [ValueName_container_base],
  }),
  signalDot: style({
    width: spacing[1],
    height: spacing[1],
    borderRadius: '50%',
    backgroundColor: color.amber[400],
  }),
  icon: style({
    height: spacing[3],
    width: spacing[3],
    color: color.gray[600],
    marginRight: spacing[1],
    '@media': {
      'screen and (prefers-color-scheme: dark)': {
        color: color.gray[400],
      },
    },
  }),
  name: styleVariants({
    base: [
      ValueName_name_base,
      {
        fontWeight: 600,
        fontFamily: theme.font.mono,
        color: color.gray[800],
        '@media': {
          'screen and (prefers-color-scheme: dark)': {
            color: color.gray[200],
          },
        },
      },
    ],
    title: [
      ValueName_name_base,
      {
        color: color.gray[500],
        '@media': {
          'screen and (prefers-color-scheme: dark)': {
            color: color.gray[300],
          },
        },
      },
    ],
  }),
  highlight: style({
    display: 'inline-block',
  }),
}

export const baseValue = style({
  fontWeight: 600,
  height: RowHeight,
  color: color.gray[800],
  '@media': {
    'screen and (prefers-color-scheme: dark)': {
      color: color.gray[200],
    },
  },
})

const bracketsStyles: CSSPropertiesWithVars = {
  fontWeight: 800,
  color: color.gray[800],
}
export const ValueObject = style({
  color: color.disabled,
  ':before': {
    ...bracketsStyles,
    content: '{',
  },
  ':after': {
    ...bracketsStyles,
    content: '}',
  },
})

export const collapsable = {
  list: style({
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: RowGap,
    marginLeft: '2ch',
  }),
}

export const ValueString = style([
  baseValue,
  {
    minHeight: RowHeight,
    color: color.green,
    '@media': {
      'screen and (prefers-color-scheme: dark)': {
        color: color.green,
      },
    },
  },
])
export const ValueNumber = style([
  baseValue,
  {
    minHeight: RowHeight,
    color: color.cyan[600],
    '@media': {
      'screen and (prefers-color-scheme: dark)': {
        color: color.green,
      },
    },
  },
])
export const ValueBoolean = style([
  baseValue,
  {
    // the checkbox is not clickable now
    // TODO: is it's not clickable—it shouldn't be able to be focused
    pointerEvents: 'none',
  },
])
export const ValueFunction = style([
  baseValue,
  {
    fontStyle: 'italic',
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
      '@media': {
        'screen and (prefers-color-scheme: dark)': {
          color: color.amber[600],
        },
      },
      textTransform: 'lowercase',
      vars: {
        [elHighlight.bgColorVar]: color.gray[300],
        [elHighlight.bgOpacityVar]: '0',
      },
      ':hover': {
        vars: {
          [elHighlight.bgOpacityVar]: '0.6',
        },
      },
      ':before': {
        color: color.disabled,
        content: `<`,
      },
      ':after': {
        color: color.disabled,
        content: '/>',
      },
    },
  ]),
  highlight: elHighlight.highlight,
}
