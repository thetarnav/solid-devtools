import { describe, beforeEach, vi, it, expect } from 'vitest'
import {
  createComputed,
  createMemo,
  createRenderEffect,
  createRoot,
  createSignal,
  JSX,
} from 'solid-js'
import { Mapped, NodeType, Solid, ValueType } from '../../types'
import { getOwner } from '../../main/utils'
import { collectOwnerDetails } from '../inspector'

let mockLAST_ID = 0
beforeEach(() => {
  mockLAST_ID = 0
})
vi.mock('../../main/id', () => ({ getNewSdtId: () => mockLAST_ID++ + '' }))

describe('collectOwnerDetails', () => {
  it('collects focused owner details', () => {
    createRoot(dispose => {
      const [s] = createSignal(0, { name: 'source' })

      let owner!: Solid.Owner
      const div = document.createElement('div')

      createComputed(
        () => {
          const focused = createMemo(
            () => {
              owner = getOwner()!
              s()
              createSignal(div, { name: 'element' })
              const memo = createMemo(() => 0, undefined, { name: 'memo' })
              createRenderEffect(memo, undefined, { name: 'render' })
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

      const { details, valueMap, nodeIdMap } = collectOwnerDetails(owner, {
        onSignalUpdate: () => {},
        onValueUpdate: () => {},
      })

      expect(details).toEqual({
        id: '0',
        name: 'focused',
        type: NodeType.Memo,
        value: [[ValueType.String, 'value']],
        signals: [
          {
            type: NodeType.Signal,
            id: '1',
            name: 'element',
            value: [[ValueType.Element, '2:div']],
          },
          {
            type: NodeType.Memo,
            id: '3',
            name: 'memo',
            value: [[ValueType.Number, 0]],
          },
        ],
      } satisfies Mapped.OwnerDetails)

      expect(valueMap.get('signal:1')).toBeTruthy()
      expect(valueMap.get('signal:3')).toBeTruthy()

      expect(nodeIdMap.get('2')).toBe(div)

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

      const { details, nodeIdMap } = collectOwnerDetails(owner, {
        onSignalUpdate: () => {},
        onValueUpdate: () => {},
      })

      dispose()

      expect(details).toEqual({
        id: '0',
        name: 'TestComponent',
        type: NodeType.Component,
        signals: [],
        value: [[ValueType.Element, '1:div']],
        props: {
          proxy: false,
          record: {
            count: [[ValueType.Number, 123]],
            children: [[ValueType.Getter, 'children']],
            nested: [[ValueType.Object, 2]],
          },
        },
      } satisfies Mapped.OwnerDetails)

      expect(nodeIdMap.get('1')).toBeInstanceOf(HTMLDivElement)
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

      const { details, nodeIdMap } = collectOwnerDetails(owner, {
        onSignalUpdate: () => {},
        onValueUpdate: () => {},
      })

      expect(details).toEqual({
        id: '0',
        name: 'Button',
        type: NodeType.Component,
        signals: [],
        value: [[ValueType.Element, '1:button']],
        props: {
          proxy: true,
          record: {
            onClick: [[ValueType.Getter, 'onClick']],
            role: [[ValueType.Getter, 'role']],
          },
        },
      } satisfies Mapped.OwnerDetails)

      expect(nodeIdMap.get('1')).toBeInstanceOf(HTMLButtonElement)

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
        onSignalUpdate: () => {},
        onValueUpdate: onValueUpdate,
      })

      expect(onValueUpdate).not.toBeCalled()

      setCount(1)
      expect(onValueUpdate).toBeCalledTimes(1)
      expect(onValueUpdate).toBeCalledWith(1, 0)

      setCount(2)
      expect(onValueUpdate).toBeCalledTimes(2)
      expect(onValueUpdate).toBeCalledWith(2, 1)

      setCount(2)
      expect(onValueUpdate).toBeCalledTimes(2)

      dispose()
    })
  })

  it('listens to signal updates', () => {
    createRoot(dispose => {
      let owner = getOwner()!
      const [, setCount] = createSignal(0) // id: "0"
      const [, setCount2] = createSignal(0) // id: "1"

      const onSignalUpdate = vi.fn()
      collectOwnerDetails(owner, {
        onSignalUpdate: onSignalUpdate,
        onValueUpdate: () => {},
      })

      expect(onSignalUpdate).not.toBeCalled()

      setCount(1)
      expect(onSignalUpdate).toBeCalledTimes(1)
      expect(onSignalUpdate).toBeCalledWith('1', 1)

      setCount(1)
      expect(onSignalUpdate).toBeCalledTimes(1)

      setCount2(1)
      expect(onSignalUpdate).toBeCalledTimes(2)
      expect(onSignalUpdate).toBeCalledWith('2', 1)

      dispose()
    })
  })
})
