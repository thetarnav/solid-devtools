/*

Setup the debugger
This is a script that should be injected into the page to expose Solid API to the debugger.
It also starts listening to Solid DEV events and stores them to be sent to the debugger.

*/

import { $PROXY, DEV, getListener, getOwner, onCleanup, untrack } from 'solid-js'
import { DEV as STORE_DEV, unwrap } from 'solid-js/store'
import type { LocatorOptions } from './locator/types'
import { DevEventType, Solid, StoredDevEvent } from './main/types'

let PassedLocatorOptions: LocatorOptions | null = null
let DevEvents: StoredDevEvent[] | null = []
let ClientVersion: string | null = null
let SolidVersion: string | null = null
let ExpectedSolidVersion: string | null = null

window._$SolidDevAPI = {
  DEV,
  getOwner,
  getListener,
  onCleanup,
  $PROXY,
  untrack,
  STORE_DEV: STORE_DEV!,
  unwrap,
  takeDevEvents() {
    const events = DevEvents ?? []
    DevEvents = null
    return events
  },
  get locatorOptions() {
    return PassedLocatorOptions
  },
  versions: {
    get client() {
      return ClientVersion
    },
    get solid() {
      return SolidVersion
    },
    get expectedSolid() {
      return ExpectedSolidVersion
    },
  },
}

window._$afterCreateRoot = function (root) {
  if (!DevEvents) return
  DevEvents.push({
    timestamp: Date.now(),
    type: DevEventType.RootCreated,
    data: root as Solid.Root,
  })
}

export function useLocator(options: LocatorOptions) {
  PassedLocatorOptions = options
}

export function markComponentLoc() {
  // TODO
}

export function setClientVersion(version: string) {
  ClientVersion = version
}

export function setSolidVersion(version: string, expected: string) {
  SolidVersion = version
  ExpectedSolidVersion = expected
}
