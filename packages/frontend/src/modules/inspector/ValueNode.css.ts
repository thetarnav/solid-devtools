import { createHighlightStyles } from '@/ui/mixins'
import {
    border,
    centerChild,
    flex,
    inset,
    rounded,
    selectors,
    spacing,
    theme,
    transition,
    vars,
} from '@/ui/theme'
import { createVar, style } from '@vanilla-extract/css'

export const RowHeight = spacing[4.5]

export const row = (() => {
    const valueRowHighlight = createHighlightStyles()
    const collapseOpacity = createVar()

    return {
        container: style([
            valueRowHighlight.container,
            {
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                paddingLeft: '2ch',
                fontFamily: theme.font.mono,
                lineHeight: RowHeight,
                vars: {
                    [valueRowHighlight.bgOpacityVar]: '0',
                    [collapseOpacity]: '0',
                },
                ':before': {
                    content: '',
                    position: 'absolute',
                    opacity: 0,
                    marginTop: spacing[0.25],
                    ...inset(spacing[-0.25], spacing[-1]),
                    ...border(vars.domColor),
                    ...rounded(),
                    maskImage: 'linear-gradient(90deg, black, transparent)',
                },
                selectors: {
                    '&[data-stale=true]': {
                        opacity: 0.6,
                    },
                    '&[data-extended=true]': {
                        vars: {
                            [collapseOpacity]: '1',
                        },
                    },
                    '&[data-hovered=true]': {
                        vars: {
                            [valueRowHighlight.bgOpacityVar]: '0.3',
                            [collapseOpacity]: '1',
                        },
                    },
                    [`&[aria-current=true]:before`]: {
                        opacity: 0.5,
                    },
                },
            },
        ]),
        highlight: style([
            valueRowHighlight.highlight,
            {
                border: vars.grayHighlight.border,
            },
        ]),
        toggle: {
            container: style({
                position: 'absolute',
                left: `-${spacing[1]}`,
                width: RowHeight,
                height: RowHeight,
                ...centerChild,
            }),
            button: style({
                opacity: collapseOpacity,
                ...transition('opacity'),
            }),
        },
    }
})()

export const actions = {
    container: style({
        position: 'absolute',
        zIndex: 2,
        top: '0',
        right: spacing[2],
        height: RowHeight,
        ...flex('justify-end', 'items-center'),
        opacity: 0,
        ...transition('opacity'),
        ...selectors({
            [`${row.container}[data-hovered=true] &`]: {
                opacity: 0.55,
                '#:hover': {
                    opacity: 0.8,
                },
                '#:active': {
                    opacity: 1,
                },
            },
        }),
    }),
    button: style({
        ...centerChild,
    }),
    icon: style({
        height: spacing[4],
        width: spacing[4],
        color: vars.defaultTextColor,
    }),
}
