import { CollapseToggle, Highlight, Icon } from '@/ui'
import { tag_brackets } from '@/ui/styles'
import theme from '@/ui/theme/new-theme'
import { highlight_container, highlight_element, highlight_opacity_var } from '@/ui/theme/styles'
import { NodeID, UNKNOWN, ValueType } from '@solid-devtools/debugger/types'
import { createHover, createPingedSignal } from '@solid-devtools/shared/primitives'
import { Entries } from '@solid-primitives/keyed'
import { defer } from '@solid-primitives/utils'
import clsx from 'clsx'
import {
    Component,
    For,
    JSX,
    Show,
    createContext,
    createEffect,
    createMemo,
    createSignal,
    untrack,
    useContext,
} from 'solid-js'
import { DecodedValue, ObjectValueData, isValueNested } from './decode'

const value_base = 'h-inspector_row font-500'
const value_nullable = value_base + ' color-disabled'
const value_function = value_base + ' font-italic'

type ToggleElementHover = (elementId: NodeID, hovered?: boolean) => void

const ValueContext = createContext<{ onElementHover?: ToggleElementHover; underStore: boolean }>()

const CollapsableObjectPreview: Component<{
    value: NonNullable<ObjectValueData['value']>
}> = props => (
    <ul class="w-full flex flex-col gap-.5">
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
                                    isExtended={extended()}
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
                        <span class={value_base}>
                            {getObjectValueName(props.type)} [{props.data.length}]
                        </span>
                    }
                    fallback={
                        <span class={value_nullable}>Empty {getObjectValueName(props.type)}</span>
                    }
                />
            }
        />
    )
}

const string_value_class = 'string_value'
const string_value = clsx(
    string_value_class,
    value_base,
    'min-h-inspector_row h-fit max-w-fit text-green',
)

const value_element_container_class = 'value_element_container'
const value_element_container = clsx(
    value_element_container_class,
    tag_brackets,
    value_base,
    highlight_container,
    'text-dom',
)

export const value_node_styles = /*css*/ `
    .${string_value_class}:before, .${string_value_class}:after {
        content: '"';
        color: ${theme.vars.disabled};
    }

    .${value_element_container_class}:hover {
        ${highlight_opacity_var}: 0.6;
    }
`

