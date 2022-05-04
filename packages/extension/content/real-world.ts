import { postWindowMessage } from "@/shared/utils"
import { MESSAGE } from "@/shared/variables"

console.log("REAL WORLD")

const solidOnPage = window.Solid$$

postWindowMessage(MESSAGE.SolidOnPage, solidOnPage)

export {}
