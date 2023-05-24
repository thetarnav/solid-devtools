export type Listener<T = void> = (payload: T) => void

export type Listen<T = void> = (listener: Listener<T>) => VoidFunction

export type Emit<T = void> = (..._: void extends T ? [payload?: T] : [payload: T]) => void

export class EventBus<T> extends Set<Listener<T>> {
  emit(..._: void extends T ? [payload?: T] : [payload: T]): void
  emit(payload?: any) {
    for (const cb of this) cb(payload)
  }
}
