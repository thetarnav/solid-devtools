import { spacing, color } from "@solid-devtools/ui/theme"
import { style } from "@vanilla-extract/css"

export const scrollWrapper = style({
  height: "100%",
  width: "100%",
  overflow: "hidden",
})

export const root = style({
  padding: spacing[4],
  paddingBottom: spacing[16],
})

export const header = style({
  marginBottom: spacing[4],
})

export const h1 = style({
  // TODO: typography
  fontSize: spacing[4],
  fontWeight: "bold",
})

export const id = style({
  fontSize: spacing[3],
  color: color.gray[500],
  fontWeight: 400,
  textTransform: "uppercase",
})

export const type = style({
  fontSize: spacing[3],
  color: color.gray[500],
  fontWeight: 400,
})

export const props = style({
  marginBottom: spacing[4],
})
