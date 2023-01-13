/*
This module is separated to make it easier to mock in tests.
*/

import { NodeID } from '../types'

let LastId = 0
export const getNewSdtId = (): NodeID => `#${(LastId++).toString(36)}` as NodeID
