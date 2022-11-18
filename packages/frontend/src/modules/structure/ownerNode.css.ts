import { createVar, style } from '@vanilla-extract/css'
import { CSSVarFunction } from '@vanilla-extract/private'
import {
  color,
  dark,
  inset,
  insetX,
  insetY,
  media,
  rounded,
  spacing,
  theme,
  transition,
} from '@/ui/theme'
import { rowHeight } from './structure.css'
import { Property } from 'csstype'
import { grayHighlightBorder, grayHighlightColor } from '@/ui/theme/vars.css'

export const levelVar: CSSVarFunction = createVar()

const dataHovered = '[data-hovered="true"]'
const dataSelected = '[data-selected="true"]'

export const container = style({
  height: rowHeight,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  paddingRight: spacing[4],
  cursor: 'pointer',
})

export const selection = style({
  position: 'absolute',
  zIndex: -1,
  ...insetY(0),
  ...insetX(1),
  ...rounded(),
  backgroundColor: grayHighlightColor,
  border: grayHighlightBorder,
  opacity: 0,
  ...transition(['opacity'], theme.duration[100]),
  selectors: {
    [`${container}${dataHovered} &`]: {
      opacity: 0.25,
    },
    [`${container}${dataSelected} &`]: {
      opacity: 0.45,
    },
  },
})

const paddingMask: Property.MaskImage = `linear-gradient(to right, rgba(0,0,0, 0.4), black ${spacing[48]})`
const remMinusPx = `calc(1rem - 1px)`
const linesColor = createVar()

export const levelPadding = style({
  position: 'relative',
  zIndex: -2,
  marginLeft: spacing[3],
  width: `calc(${levelVar} * ${spacing[4]} + ${spacing[2.5]})`,
  height: `calc(${rowHeight} + 1px)`,
  vars: {
    [linesColor]: color.gray[200],
  },
  background: `repeating-linear-gradient(to right, transparent, transparent ${remMinusPx}, ${linesColor} ${remMinusPx}, ${linesColor} 1rem)`,
  maskImage: paddingMask,
  WebkitMaskImage: paddingMask,
  ...media({
    [dark]: {
      vars: {
        [linesColor]: color.gray[600],
      },
    },
  }),
})

export const nameContainer = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  columnGap: spacing[2],
  minWidth: spacing[36],
})

export const collapse = style({
  position: 'absolute',
  left: `calc(-${rowHeight} - 2px)`,
  opacity: 0,
  ...transition('background-color'),
  ':before': {
    content: '',
    position: 'absolute',
    zIndex: -2,
    ...inset(0.5),
    ...rounded('full'),
    backgroundColor: color.white,
    ...transition('background-color'),
  },
  selectors: {
    [`${container}:is(${dataHovered}, ${dataSelected}) &`]: {
      opacity: 1,
    },
    '&:hover:before': {
      backgroundColor: color.gray[200],
    },
    [`&[aria-selected=true]`]: { opacity: 1 },
  },
  ...media({
    [dark]: {
      ':before': {
        backgroundColor: color.gray[800],
      },
      selectors: {
        '&:hover:before': {
          backgroundColor: color.gray[700],
        },
      },
    },
  }),
})
