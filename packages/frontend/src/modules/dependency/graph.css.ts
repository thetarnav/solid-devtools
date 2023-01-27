import { color, flex, hexToRgb, padding, rounded, spacing } from '@/ui/theme'
import { createVar, style } from '@vanilla-extract/css'

const gridSize = spacing[10]

export const container = (() => {
  const patternSize = `1px`
  const pattern = `${color.gray[800]} 0,
  ${color.gray[800]} ${patternSize},
  transparent ${patternSize},
  transparent ${gridSize}`

  return style({
    padding: `calc(${gridSize} - ${patternSize})`,
    position: 'relative',
    ...flex('column', 'items-start'),
    background: `repeating-linear-gradient(${pattern}), repeating-linear-gradient(90deg, ${pattern})`,
    backgroundPosition: `-${patternSize} -${patternSize}`,
    ':before': {
      content: '',
      position: 'absolute',
      zIndex: -1,
      background: color.gray[900],
      inset: 0,
    },
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
      ...padding(0, 2),
      ...rounded('md'),
      background: bg,
      ...flex('items-center'),
      boxShadow: `0 0 ${margin} ${spacing[1]} ${bg}`,
      border: `2px solid transparent`,
      selectors: {
        '&[data-inspected=true]': {
          borderColor: color.gray[100],
        },
      },
    }),
    depthVar,
  }
})()
export const { node, depthVar } = _node
