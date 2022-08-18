import { createVar, fallbackVar, style } from "@vanilla-extract/css"
import { CSSVarFunction } from "@vanilla-extract/private"
import { insetX, insetY, rounded, spacing, transition } from "./theme"

export function createHighlightStyles(
  transitionProperty:
    | "opacity"
    | "background-color"
    | ("opacity" | "background-color")[] = "opacity",
): {
  container: string
  highlight: string
  bgColorVar: CSSVarFunction
  bgOpacityVar: CSSVarFunction
} {
  const container = style({
    position: "relative",
    zIndex: 1,
  })

  const bgColorVar: CSSVarFunction = createVar()
  const bgOpacityVar: CSSVarFunction = createVar()

  const highlight = style({
    position: "absolute",
    zIndex: -1,
    ...insetX(`-${spacing[1]}`),
    ...insetY(0),
    ...rounded(),
    ...transition(transitionProperty),
    backgroundColor: bgColorVar,
    opacity: fallbackVar(bgOpacityVar, "0"),
  })

  return { container, highlight, bgColorVar, bgOpacityVar }
}
