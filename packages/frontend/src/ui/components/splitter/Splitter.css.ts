import { style, createVar, StyleRule } from '@vanilla-extract/css'
import { CSSVarFunction } from '@vanilla-extract/private'
import { mobile, spacing, media, transition } from '@/ui/theme'
import { panelBorderBg } from '@/ui/theme/vars.css'

const minSize = spacing[36]
const splitSize = '1px'
export const progress: CSSVarFunction = createVar()

const gridTemplate: StyleRule['gridTemplateRows'] = `minmax(${minSize}, ${progress}) ${splitSize} minmax(${minSize}, 1fr)`

export const container = style({
  display: 'grid',
  gridAutoFlow: 'column',
  height: '100%',
  width: '100%',
  gridTemplateColumns: `1fr`,
  selectors: {
    '&[data-open="true"]': {
      gridTemplateColumns: gridTemplate,
      gridTemplateRows: '100%',
    },
  },
  ...media({
    [mobile]: {
      selectors: {
        '&[data-open="true"]': {
          gridTemplateColumns: `100%`,
          gridTemplateRows: gridTemplate,
        },
      },
    },
  }),
})

export const content = style({
  position: 'relative',
  zIndex: 1,
  overflow: 'hidden',
})

export const split = style({
  position: 'relative',
  backgroundColor: panelBorderBg,
})

export const splitHandle = style({
  position: 'absolute',
  zIndex: 999,
  inset: `0 -2px`,
  cursor: 'col-resize',
  userSelect: 'none',
  ':after': {
    content: '',
    position: 'absolute',
    inset: `0 1px`,
    backgroundColor: panelBorderBg,
    opacity: 0,
    ...transition('opacity'),
  },
  ...media({
    [mobile]: {
      cursor: 'row-resize',
      inset: `-2px 0`,
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
