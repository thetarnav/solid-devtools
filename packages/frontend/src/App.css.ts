import { style } from '@vanilla-extract/css'
import { spacing, color, rounded, theme, flex } from '@/ui/theme'
import { toggleButton } from '@/ui/components/button/button.css'
import { varsStyle, vars } from './ui/theme/vars.css'

export const app = style([
  varsStyle,
  {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateRows: `${spacing[10]} 1fr`,
    backgroundColor: vars.panel.bg,
    color: vars.defaultTextColor,
    fontSize: theme.fontSize.base,
    fontFamily: theme.font.sans,
  },
])

export const header = (() => {
  return {
    header: style({
      padding: spacing[2],
      ...flex('items-center'),
      columnGap: spacing[2],
      backgroundColor: vars.panel.bg,
      borderBottom: vars.panel.border,
      color: vars.defaultTextColor,
    }),
    identity: style({
      ...flex('items-center'),
      columnGap: spacing[2],
    }),
    logo: style({
      width: spacing[4],
      height: spacing[4],
    }),
    subtitle: style({
      color: vars.disabled.color,
      fontFamily: theme.font.mono,
      fontSize: theme.fontSize.sm,
    }),
  }
})()

export const options = (() => {
  return {
    container: style({
      position: 'relative',
      marginLeft: 'auto',
    }),
    button: style([
      toggleButton,
      {
        ...rounded('md'),
        marginLeft: 'auto',
        width: spacing[7],
        height: spacing[7],
      },
    ]),
    icon: style({
      width: spacing[4.5],
      height: spacing[4.5],
    }),
    panel: style({
      position: 'absolute',
      zIndex: 9999,
      width: 'max-content',
      top: '0',
      right: '100%',
      marginRight: spacing[2],
      padding: spacing[2],
      ...rounded('md'),
      backgroundColor: color.gray[100],
      border: `1px solid ${color.gray[200]}`,
    }),
    menu: style({
      ...flex('column', 'items-stretch'),
      gap: spacing[2],
    }),
  }
})()

export const content = style({
  overflow: 'hidden',
})
