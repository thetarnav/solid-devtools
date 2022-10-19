import { style, createVar } from '@vanilla-extract/css'
import { CSSVarFunction } from '@vanilla-extract/private'
import { mobile, centerChild, color, spacing, transition, media, dark } from '@/ui/theme'
import { panelBorderBg } from '@/ui/theme/vars.css'

const minWidth = spacing[36]
const minHeight = spacing[12]
const splitWidth = '1px'
const splitHeight = '1px'

export const progress: CSSVarFunction = createVar()

export const container = style({
  display: 'grid',
  gridAutoFlow: 'column',
  height: '100%',
  width: '100%',
  gridTemplateColumns: `1fr`,
  selectors: {
    '&[data-open="true"]': {
      gridTemplateColumns: `minmax(${minWidth}, ${progress}) ${splitWidth} minmax(${minWidth}, 1fr)`,
    },
  },
  ...media({
    [mobile]: {
      selectors: {
        '&[data-open="true"]': {
          gridTemplateColumns: `1fr`,
          gridTemplateRows: `minmax(${minHeight}, ${progress}) ${splitHeight} minmax(${minHeight}, 1fr)`,
        },
      },
    },
  }),
})

export const mainContent = style({
  position: 'relative',
  zIndex: 1,
  overflow: 'hidden',
  height: '100%',
  width: '100%',
})

export const split = style({
  position: 'relative',
  backgroundColor: panelBorderBg,
})

export const splitHandle = style({
  position: 'absolute',
  zIndex: 10,
  top: 0,
  left: -1,
  right: -1,
  bottom: 0,
  cursor: 'col-resize',
  userSelect: 'none',
  ...media({
    [mobile]: {
      cursor: 'row-resize',
    },
  }),
})

export const toggle = style({
  position: 'absolute',
  zIndex: 11,
  top: 0,
  right: 0,
  width: spacing[5],
  height: spacing[5],
  backgroundColor: color.gray[400],
  ...centerChild,
  color: color.gray[100],
  userSelect: 'none',
  ...transition('background-color'),
  ':hover': {
    backgroundColor: color.gray[500],
  },
  ...media({
    [mobile]: {
      width: spacing[6],
      height: spacing[6],
      right: spacing[3],
    },
    [dark]: {
      backgroundColor: color.gray[600],
    },
  }),
})
export const x = style({
  width: spacing[4],
  height: spacing[4],
})
