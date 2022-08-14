import { style, globalStyle } from "@vanilla-extract/css"
import { spacing, color, rounded, inset } from "@solid-devtools/ui/theme"

// TODO: move to UI styles
globalStyle(".fade-enter, .fade-exit-to", {
  opacity: 0,
})
globalStyle(".fade-enter-active, .fade-exit-active", {
  transition: "opacity .3s ease",
})
// globalStyle(".fade-enter-active", {
//   transitionDelay: ".1s",
// })

export const app = style({
  height: "100vh",
  width: "100vw",
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: `${spacing[16]} 1fr`,
})

export const header = style({
  padding: spacing[4],
  backgroundColor: color.gray[100],
})

export const content = style({
  overflow: "hidden",
})

export const details = {
  transitionWrapper: style({
    position: "relative",
  }),
  root: style({
    position: "absolute",
    ...inset(0),
    padding: spacing[4],
  }),
  pathWrapper: style({
    display: "flex",
    flexWrap: "wrap",
    marginBottom: spacing[4],
  }),
  pathItem: style({
    position: "relative",
    padding: `${spacing[0.5]} ${spacing[1]}`,
    marginRight: spacing[4],
    marginBottom: spacing[1],
    ":last-child": {
      marginRight: 0,
    },
    ...rounded(),
    backgroundColor: color.gray[200],

    selectors: {
      "&:not(:last-child):after": {
        content: ">",
        position: "absolute",
        right: `-${spacing[3]}`,
      },
    },
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
