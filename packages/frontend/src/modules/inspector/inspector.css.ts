import { dark, spacing, color, media } from '@/ui/theme'
import { style } from '@vanilla-extract/css'

export const scrollWrapper = style({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
})

export const root = style({
  padding: spacing[4],
  paddingBottom: spacing[16],
})

export const header = style({
  marginBottom: spacing[4],
})

export const h1 = style({
  // TODO: typography
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
  color: color.gray[500],
  fontWeight: 400,
  textTransform: 'uppercase',
})
export const type = style({
  fontWeight: 400,
  color: color.gray[500],
  ...media({
    [dark]: {
      color: color.gray[300],
    },
  }),
})

export const content = style({
  display: 'flex',
  flexDirection: 'column',
  rowGap: spacing[4],
})

export const h2 = style({
  color: color.gray[500],
  marginBottom: spacing[1],
  ...media({
    [dark]: {
      color: color.gray[300],
    },
  }),
})
