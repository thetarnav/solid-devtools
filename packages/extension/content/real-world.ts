import { postMessage } from "@/shared/utils"
import { MESSAGE } from "@/shared/variables"

console.log("REAL WORLD")

const solidOnPage = window.Solid$$

postMessage(MESSAGE.SOLID_ON_PAGE, solidOnPage)

export {}
