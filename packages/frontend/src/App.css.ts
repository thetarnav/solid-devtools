import { style } from '@vanilla-extract/css'
import {
  spacing,
  color,
  rounded,
  theme,
  padding,
  insetY,
  centerChild,
  transition,
} from '@/ui/theme'
import { toggleButton } from '@/ui/components/button/button.css'
import { varsStyle, vars } from './ui/theme/vars.css'

export const app = style([
  varsStyle,
  {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateRows: `${spacing[12]} 1fr`,
    backgroundColor: vars.panel.bg,
    color: vars.defaultTextColor,
    fontSize: theme.fontSize.base,
    fontFamily: theme.font.sans,
  },
])

export const header = style({
  padding: spacing[2],
  display: 'flex',
  alignItems: 'center',
  columnGap: spacing[2],
  backgroundColor: vars.panel.bg,
  borderBottom: vars.panel.border,
  color: vars.defaultTextColor,
})

export const subtitle = style({
  color: vars.disabled.color,
  fontFamily: theme.font.mono,
  fontSize: theme.fontSize.sm,
  marginTop: spacing[1],
})

export const locatorButton = style({
  width: spacing[7],
  height: spacing[7],
})
export const locatorIcon = style({
  width: spacing[4.5],
  height: spacing[4.5],
})

export const search = (() => {
  const height = spacing[7]

  const form = style({
    position: 'relative',
    height,
    overflow: 'hidden',
  })

  const input = style({
    height,
    boxSizing: 'border-box',
    width: spacing[48],
    outline: 'unset',
    background: 'unset',
    color: 'inherit',
    fontFamily: 'inherit',
    border: vars.panel.border,
    ...rounded(),
    ...padding(0, 6),
    ...transition('padding'),
    lineHeight: spacing[8],
    '::placeholder': {
      color: vars.disabled.color,
    },
    ':focus': {
      borderColor: vars.panel.string.borderColor,
    },
    selectors: {
      [`${form}:focus-within &`]: {
        paddingLeft: spacing[2],
      },
    },
  })

  const edgeContainerBase = style({
    position: 'absolute',
    height: `calc(100% - ${spacing[2]})`,
    ...insetY(1),
    ...centerChild,
  })
  const iconBase = style({
    width: spacing[4],
    height: spacing[4],
    color: vars.disabled.color,
  })

  return {
    form,
    input,
    iconContainer: style([
      edgeContainerBase,
      {
        left: 0,
        paddingLeft: spacing[1.5],
        ...transition('transform'),
        selectors: {
          [`${form}:focus-within &`]: {
            transform: 'translateX(-100%)',
          },
        },
      },
    ]),
    icon: iconBase,
    clearButton: style([
      edgeContainerBase,
      {
        right: spacing[1],
        ...padding(0, 0.5),
        ...rounded(),
        ':hover': {
          backgroundColor: color.gray[700],
        },
      },
    ]),
    clearIcon: iconBase,
  }
})()

export const options = (() => {
  return {
    container: style({
      position: 'relative',
      marginLeft: 'auto',
    }),
    button: style([
      toggleButton,
      {
        marginLeft: 'auto',
        width: spacing[7],
        height: spacing[7],
      },
    ]),
    icon: style({
      width: spacing[4.5],
      height: spacing[4.5],
    }),
    panel: style({
      position: 'absolute',
      zIndex: 9999,
      width: 'max-content',
      top: '0',
      right: '100%',
      marginRight: spacing[2],
      padding: spacing[2],
      ...rounded('md'),
      backgroundColor: color.gray[100],
      border: `1px solid ${color.gray[200]}`,
    }),
    menu: style({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: spacing[2],
    }),
  }
})()

export const content = style({
  overflow: 'hidden',
})
