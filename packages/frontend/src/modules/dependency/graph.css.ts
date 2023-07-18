import { color, flex, padding, rounded, spacing, theme, transition, vars } from '@/ui/theme'
import { createVar, style } from '@vanilla-extract/css'

const gridSize = spacing[10]

export const container = style({
    display: 'flex',
    background: vars.panel[1],
})

export const graph = (() => {
    const patternSize = `1px`

    const pattern = `${vars.panel[2]} 0,
  ${vars.panel[2]} ${patternSize},
  transparent ${patternSize},
  transparent ${gridSize}`

    return style({
        minHeight: '100%',
        minWidth: '100%',
        padding: `calc(${gridSize} - ${patternSize})`,
        position: 'relative',
        ...flex('column', 'items-start'),
        ':before': {
            content: '',
            position: 'absolute',
            inset: 0,
            background: `repeating-linear-gradient(${pattern}), repeating-linear-gradient(90deg, ${pattern})`,
            backgroundPosition: `-${patternSize} -${patternSize}`,
            opacity: 0.7,
        },
    })
})()

export const { node, depthVar } = (() => {
    const depthVar = createVar('depth')
    const margin = spacing[2]

    return {
        node: style({
            position: 'relative',
            height: `calc(${gridSize} - ${margin} * 2)`,
            minWidth: `calc(${gridSize} * 2)`,
            transform: `translateX(calc(${depthVar} * ${gridSize}))`,
            margin: margin,
            ...padding(0, '0.4rem'), // magic number
            ...flex('items-center'),
            cursor: 'pointer',
            ':before': {
                content: '',
                position: 'absolute',
                inset: 0,
                backgroundColor: vars.panel[1],
                boxShadow: `0 0 ${margin} ${spacing[1]} ${vars.panel[1]}`,
                opacity: 0.8,
                border: `2px solid transparent`,
                ...rounded('md'),
                ...transition(['background-color', 'border-color']),
            },
            selectors: {
                // hovered
                '&:is(:hover, [data-hovered=true]):before': {
                    backgroundColor: vars.panel[2],
                },
                // inspected
                '&[data-inspected=true]': {
                    cursor: 'default',
                },
                '&[data-inspected=true]:before': {
                    borderColor: color.gray[300],
                },
                // not inspected
                '&:not([data-inspected=true]):active:before': {
                    borderColor: color.gray[500],
                },
            },
        }),
        depthVar,
    }
})()

export const lengthVar = createVar('length')

export const svg = style({
    position: 'absolute',
    overflow: 'visible',
    top: `calc(${gridSize} * 1.5)`,
    left: `calc(${gridSize} * 1.5)`,
    width: `calc(${gridSize} * ${lengthVar})`,
    height: `calc(${gridSize} * ${lengthVar})`,
    pointerEvents: 'none',
})

export const arrowHead = style({
    fill: 'none',
    stroke: vars.domColor,
})

export const line = style({
    stroke: vars.domColor,
    strokeLinecap: 'round',
    opacity: 0.5,
    ...transition('opacity', theme.duration[300], theme.duration[75]),
    selectors: {
        '&[data-highlighted=true]': {
            opacity: 1,
        },
    },
})
