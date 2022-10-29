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
import {
  NodeID,
  NodeType,
  EncodedValue,
  EncodedValueOf,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  ValueType,
  ValueNodeId,
} from '@solid-devtools/shared/graph'
import clsx from 'clsx'
import { Highlight, Icon } from '@/ui'
import { Inspector } from '.'
import * as styles from './SignalNode.css'
import { createHover } from '@solid-devtools/shared/primitives'
import { Listen } from '@solid-primitives/event-bus'
import { createPingedSignal } from '@/utils'

type ValueComponent<K extends ValueType> = Component<Omit<EncodedValueOf<K, boolean>, 'type'>>

const StringValuePreview: ValueComponent<ValueType.String> = props => (
  <span class={styles.ValueString}>"{props.value}"</span>
)

const NumberValuePreview: ValueComponent<ValueType.Number> = props => {
  const value = () => {
    switch (props.value) {
      case NAN:
        return 'NaN'
      case INFINITY:
        return 'Infinity'
      case NEGATIVE_INFINITY:
        return '-Infinity'
      default:
        return props.value
    }
  }
  return <span class={styles.ValueNumber}>{value()}</span>
}

const BooleanValuePreview: ValueComponent<ValueType.Boolean> = props => (
  <input
    type="checkbox"
    class={styles.ValueBoolean}
    onClick={e => e.preventDefault()}
    checked={props.value}
  ></input>
)

const FunctionValuePreview: ValueComponent<ValueType.Function> = props => (
  <span class={styles.ValueFunction}>{props.value ? `f ${props.value}()` : 'function()'}</span>
)
const GetterValuePreview: ValueComponent<ValueType.Getter> = props => (
  <span class={styles.ValueFunction}>get {props.value}()</span>
)

const NullableValuePreview: Component<{ value: null | undefined }> = props => (
  <span class={styles.Nullable}>{props.value === null ? 'null' : 'undefined'}</span>
)

const SymbolValuePreview: ValueComponent<ValueType.Symbol> = props => (
  <span class={styles.baseValue}>Symbol({props.value})</span>
)

const InstanceValuePreview: ValueComponent<ValueType.Instance> = props => (
  <span class={styles.baseValue}>{props.value}</span>
)

export type ToggleElementHover = (elementId: NodeID, hovered?: boolean) => void

const ElementHoverContext = createContext<ToggleElementHover>()

const ElementValuePreview: ValueComponent<ValueType.Element> = props => {
  const onHover = useContext(ElementHoverContext)

  const handleHover =
    onHover &&
    ((hovered: boolean) => {
      if (props.value.id === undefined) return
      onHover(props.value.id, hovered)
    })

  const hoverProps = handleHover && createHover(handleHover)

  return (
    <span class={styles.ValueElement.container} {...hoverProps}>
      <div class={styles.ValueElement.highlight} />
      {props.value.name}
    </span>
  )
}

const ObjectValuePreview: Component<
  EncodedValueOf<ValueType.Object | ValueType.Array, boolean> & { extended?: boolean }
> = props => (
  <Switch>
    <Match when={!props.children || props.value === 0 || props.extended === false}>
      <Show
        when={props.value > 0}
        fallback={
          <span class={styles.Nullable}>
            Empty {props.type === ValueType.Array ? 'Array' : 'Object'}
          </span>
        }
      >
        <span class={styles.baseValue}>
          {props.type === ValueType.Array ? 'Array' : 'Object'} [{props.value}]
        </span>
      </Show>
    </Match>
    <Match when={props.children}>
      <CollapsableObjectPreview value={props.children!} />
    </Match>
  </Switch>
)

const CollapsableObjectPreview: Component<{
  value:
    | EncodedValueOf<ValueType.Object, true>['children']
    | EncodedValueOf<ValueType.Array, true>['children']
}> = props => {
  return (
    <ul class={styles.collapsable.list}>
      <Entries of={props.value}>
        {(key, value) => (
          <Show
            when={value().type === ValueType.Object || value().type === ValueType.Array}
            fallback={
              <ValueRow>
                <ValueName>{key}</ValueName>
                <ValuePreview value={value()} />
              </ValueRow>
            }
          >
            {untrack(() => {
              const [extended, setExtended] = createSignal(false)
              return (
                <ValueRow
                  selected={false}
                  onClick={e => {
                    e.stopPropagation()
                    setExtended(p => !p)
                  }}
                >
                  <ValueName>{key}</ValueName>
                  <ObjectValuePreview
                    {...(value() as
                      | EncodedValueOf<ValueType.Object, true>
                      | EncodedValueOf<ValueType.Array, true>)}
                    extended={extended()}
                  />
                </ValueRow>
              )
            })}
          </Show>
        )}
      </Entries>
    </ul>
  )
}

const ValuePreview: Component<{ value: EncodedValue<boolean> }> = props =>
  createMemo(() => {
    switch (props.value.type) {
      case ValueType.String:
        return <StringValuePreview value={props.value.value} />
      case ValueType.Number:
        return <NumberValuePreview value={props.value.value} />
      case ValueType.Boolean:
        return <BooleanValuePreview value={props.value.value} />
      case ValueType.Object:
      case ValueType.Array:
        return <ObjectValuePreview {...props.value} />
      case ValueType.Function:
        return <FunctionValuePreview value={props.value.value} />
      case ValueType.Getter:
        return <GetterValuePreview value={props.value.value} />
      case ValueType.Null:
        return <NullableValuePreview value={null} />
      case ValueType.Undefined:
        return <NullableValuePreview value={undefined} />
      case ValueType.Symbol:
        return <SymbolValuePreview value={props.value.value} />
      case ValueType.Instance:
        return <InstanceValuePreview value={props.value.value} />
      case ValueType.Element:
        return <ElementValuePreview value={props.value.value} />
      case ValueType.Store:
        return <ValuePreview value={props.value.value.value} />
      // default:
      //   return <span>{ValueType[props.value.type]}</span>
    }
  })

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
  value: EncodedValue<boolean>
  name: JSX.Element
  nameIsTitle?: boolean
  isMemo?: boolean
  selected: boolean
  listenToUpdate?: Listen
  onClick?: VoidFunction
  onElementHover?: ToggleElementHover
}> = props => {
  const isUpdated = props.listenToUpdate && createPingedSignal(props.listenToUpdate)

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
      <ElementHoverContext.Provider value={props.onElementHover}>
        <ValuePreview value={props.value} />
      </ElementHoverContext.Provider>
    </ValueRow>
  )
}

type SignalControlls = {
  toggleSignalSelection(id: NodeID): void
  toggleHoveredElement: ToggleElementHover
  listenToValueUpdates: Listen<ValueNodeId>
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
  listenToValueUpdates,
}) => {
  const { type, id, name } = signal
  const valueNodeId: ValueNodeId = `signal:${id}`

  return (
    <ValueNode
      name={name}
      isMemo={type === NodeType.Memo}
      value={signal.value}
      selected={signal.selected}
      listenToUpdate={listener => listenToValueUpdates(id => id === valueNodeId && listener())}
      onClick={() => toggleSignalSelection(id)}
      onElementHover={toggleHoveredElement}
    />
  )
}
