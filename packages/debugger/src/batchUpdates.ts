import { onCleanup } from "solid-js"
import { chain, createMicrotask } from "@solid-primitives/utils"
import { BatchedUpdate, BatchUpdateListener, SignalUpdatePayload } from "@shared/graph"

export type SignalUpdateHandler = (payload: SignalUpdatePayload) => void
export type ComputationUpdateHandler = (id: number) => void

let updateBatchQueue: BatchedUpdate[] = []
const batchUpdateListeners = new Set<BatchUpdateListener>()

const callBatchUpdateListeners = chain(batchUpdateListeners)

const emitBatchUpdates = createMicrotask(() => {
  callBatchUpdateListeners([...updateBatchQueue])
  updateBatchQueue = []
})

/**
 * emit signal or computation update
 */
export function batchUpdate(update: BatchedUpdate) {
  updateBatchQueue.push(update)
  emitBatchUpdates()
}

/**
 * Listen for a series of signal & computation updates
 */
export function makeBatchUpdateListener(listener: BatchUpdateListener): VoidFunction {
  batchUpdateListeners.add(listener)
  return onCleanup(() => batchUpdateListeners.delete(listener))
}
