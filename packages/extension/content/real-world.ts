import { postWindowMessage } from "@/shared/utils"
import { MESSAGE } from "@/shared/variables"

console.log("REAL WORLD")

const solidOnPage = window.Solid$$

// actual solid detection is handled by js library – it is required for devtools working anyway
if (!solidOnPage) postWindowMessage(MESSAGE.SolidOnPage, false)

export {}
