import { media, mobile, transition, vars } from '@/ui/theme'
import { createVar, style } from '@vanilla-extract/css'
import { CSSVarFunction } from '@vanilla-extract/private'

export const MIN_SIZE_IN_REM = 8
export const MIN_SIZE = `${MIN_SIZE_IN_REM}rem`
export const SPLIT_SIZE = '1px'
export const progress: CSSVarFunction = createVar()

export const container = style({
  display: 'grid',
  gridAutoFlow: 'column',
  height: '100%',
  width: '100%',
  gridTemplateColumns: `100%`,
  gridTemplateRows: `100%`,
})

export const content = style({
  position: 'relative',
  zIndex: 1,
  overflow: 'hidden',
})

export const split = style({
  position: 'relative',
  backgroundColor: vars.panel.border,
})

export const splitHandle = style({
  position: 'absolute',
  zIndex: 999,
  inset: `0 -3px`,
  cursor: 'col-resize',
  userSelect: 'none',
  ':after': {
    content: '',
    position: 'absolute',
    inset: `0 1px`,
    backgroundColor: vars.panel.border,
    opacity: 0,
    ...transition('opacity'),
  },
  ...media({
    [mobile]: {
      cursor: 'row-resize',
      inset: `-3px 0`,
      ':after': {
        inset: `1px 0`,
      },
    },
  }),
  selectors: {
    '&:hover:after, &[data-dragging=true]:after': {
      opacity: 1,
    },
  },
})
