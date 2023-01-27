import { color, flex, hexToRgb, padding, rounded, spacing } from '@/ui/theme'
import { createVar, style } from '@vanilla-extract/css'

const gridSize = spacing[9]

export const container = (() => {
  const patternSize = `1px`
  const pattern = `${color.gray[800]} 0,
  ${color.gray[800]} ${patternSize},
  transparent ${patternSize},
  transparent ${gridSize}`

  return style({
    padding: gridSize,
    position: 'relative',
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

export const nodes = (() => {
  const shadowColor = color.gray[900]
  const shadowBlur = '36px'
  const shadowSpread = '16px'

  return style({
    ...flex('column', 'items-start'),
    // filter: (
    //   [
    //     ['-', ''],
    //     ['', '-'],
    //     ['-', '-'],
    //     ['', ''],
    //   ] as const
    // ).reduce(
    //   (acc: string, [x, y]) =>
    //     `${acc} drop-shadow(${x}${shadowSpread} ${y}${shadowSpread} ${shadowBlur} ${shadowColor})`,
    //   '',
    // ),
  })
})()

export const depthVar = createVar('depth')

export const node = style({
  height: `calc(${gridSize} - ${spacing[1]} * 2)`,
  minWidth: `calc(${gridSize} * 2)`,
  transform: `translateX(calc(${depthVar} * ${gridSize}))`,
  margin: spacing[1],
  ...padding(1, 2),
  ...rounded('md'),
  background: hexToRgb(color.gray[900], 0.8),
  ...flex('items-center'),
  boxShadow: `0 0 ${spacing[1]} ${spacing[0.5]} ${hexToRgb(color.gray[900], 0.8)}`,
})
