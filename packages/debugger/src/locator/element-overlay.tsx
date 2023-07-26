import { createElementBounds } from '@solid-primitives/bounds'
import { createElementCursor } from '@solid-primitives/cursor'
import { createRootPool } from '@solid-primitives/rootless'
import { Accessor, Component, createMemo, getOwner, runWithOwner, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { LocatorComponent } from './find-components'

export function createElementsOverlay(selected: Accessor<LocatorComponent[]>) {
    const useElementOverlay = createRootPool((component: Accessor<LocatorComponent>, active) => (
        <ElementOverlay component={active() ? component() : null} />
    ))

    // wait a second to let the framework mess with the document before attaching the overlay
    const owner = getOwner()!
    setTimeout(() => {
        runWithOwner(owner, () => (
            <Portal useShadow mount={document.documentElement}>
                <div>{selected().map(useElementOverlay)}</div>
            </Portal>
        ))
    }, 1000)
}

const ElementOverlay: Component<{ component: LocatorComponent | null }> = props => {
    const element = () => props.component?.element
    // set pointer cursor to selected component
    createElementCursor(element, 'pointer')
    const tag = () => element()?.localName
    const name = () => props.component?.name

    const bounds = createElementBounds(element)
    const left = createMemo<number>(prev => (bounds.left === null ? prev : bounds.left), 0)
    const top = createMemo<number>(prev => (bounds.top === null ? prev : bounds.top), 0)
    const width = createMemo<number>(prev => (bounds.width === null ? prev : bounds.width), 0)
    const height = createMemo<number>(prev => (bounds.height === null ? prev : bounds.height), 0)
    const transform = createMemo(() => `translate(${Math.round(left())}px, ${Math.round(top())}px)`)
    const placeOnTop = createMemo(() => top() > window.innerHeight / 2)

    return (
        <>
            <style>{styles}</style>
            <div
                class="element-overlay"
                style={{
                    transform: transform(),
                    width: width() + 'px',
                    height: height() + 'px',
                }}
            >
                <div class="border" />
                <Show when={name()}>
                    <div class={`name-container ${placeOnTop() ? 'top' : 'bottom'}`}>
                        <div class="name-animated-container">
                            <div class="name-background"></div>
                            <div class="name-text">
                                {name()}: <span>{tag()}</span>
                            </div>
                            <div class="name-invisible">
                                {name()}: {tag()}
                            </div>
                        </div>
                    </div>
                </Show>
            </div>
        </>
    )
}

const styles = /*css*/ `
.element-overlay {
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  pointer-events: none;
  transition-duration: 100ms;
  transition-property: transform, width, height;
  --color: 14 116 144;
}
.border {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 2px solid rgb(var(--color) / 0.8);
  background-color: rgb(var(--color) / 0.3);
  border-radius: 0.25rem;
}
.name-container {
  position: absolute;
  z-index: 10000;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  color: white;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1rem;
}
.name-container.bottom {
  top: 100%;
}
.name-container.top {
  bottom: 100%;
}
.name-animated-container {
  position: relative;
  margin: 0.5rem auto;
  padding: 0.25rem 0.5rem;
}
.name-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgb(var(--color) / 0.8);
  border-radius: 0.25rem;
}
.name-text {
  position: absolute;
}
.name-text span {
  color: #a5f3fc;
}
.name-invisible {
  visibility: hidden;
  width: max-content;
}
`
