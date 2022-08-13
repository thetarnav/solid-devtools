import { style, styleVariants } from "@vanilla-extract/css"
import { color, hexToRgb, inset, spacing } from "../theme"

const containerBase = style({
  height: "100%",
  width: "100%",
  position: "relative",
  overflow: "overlay",
  "::-webkit-scrollbar": {
    display: "block",
    width: spacing[4],
  },
  "::-webkit-scrollbar-button": {
    display: "none",
  },
  "::-webkit-scrollbar-track": {
    backgroundColor: "#00000000",
  },
  "::-webkit-scrollbar-track-piece": {
    backgroundColor: "#00000000",
  },
  "::-webkit-scrollbar-thumb": {
    backgroundColor: "transparent",
  },
  "::-webkit-scrollbar-corner": {
    backgroundColor: "transparent",
  },
  selectors: {
    "&:hover::-webkit-scrollbar-thumb": {
      backgroundColor: hexToRgb(color.gray[500], 0.2),
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: hexToRgb(color.gray[500], 0.4),
    },
  },
})

export const container = styleVariants({
  normal: [containerBase],
  space: [
    containerBase,
    {
      cursor: "grab",
      userSelect: "none",
    },
  ],
  dragging: [
    containerBase,
    {
      cursor: "grabbing",
      userSelect: "none",
    },
  ],
})

const overlayBase = style({
  position: "absolute",
  ...inset(0),
  zIndex: 1,
})

export const overlay = styleVariants({
  normal: [overlayBase, { pointerEvents: "none" }],
  space: [overlayBase, { pointerEvents: "all" }],
})

export const content = style({
  overflow: "hidden",
  width: "max-content",
  height: "max-content",
  minWidth: "100%",
})
