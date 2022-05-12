import { create, cssomSheet, ThemeConfiguration } from "twind"
import * as colors from "twind/colors"

export const sheet = cssomSheet({ target: new CSSStyleSheet() })

export const theme: ThemeConfiguration = {
	colors,
}

export const { tw } = create({ sheet, theme })
