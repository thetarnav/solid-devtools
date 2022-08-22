import { Solid, getOwner, NodeType } from "@solid-devtools/shared/graph"
import {
  createComponent,
  createComputed,
  createEffect,
  createMemo,
  createRenderEffect,
  createRoot,
  createSignal,
} from "solid-js"
import { getFunctionSources, getOwnerType, onDispose } from "../src/utils"

describe("getOwnerType", () => {
  it("identifies Component", () => {
    let owner!: Solid.Owner
    createRoot(dispose => {
      createComponent(() => {
        owner = getOwner()!
        return ""
      }, {})
      dispose()
    })
    expect(getOwnerType(owner)).toBe(NodeType.Component)
  })
  it("identifies Effect", () =>
    createRoot(dispose => {
      createEffect(() => {
        expect(getOwnerType(getOwner()!)).toBe(NodeType.Effect)
        dispose()
      })
    }))
  it("identifies Memo", () =>
    createRoot(dispose => {
      createMemo(() => expect(getOwnerType(getOwner()!)).toBe(NodeType.Memo))
      dispose()
    }))
  it("identifies Computation", () =>
    createRoot(dispose => {
      createComputed(() => expect(getOwnerType(getOwner()!)).toBe(NodeType.Computation))
      dispose()
    }))
  it("identifies Render Effect", () =>
    createRoot(dispose => {
      createRenderEffect(() => expect(getOwnerType(getOwner()!)).toBe(NodeType.Render))
      dispose()
    }))
  it("identifies Root", () =>
    createRoot(dispose => {
      expect(getOwnerType(getOwner()!)).toBe(NodeType.Root)
      dispose()
    }))
})

describe("getFunctionSources", () => {
  it("returns the sources of a function", () =>
    createRoot(dispose => {
      const [c] = createSignal(0)
      const m = createMemo(c)

      const owner = getOwner()!
      const cNode = Object.values(owner.sourceMap!)[0]
      const mNode = owner.owned![0]

      const sources = getFunctionSources(() => {
        c()
        m()
      })

      expect(sources).toEqual([cNode, mNode])
      dispose()
    }))
})

describe("onDispose", () => {
  it("call callback on dispose, not cleanup", () =>
    createRoot(dispose => {
      let calls = 0
      const [c, setC] = createSignal(0)
      createComputed(() => {
        c()
        onDispose(() => calls++, { id: "123" })
      })

      setC(1)
      expect(calls).toBe(0)

      dispose()
      expect(calls).toBe(1)
    }))
})
