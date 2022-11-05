import { ComplexStyleRule, createVar, style } from '@vanilla-extract/css'
import {
  centerChild,
  color,
  dark,
  hexToRgbValue,
  hexToRgb,
  media,
  rounded,
  theme,
  transition,
  spacing,
} from '@/ui/theme'

const selectedSelector = '&:is([aria-selected="true"], [aria-expanded="true"])'

const colorVar = createVar()
const colorOpacityVar = createVar()
const bgOpacityVar = createVar()
const borderOpacityVar = createVar()

export const toggleButtonStyles: ComplexStyleRule = {
  ...centerChild,
  vars: {
    [colorVar]: hexToRgbValue(color.gray[600]),
    [colorOpacityVar]: '1',
    [bgOpacityVar]: '0',
    [borderOpacityVar]: '0.2',
  },
  color: hexToRgb(colorVar, colorOpacityVar),
  backgroundColor: hexToRgb(colorVar, bgOpacityVar),
  border: `1px solid ${hexToRgb(colorVar, borderOpacityVar)}`,
  ...transition(['color', 'backgroundColor', 'borderColor'], theme.duration[200]),
  ...rounded('md'),
  ':hover': {
    vars: {
      [bgOpacityVar]: '0.1',
      [borderOpacityVar]: '0.25',
    },
  },
  ':active': {
    vars: {
      [bgOpacityVar]: '0.05',
      [borderOpacityVar]: '0.2',
    },
  },
  selectors: {
    [selectedSelector]: {
      vars: {
        [colorVar]: hexToRgbValue(color.cyan[600]),
        [bgOpacityVar]: '0.05',
        [borderOpacityVar]: '0.2',
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
}

export const toggleButton = style(toggleButtonStyles)

export const Collapse = (() => {
  const button = style({
    position: 'relative',
    height: '1.25rem',
    width: '1.25rem',
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
