import {
  Component,
  ComponentProps,
  createContext,
  createMemo,
  createSignal,
  For,
  JSX,
  Match,
  ParentComponent,
  Show,
  splitProps,
  Switch,
  untrack,
  useContext,
} from 'solid-js'
import { Entries } from '@solid-primitives/keyed'
import clsx from 'clsx'
import {
  NodeID,
  NodeType,
  EncodedValue,
  EncodedValueOf,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  ValueType,
} from '@solid-devtools/debugger/types'
import { createHover, createPingedSignal } from '@solid-devtools/shared/primitives'
import { Highlight, Icon } from '@/ui'
import { Inspector } from '.'
import * as styles from './SignalNode.css'

export type ToggleElementHover = (elementId: NodeID, hovered?: boolean) => void

const ValueContext = createContext<{ onElementHover?: ToggleElementHover; underStore: boolean }>()

type ValueComponent<K extends ValueType> = Component<{
  value: EncodedValueOf<K, boolean>
  extended?: boolean
}>

const StringValuePreview: ValueComponent<ValueType.String> = props => (
  <span class={styles.ValueString}>"{props.value.value}"</span>
)

const NumberValuePreview: ValueComponent<ValueType.Number> = props => {
  const value = () => {
    switch (props.value.value) {
      case NAN:
        return 'NaN'
      case INFINITY:
        return 'Infinity'
      case NEGATIVE_INFINITY:
        return '-Infinity'
      default:
        return props.value.value
    }
  }
  return <span class={styles.ValueNumber}>{value()}</span>
}

const BooleanValuePreview: ValueComponent<ValueType.Boolean> = props => (
  <input
    type="checkbox"
    class={styles.ValueBoolean}
    onClick={e => e.preventDefault()}
    checked={props.value.value}
  ></input>
)

const FunctionValuePreview: ValueComponent<ValueType.Function> = props => (
  <span class={styles.ValueFunction}>
    {props.value.value ? `f ${props.value.value}()` : 'function()'}
  </span>
)
const GetterValuePreview: ValueComponent<ValueType.Getter> = props => (
  <span class={styles.ValueFunction}>get {props.value.value}()</span>
)

const NullableValuePreview: ValueComponent<ValueType.Null | ValueType.Undefined> = props => (
  <span class={styles.Nullable}>{props.value.type === ValueType.Null ? 'null' : 'undefined'}</span>
)

const SymbolValuePreview: ValueComponent<ValueType.Symbol> = props => (
  <span class={styles.baseValue}>Symbol({props.value.value})</span>
)

const InstanceValuePreview: ValueComponent<ValueType.Instance> = props => (
  <span class={styles.baseValue}>{props.value.value}</span>
)

const ElementValuePreview: ValueComponent<ValueType.Element> = props => {
  const { onElementHover: onHover } = useContext(ValueContext) ?? {}

  const handleHover =
    onHover &&
    ((hovered: boolean) => {
      if (props.value.value.id === undefined) return
      onHover(props.value.value.id, hovered)
    })

  const hoverProps = handleHover && createHover(handleHover)

  return (
    <span class={styles.ValueElement.container} {...hoverProps}>
      <div class={styles.ValueElement.highlight} />
      {props.value.value.name}
    </span>
  )
}

const getObjectLength = (
  obj: EncodedValueOf<ValueType.Array | ValueType.Object, boolean>,
): number =>
  obj.children
    ? Array.isArray(obj.children)
      ? obj.children.length
      : Object.keys(obj.children).length
    : obj.value

const ObjectValuePreview: ValueComponent<ValueType.Array | ValueType.Object> = props => {
  const length = createMemo(() => getObjectLength(props.value))
  return (
    <Switch fallback={<CollapsableObjectPreview value={props.value.children!} />}>
      <Match when={length() === 0}>
        <span class={styles.Nullable}>
          Empty {props.value.type === ValueType.Array ? 'Array' : 'Object'}
        </span>
      </Match>
      <Match when={!props.value.children || !props.extended}>
        <span class={styles.baseValue}>
          {props.value.type === ValueType.Array ? 'Array' : 'Object'} [{length()}]
        </span>
      </Match>
    </Switch>
  )
}

const CollapsableObjectPreview: Component<{
  value: EncodedValueOf<ValueType.Object | ValueType.Array, true>['children']
}> = props => (
  <ul class={styles.collapsable.list}>
    <Entries of={props.value}>
      {(key, value) => (
        <>
          <Show
            when={[ValueType.Object, ValueType.Array, ValueType.Store].includes(value().type)}
            children={untrack(() => {
              const [extended, setExtended] = createSignal(false)
              return (
                <ValueNode
                  name={key}
                  value={value()}
                  onClick={e => {
                    e.stopPropagation()
                    setExtended(p => !p)
                  }}
                  selected={extended()}
                />
              )
            })}
            fallback={<ValueNode name={key} value={value()} />}
          />
        </>
      )}
    </Entries>
  </ul>
)

