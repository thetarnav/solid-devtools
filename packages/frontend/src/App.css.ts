import { style } from '@vanilla-extract/css'
import { dark, spacing, color, rounded, theme, media } from '@/ui/theme'
import { toggleButton } from '@/ui/components/button/button.css'
import { vars, panelBg, panelBorder, defaultTextColor } from './ui/theme/vars.css'

export const app = style([
  vars,
  {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateRows: `${spacing[12]} 1fr`,
    backgroundColor: panelBg,
    color: defaultTextColor,
    fontSize: theme.fontSize.base,
    fontFamily: theme.font.sans,
  },
])

export const header = style({
  padding: spacing[2],
  display: 'flex',
  alignItems: 'center',
  columnGap: spacing[2],
  backgroundColor: panelBg,
  borderBottom: panelBorder,
  color: color.black,
  ...media({
    [dark]: {
      color: color.gray[50],
    },
  }),
})

export const select = style({
  width: spacing[7],
  height: spacing[7],
})
export const selectIcon = style({
  width: spacing[4.5],
  height: spacing[4.5],
})

export const options = style({
  marginLeft: 'auto',
})
export const optionsButton = style([
  toggleButton,
  {
    marginLeft: 'auto',
    width: spacing[7],
    height: spacing[7],
  },
])
export const optionsIcon = style({
  width: spacing[4.5],
  height: spacing[4.5],
})

export const optionsPanel = style({
  position: 'fixed',
  zIndex: 9999,
  padding: spacing[2],
  ...rounded('md'),
  backgroundColor: color.gray[100],
  border: `1px solid ${color.gray[200]}`,
})

export const optionsMenu = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: spacing[2],
})

export const content = style({
  overflow: 'hidden',
})
