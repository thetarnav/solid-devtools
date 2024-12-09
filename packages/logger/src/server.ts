import {noop} from '@solid-primitives/utils'
import type * as API from './index.ts'

export const debugComputation: typeof API.debugComputation = noop
export const debugOwnerComputations: typeof API.debugOwnerComputations = noop
export const debugSignal: typeof API.debugSignal = noop
export const debugSignals: typeof API.debugSignals = noop
export const debugOwnerSignals: typeof API.debugOwnerSignals = noop
export const debugProps: typeof API.debugProps = noop
