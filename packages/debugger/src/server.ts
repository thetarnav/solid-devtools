import { noop } from "@solid-primitives/utils"
import * as API from "./index"

export const Debugger: typeof API.Debugger = props => props.children

export const reattachOwner: typeof API.reattachOwner = noop
