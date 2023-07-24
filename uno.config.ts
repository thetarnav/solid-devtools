import { defineConfig, presetUno } from 'unocss'
import * as theme from './configs/theme'

export default defineConfig({
    presets: [presetUno({ dark: 'media' })],
    theme: {
        colors: theme.colors,

        spacing: theme.spacing,
        height: theme.spacing,
        minHeight: theme.spacing,
        maxHeight: theme.spacing,
        lineHeight: theme.spacing,
        width: theme.spacing,
        minWidth: theme.spacing,
        maxWidth: theme.spacing,

        fontFamily: theme.font,
        fontSize: theme.fontSize,
    },
    variants: [
        matcher => {
            const key = 'selected'
            if (!matcher.startsWith(key + ':')) return matcher
            return {
                matcher: matcher.slice(key.length + 1),
                selector: s => s + '[aria-selected=true]',
            }
        },
    ],
    shortcuts: {
        'center-child': 'flex items-center justify-center',
    },
}) as any
