import { createVar, style, styleVariants } from '@vanilla-extract/css'
import {
  border,
  borderValue,
  centerChild,
  color,
  flex,
  insetY,
  padding,
  panelHeaderHeight,
  remValue,
  rounded,
  spacing,
  theme,
  transition,
  vars,
} from '@/ui/theme'

export const pathHeight = spacing[4.5]

export const rowHeight = spacing[4.5]
export const rowPadding = spacing[3.5]
export const vMargin = spacing[3]

export const ROW_HEIGHT_IN_REM = remValue(rowHeight)
export const V_MARGIN_IN_REM = remValue(vMargin)

export const panelWrapper = style({
  position: 'relative',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  display: 'grid',
  gridTemplateRows: `${panelHeaderHeight} 1fr ${pathHeight}`,
  gridTemplateColumns: '100%',
})

export const header = style({
  ...flex('items-center', 'wrap-wrap'),
  columnGap: spacing[2],
  borderBottom: vars.panel.border,
  overflow: 'hidden',
})

export const locatorButton = style({
  marginLeft: spacing[2],
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
    fontSize: theme.fontSize.lg,
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

export const toggleMode = (() => {
  const tabColor = createVar()

  const tabBase = style({
    borderRight: borderValue(color.gray[700]),
    ':last-child': {
      borderRight: 'unset',
    },
    ...padding(0, 2.5),
    ...centerChild,
    columnGap: spacing[1.5],
    color: vars.disabled.color,
    ...transition('color'),
    position: 'relative',
    outline: 'unset',
    ':before': {
      content: '',
      width: spacing[2],
      height: spacing[2],
      ...rounded('full'),
      ...border(tabColor),
      opacity: 0.6,
      ...transition('opacity'),
    },
    ':after': {
      content: '',
      position: 'absolute',
      inset: 0,
      opacity: 0,
      background: `radial-gradient(circle at 50% 130%, ${tabColor}, transparent 70%);`,
      zIndex: -1,
      ...transition('opacity'),
    },
    selectors: {
      '&:is(:hover, :focus, [aria-selected=true]):before': {
        opacity: 0.9,
      },
      '&:is(:hover, :focus):after': {
        opacity: 0.2,
      },
      '&[aria-selected=true]': {
        color: vars.defaultTextColor,
      },
    },
  })

  return {
    group: style({
      marginLeft: 'auto',
      height: '100%',
    }),
    list: style({
      height: '100%',
      ...flex('items-stretch'),
    }),
    tab: styleVariants({
      components: [
        tabBase,
        style({
          vars: { [tabColor]: color.cyan[600] },
        }),
      ],
      owners: [
        tabBase,
        style({
          vars: { [tabColor]: color.gray[400] },
        }),
      ],
      dom: [
        tabBase,
        style({
          vars: { [tabColor]: color.amber[600] },
        }),
      ],
    }),
    span: style({
      marginBottom: spacing[0.5],
    }),
  }
})()

export const treeLength = createVar()
export const startIndex = createVar()
export const minLevel = createVar()

export const scrolledOuter = style({
  padding: `${rowHeight} 0`,
  height: `calc(${treeLength} * ${rowHeight})`,
  boxSizing: 'content-box',
})
export const scrolledInner = style({
  transform: `translateY(calc(${startIndex} * ${rowHeight}))`,
})
export const scrolledInner2 = style({
  marginLeft: `calc(${minLevel} * -${rowPadding})`,
  ...transition('margin-left', theme.duration[300]),
})
