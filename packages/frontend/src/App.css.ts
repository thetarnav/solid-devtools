import { style } from '@vanilla-extract/css'
import { dark, spacing, color, rounded, theme, media } from '@/ui/theme'
import { toggleButton } from '@/ui/components/button/button.css'

export const app = style({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  display: 'grid',
  gridTemplateRows: `${spacing[16]} 1fr`,
  backgroundColor: color.white,
  fontSize: theme.fontSize.base,
  fontFamily: theme.font.sans,
  ...media({
    [dark]: {
      backgroundColor: color.gray[800],
    },
  }),
})

export const header = style({
  padding: spacing[4],
  backgroundColor: color.white,
  display: 'flex',
  alignItems: 'center',
  columnGap: spacing[4],
  borderBottom: `1px solid ${color.gray[200]}`,
  ...media({
    [dark]: {
      backgroundColor: color.gray[800],
      borderColor: color.gray[500],
    },
  }),
})

export const h3 = style({
  color: color.black,
  ...media({
    [dark]: {
      color: color.gray[50],
    },
  }),
})
export const select = style({
  width: spacing[8],
  height: spacing[8],
  color: color.black,
  ...media({
    [dark]: {
      color: color.gray[50],
    },
  }),
})
export const selectIcon = style({
  width: spacing[5],
  height: spacing[5],
})

export const options = style({
  marginLeft: 'auto',
})
export const optionsButton = style([
  toggleButton,
  {
    marginLeft: 'auto',
    width: spacing[8],
    height: spacing[8],
    color: color.black,
    ...media({
      [dark]: {
        color: color.gray[50],
      },
    }),
  },
])
export const optionsIcon = style({
  width: spacing[5],
  height: spacing[5],
})

export const optionsPanel = style({
  position: 'fixed',
  zIndex: 9999,
  padding: spacing[2],
  ...rounded('md'),
  backgroundColor: color.gray[100],
  border: `1px solid ${color.gray[200]}`,
})

export const optionsMenu = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: spacing[2],
})

export const content = style({
  overflow: 'hidden',
})
