import { createVar, style } from '@vanilla-extract/css'
import { color, dark, media } from '.'

export const panelBorderBg = createVar()
export const panelBorder = createVar()
export const panelBg = createVar()

export const vars = style({
  vars: {
    [panelBorderBg]: color.gray[200],
    [panelBorder]: `1px solid ${panelBorderBg}`,
    [panelBg]: color.gray[50],
  },
  ...media({
    [dark]: {
      vars: {
        [panelBorderBg]: color.gray[600],
        [panelBg]: color.gray[800],
      },
    },
  }),
})
