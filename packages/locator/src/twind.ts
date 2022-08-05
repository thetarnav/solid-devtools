import { create, cssomSheet, ThemeConfiguration } from "twind"
import * as _colors from "twind/colors"

export const sheet = cssomSheet({ target: new CSSStyleSheet() })

export const colors = {
  black: _colors.black,
  cyan: _colors.cyan,
  while: _colors.white,
  amber: _colors.amber,
  gray: _colors.gray,
}

export const theme: ThemeConfiguration = {
  colors,
  minWidth: {
    "1": "8px",
    "2": "12px",
    "3": "16px",
    "4": "24px",
    "5": "32px",
    "6": "48px",
  },
  zIndex: {
    "1": "1",
    "9999": "9999",
  },
}

export const { tw } = create({ sheet, theme })
