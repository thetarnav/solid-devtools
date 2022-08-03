import { render } from "solid-js/web"
import type { Owner } from "solid-js/types/reactive/signal"

import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Suspense,
  Switch,
} from "solid-js"
import { MetaProvider, Link, Style } from "solid-meta"
import { tw, sheet } from "@ui"

export function createDevtools(owner: Owner) {
  createEffect(() => {
    const div = document.createElement("div")
    div.className = "devtools"
    let shadow = div.attachShadow({ mode: "open" })
    document.body.appendChild(div)
    let div2 = document.createElement("div")
    shadow.appendChild(div2)
    shadow.adoptedStyleSheets = [sheet.target]

    render(() => <Devtools owner={owner} editor="vscode-insiders" />, div2)

    onCleanup(() => {
      document.body.removeChild(div)
    })
  })
}

function getSourceForElement(el) {
  return el.dataset.sourceLoc
}

function getPathToSource(el) {
  return el.slice(1)
}

export const State = /** @type {const} */ {
  IDLE: "IDLE",
  HOVER: "HOVER",
  SELECT: "SELECT",
}

/**
 * @param {Props} props
 */
export function Devtools(props) {
  const [state, setState] = createSignal(
    /** @type {State[keyof State]} */
    State.IDLE,
  )

  const [target, setTarget] = createSignal(
    /** @type {HTMLElement | null} */
    null,
  )

  function onClick(
    /**
     * @type {MouseEvent}
     */
    event,
  ) {
    if (state() === State.HOVER && target() instanceof HTMLElement) {
      const source = getSourceForElement(target())
      const path = getPathToSource(source)
      const url = `${props.editor}://file/${path}`

      event.preventDefault()
      window.open(url, "_blank")

      setState(State.IDLE)
    }
  }

  function onClose(returnValue) {
    if (returnValue) {
      const url = `${props.editor}://file/${returnValue}`
      window.open(url)
    }

    setState(State.IDLE)
  }

  function onContextMenu(
    /**
     * @type {MouseEvent}
     */
    event,
  ) {
    const { target } = event

    if (state() === State.HOVER && target instanceof HTMLElement) {
      event.preventDefault()

      setState(State.SELECT)
      setTarget(target)
    }
  }

  function onKeyDown(
    /**
     * @type {KeyboardEvent}
     */
    event,
  ) {
    switch (state()) {
      case State.IDLE:
        if (event.altKey) setState(State.HOVER)
        break

      default:
    }
  }

  function onKeyUp(
    /**
     * @type {KeyboardEvent}
     */
    event,
  ) {
    switch (state()) {
      case State.HOVER:
        setState(State.IDLE)
        break

      default:
    }
  }

  function onMouseMove(
    /** @type {MouseEvent} */
    event,
  ) {
    if (!(event.target instanceof HTMLElement)) {
      return
    }

    switch (state()) {
      case State.IDLE:
      case State.HOVER:
        if (event.target.className === "devtools") {
          break
        }
        setTarget(event.target)
        break

      default:
        break
    }
  }

  createEffect(() => {
    let t = target()
    console.log(t)
    let s = state()

    onCleanup(() => {
      for (const element of Array.from(
        document.querySelectorAll("[data-click-to-component-target]"),
      )) {
        if (element instanceof HTMLElement) {
          delete element.dataset.clickToComponentTarget
        }
      }
    })

    if (s === State.IDLE) {
      delete window.document.body.dataset.clickToComponentTarget
    } else {
      if (t instanceof HTMLElement) {
        window.document.body.dataset.clickToComponent = s
        t.dataset.clickToComponentTarget = s
      } else if (Array.isArray(t)) {
        window.document.body.dataset.clickToComponent = s
        t.forEach(a => (a.dataset.clickToComponentTarget = s))
      }
    }
  })

  createEffect(function addEventListenersToWindow() {
    window.addEventListener("click", onClick, { capture: true })
    window.addEventListener("contextmenu", onContextMenu, { capture: true })
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("mousemove", onMouseMove)

    onCleanup(() => {
      window.removeEventListener("click", onClick, { capture: true })
      window.removeEventListener("contextmenu", onContextMenu, {
        capture: true,
      })
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("mousemove", onMouseMove)
    })
  })

  //   <${FloatingPortal} key="click-to-component-portal">
  //     ${html`<${ContextMenu}
  //       key="click-to-component-contextmenu"
  //       onClose=${onClose}
  //     />`}
  //   </${FloatingPortal}
  // `

  return (
    <div>
      <MetaProvider>
        <Style>{`
      [data-click-to-component-target] {
          cursor: var(--click-to-component-cursor, context-menu) !important;
          outline: var(
            --click-to-component-outline,
            2px solid lightgreen
          ) !important;
          outline-offset: -2px;
          outline-style: inset;
        }
  `}</Style>
        <Link rel="preconnect" href="https://fonts.googleapis.com" />
        <Link rel="preconnect" href="https://fonts.gstatic.com" />
        <Link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap"
          rel="stylesheet"
        />
      </MetaProvider>
      <ComponentTree owner={props.owner} onTargetHover={t => setTarget(t)} />
    </div>
  )
}

