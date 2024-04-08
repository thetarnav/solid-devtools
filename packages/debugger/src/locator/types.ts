import {ToDyscriminatedUnion} from '@solid-devtools/shared/utils'
import {EmitterEmit} from '@solid-primitives/event-bus'
import {Accessor} from 'solid-js'
import {Debugger, NodeID} from '../types'

export type SourceLocation = {
    file: string
    line: number
    column: number
}

export type SourceElementType<ElementType> = ElementType | string | undefined

export type HighlightElementPayload = ToDyscriminatedUnion<{
    node: {id: NodeID}
    element: {id: NodeID}
}> | null

export interface Locator<ElementType> {
    setDevtoolsHighlightTarget(target: HighlightElementPayload): void
    openElementSourceCode(location: SourceLocation, element: SourceElementType<ElementType>): void
}

export interface CreateLocatorProps {
    emit: EmitterEmit<Debugger.OutputChannels>
    locatorEnabled: Accessor<boolean>
    setLocatorEnabledSignal(signal: Accessor<boolean>): void
    onComponentClick(componentId: NodeID, next: VoidFunction): void
}

export type LocatorFactory<ElementType> = (props: CreateLocatorProps) => Locator<ElementType>

// TODO: rename or remove?
// this is used externally so any change is a change in API
export type {LocatorOptions} from './DOMLocator/types'
