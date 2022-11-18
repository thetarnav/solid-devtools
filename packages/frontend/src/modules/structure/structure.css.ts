import { createVar, style } from '@vanilla-extract/css'
import { insetX, remValue, spacing } from '@/ui/theme'
import { panelBg, panelBorder } from '@/ui/theme/vars.css'

export const rowHeight = spacing[4.5]
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

export const scrolledOuter = style({
  padding: `${rowHeight} 0`,
  height: `calc(${treeLength} * ${rowHeight})`,
  boxSizing: 'content-box',
})
export const scrolledInner = style({
  transform: `translateY(calc(${startIndex} * ${rowHeight}))`,
})

export const path = style({
  flexShrink: 0,
  height: spacing[4],
  width: '100%',
  position: 'relative',
})
export const pathInner = style({
  position: 'absolute',
  zIndex: 1,
  bottom: 0,
  ...insetX(0),
  minHeight: spacing[4],
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: `${spacing[0.5]} ${spacing[2]} calc(${spacing[0.5]} + 1px) ${spacing[2]}`,
  borderTop: panelBorder,
  backgroundColor: panelBg,
})
