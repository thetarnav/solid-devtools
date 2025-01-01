import * as s from 'solid-js'
import {defer} from '@solid-primitives/utils'
import {makeEventListener} from '@solid-primitives/event-listener'
import {createKeyHold} from '@solid-primitives/keyboard'
import {scheduleIdle} from '@solid-primitives/scheduled'
import {makeHoverElementListener} from '@solid-devtools/shared/primitives'
import {msg, warn} from '@solid-devtools/shared/utils'
import {type OutputEmit} from '../main/index.ts'
import * as registry from '../main/component-registry.ts'
import {ObjectType, getObjectById} from '../main/id.ts'
import SolidAPI from '../main/setup.ts'
import {type NodeID} from '../main/types.ts'
import {createElementsOverlay} from './element-overlay.tsx'
import {
    type LocatorComponent,
    type SourceCodeData,
    type SourceLocation,
    type TargetIDE,
    type TargetURLFunction,
    getLocationAttr,
    getProjectPath,
    getSourceCodeData,
    openSourceCode,
} from './find-components.ts'
import {type HighlightElementPayload, type LocatorOptions} from './types.ts'

export {parseLocationString} from './find-components.ts'

export * from './types.ts'

export function createLocator(props: {
    locatorEnabled: s.Accessor<boolean>
    setLocatorEnabledSignal(signal: s.Accessor<boolean>): void
    onComponentClick(componentId: NodeID, next: VoidFunction): void
    emit: OutputEmit
}) {
    const [enabledByPressingSignal, setEnabledByPressingSignal] = s.createSignal((): boolean => false)
    props.setLocatorEnabledSignal(s.createMemo(() => enabledByPressingSignal()()))

    const [hoverTarget, setHoverTarget] = s.createSignal<HTMLElement | null>(null)
    const [devtoolsTarget, setDevtoolsTarget] = s.createSignal<HighlightElementPayload>(null)

    const [highlightedComponents, setHighlightedComponents] = s.createSignal<LocatorComponent[]>([])

    const calcHighlightedComponents = (
        target: HTMLElement | HighlightElementPayload,
    ): LocatorComponent[] => {
        if (!target) return []

        // target is an elementId
        if ('type' in target && target.type === 'element') {
            const element = getObjectById(target.id, ObjectType.Element)
            if (!(element instanceof HTMLElement)) return []
            target = element
        }

        // target is an element
        if (target instanceof HTMLElement) {
            const comp = registry.findComponent(target)
            if (!comp) return []
            return [
                {
                    location: getLocationAttr(target),
                    element: target,
                    id: comp.id,
                    name: comp.name,
                },
            ]
        }

        // target is a component or an element of a component (in DOM walker mode)
        const comp = registry.getComponent(target.id)
        if (!comp) return []
        return comp.elements.map(element => ({
            element,
            id: comp.id,
            name: comp.name,
        }))
    }

    s.createEffect(
        defer(
            () => hoverTarget() ?? devtoolsTarget(),
            scheduleIdle(target =>
                setHighlightedComponents(() => calcHighlightedComponents(target)),
            ),
        ),
    )

    createElementsOverlay(highlightedComponents)

    // notify of component hovered by using the debugger
    s.createEffect((prev: NodeID | undefined) => {
        const target = hoverTarget()
        const comp = target && registry.findComponent(target)
        if (prev) {
            props.emit(msg('HoveredComponent', {nodeId: prev, state: false}))
        }
        if (comp) {
            const {id} = comp
            props.emit(msg('HoveredComponent', {nodeId: id, state: true}))
            return id
        }
    })

    let targetIDE: TargetIDE | TargetURLFunction | undefined

    s.createEffect(() => {
        if (!props.locatorEnabled()) return

        // set hovered element as target
        makeHoverElementListener(el => setHoverTarget(el))
        s.onCleanup(() => setHoverTarget(null))

        // go to selected component source code on click
        makeEventListener(
            window,
            'click',
            e => {
                const {target} = e
                if (!(target instanceof HTMLElement)) return
                const highlighted = highlightedComponents()
                const comp =
                    highlighted.find(({element}) => target.contains(element)) ?? highlighted[0]
                if (!comp) return
                const sourceCodeData =
                    comp.location && getSourceCodeData(comp.location, comp.element)

                // intercept on-page components clicks and send them to the devtools overlay
                props.onComponentClick(comp.id, () => {
                    if (!targetIDE || !sourceCodeData) return
                    e.preventDefault()
                    e.stopPropagation()
                    openSourceCode(targetIDE, sourceCodeData)
                })
            },
            true,
        )
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
    function useLocator(options: LocatorOptions): void {
        s.runWithOwner(owner, () => {
            if (locatorUsed) return warn('useLocator can be called only once.')
            locatorUsed = true
            if (options.targetIDE) targetIDE = options.targetIDE
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
        setDevtoolsHighlightTarget(target: HighlightElementPayload) {
            setDevtoolsTarget(target)
        },
        openElementSourceCode(location: SourceLocation, element: SourceCodeData['element']) {
            if (!targetIDE) return warn('Please set `targetIDE` it in useLocator options.')
            const projectPath = getProjectPath()
            if (!projectPath) return warn('projectPath is not set.')
            openSourceCode(targetIDE, {
                ...location,
                projectPath,
                element,
            })
        },
    }
}
