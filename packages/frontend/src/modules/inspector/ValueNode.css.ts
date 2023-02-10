import { createHighlightStyles } from '@/ui/mixins'
import {
  centerChild,
  color,
  dark,
  flex,
  media,
  selectors,
  spacing,
  theme,
  transition,
  vars,
} from '@/ui/theme'
import { createVar, style, StyleRule } from '@vanilla-extract/css'

export const RowHeight = spacing[4.5]
const RowGap = spacing[0.5]

export const row = (() => {
  const valueRowHighlight = createHighlightStyles()
  const collapseOpacity = createVar()

  return {
    container: style([
      valueRowHighlight.container,
      {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        paddingLeft: '2ch',
        fontFamily: theme.font.mono,
        color: color.gray[800],
        lineHeight: RowHeight,
        vars: {
          [valueRowHighlight.bgOpacityVar]: '0',
          [collapseOpacity]: '0',
        },
        selectors: {
          '&[data-stale=true]': {
            opacity: 0.6,
          },
          '&[data-extended=true]': {
            vars: {
              [collapseOpacity]: '1',
            },
          },
          '&[data-hovered=true]': {
            vars: {
              [valueRowHighlight.bgOpacityVar]: '0.3',
              [collapseOpacity]: '1',
            },
          },
        },
      },
    ]),
    highlight: style([
      valueRowHighlight.highlight,
      {
        border: vars.grayHighlight.border,
      },
    ]),
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

export const actions = {
  container: style({
    position: 'absolute',
    zIndex: 2,
    top: '0',
    right: spacing[2],
    height: RowHeight,
    ...flex('justify-end', 'items-center'),
    opacity: 0,
    ...transition('opacity'),
    ...selectors({
      [`${row.container}[data-hovered=true] &`]: {
        opacity: 0.55,
        '#:hover': {
          opacity: 0.8,
        },
        '#:active': {
          opacity: 1,
        },
      },
    }),
  }),
  button: style({
    ...centerChild,
  }),
  icon: style({
    height: spacing[4],
    width: spacing[4],
    color: vars.defaultTextColor,
  }),
}

export const name = {
  container: style({
    display: 'flex',
    alignItems: 'center',
    height: RowHeight,
    selectors: {
      [`${row.container}[data-extended] &`]: {
        cursor: 'pointer',
      },
    },
  }),
  // icon: style({
  //   height: spacing[3],
  //   width: spacing[3],
  //   color: color.gray[600],
  //   marginRight: spacing[1],
  //   ...media({
  //     [dark]: {
  //       color: color.gray[400],
  //     },
  //   }),
  // }),
  name: style({
    height: RowHeight,
    minWidth: '5ch',
    marginRight: '2ch',
    userSelect: 'none',
    ':after': {
      content: ':',
      color: vars.disabled.color,
    },
    fontFamily: theme.font.mono,
    color: vars.lighterTextColor,
    selectors: {
      '&[data-signal=true]': {
        color: vars.domColor,
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
  color: vars.lighterTextColor,
})

const bracketsStyles: StyleRule = {
  fontWeight: 800,
  color: color.gray[800],
}
export const ValueObject = style({
  color: vars.disabled.color,
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
    color: vars.disabled.color,
  },
])

const elHighlight = createHighlightStyles()

export const ValueElement = {
  container: style([
    baseValue,
    elHighlight.container,
    {
      color: vars.domColor,
      vars: {
        [elHighlight.bgOpacityVar]: '0',
      },
      ':hover': {
        vars: {
          [elHighlight.bgOpacityVar]: '0.6',
        },
      },
      ':before': {
        color: vars.disabled.color,
        content: `<`,
      },
      ':after': {
        color: vars.disabled.color,
        content: '/>',
      },
    },
  ]),
  highlight: elHighlight.highlight,
}
