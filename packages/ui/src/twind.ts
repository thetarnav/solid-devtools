import { create, cssomSheet, ThemeConfiguration } from "twind"
import * as _colors from "twind/colors"

export const sheet = cssomSheet({ target: new CSSStyleSheet() })

export const colors = _colors

export const theme: ThemeConfiguration = {
	colors,
}

export const { tw } = create({ sheet, theme })
