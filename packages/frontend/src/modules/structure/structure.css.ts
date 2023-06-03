import { tabColor } from '@/ui/components/toggle-tabs/toggle-tabs.css'
import { createHoverBackground } from '@/ui/mixins'
import {
  border,
  centerChild,
  flex,
  insetX,
  insetY,
  padding,
  remValue,
  rounded,
  spacing,
  theme,
  transition,
  vars,
} from '@/ui/theme'
import { createVar, style, styleVariants } from '@vanilla-extract/css'

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
  gridTemplateRows: `${vars.panel.headerHeight} 1fr ${pathHeight}`,
  gridTemplateColumns: '100%',
})

export const panelHeaderAfterEl = style({
  position: 'relative',
  ':after': {
    content: '',
    position: 'absolute',
    zIndex: 1,
    ...insetX(0),
    top: '100%',
    height: '0.6px',
    backgroundColor: vars.panel.border,
  },
})

export const header = style([
  panelHeaderAfterEl,
  {
    ...flex('items-stretch'),
  },
])

export const locatorButton = style({
  flexShrink: 0,
  width: spacing[7],
  height: spacing[7],
})
export const locatorIcon = style({
  width: spacing[4],
  height: spacing[4],
})

export const search = (() => {
  const { hoverBgStyle } = createHoverBackground()

  const form = style([
    hoverBgStyle,
    {
      ...border(vars.panel[2], 'l', 'r'),
      flexGrow: 1,
      position: 'relative',
      overflow: 'hidden',
    },
  ])

  const input = style({
    height: vars.panel.headerHeight,
    width: '100%',
    outline: 'unset',
    background: 'unset',
    border: 'unset',
    color: 'inherit',
    fontSize: theme.fontSize.lg,
    ...padding(0, 6),
    ...transition('padding'),
    lineHeight: spacing[9],
    '::placeholder': {
      color: vars.disabled.color,
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
    width: spacing[3.5],
    height: spacing[3.5],
    color: vars.disabled.color,
  })

  return {
    form,
    input,
    iconContainer: style([
      edgeContainerBase,
      {
        pointerEvents: 'none',
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
      hoverBgStyle,
      {
        right: spacing[1],
        ...padding(0, 0.5),
        ...rounded(),
      },
    ]),
    clearIcon: iconBase,
  }
})()

export const toggleMode = (() => {
  const tabBase = style({
    ':before': {
      content: '',
      width: spacing[2],
      height: spacing[2],
      ...rounded('full'),
      ...border(tabColor),
      opacity: 0.6,
      ...transition('opacity'),
    },
    selectors: {
      '&:is(:hover, :focus, [aria-selected=true]):before': {
        opacity: 1,
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
    }),
    tab: styleVariants({
      components: [
        tabBase,
        style({
          vars: { [tabColor]: vars.componentNameColor },
        }),
      ],
      owners: [tabBase],
      dom: [
        tabBase,
        style({
          vars: { [tabColor]: vars.domColor },
        }),
      ],
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
