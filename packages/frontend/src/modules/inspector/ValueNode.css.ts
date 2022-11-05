import { createVar, style, styleVariants } from '@vanilla-extract/css'
import { CSSPropertiesWithVars } from '@vanilla-extract/css/dist/declarations/src/types'
import { dark, color, spacing, theme, media, centerChild, transition } from '@/ui/theme'
import { createHighlightStyles } from '@/ui/mixins'
import { colorDisabled } from '@/ui/theme/vars.css'

const RowHeight = spacing[4.5]
const RowGap = spacing[0.5]

export const row = (() => {
  const valueRowHighlight = createHighlightStyles()

  const container = style({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingLeft: '2ch',
    fontFamily: theme.font.mono,
    color: color.gray[800],
    lineHeight: RowHeight,
  })

  const collapseOpacity = createVar()

  return {
    collapseOpacity,
    container: styleVariants({
      base: [container],
      collapsable: [
        container,
        valueRowHighlight.container,
        {
          cursor: 'pointer',
          vars: {
            [valueRowHighlight.bgColorVar]: color.gray[300],
            [valueRowHighlight.bgOpacityVar]: '0',
          },
          selectors: {
            [`&[data-hovered=true]`]: {
              vars: { [valueRowHighlight.bgOpacityVar]: '0.3' },
            },
          },
          ...media({
            [dark]: {
              vars: {
                [valueRowHighlight.bgColorVar]: color.gray[600],
              },
            },
          }),
        },
      ],
    }),
    highlight: style([valueRowHighlight.highlight, { border: `1px solid ${color.gray[400]}` }]),
    toggle: {
      container: style({
        position: 'absolute',
        left: `-${spacing[1]}`,
        width: RowHeight,
        height: RowHeight,
        ...centerChild,
      }),
      button: style({
        opacity: collapseOpacity,
        ...transition('opacity'),
      }),
    },
  }
})()

export const name = {
  container: style({
    display: 'flex',
    alignItems: 'center',
    height: RowHeight,
  }),
  icon: style({
    height: spacing[3],
    width: spacing[3],
    color: color.gray[600],
    marginRight: spacing[1],
    ...media({
      [dark]: {
        color: color.gray[400],
      },
    }),
  }),
  name: style({
    height: RowHeight,
    minWidth: '5ch',
    marginRight: '2ch',
    userSelect: 'none',
    ':after': {
      content: ':',
      color: colorDisabled,
    },
    fontFamily: theme.font.mono,
    color: color.gray[800],
    ...media({
      [dark]: {
        color: color.gray[200],
      },
    }),
    selectors: {
      '&[data-signal=true]': {
        color: color.amber[600],
        ...media({
          [dark]: {
            color: color.amber[500],
          },
        }),
      },
    },
  }),
  highlight: style({
    display: 'inline-block',
  }),
}

export const baseValue = style({
  fontWeight: 500,
  height: RowHeight,
  color: color.gray[800],
  ...media({
    [dark]: {
      color: color.gray[200],
    },
  }),
})

const bracketsStyles: CSSPropertiesWithVars = {
  fontWeight: 800,
  color: color.gray[800],
}
export const ValueObject = style({
  color: colorDisabled,
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
  }),
}

export const ValueString = style([
  baseValue,
  {
    minHeight: RowHeight,
    height: 'fit-content',
    maxWidth: 'fit-content',
    color: color.green,
    ...media({
      [dark]: {
        color: color.green,
      },
    }),
  },
])
export const ValueNumber = style([
  baseValue,
  {
    minHeight: RowHeight,
    color: color.cyan[600],
    ...media({
      [dark]: {
        color: color.green,
      },
    }),
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
    color: colorDisabled,
  },
])

const elHighlight = createHighlightStyles()

export const ValueElement = {
  container: style([
    baseValue,
    elHighlight.container,
    {
      color: color.amber[600],
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
        color: colorDisabled,
        content: `<`,
      },
      ':after': {
        color: colorDisabled,
        content: '/>',
      },
      ...media({
        [dark]: {
          color: color.amber[500],
          vars: {
            [elHighlight.bgColorVar]: color.gray[600],
          },
        },
      }),
    },
  ]),
  highlight: elHighlight.highlight,
}
