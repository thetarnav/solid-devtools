import { dark, spacing, color, media } from '@/ui/theme'
import { colorDisabled } from '@/ui/theme/vars.css'
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
export const rootMargin = style({
  padding: spacing[4],
  paddingBottom: spacing[16],
})

export const header = style({
  marginBottom: spacing[4],
})

export const h1 = style({
  fontSize: spacing[4],
  fontWeight: 'bold',
  color: color.black,
  ...media({
    [dark]: {
      color: color.gray[50],
    },
  }),
})
export const id = style({
  fontSize: spacing[3],
  color: colorDisabled,
  fontWeight: 400,
  textTransform: 'uppercase',
})
export const type = style({
  fontWeight: 400,
  color: colorDisabled,
})

export const content = style({
  display: 'flex',
  flexDirection: 'column',
  rowGap: spacing[4],
})

export const h2 = style({
  color: colorDisabled,
  marginBottom: spacing[1],
  textTransform: 'capitalize',
})
