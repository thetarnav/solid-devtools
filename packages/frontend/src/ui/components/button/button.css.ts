import {
  centerChild,
  color,
  dark,
  hexToRgb,
  hexToRgbValue,
  media,
  spacing,
  theme,
  transition,
} from '@/ui/theme'
import { createVar, fallbackVar, style } from '@vanilla-extract/css'

const selectedSelector = '&:is([aria-selected="true"], [aria-expanded="true"])'

const colorVar = createVar()
const colorOpacityVar = createVar()
const bgOpacityVar = createVar()
const borderOpacityVar = createVar()

export const toggleButton = style({
  ...centerChild,
  vars: {
    [colorVar]: hexToRgbValue(color.gray[600]),
    [colorOpacityVar]: '1',
    [bgOpacityVar]: '0',
    [borderOpacityVar]: '0',
  },
  color: hexToRgb(colorVar, colorOpacityVar),
  backgroundColor: hexToRgb(colorVar, bgOpacityVar),
  border: `1px solid ${hexToRgb(colorVar, borderOpacityVar)}`,
  outline: 'unset',
  ...transition(['color', 'backgroundColor', 'borderColor'], theme.duration[200]),

  selectors: {
    '&:is(:hover, :active:hover)': {
      vars: { [bgOpacityVar]: '0.1' },
    },
    '&:focus': {
      vars: { [borderOpacityVar]: '0.3' },
    },
    '&:active': {
      vars: { [bgOpacityVar]: '0.05' },
    },
    [selectedSelector]: {
      vars: {
        [colorVar]: hexToRgbValue(color.cyan[600]),
        [bgOpacityVar]: '0.05',
      },
    },
  },
  ...media({
    [dark]: {
      vars: {
        [colorVar]: hexToRgbValue(color.gray[400]),
      },
      selectors: {
        [selectedSelector]: {
          vars: {
            [colorVar]: hexToRgbValue(color.cyan[400]),
          },
        },
      },
    },
  }),
})
export const collapseButtonSize = createVar()

export const Collapse = (() => {
  const button = style({
    position: 'relative',
    height: fallbackVar(collapseButtonSize, spacing[4.5]),
    width: fallbackVar(collapseButtonSize, spacing[4.5]),
    flexShrink: 0,
    ...centerChild,
  })

  const defaultCollapsed = style({})

  return {
    button,
    defaultCollapsed,
    icon: style({
      width: spacing[2],
      height: spacing[2],
      color: color.gray[600],
      transform: 'rotate(180deg)',
      opacity: 0.5,
      ...transition(['transform', 'opacity']),
      selectors: {
        [`${button}[aria-selected="true"] &`]: {
          transform: 'rotate(90deg)',
          opacity: 1,
        },
        [`${defaultCollapsed} &`]: {
          opacity: 1,
        },
        [`${defaultCollapsed}[aria-selected="true"] &`]: {
          opacity: 0.5,
        },
      },
      ...media({
        [dark]: {
          color: color.gray[400],
        },
      }),
    }),
  }
})()
