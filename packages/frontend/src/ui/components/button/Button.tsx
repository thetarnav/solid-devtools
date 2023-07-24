import { Component, ComponentProps, JSX, ParentComponent } from 'solid-js'
// import { AriaToggleButtonProps, createToggleButton } from "@solid-aria/button"
import { Icon } from '@/ui'
import { combineProps } from '@solid-primitives/props'
import clsx from 'clsx'
import * as styles from './button.css'

export const ToggleButton: ParentComponent<
    ComponentProps<'button'> & { onToggle: (selected: boolean) => void; selected: boolean }
> = props => {
    props = combineProps(props, {
        class: styles.toggleButton,
        get 'aria-selected'() {
            return props.selected
        },
        onClick: () => props.onToggle(!props.selected),
    })

    // ! createToggleButton doesn't seems to passing class to buttonProps
    // let ref!: HTMLButtonElement
    // const { buttonProps } = createToggleButton(props, () => ref)

    return <button {...props} />
}

export const CollapseToggle: Component<{
    class?: string
    style?: string | JSX.CSSProperties
    iconClass?: string
    isCollapsed: boolean
    onToggle?: (newState: boolean) => void
    defaultCollapsed?: boolean
}> = props => {
    return (
        <button
            class={clsx(styles.Collapse.button, props.class, {
                [styles.Collapse.defaultCollapsed]: props.defaultCollapsed,
            })}
            style={props.style}
            aria-selected={props.isCollapsed}
            onClick={
                props.onToggle &&
                (e => {
                    e.stopPropagation()
                    props.onToggle!(!props.isCollapsed)
                })
            }
        >
            <Icon.Triangle class={clsx(styles.Collapse.icon, props.iconClass)} />
        </button>
    )
}
