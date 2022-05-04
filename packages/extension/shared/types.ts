import { MESSAGE } from "./variables"

export interface Message<K extends MESSAGE> {
  id: K
}

export interface MessagePayloads {
  [MESSAGE.SolidOnPage]: boolean
  [MESSAGE.Hello]: string
  [MESSAGE.PanelVisibility]: boolean
}

export type PostMessageFn = <K extends MESSAGE>(id: K, payload: MessagePayloads[K]) => void

export type OnMessageFn = <K extends MESSAGE>(
  id: K,
  handler: (payload: MessagePayloads[K]) => void
) => void
