/*

A real-world script that will check if solid is on the page,
and notify the content script

*/

import '@solid-devtools/debugger/types'
import {detectSolid, onSolidDevDetect, onSolidDevtoolsDetect} from '@solid-devtools/shared/detect'
import * as bridge from '../shared/bridge.ts'

const state: bridge.DetectionState = {
    Solid: false,
    SolidDev: false,
    Devtools: false,
}

function postState() {
    postMessage({name: bridge.DETECT_MESSAGE, state} satisfies bridge.DetectEvent, '*')
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
})
