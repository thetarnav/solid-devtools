import { createRuntimeMessanger } from "../shared/messanger"
import { MESSAGE } from "@shared/messanger"

export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

postRuntimeMessage(MESSAGE.ForceUpdate)
