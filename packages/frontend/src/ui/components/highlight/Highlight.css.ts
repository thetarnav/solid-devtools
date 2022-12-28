import { createHighlightStyles } from '@/ui/mixins'
import { color, dark, light, media } from '@/ui/theme'
import { style } from '@vanilla-extract/css'

const mixin = createHighlightStyles()

export const container = mixin.container

export const highlighted = style({
  ...media({
    [light]: {
      color: color.black,
    },
  }),
})

export const highlight = style([
  mixin.highlight,
  {
    vars: {
      [mixin.bgColorVar]: color.cyan[400],
      [mixin.bgOpacityVar]: '0',
    },
    selectors: {
      [`${highlighted} &`]: {
        vars: {
          [mixin.bgOpacityVar]: '0.6',
        },
      },
      [`&[data-signal=true]`]: {
        vars: {
          [mixin.bgColorVar]: color.amber[500],
        },
      },
    },
    ...media({
      [dark]: {
        selectors: {
          [`${highlighted} &`]: {
            vars: {
              [mixin.bgOpacityVar]: '0.35',
            },
          },
          [`${highlighted} &[data-signal=true]`]: {
            vars: {
              [mixin.bgOpacityVar]: '0.25',
            },
          },
        },
      },
    }),
  },
])
