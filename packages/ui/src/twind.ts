import { create, cssomSheet, ThemeConfiguration } from "twind"
import * as _colors from "twind/colors"

export function hexToRgb(hex: string, alpha?: number) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	if (!result) return null
	const r = parseInt(result[1], 16),
		g = parseInt(result[2], 16),
		b = parseInt(result[3], 16)
	return alpha === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b}, ${alpha})`
}

export const sheet = cssomSheet({ target: new CSSStyleSheet() })

export const colors = _colors

export const theme: ThemeConfiguration = {
	colors,
}

export const { tw } = create({ sheet, theme })
