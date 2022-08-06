import { createRuntimeMessanger } from "../shared/messanger"
import { MESSAGE } from "@shared/bridge"

export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

postRuntimeMessage(MESSAGE.ForceUpdate)
