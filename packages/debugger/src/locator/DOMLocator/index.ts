import {makeHoverElementListener} from '@solid-devtools/shared/primitives'
import {warn} from '@solid-devtools/shared/utils'
import {makeEventListener} from '@solid-primitives/event-listener'
import {createKeyHold} from '@solid-primitives/keyboard'
import {scheduleIdle} from '@solid-primitives/scheduled'
import {defer} from '@solid-primitives/utils'
import {createEffect, createMemo, createSignal, onCleanup} from 'solid-js'
import * as registry from '../../main/component-registry'
import {ObjectType, getObjectById} from '../../main/id'
import {NodeID} from '../../main/types'
import {HighlightElementPayload, LocatorFactory, SourceElementType, SourceLocation} from '../types'
import {createElementsOverlay} from './element-overlay'
import {
    LocatorComponent,
    TargetIDE,
    TargetURLFunction,
    getLocationAttr,
    getProjectPath,
    getSourceCodeData,
    openSourceCode,
} from './find-components'
import {LocatorOptions} from './types'

export function createDOMLocatorFactory(options: LocatorOptions): LocatorFactory<HTMLElement> {
    return props => {
        const [enabledByPressingSignal, setEnabledByPressingSignal] = createSignal(
            (): boolean => false,
        )
        props.setLocatorEnabledSignal(createMemo(() => enabledByPressingSignal()()))

        const [hoverTarget, setHoverTarget] = createSignal<HTMLElement | null>(null)
        const [devtoolsTarget, setDevtoolsTarget] = createSignal<HighlightElementPayload>(null)

        const [highlightedComponents, setHighlightedComponents] = createSignal<LocatorComponent[]>(
            [],
        )

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

        createEffect(
            defer(
                () => hoverTarget() ?? devtoolsTarget(),
                scheduleIdle(target =>
                    setHighlightedComponents(() => calcHighlightedComponents(target)),
                ),
            ),
        )

        createElementsOverlay(highlightedComponents)

        // notify of component hovered by using the debugger
        createEffect((prev: NodeID | undefined) => {
            const target = hoverTarget()
            const comp = target && registry.findComponent(target)
            if (prev) props.emit('HoveredComponent', {nodeId: prev, state: false})
            if (comp) {
                const {id} = comp
                props.emit('HoveredComponent', {nodeId: id, state: true})
                return id
            }
        })

        let targetIDE: TargetIDE | TargetURLFunction | undefined

        createEffect(() => {
            if (!props.locatorEnabled()) return

            // set hovered element as target
            makeHoverElementListener(el => setHoverTarget(el))
            onCleanup(() => setHoverTarget(null))

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

        if (options.targetIDE) targetIDE = options.targetIDE
        if (options.key !== false) {
            const isHoldingKey = createKeyHold(options.key ?? 'Alt', {preventDefault: true})
            setEnabledByPressingSignal(() => isHoldingKey)
        }

        return {
            setDevtoolsHighlightTarget(target: HighlightElementPayload) {
                setDevtoolsTarget(target)
            },
            openElementSourceCode(
                location: SourceLocation,
                element: SourceElementType<HTMLElement>,
            ) {
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
}
