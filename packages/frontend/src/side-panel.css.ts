import { createVar, style } from '@vanilla-extract/css'
import { createHoverBackground } from './ui/mixins'
import { border, centerChild, flex, padding, rounded, spacing, transition, vars } from './ui/theme'

export const actions = (() => {
    const textOpacity = createVar()

    const { hoverBgStyle } = createHoverBackground()

    return {
        container: style({
            ...padding(0, 1),
            marginLeft: 'auto',
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
                ...transition(['background-color', 'color']),
                vars: {
                    [textOpacity]: '0.85',
                },
                ':hover': {
                    vars: {
                        [textOpacity]: '1',
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

export const tabs = (() => {
    return {
        list: style({
            ...border(vars.panel[2], 'l'),
            height: '100%',
        }),
    }
})()