export function ComponentTree(props) {
  const tree = createMemo(() => {
    const map = new Map()
    return getTree(props.owner, map, null)
  })
  const [selected, setSelected] = createSignal(null)

  return (
    <div
      id="devtools"
      class={tw`
        fixed bottom-0 left-0
        w-screen h-[50vh]
        bg-gray-900
      `}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          height: "100%",
        }}
      >
        <div
          style={{
            flex: 3,
            height: "100%",
            overflow: "scroll",
          }}
        >
          <Show when={tree()}>
            <Node
              node={tree()}
              setSelected={setSelected}
              selected={selected}
              setHoverTarget={props.onTargetHover}
            />
          </Show>
        </div>
        <div
          style={{
            flex: 1,
            height: "100%",
            overflow: "scroll",
          }}
        >
          <SelectedElement selected={selected()} />
        </div>
      </div>
    </div>
  )
}

function SelectedElement(props) {
  return (
    <Suspense fallback={"loading"}>
      <Switch>
        <Match when={props.selected?.element}>
          <Source element={props.selected?.element} />
        </Match>
      </Switch>
    </Suspense>
  )
}

function Source(props) {
  const [resource] = createResource(
    () => props.element.dataset.sourceLoc,
    async loc => {
      let [file, line, col] = loc.split(":")
      let src = await fetch("__src" + file).then(res => res.text())
      console.log(line, col)
      return {
        src,
        lines: src.split("\n"),
        line: Number(line),
        col: Number(col),
      }
    },
  )
  return (
    <div
      style={{
        "font-size": "0.6rem",
        display: "flex",
        "flex-direction": "column",
      }}
      // innerText={resource()?.src}
    >
      <For each={resource()?.lines}>
        {(line, index) => (
          <pre
            style={{
              margin: 0,
              opacity: index() === resource()?.line - 1 ? 1 : 0.5,
            }}
          >
            {line}
          </pre>
        )}
      </For>
    </div>
  )
}

function Node(props) {
  const [toggle, setToggle] = createSignal(true)
  console.log(props.node)
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        "font-size": "0.6rem",
        "font-family": "Roboto Mono",
      }}
      //"relative flex flex-col font-mono text-xs h-full"}
    >
      <div
        style={{
          display: "flex",
          "flex-direction": "row",
          "align-items": "center",
        }}
        //"flex flex-row items-center space-x-1"
      >
        <div>
          <Show
            when={props.node.children?.length}
            fallback={
              <div
              // style={{
              //   width: "4px"
              // }}
              />
            }
          >
            <div
              style={{
                "margin-left": "-8px",
              }}
              onClick={() => setToggle(t => !t)}
            >
              <Show when={!toggle()} fallback={"▼"}>
                ▶
              </Show>
            </div>
          </Show>
        </div>

        <div
          style={{
            color: "purple",
          }}
          onMouseEnter={() => {
            if (props.node.element) props.setHoverTarget(props.node.element)
            else if (props.node.children?.length) {
              function getDomNodes(node) {
                console.log(node.children)
                let elements = node.children
                  ?.map(child => {
                    if (child.element) {
                      return child.element
                    } else {
                      return getDomNodes(child)
                    }
                  })
                  .flat()
                  .filter(Boolean)
                return elements ?? []
              }
              let elements = getDomNodes(props.node)
              props.setHoverTarget(elements)
            }
          }}
          onMouseLeave={() => {
            if (props.node.element || props.node.children?.length) props.setHoverTarget(null)
          }}
          onClick={() => props.setSelected(props.node)}
        >
          {"<"}
          {props.node.componentName}
          <Show when={props.node.children?.length && toggle()} fallback={"/>"}>
            {">"}
          </Show>
        </div>
      </div>
      <Show when={toggle()}>
        <div
          style={{
            "margin-left": "16px",
            display: "flex",
            "flex-direction": "column",
          }}
        >
          <For each={props.node.children}>
            {child => (
              <div>
                <Node
                  node={child}
                  selected={props.selected}
                  setSelected={props.setSelected}
                  setHoverTarget={props.setHoverTarget}
                />
              </div>
            )}
          </For>
        </div>
      </Show>
      <Show when={props.node.children.length && toggle()}>
        <div
          style={{
            display: "flex",
            "flex-direction": "row",
            "align-items": "center",
          }}
          //"flex flex-row items-center space-x-1"
        >
          <div
            onClick={() => props.setSelected(props.node)}
            style={{
              color: "purple",
            }}
          >
            {"</"}
            {props.node.componentName}
            {">"}
          </div>
        </div>
      </Show>
    </div>
  )
}

function firstLowerCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1)
}
export function getTree(owner, map, parent) {
  let node = {
    parent,
    owner: owner,
    componentName:
      (owner.componentName?.startsWith("_Hot$$")
        ? owner.componentName.slice(6)
        : owner.componentName) || "(anonymous)",
    children: [],
  }

  function visitThreeChildren(parent, object) {
    object.__r3f.objects.forEach(o => {
      let tree = {
        componentName: firstLowerCase(o.type),
        owner: o,
        children: [],
      }

      if (o?.__r3f) {
        visitThreeChildren(parent, o)
      }

      parent.children.push(tree)
    })
  }

  // function visitThreeNode(owner) {
  //   owner.componentName = firstLowerCase(owner.value.type);
  //   let tree = getTree(owner);
  //   visitThreeChildren(tree, owner.value);
  //   node.children.push(tree);
  //   return tree;
  // }
  function visitOwner(owner, map, parent) {
    if (owner.componentName) {
      node.children.push(getTree(owner, map, node))

      // if (owner.owned === null && owner.value instanceof HTMLElement) {
      //   node.children.push({
      //     componentName: owner.value.tagName.toLowerCase(),
      //     children: []
      //   });
      // } else if (owner.owned === null && owner.value instanceof Text) {
      //   node.children.push({
      //     componentName: "text",
      //     children: []
      //   });
      // }
    } else {
      // if (owner.value?.__r3f) {
      //   visitThreeNode(owner);
      // } else if (Array.isArray(owner.value)) {
      //   // owner.componentName = firstLowerCase(owner.value[0].type);
      //   // let tree = getTree(owner.value[0]);
      //   owner.value.forEach(o => {
      //     // if (o?.__r3f) {
      //     //   console.log(o?.__r3f);
      //     //   let tree = {
      //     //     componentName: getThreeTypeName(o),
      //     //     owner: o,
      //     //     children: []
      //     //   };
      //     //   visitThreeChildren(tree, o);
      //     //   node.children.push(tree);
      //     // }
      //   });
      //   // node.children.push(tree);
      // }
      visitOwners(owner, map, parent)
    }

    return node
  }

  function visitDomNode(domNode, map, components) {
    if (map.has(domNode)) {
      let comp = map.get(domNode)
      while (true) {
        if (!comp || comp.parent === node) {
          break
        }

        comp = comp.parent
      }

      if (comp) {
        components.set(comp, domNode)
        return comp
      }
      return null
    }

    if (!domNode.dataset.sourceLoc) {
      // return domNode;
    }

    return {
      componentName: domNode.tagName.toLowerCase(),
      element: domNode,
      children: [...domNode.children]
        .map(child => visitDomNode(child, map, components))
        .filter(Boolean),
    }
  }

  function visitOwners(owner, map, parent) {
    // let f = owner.owned?.find(o => o.componentName === "For");
    // if (f) {
    //   console.log("FOOR", f, owner, owner.owned, owner.owned.indexOf(f));
    //   let o = owner.owned[owner.owned.indexOf(f) + 1];
    //   visitOwner(o);
    //   // node.children.push(getTree(owner));
    // }
    owner.owned?.forEach(child => {
      visitOwner(child, map, parent)
    })

    let component = new Map()

    if (owner.value instanceof HTMLElement && !map.get(owner.value)) {
      node.children = [
        visitDomNode(owner.value, map, component),
        ...node.children.filter(child => !component.has(child)),
      ]
      map.set(owner.value, node)
    } else if (owner.value instanceof Text) {
      node.children.push({
        componentName: "text",
        text: owner.value.textContent,

        children: [],
      })
    } else if (owner.value instanceof Array) {
      owner.value.forEach(value => {
        if (value instanceof HTMLElement && !map.get(value)) {
          node.children = [
            visitDomNode(value, map, component),
            ...node.children.filter(child => !component.has(child)),
          ]
          map.set(value, node)
        } else if (value instanceof Text) {
          node.children.push({
            componentName: "text",
            text: value.textContent,
            children: [],
          })
        }
      })
    }
  }

  visitOwners(owner, map, parent)

  console.log(node)
  return node
}
