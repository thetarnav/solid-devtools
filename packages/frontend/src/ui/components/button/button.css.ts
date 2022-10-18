import { ComplexStyleRule, style } from '@vanilla-extract/css'
import { centerChild, color, dark, media, rounded, theme, transition } from '@/ui/theme'

export const selectedStyles: ComplexStyleRule = {
  color: color.cyan[700],
  backgroundColor: color.cyan[50],
  borderColor: color.cyan[200],
}

export const toggleButtonStyles: ComplexStyleRule = {
  ...centerChild,
  color: color.gray[500],
  backgroundColor: 'transparent',
  border: `1px solid ${color.gray[200]}`,
  ...transition(['color', 'backgroundColor', 'borderColor'], theme.duration[200]),
  ...rounded('md'),
  ':hover': {
    color: color.gray[700],
    backgroundColor: color.gray[200],
    borderColor: color.gray[300],
  },
  selectors: {
    '&[aria-selected="true"]': selectedStyles,
    '&[aria-expanded="true"]': selectedStyles,
  },
  ...media({
    [dark]: {
      borderColor: color.gray[500],
      ':hover': {
        color: color.gray[100],
        backgroundColor: color.gray[500],
        borderColor: color.gray[700],
      },
    },
  }),
}

export const toggleButton = style(toggleButtonStyles)
