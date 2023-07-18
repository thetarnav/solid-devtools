import { createVar, style } from '@vanilla-extract/css'
import { panelHeaderAfterEl } from './modules/structure/structure.css'
import { createHoverBackground } from './ui/mixins'
import { border, centerChild, flex, padding, rounded, spacing, transition, vars } from './ui/theme'

export const root = style({
    height: '100%',
    display: 'grid',
    gridTemplateRows: `${vars.panel.headerHeight} 1fr`,
    gridTemplateColumns: '100%',
})

export const header = style([
    panelHeaderAfterEl,
    {
        ...padding(0, 0, 0, 4),
        ...flex('items-center'),
    },
])

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
