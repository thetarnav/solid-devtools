import {
  Accessor,
  Component,
  createContext,
  createMemo,
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  ParentComponent,
  Show,
  splitProps,
  Switch,
  untrack,
  useContext,
} from "solid-js"
import { Entries } from "@solid-primitives/keyed"
import { Graph, NodeID, NodeType } from "@solid-devtools/shared/graph"
import {
  EncodedValue,
  EncodedValueOf,
  INFINITY,
  NAN,
  NEGATIVE_INFINITY,
  ValueType,
} from "@solid-devtools/shared/serialize"
import clsx from "clsx"
import * as Icon from "~/icons"
import { color } from "~/theme"
import { Highlight } from "../highlight/Highlight"
import * as styles from "./SignalNode.css"

type ValueComponent<K extends ValueType> = Component<Omit<EncodedValueOf<K, boolean>, "type">>

const StringValuePreview: ValueComponent<ValueType.String> = props => (
  <span class={styles.ValueString}>"{props.value}"</span>
)

const NumberValuePreview: ValueComponent<ValueType.Number> = props => {
  const value = () => {
    switch (props.value) {
      case NAN:
        return "NaN"
      case INFINITY:
        return "Infinity"
      case NEGATIVE_INFINITY:
        return "-Infinity"
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
  <span class={styles.ValueFunction}>{props.value ? `f ${props.value}()` : "function()"}</span>
)
const GetterValuePreview: ValueComponent<ValueType.Getter> = props => (
  <span class={styles.ValueFunction}>get {props.value}()</span>
)

const NullableValuePreview: Component<{ value: null | undefined }> = props => (
  <span class={styles.Nullable}>{props.value === null ? "null" : "undefined"}</span>
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

  handleHover && onCleanup(() => handleHover(false))

  return (
    <span
      class={styles.ValueElement.container}
      {...(handleHover && {
        onMouseEnter: () => handleHover(true),
        onMouseLeave: () => handleHover(false),
      })}
    >
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
            Empty {props.type === ValueType.Array ? "Array" : "Object"}
          </span>
        }
      >
        <span class={styles.baseValue}>
          {props.type === ValueType.Array ? "Array" : "Object"} [{props.value}]
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
    | EncodedValueOf<ValueType.Object, true>["children"]
    | EncodedValueOf<ValueType.Array, true>["children"]
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
      // default:
      //   return <span>{ValueType[props.value.type]}</span>
    }
  })

const ValueName: ParentComponent<{ type?: NodeType.Signal | NodeType.Memo | null }> = props => {
  const IconComponent = createMemo(() => {
    switch (props.type) {
      case NodeType.Signal:
        return <div class={styles.ValueName.signalDot} />
      case NodeType.Memo:
        return <Icon.Memo bgColor={color.amber[400]} class={styles.ValueName.icon} />
      default:
        return null
    }
  })

  return (
    <div class={styles.ValueName.container}>
      <div class={styles.ValueName.iconWrapper}>{<IconComponent />}</div>
      <div class={styles.ValueName.name}>{props.children}</div>
    </div>
  )
}

const ValueRow: ParentComponent<{ selected?: boolean } & JSX.IntrinsicElements["li"]> = props => {
  const [, attrs] = splitProps(props, ["selected", "children", "class"])

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
      onPointerOver={e => {
        e.stopPropagation()
        setIsHovered(true)
      }}
      onPointerOut={e => {
        e.stopPropagation()
        setIsHovered(false)
      }}
    >
      <div class={styles.ValueRow.highlight} />
      {props.children}
    </li>
  )
}

export const Signals: Component<{ each: Graph.Signal[] }> = props => {
  const sorted = createMemo(() =>
    props.each.slice().sort((a, b) => {
      if (a.type === b.type) return a.id > b.id ? 1 : -1
      return a.type === NodeType.Memo ? 1 : -1
    }),
  )
  return (
    <Show when={props.each.length}>
      <ul class={styles.Signals.container}>
        <For each={sorted()}>{signal => <SignalNode signal={signal} />}</For>
      </ul>
    </Show>
  )
}

export const ValueNode: Component<{
  value: EncodedValue<boolean>
  name: string
  type?: NodeType.Memo | NodeType.Signal | null
  selected: boolean
  updated?: boolean
  onClick?: VoidFunction
  onElementHover?: ToggleElementHover
}> = props => {
  return (
    <ValueRow selected={props.selected} onClick={props.onClick}>
      <ValueName type={props.type}>
        <Highlight strong={props.updated} light={false} signal class={styles.ValueName.highlight}>
          {props.name}
        </Highlight>
      </ValueName>
      <ElementHoverContext.Provider value={props.onElementHover}>
        <ValuePreview value={props.value} />
      </ElementHoverContext.Provider>
    </ValueRow>
  )
}

export type SignalContextState = {
  useUpdatedSelector: (id: NodeID) => Accessor<boolean>
  toggleSignalFocus: (signal: NodeID, focused?: boolean) => void
  toggleHoveredElement: ToggleElementHover
}

const SignalContext = createContext<SignalContextState>()

export const SignalContextProvider = SignalContext.Provider

const useSignalContext = (): SignalContextState => {
  const ctx = useContext(SignalContext)
  if (!ctx) throw "SignalContext wasn't provided."
  return ctx
}

export const SignalNode: Component<{ signal: Graph.Signal }> = ({ signal }) => {
  const { type, id, name } = signal
  const { useUpdatedSelector, toggleSignalFocus, toggleHoveredElement } = useSignalContext()

  const isUpdated = useUpdatedSelector(id)

  return (
    <ValueNode
      name={name}
      type={type}
      value={signal.value}
      selected={signal.selected}
      updated={isUpdated()}
      onClick={() => toggleSignalFocus(id)}
      onElementHover={toggleHoveredElement}
    />
  )
}
