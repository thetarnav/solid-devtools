import { spacing, theme, padding } from '@/ui/theme'
import { colorDisabled, panelBorder } from '@/ui/theme/vars.css'
import { style } from '@vanilla-extract/css'

export const root = style({
  height: '100%',
  display: 'grid',
  gridTemplateRows: `${spacing[8]} 1fr`,
  gridTemplateColumns: '100%',
})

export const header = style({
  ...padding(0, 4),
  display: 'flex',
  alignItems: 'center',
  borderBottom: panelBorder,
})
export const codeIcon = style({
  width: spacing[4],
  height: spacing[4],
})

export const scrollWrapper = style({
  width: '100%',
  overflow: 'hidden',
})

export const content = style({
  minWidth: '100%',
  width: 'fit-content',
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
