import { borderValue, centerChild, flex, padding, spacing, transition, vars } from '@/ui/theme'
import { createVar, style } from '@vanilla-extract/css'

export const list = style({
    ...flex('items-stretch'),
})

export const tabColor = createVar()

export const item = style({
    borderRight: borderValue(vars.panel[2]),
    ':last-child': {
        borderRight: 'unset',
    },
    ...padding(0, 2.5),
    ...centerChild,
    columnGap: spacing[1.5],
    color: vars.disabled.color,
    ...transition('color'),
    position: 'relative',
    outline: 'unset',
    vars: { [tabColor]: vars.defaultTextColor },
    ':after': {
        content: '',
        position: 'absolute',
        inset: 0,
        opacity: 0,
        background: `radial-gradient(circle at 50% 130%, ${tabColor}, transparent 70%);`,
        zIndex: -1,
        ...transition('opacity'),
    },
    selectors: {
        '&:is(:hover, :focus):after': {
            opacity: 0.2,
        },
        '&[aria-selected=true]': {
            color: vars.defaultTextColor,
        },
    },
})
