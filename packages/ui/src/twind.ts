import { create, cssomSheet } from "twind"

export const sheet = cssomSheet({ target: new CSSStyleSheet() })

export const { tw } = create({ sheet })
