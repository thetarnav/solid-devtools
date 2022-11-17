import { style, StyleRule } from '@vanilla-extract/css'
import { color, dark, media, spacing, theme } from '../theme'
import { colorDisabled } from '../theme/vars.css'

const strikeThroughLine: StyleRule = {
  content: '',
  position: 'absolute',
  zIndex: -1,
  top: '50%',
  left: 0,
  right: 0,
  height: '1px',
  backgroundColor: 'currentcolor',
}

export const container = style({
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  fontFamily: theme.font.mono,
})

export const title = style({
  fontSize: theme.fontSize.lg,
})

export const name = style({
  selectors: {
    [`${container}[data-frozen="true"] &`]: {
      color: colorDisabled,
    },
    [`${container}[data-frozen="true"] &:after`]: strikeThroughLine,
  },
  color: color.black,
  ...media({
    [dark]: {
      color: color.gray[50],
    },
  }),
})
export const componentName = style([
  name,
  {
    ':before': {
      content: '<',
      color: colorDisabled,
    },
    ':after': {
      content: '>',
      color: colorDisabled,
    },
  },
])

export const type = style({
  fontSize: '0.8em',
  userSelect: 'none',
  selectors: {
    [`${container}[data-frozen="true"] &:after`]: strikeThroughLine,
  },
  color: colorDisabled,
})

export const typeIcon = style({
  width: spacing[3],
  height: spacing[3],
  marginRight: spacing[1],
  marginBottom: `-1px`,
  color: color.gray[600],
  ...media({
    [dark]: {
      color: color.gray[100],
    },
  }),
})
