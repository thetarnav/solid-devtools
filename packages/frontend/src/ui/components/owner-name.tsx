import { NodeType, UNKNOWN } from '@solid-devtools/debugger/types'
import { createPingedSignal } from '@solid-devtools/shared/primitives'
import clsx from 'clsx'
import { Component, JSX, createMemo } from 'solid-js'
import Icon, { IconComponent } from '../icons'
import { tag_brackets } from '../styles'
import { Highlight } from './highlight/Highlight'

export function Node_Type_Icon(props: {
    type: NodeType | undefined | null
    class?: string
}): JSX.Element {
    let prev_icon: IconComponent | undefined
    let prev_rendered: JSX.Element | undefined

    const fn = () => {
        let IconComp: IconComponent | undefined
        switch (props.type) {
            case NodeType.Memo:
                IconComp = Icon.Memo
                break
            case NodeType.Effect:
                IconComp = Icon.Effect
                break
            case NodeType.Root:
                IconComp = Icon.Root
                break
            case NodeType.Render:
                IconComp = Icon.RenderEffect
                break
            case NodeType.Computation:
                IconComp = Icon.Computation
                break
            case NodeType.Context:
                IconComp = Icon.Context
                break
            case NodeType.Signal:
                IconComp = Icon.Signal
                break
        }

        if (IconComp === prev_icon) {
            return prev_rendered
        }
        prev_icon = IconComp
        prev_rendered = IconComp ? <IconComp class={props.class} /> : null
        return prev_rendered
    }
    return fn as any as JSX.Element
}

const strike_through_line =
    'before:content-empty before:absolute before:-z-1 before:top-1/2 before:inset-x-0 before:h-px before:bg-current'

const node_type_classes = (frozen: boolean): string =>
    clsx('text-.8em select-none text-disabled', frozen && strike_through_line)

const name_classes = (frozen: boolean): string =>
    clsx(frozen && [strike_through_line, 'text-disabled'])

const component_classes = (frozen: boolean): string =>
    clsx(name_classes(frozen), tag_brackets, 'text-component')

const element_classes = (frozen: boolean): string =>
    clsx(name_classes(frozen), tag_brackets, 'text-dom')

const signal_classes = (frozen: boolean): string => clsx(name_classes(frozen), 'text-dom')

export const Node_Name: Component<{
    name: string | undefined | null
    type: NodeType | undefined | null
    frozen: boolean
}> = props => {
    const name = () => props.name || UNKNOWN
    return createMemo(() => {
        switch (props.type) {
            case NodeType.Root:
                return <span class={node_type_classes(props.frozen)}>Root</span>
            case NodeType.Context:
                return <span class={node_type_classes(props.frozen)}>Context</span>
            case NodeType.Render:
                return <span class={node_type_classes(props.frozen)}>Render Effect</span>
            case NodeType.Component:
                return <span class={component_classes(props.frozen)}>{name()}</span>
            case NodeType.Element:
                return <span class={element_classes(props.frozen)}>{name()}</span>
            case NodeType.Signal:
                return <span class={signal_classes(props.frozen)}>{name()}</span>
            default:
                return <span class={name_classes(props.frozen)}>{name()}</span>
        }
    }) as unknown as JSX.Element
}

export const Owner_Name: Component<{
    name: string | undefined | null
    type: NodeType | undefined | null
    is_title?: boolean
    frozen?: boolean
}> = props => {
    return (
        <span class={clsx('flex items-center font-mono', props.is_title ? 'text-lg' : 'text-base')}>
            <Node_Type_Icon type={props.type} class="w-3 h-3 mr-1 -mb-2px text-disabled" />
            <Node_Name name={props.name} type={props.type} frozen={!!props.frozen} />
        </span>
    )
}

export function createHighlightedOwnerName() {
    const [isUpdated, pingUpdated] = createPingedSignal()
    return {
        isUpdated,
        pingUpdated,
        OwnerName: (props: Parameters<typeof Owner_Name>[0]) => (
            <Highlight highlight={isUpdated()} isSignal={props.type === NodeType.Signal}>
                <Owner_Name {...props} />
            </Highlight>
        ),
    }
}
