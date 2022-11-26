import { createVar, style } from '@vanilla-extract/css'
import { color, dark, hexToRgbValue, media } from './theme.css'

export const vars = {
  panel: {
    bg: createVar(),
    border: createVar(),
    borderColor: createVar(),
    string: {
      border: createVar(),
      borderColor: createVar(),
    },
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
  componentNameColor: createVar(),
}

export const varsStyle = style({
  vars: {
    [vars.panel.borderColor]: color.gray[200],
    [vars.panel.border]: `1px solid ${vars.panel.borderColor}`,
    [vars.panel.bg]: color.gray[50],
    [vars.panel.string.borderColor]: color.gray[400],
    [vars.panel.string.border]: `1px solid ${vars.panel.string.borderColor}`,

    [vars.grayHighlight.color]: color.gray[300],
    [vars.grayHighlight.border]: `1px solid ${color.gray[400]}`,

    [vars.disabled.color]: color.disabled.light,
    [vars.disabled.colorValue]: hexToRgbValue(color.disabled.light),
    [vars.defaultTextColor]: color.gray[900],
    [vars.componentNameColor]: color.cyan[600],
  },
  ...media({
    [dark]: {
      vars: {
        [vars.panel.borderColor]: color.gray[600],
        [vars.panel.bg]: color.gray[800],

        [vars.grayHighlight.color]: color.gray[600],
        [vars.grayHighlight.border]: `1px solid ${color.gray[500]}`,

        [vars.disabled.color]: color.disabled.dark,
        [vars.disabled.colorValue]: hexToRgbValue(color.disabled.dark),
        [vars.defaultTextColor]: color.gray[50],
        [vars.componentNameColor]: color.cyan[400],
      },
    },
  }),
})

export default vars
