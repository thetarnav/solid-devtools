import { createVar, style } from '@vanilla-extract/css'
import { color, dark, hexToRgbValue, media, spacing } from './theme.css'

export const vars = {
    panel: {
        1: createVar(),
        2: createVar(),
        3: createVar(),
        4: createVar(),
        5: createVar(),
        6: createVar(),
        7: createVar(),
        8: createVar(),

        bg: createVar(),
        border: createVar(),
        headerHeight: spacing[7],
    },
    grayHighlight: {
        color: createVar(),
        border: createVar(),
    },
    disabled: {
        color: createVar(),
        colorValue: createVar(),
    },
    defaultTextColor: createVar(),
    lighterTextColor: createVar(),
    componentNameColor: createVar(),
    domColor: createVar(),
}

export const varsStyle = style({
    vars: {
        [vars.panel[1]]: color.gray[100],
        [vars.panel[2]]: color.gray[200],
        [vars.panel[3]]: color.gray[300],
        [vars.panel[4]]: color.gray[400],
        [vars.panel[5]]: color.gray[500],
        [vars.panel[6]]: color.gray[600],
        [vars.panel[7]]: color.gray[700],
        [vars.panel[8]]: color.gray[800],

        [vars.panel.bg]: color.gray[50],
        [vars.panel.border]: color.gray[300],

        [vars.grayHighlight.color]: color.gray[300],
        [vars.grayHighlight.border]: `1px solid ${color.gray[400]}`,

        [vars.disabled.color]: color.disabled.light,
        [vars.disabled.colorValue]: hexToRgbValue(color.disabled.light),
        [vars.defaultTextColor]: color.gray[900],
        [vars.lighterTextColor]: color.gray[800],
        [vars.componentNameColor]: color.cyan[600],
        [vars.domColor]: color.amber[600],
    },
    ...media({
        [dark]: {
            vars: {
                [vars.panel[1]]: color.gray[800],
                [vars.panel[2]]: color.gray[700],
                [vars.panel[3]]: color.gray[600],
                [vars.panel[4]]: color.gray[500],
                [vars.panel[5]]: color.gray[400],
                [vars.panel[6]]: color.gray[300],
                [vars.panel[7]]: color.gray[200],
                [vars.panel[8]]: color.gray[100],

                [vars.panel.bg]: color.gray[800],
                [vars.panel.border]: color.gray[600],

                [vars.grayHighlight.color]: color.gray[600],
                [vars.grayHighlight.border]: `1px solid ${color.gray[500]}`,

                [vars.disabled.color]: color.disabled.dark,
                [vars.disabled.colorValue]: hexToRgbValue(color.disabled.dark),
                [vars.defaultTextColor]: color.gray[100],
                [vars.lighterTextColor]: color.gray[200],
                [vars.componentNameColor]: color.cyan[400],
                [vars.domColor]: color.amber[500],
            },
        },
    }),
})

export default vars
