import * as s from 'solid-js'
import * as sweb from 'solid-js/web'
import {createRootPool} from '@solid-primitives/rootless'
import type {LocatorComponent} from './index.ts'
import {UNKNOWN, type ElementInterface, type Rect} from '../types.ts'

export function createElementsOverlay<TEl extends object>(
    selected: s.Accessor<LocatorComponent<TEl>[]>,
    eli:      ElementInterface<TEl>,
) {

    const useElementOverlay = createRootPool((componentRaw: s.Accessor<LocatorComponent<TEl>>, active) => {

        const component = () => active() ? componentRaw() : null

        const name = () => component()?.name

        const rect = s.createMemo((prev: Rect) => {
            let comp = component()
            if (comp === null) return prev

            let rect = eli.getRect(comp.element)
            if (rect === null) return prev

            return rect
        }, {x: 0, y: 0, width: 0, height: 0})

        const transform  = () => `translate(${Math.round(rect().x)}px, ${Math.round(rect().y)}px)`
        const placeOnTop = () => rect().y > window.innerHeight / 2

        const tag = () => {
            let comp = component()
            if (comp === null) return UNKNOWN

            return eli.getName(comp.element) ?? UNKNOWN
        }

        return (
            <>
                <style>{styles}</style>
                <div
                    class="element-overlay"
                    style={{
                        transform: transform(),
                        width: rect().width + 'px',
                        height: rect().height + 'px',
                    }}
                >
                    <div class="border" />
                    <s.Show when={name()}>
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
                    </s.Show>
                </div>
            </>
        )

    })

    // wait a second to let the framework mess with the document before attaching the overlay
    const owner = s.getOwner()!
    setTimeout(() => {
        s.runWithOwner(owner, () => (
            <sweb.Portal useShadow mount={document.documentElement}>
                <div data-darkreader-ignore>{selected().map(useElementOverlay)}</div>
            </sweb.Portal>
        ))
    }, 1000)
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
