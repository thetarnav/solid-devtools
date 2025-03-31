import * as s from 'solid-js'
import {defer} from '@solid-primitives/utils'
import {makeEventListener} from '@solid-primitives/event-listener'
import {createKeyHold} from '@solid-primitives/keyboard'
import {scheduleIdle} from '@solid-primitives/scheduled'
import {msg, warn} from '@solid-devtools/shared/utils'
import * as walker from '../structure/walker.ts'
import {ObjectType, getObjectById} from '../main/id.ts'
import SolidAPI from '../main/setup.ts'
import {type ElementInterface, type NodeID, type OutputEmit, type SourceLocation} from '../main/types.ts'
import {createElementsOverlay} from './element-overlay.tsx'
import * as locator from './locator.ts'
import {unwrap_append} from '../main/utils.ts'

export * from './locator.ts'

export type LocatorComponent<TEl extends object> = {
    id:        NodeID
    name:      string | undefined
    element:   TEl
    location?: SourceLocation | null
}

function makeHoverElementListener<TEl extends object>(
    eli:     ElementInterface<TEl>,
    onHover: (el: TEl | null) => void,
): void {
    let last: TEl | null = null
    makeEventListener(window, 'mouseover', e => {
        let el = eli.getElementAt(e)
        if (el !== last) {
            onHover(last = el)
        }
    })
    makeEventListener(document, 'mouseleave', () => {
        if (null !== last) {
            onHover(last = null)
        }
    })
}

export function createLocator<TEl extends object>(props: {
    locatorEnabled: s.Accessor<boolean>,
    setLocatorEnabledSignal(signal: s.Accessor<boolean>): void,
    onComponentClick(componentId: NodeID, next: VoidFunction): void,
    emit: OutputEmit,
    component_registry: walker.ComponentRegistry<TEl>,
}) {
    const [enabledByPressingSignal, setEnabledByPressingSignal] = s.createSignal((): boolean => false)
    props.setLocatorEnabledSignal(s.createMemo(() => enabledByPressingSignal()()))

    const [hoverTarget, setHoverTarget] = s.createSignal<TEl | null>(null)
    const [devtoolsTarget, setDevtoolsTarget] = s.createSignal<locator.HighlightElementPayload>(null)

    const [highlightedComponents, setHighlightedComponents] = s.createSignal<LocatorComponent<TEl>[]>([])

    function getLocatorComponentFromElement(
        el: TEl,
    ): LocatorComponent<TEl> | null {
        let comp = walker.findComponent(props.component_registry, el)
        return comp && {
            location: props.component_registry.eli.getLocation(el),
            element: el,
            id: comp.id,
            name: comp.name,
        }
    }

    const target = s.createMemo(() => {
        let hover = hoverTarget()
        return hover != null
            ? {
                type: 'hover' as const,
                element: hover,
            }
            : devtoolsTarget()
    }, undefined, {
        equals: (a, b) => {
            if (a === b) return true
            if (a == null && b == null) return true
            if (a == null || b == null) return false
            if (a.type !== b.type) return false
            switch (a.type) {
            case 'hover': return a.element === (b as any).element
            case 'node': return a.id === (b as any).id
            case 'element': return a.id === (b as any).id
            }
        },
    })

    s.createEffect(defer(target, scheduleIdle(target => {

        let locator_components: LocatorComponent<TEl>[] = []

        if (target != null) {
            switch (target.type) {
            case 'hover': {
                unwrap_append(locator_components, getLocatorComponentFromElement(target.element))
                break
            }
            case 'element': {
                let element = getObjectById(target.id, ObjectType.Element) as TEl | null
                if (element != null) {
                    unwrap_append(locator_components, getLocatorComponentFromElement(element))
                }
                break
            }
            case 'node': {
                // target is a component or an element of a component (in DOM walker mode)
                let comp = walker.getComponent(props.component_registry, target.id)
                if (comp != null) {
                    for (let el of comp.elements) {
                        locator_components.push({
                            element: el,
                            id: comp.id,
                            name: comp.name,
                        })
                    }
                }
            }
            }
        }

        setHighlightedComponents(locator_components)
    })))

    createElementsOverlay(highlightedComponents, props.component_registry.eli)

    // notify of component hovered by using the debugger
    s.createEffect((prev: NodeID | undefined) => {
        const target = hoverTarget()
        const comp = target && walker.findComponent(props.component_registry, target)
        if (prev) {
            props.emit(msg('HoveredComponent', {nodeId: prev, state: false}))
        }
        if (comp) {
            const {id} = comp
            props.emit(msg('HoveredComponent', {nodeId: id, state: true}))
            return id
        }
    })

    let target_ide: locator.TargetIDE | locator.TargetURLFunction | undefined

    s.createEffect(() => {
        if (!props.locatorEnabled()) return

        // set hovered element as target
        makeHoverElementListener(props.component_registry.eli, el => setHoverTarget(() => el))
        s.onCleanup(() => setHoverTarget(null))

        // go to selected component source code on click
        makeEventListener(window, 'click', e => {

            let el = props.component_registry.eli.getElementAt(e)
            if (el == null) {
                DEV: {warn("Locator: can't find element at click target (target=%o)", e.target)}
                return
            }

            let comp = getLocatorComponentFromElement(el)
            if (comp == null) {
                DEV: {warn("Locator: can't find component at click target (target=%o, el=%o)", e.target, el)}
                return
            }

            let source_code_data = comp.location
                ? locator.getSourceCodeData(comp.location, comp.element as any)
                : null

            // intercept on-page components clicks and send them to the devtools overlay
            props.onComponentClick(comp.id, () => {
                if (target_ide == null || source_code_data == null) return
                e.preventDefault()
                e.stopPropagation()
                locator.openSourceCode(target_ide, source_code_data)
            })
        }, true)
    })

    let locatorUsed = false
    const owner = s.getOwner()!
    /**
     * User function to enable user locator features. Such as element hover and go to source.
     *
     * Can bu used only once.
     *
     * @param options {@link LocatorOptions} for the locator.
     */
    function useLocator(options: locator.LocatorOptions): void {
        s.runWithOwner(owner, () => {
            if (locatorUsed) return warn('useLocator can be called only once.')
            locatorUsed = true
            if (options.targetIDE) target_ide = options.targetIDE
            if (options.key !== false) {
                const isHoldingKey = createKeyHold(options.key ?? 'Alt', {preventDefault: true})
                setEnabledByPressingSignal(() => isHoldingKey)
            }
        })
    }

    // Enable the locator when the options were passed by the vite plugin
    let locator_options = SolidAPI.get_locator_options()
    if (locator_options) {
        useLocator(locator_options)
    }

    return {
        useLocator,
        setDevtoolsHighlightTarget(target: locator.HighlightElementPayload) {
            setDevtoolsTarget(target)
        },
        openElementSourceCode(location: SourceLocation, element: locator.SourceCodeData['element']) {
            if (!target_ide) return warn('Please set `targetIDE` it in useLocator options.')
            const projectPath = locator.getProjectPath()
            if (!projectPath) return warn('projectPath is not set.')
            locator.openSourceCode(target_ide, {
                ...location,
                projectPath,
                element,
            })
        },
    }
}
