import { createHoverBackground } from '@/ui/mixins'
import { centerChild, flex, padding, rounded, spacing, theme, transition, vars } from '@/ui/theme'
import { createVar, style } from '@vanilla-extract/css'
import { panelHeaderAfterEl, panelHeaderHeight } from '../structure/structure.css'

export const root = style({
  height: '100%',
  display: 'grid',
  gridTemplateRows: `${panelHeaderHeight} 1fr`,
  gridTemplateColumns: '100%',
})

export const header = style([
  panelHeaderAfterEl,
  {
    ...padding(0, 2, 0, 4),
    ...flex('items-center', 'justify-space-between'),
  },
])

export const actions = (() => {
  const textOpacity = createVar()

  const { hoverBgStyle } = createHoverBackground()

  return {
    container: style({
      ...flex('items-center'),
      columnGap: spacing[1],
    }),
    button: style([
      hoverBgStyle,
      {
        width: spacing[6],
        height: spacing[6],
        ...rounded(),
        ...centerChild,
        color: `rgb(${vars.disabled.colorValue} / ${textOpacity})`,
        vars: {
          [textOpacity]: '0.85',
        },
        ...transition(['background-color', 'color']),
        selectors: {
          '&:hover': {
            vars: {
              [textOpacity]: '1',
            },
          },
        },
      },
    ]),
    icon: style({
      width: spacing[4],
      height: spacing[4],
    }),
  }
})()

export const scrollWrapper = style({
  width: '100%',
  overflow: 'hidden',
})

export const content = style({
  minWidth: '100%',
  width: 'fit-content',
  padding: spacing[4],
  paddingBottom: spacing[16],
  ...flex('column'),
  rowGap: spacing[4],
})

export const h2 = style({
  color: vars.disabled.color,
  marginBottom: spacing[1],
  textTransform: 'capitalize',
})

export const location = style({
  marginTop: spacing[1],
  marginLeft: '2ch',
  fontFamily: theme.font.mono,
})
