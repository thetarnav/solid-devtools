import { CollapseToggle, Highlight } from '@/ui'
import { NodeID, ValueType } from '@solid-devtools/debugger/types'
import { createHover, createPingedSignal, defer } from '@solid-devtools/shared/primitives'
import { Entries } from '@solid-primitives/keyed'
import { assignInlineVars } from '@vanilla-extract/dynamic'
import clsx from 'clsx'
import {
  Component,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  Show,
  untrack,
  useContext,
} from 'solid-js'
import { DecodedValue, isValueNested, ObjectValueData } from './decode'
import * as styles from './ValueNode.css'

type ToggleElementHover = (elementId: NodeID, hovered?: boolean) => void

const ValueContext = createContext<{ onElementHover?: ToggleElementHover; underStore: boolean }>()

const CollapsableObjectPreview: Component<{
  value: Record<string, DecodedValue>
}> = props => (
  <ul class={styles.collapsable.list}>
    <Entries of={props.value}>
      {(key, _value) => {
        const value = createMemo(_value)
        return (
          <Show
            when={isValueNested(value())}
            children={untrack(() => {
              const [extended, setExtended] = createSignal(false)
              return (
                <ValueNode
                  name={key}
                  value={value()}
                  onClick={() => setExtended(p => !p)}
                  extended={extended()}
                />
              )
            })}
            fallback={<ValueNode name={key} value={value()} />}
          />
        )
      }}
    </Entries>
  </ul>
)

const getObjectValueName = (type: ValueType.Array | ValueType.Object) =>
  type === ValueType.Array ? 'Array' : 'Object'

const ObjectValuePreview: Component<{
  type: ValueType.Array | ValueType.Object
  data: ObjectValueData
  extended?: boolean
}> = props => {
  return (
    <Show
      when={props.data.value && props.data.length && props.extended}
      children={<CollapsableObjectPreview value={props.data.value!} />}
      fallback={
        <Show
          when={props.data.length}
          children={
            <span class={styles.baseValue}>
              {getObjectValueName(props.type)} [{props.data.length}]
            </span>
          }
          fallback={<span class={styles.Nullable}>Empty {getObjectValueName(props.type)}</span>}
        />
      }
    />
  )
}

const ValuePreview: Component<{ value: DecodedValue; extended?: boolean }> = props => {
  return createMemo(() => {
    const value = props.value
    switch (value.type) {
      case ValueType.String:
        return <span class={styles.ValueString}>"{value.value}"</span>
      case ValueType.Number:
        return <span class={styles.ValueNumber}>{value.value}</span>
      case ValueType.Boolean:
        return (
          <input
            type="checkbox"
            class={styles.ValueBoolean}
            onClick={e => e.preventDefault()}
            checked={value.value}
          ></input>
        )
      case ValueType.Null:
        return <span class={styles.Nullable}>{value.value === null ? 'null' : 'undefined'}</span>
      case ValueType.Unknown:
        return <span class={styles.Nullable}>unknown</span>
      case ValueType.Function:
        return (
          <span class={styles.ValueFunction}>
            {value.name ? `f ${value.name}()` : 'function()'}
          </span>
        )
      case ValueType.Getter:
        return <span class={styles.ValueFunction}>get {value.name}()</span>
      case ValueType.Symbol:
        return <span class={styles.baseValue}>Symbol({value.name})</span>
      case ValueType.Instance:
        return <span class={styles.baseValue}>{value.name}</span>
      case ValueType.Element: {
        const { onElementHover: onHover } = useContext(ValueContext)!

        const hoverProps = onHover && createHover(hovered => onHover(value.id, hovered))

        return (
          <span class={styles.ValueElement.container} {...hoverProps}>
            <div class={styles.ValueElement.highlight} />
            {value.name}
          </span>
        )
      }
      case ValueType.Store:
        return <ObjectValuePreview type={value.valueType} data={value} extended={props.extended} />
      default:
        return <ObjectValuePreview type={value.type} data={value} extended={props.extended} />
    }
  })
}

function createNestedHover() {
  const [isHovered, setIsHovered] = createSignal(false)
  return {
    isHovered,
    hoverProps: {
      'on:pointerover': (e: PointerEvent) => {
        e.stopPropagation()
        setIsHovered(true)
      },
      'on:pointerout': (e: PointerEvent) => {
        e.stopPropagation()
        setIsHovered(false)
      },
    },
  }
}

export const ValueNode: Component<{
  value: DecodedValue
  name: JSX.Element
  extended?: boolean
  /** top-level, or inside a store (the value can change) */
  isSignal?: boolean
  isStale?: boolean
  onClick?: VoidFunction
  onElementHover?: ToggleElementHover
  class?: string
}> = props => {
  const ctx = useContext(ValueContext)

  const isUpdated =
    (props.isSignal || ctx?.underStore) &&
    (() => {
      const [_isUpdated, pingUpdated] = createPingedSignal()
      createEffect(defer(() => props.value, pingUpdated))
      return _isUpdated
    })()

  const handleSelect = () => {
    if (props.onClick && isValueNested(props.value)) props.onClick()
  }

  const ValueContent = () => <ValuePreview value={props.value} extended={props.extended} />

  const content = createMemo(() => (
    <>
      <div class={styles.name.container} onClick={handleSelect}>
        <div class={styles.name.name} data-signal={props.isSignal || ctx?.underStore}>
          <Highlight highlight={isUpdated && isUpdated()} isSignal class={styles.name.highlight}>
            {props.name}
          </Highlight>
        </div>
      </div>
      {/* provide context if one isn't already provided or if the value is a store
      (so that the ctx.underStore could be overwritten) */}
      <Show
        when={ctx && props.value.type !== ValueType.Store}
        children={<ValueContent />}
        fallback={
          <ValueContext.Provider
            value={{
              onElementHover: props.onElementHover || ctx?.onElementHover,
              get underStore() {
                return props.value.type === ValueType.Store
              },
            }}
          >
            <ValueContent />
          </ValueContext.Provider>
        }
      />
    </>
  ))

  return (
    <Show
      when={isValueNested(props.value)}
      fallback={
        <li class={styles.row.container.base} data-stale={props.isStale}>
          {content()}
        </li>
      }
    >
      {untrack(() => {
        const { isHovered, hoverProps } = createNestedHover()
        return (
          <li
            class={clsx(styles.row.container.collapsable, props.class)}
            data-hovered={isHovered()}
            data-stale={props.isStale}
            style={assignInlineVars({
              [styles.row.collapseOpacity]: isHovered() || props.extended ? '1' : '0',
            })}
            {...hoverProps}
          >
            <div class={styles.row.highlight} />
            <div class={styles.row.toggle.container}>
              <CollapseToggle
                onToggle={handleSelect}
                class={styles.row.toggle.button}
                isCollapsed={!props.extended}
                defaultCollapsed
              />
            </div>
            {content()}
          </li>
        )
      })}
    </Show>
  )
}
