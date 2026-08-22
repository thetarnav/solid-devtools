import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createEffect, createRoot } from 'solid-js'
import { createTrackedSignal, type StormDetails } from '../src/createTrackedSignal'

describe('createTrackedSignal', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('behaves identically to standard signal for normal updates', () => {
    createRoot(dispose => {
      const [count, setCount] = createTrackedSignal(0, { name: 'testCount' })

      expect(count()).toBe(0)
      setCount(5)
      expect(count()).toBe(5)
      setCount(prev => prev + 1)
      expect(count()).toBe(6)

      expect(warnSpy).not.toHaveBeenCalled()
      dispose()
    })
  })

  it('triggers storm alert when transition threshold is exceeded in a single tick', () => {
    createRoot(dispose => {
      const onStorm = vi.fn()
      const [, setCount] = createTrackedSignal(0, {
        name: 'stormLoopSignal',
        maxTransitionsPerTick: 10,
        onStorm
      })

      for (let i = 1; i <= 15; i++) {
        setCount(i)
      }

      expect(onStorm).toHaveBeenCalled()
      const details: StormDetails<number> = onStorm.mock.calls[0][0]
      expect(details.signalName).toBe('stormLoopSignal')
      expect(details.transitionsInTick).toBe(11)
      expect(details.nextValue).toBe(11)

      dispose()
    })
  })

  it('detects circular updates inside reactive effects', async () => {
    const onStorm = vi.fn()

    createRoot(dispose => {
      const [a, setA] = createTrackedSignal(0, {
        name: 'ping',
        maxTransitionsPerTick: 20,
        onStorm
      })
      const [b, setB] = createTrackedSignal(0, {
        name: 'pong',
        maxTransitionsPerTick: 20
      })

      createEffect(() => {
        const valA = a()
        if (valA < 30) {
          setB(valA + 1)
        }
      })

      createEffect(() => {
        const valB = b()
        if (valB < 30) {
          setA(valB + 1)
        }
      })

      dispose()
    })

    await vi.runAllTicksAsync()
    expect(onStorm).toHaveBeenCalled()
  })

  it('resets transition counters after microtask boundary', async () => {
    const onStorm = vi.fn()

    await createRoot(async dispose => {
      const [, setCount] = createTrackedSignal(0, {
        maxTransitionsPerTick: 5,
        onStorm
      })

      // 4 updates in tick 1
      for (let i = 1; i <= 4; i++) setCount(i)
      expect(onStorm).not.toHaveBeenCalled()

      // Settle microtask
      await vi.runAllTicksAsync()

      // 4 updates in tick 2
      for (let i = 5; i <= 8; i++) setCount(i)
      expect(onStorm).not.toHaveBeenCalled()

      dispose()
    })
  })
})
