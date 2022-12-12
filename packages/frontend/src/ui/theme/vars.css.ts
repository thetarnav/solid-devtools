import { createVar, style } from '@vanilla-extract/css'
import { color, dark, hexToRgbValue, media } from './theme.css'

export const vars = {
  panel: {
    bg: createVar(),
    border: createVar(),
    lightBorder: createVar(),
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
  domColor: createVar(),
}

export const varsStyle = style({
  vars: {
    [vars.panel.bg]: color.gray[50],
    [vars.panel.border]: color.gray[300],
    [vars.panel.lightBorder]: color.gray[200],

    [vars.grayHighlight.color]: color.gray[300],
    [vars.grayHighlight.border]: `1px solid ${color.gray[400]}`,

    [vars.disabled.color]: color.disabled.light,
    [vars.disabled.colorValue]: hexToRgbValue(color.disabled.light),
    [vars.defaultTextColor]: color.gray[900],
    [vars.componentNameColor]: color.cyan[600],
    [vars.domColor]: color.amber[600],
  },
  ...media({
    [dark]: {
      vars: {
        [vars.panel.bg]: color.gray[800],
        [vars.panel.border]: color.gray[600],
        [vars.panel.lightBorder]: color.gray[700],

        [vars.grayHighlight.color]: color.gray[600],
        [vars.grayHighlight.border]: `1px solid ${color.gray[500]}`,

        [vars.disabled.color]: color.disabled.dark,
        [vars.disabled.colorValue]: hexToRgbValue(color.disabled.dark),
        [vars.defaultTextColor]: color.gray[50],
        [vars.componentNameColor]: color.cyan[400],
        [vars.domColor]: color.amber[500],
      },
    },
  }),
})

export default vars
