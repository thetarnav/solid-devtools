import { createRuntimeMessanger } from "@/shared/utils"
import { MESSAGE } from "@shared/messanger"

export const { onRuntimeMessage, postRuntimeMessage } = createRuntimeMessanger()

postRuntimeMessage(MESSAGE.Hello, "Hello from Panel")
