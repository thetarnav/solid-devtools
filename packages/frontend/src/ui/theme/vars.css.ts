import { createVar, style } from '@vanilla-extract/css'
import { color, dark, hexToRgbValue, media } from '.'

export const panelBorderBg = createVar()
export const panelBorder = createVar()
export const panelBg = createVar()

export const grayHighlightColor = createVar()
export const grayHighlightBorder = createVar()

export const colorDisabled = createVar()
export const colorDisabledValue = createVar()
export const defaultTextColor = createVar()
export const componentNameColor = createVar()

export const vars = style({
  vars: {
    [panelBorderBg]: color.gray[200],
    [panelBorder]: `1px solid ${panelBorderBg}`,
    [panelBg]: color.gray[50],

    [grayHighlightColor]: color.gray[300],
    [grayHighlightBorder]: `1px solid ${color.gray[400]}`,

    [colorDisabled]: color.disabled.light,
    [colorDisabledValue]: hexToRgbValue(color.disabled.light),
    [defaultTextColor]: color.gray[900],
    [componentNameColor]: color.cyan[600],
  },
  ...media({
    [dark]: {
      vars: {
        [panelBorderBg]: color.gray[600],
        [panelBg]: color.gray[800],

        [grayHighlightColor]: color.gray[600],
        [grayHighlightBorder]: `1px solid ${color.gray[500]}`,

        [colorDisabled]: color.disabled.dark,
        [colorDisabledValue]: hexToRgbValue(color.disabled.dark),
        [defaultTextColor]: color.gray[50],
        [componentNameColor]: color.cyan[400],
      },
    },
  }),
})
