import { createVar, style } from '@vanilla-extract/css'
import { insetX, spacing } from '@/ui/theme'
import { panelBg, panelBorder } from '@/ui/theme/vars.css'

export const ROW_HEIGHT_IN_REM = 1.25
export const V_MARGIN_IN_REM = 0.75

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
  padding: `${V_MARGIN_IN_REM}rem 0`,
  height: `calc(${treeLength} * ${ROW_HEIGHT_IN_REM}rem)`,
  boxSizing: 'content-box',
})
export const scrolledInner = style({
  transform: `translateY(calc(${startIndex} * ${ROW_HEIGHT_IN_REM}rem))`,
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
