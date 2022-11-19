import { createVar, style } from '@vanilla-extract/css'
import { remValue, spacing, theme, transition } from '@/ui/theme'

export const rowHeight = spacing[4.5]
export const rowPadding = spacing[3.5]
export const vMargin = spacing[3]

export const ROW_HEIGHT_IN_REM = remValue(rowHeight)
export const V_MARGIN_IN_REM = remValue(vMargin)

export const panelWrapper = style({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
})

export const treeLength = createVar()
export const startIndex = createVar()
export const minLevel = createVar()

export const scrolledOuter = style({
  padding: `${rowHeight} 0`,
  height: `calc(${treeLength} * ${rowHeight})`,
  boxSizing: 'content-box',
})
export const scrolledInner = style({
  transform: `translateY(calc(${startIndex} * ${rowHeight}))`,
})
export const scrolledInner2 = style({
  marginLeft: `calc(${minLevel} * -${rowPadding})`,
  ...transition('margin-left', theme.duration[300]),
})
