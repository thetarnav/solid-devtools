/*

The real-world script will check if solid is on the page,
notify the content script,
and then import the debugger script.

*/

import '@solid-devtools/debugger/types'
import { interceptPropertySet } from '@solid-devtools/shared/utils'
import { SOLID_ON_PAGE_MESSAGE } from '../src/bridge'

let notified = false
function notify() {
  if (notified) return
  notified = true
  postMessage(SOLID_ON_PAGE_MESSAGE, '*')
  import('./debugger')
}

if (window.SolidDevtools$$) {
  notify()
} else {
  interceptPropertySet(window, 'SolidDevtools$$', v => v && notify())
}
