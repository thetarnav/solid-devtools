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
import {
  DecodedValue,
  ElementNode,
  FunctionNode,
  GetterNode,
  InstanceNode,
  ObjectPreviewNode,
  StoreNode,
  UnknownNode,
} from './decode'
import * as styles from './ValueNode.css'

type ToggleElementHover = (elementId: NodeID, hovered?: boolean) => void

const ValueContext = createContext<{ onElementHover?: ToggleElementHover; underStore: boolean }>()

const getIsCollapsable = (value: DecodedValue): boolean =>
  !!value &&
  typeof value === 'object' &&
  (Array.isArray(value) ||
    Object.getPrototypeOf(value) === Object.prototype ||
    (value instanceof ObjectPreviewNode && value.length > 0) ||
    (value instanceof StoreNode && getIsCollapsable(value.value)))

const getObjectValueLength = (value: DecodedValue<ValueType.Array | ValueType.Object>): number =>
  value instanceof ObjectPreviewNode || Array.isArray(value)
    ? value.length
    : Object.keys(value).length

const CollapsableObjectPreview: Component<{
  value: Exclude<DecodedValue<ValueType.Array | ValueType.Object>, ObjectPreviewNode>
}> = props => (
  <ul class={styles.collapsable.list}>
    <Entries of={props.value}>
      {(key, value) => (
        <Show
          when={getIsCollapsable(value())}
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
      )}
    </Entries>
  </ul>
)

const ObjectValuePreview: Component<{
  value: DecodedValue<ValueType.Array | ValueType.Object>
  extended?: boolean
}> = props => {
  return (
    <Show
      when={props.value instanceof ObjectPreviewNode || !props.extended}
      fallback={
        <CollapsableObjectPreview
          value={props.value as Exclude<typeof props.value, ObjectPreviewNode>}
        />
      }
    >
      {() => {
        const type = () =>
          props.value instanceof ObjectPreviewNode
            ? props.value.type
            : Array.isArray(props.value)
            ? ValueType.Array
            : ValueType.Object
        const name = () => (type() === ValueType.Array ? 'Array' : 'Object')

        return (
          <Show
            when={getObjectValueLength(props.value)}
            fallback={<span class={styles.Nullable}>Empty {name()}</span>}
          >
            <span class={styles.baseValue}>
              {name()} [{getObjectValueLength(props.value)}]
            </span>
          </Show>
        )
      }}
    </Show>
  )
}

const ValuePreview: Component<{ value: DecodedValue; extended?: boolean }> = props => {
  return createMemo(() => {
    const value = props.value
    if (typeof value === 'string') {
      return <span class={styles.ValueString}>"{value}"</span>
    }
    if (typeof value === 'number') {
      return <span class={styles.ValueNumber}>{value}</span>
    }
    if (typeof value === 'boolean') {
      return (
        <input
          type="checkbox"
          class={styles.ValueBoolean}
          onClick={e => e.preventDefault()}
          checked={value}
        ></input>
      )
    }
    if (!value) {
      return <span class={styles.Nullable}>{value === null ? 'null' : 'undefined'}</span>
    }
    if (value instanceof FunctionNode) {
      return (
        <span class={styles.ValueFunction}>{value.name ? `f ${value.name}()` : 'function()'}</span>
      )
    }
    if (value instanceof GetterNode) {
      return <span class={styles.ValueFunction}>get {value.name}()</span>
    }
    if (typeof value === 'symbol') {
      return <span class={styles.baseValue}>Symbol({value.description})</span>
    }
    if (value instanceof InstanceNode) {
      return <span class={styles.baseValue}>{value.name}</span>
    }
    if (value instanceof ElementNode) {
      const { onElementHover: onHover } = useContext(ValueContext)!

      const hoverProps = onHover && createHover(hovered => onHover(value.id, hovered))

      return (
        <span class={styles.ValueElement.container} {...hoverProps}>
          <div class={styles.ValueElement.highlight} />
          {value.name}
        </span>
      )
    }
    if (value instanceof StoreNode) {
      return <ValuePreview value={value.value} extended={props.extended} />
    }
    if (value instanceof UnknownNode) {
      return <span class={styles.Nullable}>unknown</span>
    }
    return <ObjectValuePreview value={value} extended={props.extended} />
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
  onClick?: () => boolean
  onElementHover?: ToggleElementHover
  class?: string
}> = props => {
  const ctx = useContext(ValueContext)
  const value = () => props.value

  // this is to prevent the value from being considered updated when the collapse is toggled
  let toggledCollapse = false

  const isUpdated =
    (props.isSignal || ctx?.underStore) &&
    (() => {
      const [_isUpdated, pingUpdated] = createPingedSignal()
      createEffect(
        defer(value, () => (toggledCollapse ? (toggledCollapse = false) : pingUpdated())),
      )
      return _isUpdated
    })()

  const handleSelect = () => {
    if (props.onClick && getIsCollapsable(value())) {
      toggledCollapse = props.onClick()
    }
  }

  const ValueContent = () => <ValuePreview value={value()} extended={props.extended} />

  const content = createMemo(() => (
    <>
      <div class={styles.name.container} onClick={handleSelect}>
        <div class={styles.name.name} data-signal={props.isSignal || ctx?.underStore}>
          <Highlight highlight={isUpdated && isUpdated()} isSignal class={styles.name.highlight}>
            {props.name}
          </Highlight>
        </div>
      </div>
      {
        // provide context if one isn't already provided or if the value is a store
        // (so that the ctx.underStore could be overwritten)
        ctx && !(value() instanceof StoreNode) ? (
          <ValueContent />
        ) : (
          <ValueContext.Provider
            value={{
              onElementHover: props.onElementHover || ctx?.onElementHover,
              get underStore() {
                return value() instanceof StoreNode
              },
            }}
          >
            <ValueContent />
          </ValueContext.Provider>
        )
      }
    </>
  ))

  return (
    <Show
      when={getIsCollapsable(value())}
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
