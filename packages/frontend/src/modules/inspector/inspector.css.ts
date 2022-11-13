import { spacing, theme, padding } from '@/ui/theme'
import { colorDisabled, panelBorder } from '@/ui/theme/vars.css'
import { style } from '@vanilla-extract/css'

export const scrollWrapper = style({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
})

export const root = style({
  minWidth: '100%',
  width: 'fit-content',
})

export const header = style({
  ...padding(0, 4),
  height: spacing[10],
  display: 'flex',
  alignItems: 'center',
  borderBottom: panelBorder,
})

export const content = style({
  padding: spacing[4],
  paddingBottom: spacing[16],
  display: 'flex',
  flexDirection: 'column',
  rowGap: spacing[4],
})

export const h2 = style({
  color: colorDisabled,
  marginBottom: spacing[1],
  textTransform: 'capitalize',
})

export const location = style({
  marginTop: spacing[1],
  marginLeft: '2ch',
  fontFamily: theme.font.mono,
})
