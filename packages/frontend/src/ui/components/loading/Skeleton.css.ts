import { centerChild, color } from '@/ui/theme'
import { style } from '@vanilla-extract/css'

export const skeleton = style({
  ...centerChild,
  width: '100%',
  height: '100%',
  backgroundColor: color.gray[200],
  color: color.gray[600],
})
