import { flex, spacing, theme, vars } from '@/ui/theme'
import { style } from '@vanilla-extract/css'

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