const ValuePreview: Component<{ value: EncodedValue<boolean>; extended?: boolean }> = props => {
  const value = createMemo(() => props.value)
  return createMemo(() => {
    const valueRef = value()
    switch (valueRef.type) {
      case ValueType.String:
        return <StringValuePreview value={valueRef} />
      case ValueType.Number:
        return <NumberValuePreview value={valueRef} />
      case ValueType.Boolean:
        return <BooleanValuePreview value={valueRef} />
      case ValueType.Object:
      case ValueType.Array:
        return <ObjectValuePreview value={valueRef} extended={props.extended} />
      case ValueType.Function:
        return <FunctionValuePreview value={valueRef} />
      case ValueType.Getter:
        return <GetterValuePreview value={valueRef} />
      case ValueType.Null:
      case ValueType.Undefined:
        return <NullableValuePreview value={valueRef} />
      case ValueType.Symbol:
        return <SymbolValuePreview value={valueRef} />
      case ValueType.Instance:
        return <InstanceValuePreview value={valueRef} />
      case ValueType.Element:
        return <ElementValuePreview value={valueRef} />
      case ValueType.Store:
        return <ValuePreview value={valueRef.value.value} extended={props.extended} />
      // default:
      //   return <span>{ValueType[props.value.type]}</span>
    }
  })
}

const ValueName: ParentComponent<{ isTitle?: boolean; isMemo?: boolean }> = props => {
  return (
    <div class={styles.ValueName.container[props.isTitle !== true ? 'base' : 'title']}>
      {props.isTitle !== true && props.isMemo && <Icon.Memo class={styles.ValueName.icon} />}
      <div class={styles.ValueName.name[props.isTitle !== true ? 'base' : 'title']}>
        {props.children}
      </div>
    </div>
  )
}

const ValueRow: ParentComponent<{ selected?: boolean } & ComponentProps<'li'>> = props => {
  const [, attrs] = splitProps(props, ['selected', 'children', 'class'])

  // early return if this value in not selectable (if undefined, this shouldn't be assigned again)
  if (props.selected === undefined) {
    return (
      <li {...attrs} class={clsx(styles.ValueRow.container, props.class)}>
        {props.children}
      </li>
    )
  }

  const [isHovered, setIsHovered] = createSignal(false)
  return (
    <li
      {...attrs}
      class={clsx(
        styles.ValueRow.container,
        props.selected && styles.ValueRow.containerFocused,
        isHovered() && styles.ValueRow.containerHovered,
        props.class,
      )}
      on:pointerover={e => {
        e.stopPropagation()
        setIsHovered(true)
      }}
      on:pointerout={e => {
        e.stopPropagation()
        setIsHovered(false)
      }}
    >
      <div class={styles.ValueRow.highlight} />
      {props.children}
    </li>
  )
}

export const ValueNode: Component<{
  value: EncodedValue
  name: JSX.Element
  nameIsTitle?: boolean
  isMemo?: boolean
  selected?: boolean
  /** top-level, or inside a store (the value can change) */
  updateable?: boolean
  onClick?: JSX.EventHandlerUnion<HTMLLIElement, MouseEvent>
  onElementHover?: ToggleElementHover
}> = props => {
  const ctx = useContext(ValueContext)
  const isStore = () => props.value.type === ValueType.Store
  const isUpdated =
    props.updateable || ctx?.underStore ? createPingedSignal(() => props.value) : undefined
  const ValueContent = () => <ValuePreview value={props.value} extended={props.selected} />

  return (
    <ValueRow selected={props.selected} onClick={props.onClick}>
      <ValueName isMemo={props.isMemo} isTitle={props.nameIsTitle}>
        <Highlight
          strong={isUpdated && isUpdated()}
          light={false}
          signal
          class={styles.ValueName.highlight}
        >
          {props.name}
        </Highlight>
      </ValueName>
      {
        // provide context if one isn't already provided or if the value is a store
        // (so that the ctx.underStore could be overwritten)
        ctx && !isStore() ? (
          <ValueContent />
        ) : (
          <ValueContext.Provider
            value={{
              onElementHover: props.onElementHover || ctx?.onElementHover,
              get underStore() {
                return isStore()
              },
            }}
          >
            <ValueContent />
          </ValueContext.Provider>
        )
      }
    </ValueRow>
  )
}

type SignalControlls = {
  toggleSignalSelection(id: NodeID): void
  toggleHoveredElement: ToggleElementHover
}

export const Signals: Component<{ each: Inspector.Signal[] } & SignalControlls> = props => {
  const sorted = createMemo(() =>
    props.each.slice().sort((a, b) => {
      if (a.type === b.type) return a.id > b.id ? 1 : -1
      return a.type === NodeType.Memo ? 1 : -1
    }),
  )
  return (
    <Show when={props.each.length}>
      <ul class={styles.Signals.container}>
        <For each={sorted()}>{signal => <SignalNode signal={signal} {...props} />}</For>
      </ul>
    </Show>
  )
}

export const SignalNode: Component<{ signal: Inspector.Signal } & SignalControlls> = ({
  signal,
  toggleSignalSelection,
  toggleHoveredElement,
}) => {
  const { type, id, name } = signal

  return (
    <ValueNode
      name={name}
      isMemo={type === NodeType.Memo}
      value={signal.value}
      selected={signal.selected}
      onClick={() => toggleSignalSelection(id)}
      onElementHover={toggleHoveredElement}
      updateable
    />
  )
}
