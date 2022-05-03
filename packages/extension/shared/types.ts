import { MESSAGE } from "./variables"

export interface Message<K extends MESSAGE> {
  id: K
}

export interface MessagePayloads {
  [MESSAGE.SOLID_ON_PAGE]: boolean
}
