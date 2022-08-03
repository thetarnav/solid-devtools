// ported from voby https://github.com/vobyjs/voby/blob/master/src/hooks/use_scheduler.ts
import { Accessor } from "solid-js"

type FN<Arguments extends unknown[], Return extends unknown = void> = (...args: Arguments) => Return
type MaybeAccessor<T = unknown> = Accessor<T> | T
const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
  typeof value === "function"
const unwrap = <T>(maybeValue: MaybeAccessor<T>): T =>
  isFunction(maybeValue) ? maybeValue() : maybeValue

export const createScheduler = <T, U>({
  loop,
  callback,
  cancel,
  schedule,
}: {
  loop?: MaybeAccessor<boolean>
  callback: MaybeAccessor<FN<[U]>>
  cancel: FN<[T]>
  schedule: (callback: FN<[U]>) => T
}): (() => void) => {
  let tickId: T
  const work = (): void => {
    if (unwrap(loop)) tick()
    unwrap(callback)
  }

  const tick = (): void => {
    tickId = schedule(work)
  }

  const dispose = (): void => {
    cancel(tickId)
  }

  tick()
  return dispose
}

export const createAnimationLoop = (callback: FrameRequestCallback) =>
  createScheduler({
    callback,
    loop: true,
    cancel: cancelAnimationFrame,
    schedule: requestAnimationFrame,
  })
