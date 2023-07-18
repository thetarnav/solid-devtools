import { centerChild, color, hexToRgb, inset, rounded, spacing, theme } from '@/ui/theme'
import { style } from '@vanilla-extract/css'

export const container = {
    fixed: style({
        position: 'fixed',
        ...inset(0),
        zIndex: 9999,
        overflowY: 'auto',
    }),
    container: style({
        minHeight: '100vh',
        padding: `${spacing[4]} 0`,
        ...centerChild,
    }),
    overlay: style({
        position: 'fixed',
        ...inset(0),
        backgroundColor: hexToRgb(color.black, 0.5),
    }),
    content: style({
        zIndex: 50,
        maxWidth: `calc(100vw - ${spacing[4]})`,
        minWidth: spacing[80],
        overflow: 'hidden',
        padding: spacing[4],
        rowGap: spacing[2],
        marginTop: spacing[8],
        marginBottom: spacing[8],
        backgroundColor: color.gray[50],
        ...rounded('xl'),
        fontFamily: theme.font.mono,
        color: color.gray[800],
    }),
}

export const navbar = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
})

export const pagination = style({
    ...centerChild,
    columnGap: spacing[1],
})
export const pageCounter = style({
    padding: spacing[1],
    fontWeight: 500,
})

export const controls = style({
    ...centerChild,
    columnGap: spacing[1],
})

export const content = {
    container: style({
        paddingTop: spacing[2],
        display: 'flex',
        flexDirection: 'column',
        rowGap: spacing[2],
    }),
    error: style({
        color: color.red,
        fontWeight: 500,
    }),
    errorName: style({
        fontWeight: 700,
    }),
}

export const button = style({
    ...rounded('md'),
    backgroundColor: color.gray[50],
    ':hover': {
        backgroundColor: color.gray[200],
        color: color.gray[600],
    },
    ':active': {
        backgroundColor: color.gray[100],
        color: color.gray[700],
    },
})

export const icon = style({
    width: spacing[6],
    height: spacing[6],
    padding: spacing[1],
    color: color.gray[600],
})
