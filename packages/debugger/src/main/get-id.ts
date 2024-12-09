/*
This module is separated to make it easier to mock in tests.
*/

import {type NodeID} from '../types.ts'

let LastId = 0
export const getNewSdtId = (): NodeID => `#${(LastId++).toString(36)}`
