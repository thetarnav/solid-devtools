import { style } from "@vanilla-extract/css"
import { spacing, color, insetX } from "@solid-devtools/ui/theme"

export const app = style({
  height: "100vh",
  width: "100vw",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: `${spacing[16]} 1fr`,
})

export const header = style({
  padding: spacing[4],
  backgroundColor: color.white,
  display: "flex",
  alignItems: "center",
  columnGap: spacing[4],
})

//
// SELECT ELEMENT
//
export const select = style({
  width: spacing[8],
  height: spacing[8],
})
export const selectIcon = style({
  width: spacing[5],
  height: spacing[5],
})

export const content = style({
  overflow: "hidden",
})

export const graphWrapper = style({
  height: "100%",
  width: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
})

export const path = style({
  flexShrink: 0,
  height: spacing[4],
  width: "100%",
  position: "relative",
})
export const pathInner = style({
  position: "absolute",
  zIndex: 1,
  bottom: 0,
  ...insetX(0),
  minHeight: spacing[4],
  width: "100%",
  display: "flex",
  alignItems: "center",
  padding: `${spacing[0.5]} ${spacing[2]}`,
  borderTop: `1px solid ${color.gray[200]}`,
  backgroundColor: color.gray[50],
})

export const details = {
  scrollWrapper: style({
    height: "100%",
    width: "100%",
    overflow: "hidden",
  }),
  root: style({
    padding: spacing[4],
    paddingBottom: spacing[16],
  }),
  header: style({
    marginBottom: spacing[4],
  }),
  h1: style({
    // TODO: typography
    fontSize: spacing[4],
    fontWeight: "bold",
  }),
  id: style({
    fontSize: spacing[3],
    color: color.gray[500],
    fontWeight: 400,
    textTransform: "uppercase",
  }),
  type: style({
    fontSize: spacing[3],
    color: color.gray[500],
    fontWeight: 400,
  }),
}
