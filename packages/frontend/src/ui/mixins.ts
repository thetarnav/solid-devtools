import { createVar, fallbackVar, style } from '@vanilla-extract/css'
import { CSSVarFunction } from '@vanilla-extract/private'
import { insetX, insetY, rounded, spacing, transition } from './theme/theme.css'
import { vars } from './theme/vars.css'

export function createHighlightStyles(
    transitionProperty:
        | 'opacity'
        | 'background-color'
        | ('opacity' | 'background-color')[] = 'opacity',
): {
    container: string
    highlight: string
    bgColorVar: CSSVarFunction
    bgOpacityVar: CSSVarFunction
} {
    const container = style({
        position: 'relative',
        zIndex: 1,
    })

    const bgColorVar: CSSVarFunction = createVar()
    const bgOpacityVar: CSSVarFunction = createVar()

    const highlight = style({
        position: 'absolute',
        zIndex: -1,
        ...insetX(`-${spacing[1]}`),
        ...insetY(0),
        ...rounded(),
        ...transition(transitionProperty),
        backgroundColor: fallbackVar(bgColorVar, vars.grayHighlight.color),
        opacity: fallbackVar(bgOpacityVar, '0'),
    })

    return { container, highlight, bgColorVar, bgOpacityVar }
}

export const createHoverBackground = () => {
    const colorValueVar = createVar()
    const opacityVar = createVar()

    return {
        hoverBgStyle: style({
            vars: {
                [opacityVar]: '0',
            },
            backgroundColor: `rgb(${fallbackVar(
                colorValueVar,
                vars.disabled.colorValue,
            )} / ${opacityVar})`,
            ...transition('background-color'),
            selectors: {
                '&:is(:hover, [aria-selected=true]:hover)': {
                    vars: { [opacityVar]: '0.1' },
                },
                '&:is(:active, :hover:active)': {
                    vars: { [opacityVar]: '0.05' },
                },
                '&[aria-selected=true]': {
                    vars: {
                        [opacityVar]: '0.05',
                    },
                },
            },
        }),
        colorValueVar,
    }
}
