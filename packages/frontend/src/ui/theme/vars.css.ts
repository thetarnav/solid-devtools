import { createVar, style } from '@vanilla-extract/css'
import { color, dark, media } from '.'

export const panelBorderBg = createVar()
export const panelBorder = createVar()
export const panelBg = createVar()
export const colorDisabled = createVar()
export const defaultTextColor = createVar()

export const vars = style({
  vars: {
    [panelBorderBg]: color.gray[200],
    [panelBorder]: `1px solid ${panelBorderBg}`,
    [panelBg]: color.gray[50],
    [colorDisabled]: color.gray[500],
    [defaultTextColor]: color.gray[900],
  },
  ...media({
    [dark]: {
      vars: {
        [panelBorderBg]: color.gray[600],
        [panelBg]: color.gray[800],
        [colorDisabled]: color.gray[400],
        [defaultTextColor]: color.gray[50],
      },
    },
  }),
})
