import { style, styleVariants } from '@vanilla-extract/css'
import { createHighlightStyles } from '@/ui/mixins'
import {
  centerChild,
  color,
  rounded,
  spacing,
  theme,
  insetX,
  padding,
  margin,
  remValue,
  vars,
  borderValue,
} from '@/ui/theme'
import { pathHeight } from './structure.css'

const rowHeight = spacing[3]

export const MIN_PATH_HEIGHT_IN_REM = remValue(pathHeight)

export const path = style({
  flexShrink: 0,
  height: pathHeight,
  width: '100%',
  position: 'relative',
  display: 'flex',
})

export const expand = style({
  height: '100%',
  backgroundColor: color.gray[700],
})

export const content = style({
  position: 'absolute',
  zIndex: 1,
  bottom: 0,
  ...insetX(0),
  minHeight: pathHeight,
  height: pathHeight,
  overflow: 'hidden',
  width: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'flex-end',
  ...padding(0.25, 2, 0.25, 2),
  borderTop: borderValue(vars.panel.border),
  backgroundColor: vars.panel.bg,
  ':hover': {
    height: 'auto',
    paddingTop: spacing[0.5],
  },
})

export const expendable = style({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 2,
  backgroundImage: `linear-gradient(to right, ${vars.panel.bg} ${spacing[8]}, transparent ${spacing[32]})`,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: spacing[3],
  selectors: {
    [`${content}:hover &`]: {
      opacity: 0,
    },
  },
})
export const expendableIcon = style({
  width: spacing[3],
  height: spacing[3],
  color: vars.disabled.color,
})

export const container = style({
  display: 'flex',
  flexWrap: 'wrap',
  fontSize: theme.fontSize.sm,
  lineHeight: rowHeight,
  fontFamily: theme.font.mono,
})

export const divider = style({
  width: rowHeight,
  height: spacing[4],
  ...margin(0, 0.5),
  ...centerChild,
  selectors: {
    [`${container} &:first-child`]: {
      display: 'none',
    },
  },
})

export const carret = style({
  width: spacing[2],
  height: spacing[2],
  marginBottom: '0.15rem',
  color: vars.disabled.color,
})

const highlights = createHighlightStyles()

export const item = style([
  highlights.container,
  {
    height: rowHeight,
    ...padding(0.25, 0),
    ...margin(0.25, 0),
    display: 'flex',
    alignItems: 'center',
    columnGap: spacing[1],
    cursor: 'pointer',
    vars: {
      [highlights.bgOpacityVar]: '0',
    },
    selectors: {
      '&[data-hovered="true"]': {
        vars: { [highlights.bgOpacityVar]: '0.3' },
      },
    },
  },
])

export const highlight = style([
  highlights.highlight,
  {
    border: `1px solid ${color.gray[400]}`,
    ...rounded('sm'),
  },
])

export const typeIcon = style({
  width: spacing[2.5],
  height: spacing[2.5],
  color: vars.disabled.color,
})

export const name = styleVariants({
  default: { color: vars.defaultTextColor },
  gray: { color: vars.disabled.color },
})
