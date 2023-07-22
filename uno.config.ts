import { defineConfig, presetUno } from 'unocss'
import theme from './configs/theme'

export default defineConfig({
    presets: [presetUno({ dark: 'media' })],
    theme: {
        colors: theme.colors,
        spacing: theme.spacing,
        fontFamily: theme.font,
        fontSize: theme.fontSize,
    },
    shortcuts: {
        'center-child': 'flex items-center justify-center',
    },
}) as any
