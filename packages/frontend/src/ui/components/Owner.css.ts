import { style, StyleRule } from '@vanilla-extract/css'
import { color, dark, media, spacing, theme } from '../theme'

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
})

export const title = style({
  fontSize: theme.fontSize.lg,
})

export const name = style({
  selectors: {
    [`${container}[data-frozen="true"] &`]: {
      color: color.gray[600],
    },
    [`${container}[data-frozen="true"] &:after`]: strikeThroughLine,
  },
  color: color.black,
  ...media({
    [dark]: {
      color: color.gray[50],
      selectors: {
        [`${container}[data-frozen="true"] &`]: {
          color: color.gray[500],
        },
      },
    },
  }),
})

export const type = style({
  fontSize: '0.8em',
  userSelect: 'none',
  selectors: {
    [`${container}[data-frozen="true"] &:after`]: strikeThroughLine,
  },
  color: color.gray[500],
  ...media({
    [dark]: {
      color: color.gray[400],
      selectors: {
        [`${container}[data-frozen="true"] &`]: {
          color: color.gray[500],
        },
      },
    },
  }),
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
