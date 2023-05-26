import {
  createComputed,
  createMemo,
  createRenderEffect,
  createRoot,
  createSignal,
  JSX,
} from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getObjectById, getSdtId, ObjectType } from '../../main/id'
import SolidApi from '../../main/solid-api'
import { Mapped, NodeType, PropGetterState, Solid, ValueType } from '../../types'
import { collectOwnerDetails } from '../inspector'

const { getOwner } = SolidApi

let mockLAST_ID = 0
beforeEach(() => {
  mockLAST_ID = 0
})
vi.mock('../../main/get-id', () => ({ getNewSdtId: () => '#' + mockLAST_ID++ }))

describe('collectOwnerDetails', () => {
  it('collects focused owner details', () => {
    createRoot(dispose => {
      const [s] = createSignal(0, { name: 'source' })

      let memo!: Solid.Owner
      const div = document.createElement('div')

      createComputed(
        () => {
          const focused = createMemo(
            () => {
              memo = getOwner()!
              s()
              createSignal(div, { name: 'element' })
              const m = createMemo(() => 0, undefined, { name: 'memo' })
              createRenderEffect(m, undefined, { name: 'render' })
              return 'value'
            },
            undefined,
            { name: 'focused' },
          )
          focused()
        },
        undefined,
        { name: 'WRAPPER' },
      )

      const [signalB] = memo.sourceMap as [Solid.Signal]
      const [innerMemo] = memo.owned as [Solid.Memo, Solid.Computation]

      const { details, valueMap } = collectOwnerDetails(memo, {
        observedPropsMap: new WeakMap(),
        onPropStateChange: () => {},
        onValueUpdate: () => {},
      })

      expect(details).toEqual({
        id: getSdtId(memo, ObjectType.Owner),
        name: 'focused',
        type: NodeType.Memo,
        value: [[ValueType.String, 'value']],
        signals: [
          {
            type: NodeType.Signal,
            id: getSdtId(signalB, ObjectType.Signal),
            name: 'element',
            value: [[ValueType.Element, '#3:div']],
          },
          {
            type: NodeType.Memo,
            id: getSdtId(innerMemo, ObjectType.Owner),
            name: 'memo',
            value: [[ValueType.Number, 0]],
          },
        ],
      } satisfies Mapped.OwnerDetails)

      expect(valueMap.get(`signal:${getSdtId(signalB, ObjectType.Signal)}`)).toBeTruthy()
      expect(valueMap.get(`signal:${getSdtId(innerMemo, ObjectType.Owner)}`)).toBeTruthy()

      expect(getObjectById('#3', ObjectType.Element)).toBe(div)

      dispose()
    })
  })

  it('component props', () => {
    createRoot(dispose => {
      let owner!: Solid.Owner
      const TestComponent = (props: {
        count: number
        children: JSX.Element
        nested: { foo: number; bar: string }
      }) => {
        owner = getOwner()!
        return <div>{props.children}</div>
      }
      createRenderEffect(() => (
        <TestComponent count={123} nested={{ foo: 1, bar: '2' }}>
          <button>Click me</button>
        </TestComponent>
      ))

      const { details } = collectOwnerDetails(owner, {
        observedPropsMap: new WeakMap(),
        onPropStateChange: () => {},
        onValueUpdate: () => {},
      })

      dispose()

      expect(details).toEqual({
        id: '#1',
        name: 'TestComponent',
        type: NodeType.Component,
        signals: [],
        value: [[ValueType.Element, '#2:div']],
        props: {
          proxy: false,
          record: {
            count: {
              getter: false,
              value: [[ValueType.Number, 123]],
            },
            nested: {
              getter: false,
              value: [[ValueType.Object, 2]],
            },
            children: {
              getter: PropGetterState.Stale,
              value: null,
            },
          },
        },
      } satisfies Mapped.OwnerDetails)

      expect(getObjectById('#2', ObjectType.Element)).toBeInstanceOf(HTMLDivElement)
    })
  })

  it('dynamic component props', () => {
    createRoot(dispose => {
      let owner!: Solid.Owner
      const Button = (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => {
        owner = getOwner()!
        return <button {...props}>Click me</button>
      }
      createRenderEffect(() => {
        const props = () => ({ onClick: () => {}, role: 'button' } as const)
        return <Button {...props()} />
      })

      const { details } = collectOwnerDetails(owner, {
        observedPropsMap: new WeakMap(),
        onPropStateChange: () => {},
        onValueUpdate: () => {},
      })

      expect(details).toEqual({
        id: '#1',
        name: 'Button',
        type: NodeType.Component,
        signals: [],
        value: [[ValueType.Element, '#2:button']],
        props: {
          proxy: true,
          record: {
            onClick: {
              getter: PropGetterState.Stale,
              value: null,
            },
            role: {
              getter: PropGetterState.Stale,
              value: null,
            },
          },
        },
      } satisfies Mapped.OwnerDetails)

      expect(getObjectById('#2', ObjectType.Element)).toBeInstanceOf(HTMLButtonElement)

      dispose()
    })
  })

  it('listens to value updates', () => {
    createRoot(dispose => {
      let owner!: Solid.Owner

      const [count, setCount] = createSignal(0)
      createMemo(() => {
        owner = getOwner()!
        return count()
      })

      const onValueUpdate = vi.fn()
      collectOwnerDetails(owner, {
        observedPropsMap: new WeakMap(),
        onPropStateChange: () => {},
        onValueUpdate: onValueUpdate,
      })

      expect(onValueUpdate).not.toBeCalled()

      setCount(1)
      expect(onValueUpdate).toBeCalledTimes(1)
      expect(onValueUpdate).toHaveBeenLastCalledWith('value')

      setCount(2)
      expect(onValueUpdate).toBeCalledTimes(2)
      expect(onValueUpdate).toHaveBeenLastCalledWith('value')

      setCount(2)
      expect(onValueUpdate).toBeCalledTimes(2)

      dispose()
    })
  })

  it('listens to signal updates', () => {
    createRoot(dispose => {
      const owner = getOwner()!
      const [, setCount] = createSignal(0) // id: "0"
      const [, setCount2] = createSignal(0) // id: "1"

      const onValueUpdate = vi.fn()
      collectOwnerDetails(owner, {
        observedPropsMap: new WeakMap(),
        onPropStateChange: () => {},
        onValueUpdate: onValueUpdate,
      })

      expect(onValueUpdate).not.toBeCalled()

      setCount(1)
      expect(onValueUpdate).toBeCalledTimes(1)
      expect(onValueUpdate).toHaveBeenLastCalledWith('signal:#1')

      setCount(1)
      expect(onValueUpdate).toBeCalledTimes(1)

      setCount2(1)
      expect(onValueUpdate).toBeCalledTimes(2)
      expect(onValueUpdate).toHaveBeenLastCalledWith('signal:#2')

      dispose()
    })
  })
})
