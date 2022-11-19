import { style } from '@vanilla-extract/css'
import {
  spacing,
  color,
  rounded,
  theme,
  border,
  padding,
  insetY,
  centerChild,
  transition,
} from '@/ui/theme'
import { toggleButton } from '@/ui/components/button/button.css'
import { vars, panelBg, panelBorder, defaultTextColor, colorDisabled } from './ui/theme/vars.css'

export const app = style([
  vars,
  {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateRows: `${spacing[12]} 1fr`,
    backgroundColor: panelBg,
    color: defaultTextColor,
    fontSize: theme.fontSize.base,
    fontFamily: theme.font.sans,
  },
])

export const header = style({
  padding: spacing[2],
  display: 'flex',
  alignItems: 'center',
  columnGap: spacing[2],
  backgroundColor: panelBg,
  borderBottom: panelBorder,
  color: defaultTextColor,
})

export const subtitle = style({
  color: colorDisabled,
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
    ...border(color.gray[700]),
    ...rounded(),
    ...padding(0, 6),
    ...transition('padding'),
    lineHeight: spacing[8],
    '::placeholder': {
      color: colorDisabled,
    },
    ':focus': {
      ...border(color.gray[500]),
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
    color: colorDisabled,
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
