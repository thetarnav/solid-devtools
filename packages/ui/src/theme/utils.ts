import { Many } from "@solid-primitives/utils"
import { ComplexStyleRule } from "@vanilla-extract/css"
import { clsx } from "clsx"
import { Property } from "csstype"
import { spacing, theme } from "."

export function hexToRgbValue(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16),
    g = parseInt(result[2], 16),
    b = parseInt(result[3], 16)
  return `${r} ${g} ${b}`
}

export function hexToRgb(hex: string, alpha?: number) {
  const value = hexToRgbValue(hex)
  return alpha === undefined ? `rgb(${value})` : `rgb(${value} / ${alpha})`
}

export const insetX = (n: string | keyof typeof spacing) => {
  const nn = typeof n === "string" ? n : spacing[n]
  return {
    left: nn,
    right: nn,
  }
}
export const insetY = (n: string | keyof typeof spacing) => {
  const nn = typeof n === "string" ? n : spacing[n]
  return {
    top: nn,
    bottom: nn,
  }
}
export const inset = (n: string | keyof typeof spacing) => {
  const nn = typeof n === "string" ? n : spacing[n]
  return {
    top: nn,
    bottom: nn,
    left: nn,
    right: nn,
  }
}

export const centerChild = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const

export const rounded = (key: keyof typeof theme.radius = "DEFAULT") => ({
  borderRadius: theme.radius[key],
})

export const transition = (
  property: Many<Property.TransitionProperty>,
  duration: Property.TransitionDuration = theme.duration[150],
  delay: Property.TransitionDelay = theme.duration[0],
  easing: Property.TransitionTimingFunction = theme.easing.DEFAULT,
): ComplexStyleRule => ({
  transitionProperty: clsx(property),
  transitionDuration: duration,
  transitionDelay: delay,
  transitionTimingFunction: easing,
})
