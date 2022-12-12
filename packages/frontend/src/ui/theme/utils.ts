import { asArray, Many } from '@solid-primitives/utils'
import { StyleRule } from '@vanilla-extract/css'
import { Property } from 'csstype'
import { spacing, theme } from './theme.css'

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

export function remValue(value: `${number}rem`): number {
  return +value.substring(0, value.length - 3)
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
): StyleRule => {
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
): StyleRule => ({
  transitionProperty: property,
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
export const light = '(prefers-color-scheme: light)'
export const mobile = '(max-width: 640px)'
export const touch = '(hover: none)'

export const borderValue = (color: string): StyleRule['border'] => {
  return `1px solid ${color}`
}

export const border = (color: string, ...edges: ('t' | 'r' | 'b' | 'l')[]): StyleRule => {
  if (!edges.length) return { border: borderValue(color) }

  const rules: StyleRule = {}

  if (edges.includes('t')) rules.borderTop = borderValue(color)
  if (edges.includes('r')) rules.borderRight = borderValue(color)
  if (edges.includes('b')) rules.borderBottom = borderValue(color)
  if (edges.includes('l')) rules.borderLeft = borderValue(color)

  return rules
}

export function padding(allEdges: SpacingValue): StyleRule
export function padding(v: SpacingValue, h: SpacingValue): StyleRule
export function padding(t: SpacingValue, h: SpacingValue, b: SpacingValue): StyleRule
export function padding(
  t: SpacingValue,
  r: SpacingValue,
  b: SpacingValue,
  l: SpacingValue,
): StyleRule
export function padding(
  a: SpacingValue,
  b?: SpacingValue,
  c?: SpacingValue,
  d?: SpacingValue,
): StyleRule {
  if (b === undefined) return { padding: resolveSpacing(a) }
  if (c === undefined) return { padding: `${resolveSpacing(a)} ${resolveSpacing(b)}` }
  if (d === undefined)
    return { padding: `${resolveSpacing(a)} ${resolveSpacing(b)} ${resolveSpacing(c)}` }
  return {
    padding: `${resolveSpacing(a)} ${resolveSpacing(b)} ${resolveSpacing(c)} ${resolveSpacing(d)}`,
  }
}

export function margin(allEdges: SpacingValue): StyleRule
export function margin(v: SpacingValue, h: SpacingValue): StyleRule
export function margin(t: SpacingValue, h: SpacingValue, b: SpacingValue): StyleRule
export function margin(
  t: SpacingValue,
  r: SpacingValue,
  b: SpacingValue,
  l: SpacingValue,
): StyleRule
export function margin(
  a: SpacingValue,
  b?: SpacingValue,
  c?: SpacingValue,
  d?: SpacingValue,
): StyleRule {
  if (b === undefined) return { margin: resolveSpacing(a) }
  if (c === undefined) return { margin: `${resolveSpacing(a)} ${resolveSpacing(b)}` }
  if (d === undefined)
    return { margin: `${resolveSpacing(a)} ${resolveSpacing(b)} ${resolveSpacing(c)}` }
  return {
    margin: `${resolveSpacing(a)} ${resolveSpacing(b)} ${resolveSpacing(c)} ${resolveSpacing(d)}`,
  }
}

type OnlyStringValues<T> = keyof {
  [K in T as string extends K
    ? never
    : K extends string
    ? K extends
        | `var${string}`
        | 'inherit'
        | 'initial'
        | '-moz-initial'
        | 'unset'
        | 'revert'
        | 'none'
        | 'revert-layer'
      ? never
      : K
    : never]: never
}

export function flex(
  ...rules: (
    | OnlyStringValues<StyleRule['flexDirection']>
    | `items-${OnlyStringValues<StyleRule['alignItems']>}`
    | `justify-${OnlyStringValues<StyleRule['justifyContent']>}`
    | `wrap-${OnlyStringValues<StyleRule['flexWrap']>}`
  )[]
): StyleRule {
  const styles: StyleRule = {
    display: 'flex',
  }
  for (const rule of rules) {
    if (rule.startsWith('items-')) {
      styles.alignItems = rule.slice(6) as StyleRule['alignItems']
    } else if (rule.startsWith('justify-')) {
      styles.justifyContent = rule.slice(8) as StyleRule['justifyContent']
    } else if (rule.startsWith('wrap-')) {
      styles.flexWrap = rule.slice(5) as StyleRule['flexWrap']
    } else {
      styles.flexDirection = rule as StyleRule['flexDirection']
    }
  }
  return styles
}
