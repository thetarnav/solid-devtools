// current theme is based on the tailwind default theme
// colors: https://github.com/tailwindlabs/tailwindcss/blob/master/src/public/colors.js
// spacing and other values: https://github.com/tailwindlabs/tailwindcss/blob/master/stubs/defaultConfig.stub.js

import {misc} from '@nothing-but/utils'
import type {Prettify, UnionToIntersection} from '@nothing-but/utils/types'

const cyan = {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
} as const

const amber = {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
} as const

const gray = {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
} as const

export const fontSize = {
    xs: '0.5rem',
    sm: '0.625rem',
    base: '0.75rem',
    lg: '0.875rem',
    xl: '1rem',
    '2xl': '1.125rem',
    '3xl': '1.25rem',
} as const

export const lineHeight = {
    '3xs': '1rem',
    '2xs': '1rem',
    xs: '1rem',
    sm: '1.25rem',
    base: '1.5rem',
    lg: '1.75rem',
    xl: '1.75rem',
    '2xl': '2rem',
    '3xl': '2.25rem',
    '4xl': '2.5rem',
    '5xl': '1',
    '6xl': '1',
} as const

const raw_spacing = {
    px: '1px',
    0: '0',
    0.25: '0.0625rem', // 1px
    0.5: '0.125rem', // 2px
    1: '0.25rem', // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem', // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem', // 12px
    3.5: '0.875rem', // 14px
    4: '1rem', // 16px
    4.5: '1.125rem', // 18px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    7: '1.75rem', // 28px
    8: '2rem', // 32px
    9: '2.25rem', // 36px
    10: '2.5rem', // 40px
    11: '2.75rem', // 44px
    12: '3rem', // 48px
    14: '3.5rem', // 56px
    16: '4rem', // 64px
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
} as const

/*
    Add here any custom spacing values to use in the theme.
*/
const raw_spacing_with_custom = {
    ...raw_spacing,
    header_height: raw_spacing[7],
    inspector_row: raw_spacing[4.5],
}

export type Spacing = Prettify<
    UnionToIntersection<
        {
            [K in keyof typeof raw_spacing_with_custom]: {
                [K2 in `-${K}`]: `-${(typeof raw_spacing_with_custom)[K]}`
            } & {
                [K2 in K]: (typeof raw_spacing_with_custom)[K]
            }
        }[keyof typeof raw_spacing_with_custom]
    >
>

export const spacing = misc.keys(raw_spacing_with_custom).reduce(
    (acc, key) => {
        const value = raw_spacing_with_custom[key]
        acc[key] = value
        acc[`-${key}`] = `-${value}`
        return acc
    },
    {} as Record<string, string>,
) as Spacing

export function remValue(value: `${number}rem`): number {
    return +value.substring(0, value.length - 3)
}

export interface Var {
    name: string
    light: string
    dark: string
}

const css_vars: Var[] = []

function cssvar<T extends string>(name: T, light: string, dark: string): string {
    const css_var: Var = {
        name: '--' + name,
        light,
        dark,
    }
    css_vars.push(css_var)
    return `var(${css_var.name})`
}

export const vars = {
    panel: {
        1: cssvar('panel__1', gray[100], gray[800]),
        2: cssvar('panel__2', gray[200], gray[700]),
        3: cssvar('panel__3', gray[300], gray[600]),
        4: cssvar('panel__4', gray[400], gray[500]),
        5: cssvar('panel__5', gray[500], gray[400]),
        6: cssvar('panel__6', gray[600], gray[300]),
        7: cssvar('panel__7', gray[700], gray[200]),
        8: cssvar('panel__8', gray[800], gray[100]),

        bg: cssvar('panel__bg', gray[50], gray[800]),
        border: cssvar('panel__border', gray[300], gray[600]),
    },
    highlight: {
        bg: cssvar('gray_highlight__color', gray[300], gray[600]),
        border: cssvar('gray_highlight__border', gray[400], gray[500]),
    },
    disabled: cssvar('disabled__color', gray[500], gray[400]),
    text: {
        DEFAULT: cssvar('default-text-color', gray[900], gray[100]),
        light: cssvar('light-text-color', gray[800], gray[200]),
    },
    component: cssvar('component-color', cyan[600], cyan[400]),
    dom: cssvar('dom-color', amber[600], amber[500]),
} as const

export function make_var_styles(root_class: string): string {
    return `
        .${root_class} {
            ${css_vars.map(css_var => `${css_var.name}: ${css_var.light};`).join('')}
        }
        @media (prefers-color-scheme: dark) {
            .${root_class} {
                ${css_vars.map(css_var => `${css_var.name}: ${css_var.dark};`).join('')}
            }
        }
    `
}

export const colors = {
    inherit: 'inherit',
    current: 'currentColor',
    transparent: 'transparent',
    black: '#000000',
    white: '#ffffff',
    cyan,
    amber,
    gray,
    green: '#16a34a',
    red: '#ef4444',
    ...vars,
}

export const easing = {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
}

export const radius = {
    none: '0px',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
}

export const duration = {
    0: '0ms',
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
}

export const font = {
    sans: "ui-sans-serif, -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Noto Color Emoji'",
    serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
}
