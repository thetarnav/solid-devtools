import { asArray, Many } from '@solid-primitives/utils'
import { StyleRule } from '@vanilla-extract/css'
import type { CSSPropertiesWithVars } from '@vanilla-extract/css/dist/declarations/src/types'
import { clsx } from 'clsx'
import { Property } from 'csstype'
import { spacing, theme } from '.'

export function hexToRgbValue(hex: string) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return hex
  const r = parseInt(result[1], 16),
    g = parseInt(result[2], 16),
    b = parseInt(result[3], 16)
  return `${r} ${g} ${b}`
}

export function hexToRgb(hex: string, alpha?: number | string) {
  const value = hexToRgbValue(hex)
  return alpha === undefined ? `rgb(${value})` : `rgb(${value} / ${alpha})`
}

export type SpacingValue = string | keyof typeof spacing

const resolveSpacing = (n: SpacingValue) => {
  return n in spacing ? spacing[n as keyof typeof spacing] : (n as string)
}

export const insetX = (n: SpacingValue) => {
  const nn = resolveSpacing(n)
  return { left: nn, right: nn }
}
export const insetY = (n: SpacingValue) => {
  const nn = resolveSpacing(n)
  return { top: nn, bottom: nn }
}
export const inset = (n: SpacingValue) => {
  const nn = resolveSpacing(n)
  return { top: nn, bottom: nn, left: nn, right: nn }
}

export const centerChild = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

export const rounded = (
  key: keyof typeof theme.radius = 'DEFAULT',
  corners?: ('tl' | 'tr' | 'bl' | 'br')[],
): CSSPropertiesWithVars => {
  if (!corners) return { borderRadius: theme.radius[key] }

  const radius = theme.radius[key]
  const tl = corners.includes('tl') ? radius : '0'
  const tr = corners.includes('tr') ? radius : '0'
  const bl = corners.includes('bl') ? radius : '0'
  const br = corners.includes('br') ? radius : '0'
  return { borderRadius: `${tl} ${tr} ${br} ${bl}` }
}

export const transition = (
  property: Many<Property.TransitionProperty>,
  duration: Property.TransitionDuration = theme.duration[150],
  delay: Property.TransitionDelay = theme.duration[0],
  easing: Property.TransitionTimingFunction = theme.easing.DEFAULT,
): CSSPropertiesWithVars => ({
  transitionProperty: clsx(property),
  transitionDuration: duration,
  transitionDelay: delay,
  transitionTimingFunction: easing,
})

export const media = (
  rules: Many<({ rule: Many<string> } & StyleRule) | Record<string, StyleRule>>,
): {
  '@media': Record<string, StyleRule>
} => {
  const media: Record<string, StyleRule> = {}
  for (const obj of asArray(rules)) {
    if ('rule' in obj) {
      const { rule, ...styles } = obj
      const calcRule = ['screen', ...asArray(rule)].join(' and ')
      media[calcRule] = styles
    } else {
      for (const [rule, styles] of Object.entries(obj)) {
        media[`screen and ${rule}`] = styles
      }
    }
  }
  return { '@media': media }
}
export const dark = '(prefers-color-scheme: dark)'
export const mobile = '(max-width: 640px)'
export const touch = '(hover: none)'

export const borderValue = (color: string): StyleRule['border'] => {
  return `1px solid ${color}`
}

export const border = (
  color: string,
  ...edges: ('t' | 'r' | 'b' | 'l')[]
): CSSPropertiesWithVars => {
  if (!edges.length) return { border: borderValue(color) }

  const rules: CSSPropertiesWithVars = {}

  if (edges.includes('t')) rules.borderTop = borderValue(color)
  if (edges.includes('r')) rules.borderRight = borderValue(color)
  if (edges.includes('b')) rules.borderBottom = borderValue(color)
  if (edges.includes('l')) rules.borderLeft = borderValue(color)

  return rules
}

export function padding(allEdges: SpacingValue): CSSPropertiesWithVars
export function padding(v: SpacingValue, h: SpacingValue): CSSPropertiesWithVars
export function padding(t: SpacingValue, h: SpacingValue, b: SpacingValue): CSSPropertiesWithVars
export function padding(
  t: SpacingValue,
  r: SpacingValue,
  b: SpacingValue,
  l: SpacingValue,
): CSSPropertiesWithVars
export function padding(
  a: SpacingValue,
  b?: SpacingValue,
  c?: SpacingValue,
  d?: SpacingValue,
): CSSPropertiesWithVars {
  if (b === undefined) return { padding: resolveSpacing(a) }
  if (c === undefined) return { padding: `${resolveSpacing(a)} ${resolveSpacing(b)}` }
  if (d === undefined)
    return { padding: `${resolveSpacing(a)} ${resolveSpacing(b)} ${resolveSpacing(c)}` }
  return {
    padding: `${resolveSpacing(a)} ${resolveSpacing(b)} ${resolveSpacing(c)} ${resolveSpacing(d)}`,
  }
}
