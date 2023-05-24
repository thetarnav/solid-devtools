/*

The real-world script will check if solid is on the page,
notify the content script,
and then import the debugger script.

*/

import '@solid-devtools/debugger/types'
import { detectSolid, onSolidDevDetect, onSolidDevtoolsDetect } from '@solid-devtools/shared/detect'
import { DETECT_MESSAGE, DetectEvent, DetectionState } from '../src/bridge'

const state: DetectionState = {
  Solid: false,
  SolidDev: false,
  Devtools: false,
}

function postState() {
  postMessage({ name: DETECT_MESSAGE, state } satisfies DetectEvent, '*')
}

detectSolid().then(hasSolid => {
  if (!hasSolid || state.Solid) return
  state.Solid = true
  postState()
})

onSolidDevDetect(() => {
  state.SolidDev = true
  state.Solid = true
  postState()
})

onSolidDevtoolsDetect(() => {
  state.Devtools = true
  postState()
  import('./debugger')
})
