/*
This module is separated to make it easier to mock in tests.
*/

let LastId = 0
export const getNewSdtId = () => (LastId++).toString(36)
