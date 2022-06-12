import { noop } from "@solid-primitives/utils"
import * as API from "./index"

export const makeBatchUpdateListener: typeof API.makeBatchUpdateListener = () => noop

export const Debugger: typeof API.Debugger = props => props.children
