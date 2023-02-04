import {
  color,
  flex,
  hexToRgb,
  padding,
  rounded,
  spacing,
  theme,
  transition,
  vars,
} from '@/ui/theme'
import { createVar, style } from '@vanilla-extract/css'

const gridSize = spacing[10]

export const container = style({
  width: '100%',
  height: '100%',
  background: color.gray[900],
})

export const graph = (() => {
  const patternSize = `1px`
  const patternColor = hexToRgb(color.gray[800], 0.7)
  const pattern = `${patternColor} 0,
  ${patternColor} ${patternSize},
  transparent ${patternSize},
  transparent ${gridSize}`

  return style({
    padding: `calc(${gridSize} - ${patternSize})`,
    paddingBottom: '100%',
    position: 'relative',
    ...flex('column', 'items-start'),
    background: `repeating-linear-gradient(${pattern}), repeating-linear-gradient(90deg, ${pattern})`,
    backgroundPosition: `-${patternSize} -${patternSize}`,
  })
})()

const _node = (() => {
  const depthVar = createVar('depth')

  const bg = hexToRgb(color.gray[900], 0.8)
  const margin = spacing[2]

  return {
    node: style({
      height: `calc(${gridSize} - ${margin} * 2)`,
      minWidth: `calc(${gridSize} * 2)`,
      transform: `translateX(calc(${depthVar} * ${gridSize}))`,
      margin: margin,
      ...padding(0, 1.5),
      ...rounded('md'),
      backgroundColor: bg,
      ...flex('items-center'),
      boxShadow: `0 0 ${margin} ${spacing[1]} ${bg}`,
      border: `2px solid transparent`,
      ...transition(['background-color', 'border-color']),
      cursor: 'pointer',
      selectors: {
        // hovered
        '&:is(:hover, [data-hovered=true])': {
          backgroundColor: color.gray[800],
        },
        // inspected
        '&[data-inspected=true]': {
          borderColor: color.gray[300],
          cursor: 'default',
        },
        // not inspected
        '&:not([data-inspected=true]):active': {
          borderColor: color.gray[500],
        },
      },
    }),
    depthVar,
  }
})()
export const { node, depthVar } = _node

export const lengthVar = createVar('length')

export const svg = style({
  position: 'absolute',
  overflow: 'visible',
  top: `calc(${gridSize} * 1.5)`,
  left: `calc(${gridSize} * 1.5)`,
  width: `calc(${gridSize} * ${lengthVar})`,
  height: `calc(${gridSize} * ${lengthVar})`,
  pointerEvents: 'none',
})

export const arrowHead = style({
  fill: 'none',
  stroke: vars.domColor,
})

export const line = style({
  stroke: vars.domColor,
  strokeLinecap: 'round',
  opacity: 0.5,
  ...transition('opacity', theme.duration[300], theme.duration[75]),
  selectors: {
    '&[data-highlighted=true]': {
      opacity: 1,
    },
  },
})