const ValuePreview: Component<{ value: DecodedValue; extended?: boolean }> = props => {
    return createMemo(() => {
        const value = props.value
        switch (value.type) {
            case ValueType.String:
                return <span class={string_value}>{value.value}</span>
            case ValueType.Number:
                return (
                    <span class={value_base + ' min-h-inspector_row text-cyan-600'}>
                        {value.value}
                    </span>
                )
            case ValueType.Boolean:
                return (
                    <input
                        type="checkbox"
                        class={value_base + ' pointer-events-none'}
                        onClick={e => e.preventDefault()}
                        checked={value.value}
                    ></input>
                )
            case ValueType.Null:
                return (
                    <span class={value_nullable}>
                        {value.value === null ? 'null' : 'undefined'}
                    </span>
                )
            case ValueType.Unknown:
                return <span class={value_nullable}>unknown</span>
            case ValueType.Function:
                return (
                    <span class={value_function}>
                        {value.name ? `f ${value.name}()` : 'function()'}
                    </span>
                )
            case ValueType.Getter:
                return <span class={value_function}>get {value.name}()</span>
            case ValueType.Symbol:
                return <span class={value_base}>Symbol({value.name})</span>
            case ValueType.Instance:
                return <span class={value_base}>{value.name}</span>
            case ValueType.Element: {
                const { onElementHover: onHover } = useContext(ValueContext)!

                const hoverProps = onHover && createHover(hovered => onHover(value.id, hovered))

                return (
                    <span class={value_element_container} {...hoverProps}>
                        <div class={highlight_element} />
                        {value.name}
                    </span>
                )
            }
            case ValueType.Store:
                return (
                    <ObjectValuePreview
                        type={value.valueType}
                        data={value}
                        extended={props.extended}
                    />
                )
            default:
                return (
                    <ObjectValuePreview type={value.type} data={value} extended={props.extended} />
                )
        }
    }) as unknown as JSX.Element
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
    name: string | undefined
    /** signals can be inspected to be viewed in the dependency graph */
    isInspected?: boolean
    /** for nested values - is it collapsed or extended */
    isExtended?: boolean
    /** top-level, or inside a store (the value can change) */
    isSignal?: boolean
    /** for stale prop getters - their value is probably outdated */
    isStale?: boolean
    onClick?: VoidFunction
    onElementHover?: ToggleElementHover
    actions?: { icon: keyof typeof Icon; title?: string; onClick: VoidFunction }[]
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

    const { isHovered, hoverProps } = createNestedHover()
    const isExtendable = createMemo(() => isValueNested(props.value))

    return (
        <li
            class={clsx(
                props.class,
                highlight_container,
                'flex flex-wrap items-start pl-2ch',
                'font-mono leading-inspector_row',
                props.isStale && 'opacity-60',
            )}
            {...hoverProps}
        >
            <div
                class={clsx(
                    'absolute mt-.25 -inset-y-.25 -inset-x-1 b b-solid b-dom rounded',
                    props.isInspected ? 'opacity-50' : 'opacity-0',
                )}
                style={{ 'mask-image': 'linear-gradient(90deg, black, transparent)' }}
            />
            <div
                class={clsx(
                    highlight_element,
                    'b b-solid b-highlight-border',
                    isHovered() ? 'opacity-30' : 'opacity-0',
                )}
            />

            {isExtendable() && (
                <div class="absolute -left-1 w-inspector_row h-inspector_row center-child">
                    <CollapseToggle
                        onToggle={handleSelect}
                        class={clsx(
                            'transition-opacity',
                            (isExtendable() && props.isExtended) || isHovered()
                                ? 'opacity-100'
                                : 'opacity-0',
                        )}
                        isCollapsed={!props.isExtended}
                        defaultCollapsed
                    />
                </div>
            )}

            {props.actions && (
                <div
                    class={clsx(
                        'absolute z-2 top-0 right-2 h-inspector_row',
                        'flex justify-end items-center',
                        'transition-opacity',
                        isHovered()
                            ? 'opacity-55 hover:opacity-80 active:opacity-100'
                            : 'opacity-0',
                    )}
                >
                    <For each={props.actions}>
                        {action => {
                            const IconComponent = Icon[action.icon]
                            return (
                                <button
                                    onClick={action.onClick}
                                    class="center-child"
                                    title={action.title}
                                >
                                    <IconComponent class="h-4 w-4" />
                                </button>
                            )
                        }}
                    </For>
                </div>
            )}

            <div
                class={clsx('flex items-center', isExtendable() && 'cursor-pointer')}
                onClick={handleSelect}
            >
                <div
                    class={clsx(
                        'h-inspector_row min-w-5ch mr-2ch select-none truncate font-mono',
                        props.isSignal || ctx?.underStore ? 'text-dom' : 'text-text-light',
                        'after:content-[":"] after:color-disabled',
                    )}
                >
                    <Highlight highlight={isUpdated && isUpdated()} isSignal class="inline-block">
                        {props.name || UNKNOWN}
                    </Highlight>
                </div>
            </div>

            {/* provide context if one isn't already provided or if the value is a store
      (so that the ctx.underStore could be overwritten) */}
            <Show
                when={ctx && props.value.type !== ValueType.Store}
                children={<ValuePreview value={props.value} extended={props.isExtended} />}
                fallback={
                    <ValueContext.Provider
                        value={{
                            onElementHover: props.onElementHover || ctx?.onElementHover,
                            get underStore() {
                                return props.value.type === ValueType.Store
                            },
                        }}
                    >
                        <ValuePreview value={props.value} extended={props.isExtended} />
                    </ValueContext.Provider>
                }
            />
        </li>
    )
}
