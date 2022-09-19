import { describe, beforeEach, jest, it, test, expect } from "@jest/globals"
import { getOwner, NodeType, Solid } from "@solid-devtools/shared/graph"
import { ValueType } from "@solid-devtools/shared/serialize"
import {
  createComputed,
  createMemo,
  createRenderEffect,
  createRoot,
  createSignal,
  JSX,
} from "solid-js"
import type * as API from "../src/inspect"

const getModule = (): typeof API.collectOwnerDetails =>
  require("../src/inspect").collectOwnerDetails

const getElementsMap = (): import("@solid-devtools/shared/serialize").ElementMap =>
  new (require("@solid-devtools/shared/serialize").ElementMap)()

describe("collectOwnerDetails", () => {
  beforeEach(() => {
    delete (window as any).Solid$$
    jest.resetModules()
  })

  it("collects focused owner details", () =>
    createRoot(dispose => {
      const collectOwnerDetails = getModule()
      const [s, setS] = createSignal(0, { name: "source" })

      let owner!: Solid.Owner
      const div = document.createElement("div")
      const elementMap = getElementsMap()

      createComputed(
        () => {
          const focused = createMemo(
            () => {
              owner = getOwner()!
              owner.sdtId = "ff"
              s()
              createSignal(div, { name: "element" })
              const memo = createMemo(() => 0, undefined, { name: "memo" })
              createRenderEffect(memo, undefined, { name: "render" })
              return "value"
            },
            undefined,
            { name: "focused" },
          )
          focused()
        },
        undefined,
        { name: "WRAPPER" },
      )

      const { details, signalMap } = collectOwnerDetails(owner, {
        elementMap,
        inspectedProps: new Set(),
        signalUpdateHandler: () => {},
      })

      expect(details).toEqual({
        id: "ff",
        name: "focused",
        type: NodeType.Memo,
        path: ["1", "0"],
        value: { type: ValueType.String, value: "value" },
        sources: ["5"],
        observers: ["0"],
        signals: [
          {
            type: NodeType.Signal,
            id: "2",
            name: "element",
            observers: [],
            value: { type: ValueType.Element, value: { name: "DIV", id: "0" } },
          },
          {
            type: NodeType.Memo,
            id: "3",
            name: "memo",
            observers: ["4"],
            value: { type: ValueType.Number, value: 0 },
          },
        ],
      })

      expect(signalMap).toHaveProperty("2")
      expect(signalMap).toHaveProperty("3")
      expect(signalMap["2"].sdtId).toBe("2")
      expect(signalMap["3"].sdtId).toBe("3")

      expect(elementMap.get("0")).toBe(div)

      dispose()
    }))

  it("component props", () => {
    const collectOwnerDetails = getModule()

    createRoot(dispose => {
      let elementMap = getElementsMap()

      let owner!: Solid.Owner
      const TestComponent = (props: {
        count: number
        children: JSX.Element
        nested: { foo: number; bar: string }
      }) => {
        owner = getOwner()!
        return <div>{props.children}</div>
      }
      createRenderEffect(() => (
        <TestComponent count={123} nested={{ foo: 1, bar: "2" }}>
          <button>Click me</button>
        </TestComponent>
      ))

      const { details } = collectOwnerDetails(owner, {
        elementMap,
        inspectedProps: new Set(),
        signalUpdateHandler: () => {},
      })

      dispose()

      expect(details).toEqual({
        id: "2",
        name: "TestComponent",
        type: NodeType.Component,
        signals: [],
        sources: [],
        path: ["1", "0"],
        value: { type: ValueType.Element, value: { id: "0", name: "DIV" } },
        props: {
          proxy: false,
          record: {
            count: { type: ValueType.Number, value: 123 },
            children: { type: ValueType.Getter, value: "children" },
            nested: { type: ValueType.Object, value: 2 },
          },
        },
      })

      expect(elementMap.get("0")).toBeInstanceOf(HTMLDivElement)
    })
  })

  it("dynamic component props", () =>
    createRoot(dispose => {
      const collectOwnerDetails = getModule()
      let elementMap = getElementsMap()

      let owner!: Solid.Owner
      const Button = (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) => {
        owner = getOwner()!
        return <button {...props}>Click me</button>
      }
      createRenderEffect(() => {
        const props = () => ({ onClick: () => {}, role: "button" } as const)
        return <Button {...props()} />
      })

      const { details } = collectOwnerDetails(owner, {
        elementMap,
        inspectedProps: new Set(),
        signalUpdateHandler: () => {},
      })

      expect(details).toEqual({
        id: "2",
        name: "Button",
        type: NodeType.Component,
        signals: [],
        sources: [],
        path: ["1", "0"],
        value: { type: ValueType.Element, value: { id: "0", name: "BUTTON" } },
        props: {
          // ! this should be true, don't know what's the reason. it's working in the browser
          proxy: false,
          record: {
            onClick: { type: ValueType.Getter, value: "onClick" },
            role: { type: ValueType.Getter, value: "role" },
          },
        },
      })

      expect(elementMap.get("0")).toBeInstanceOf(HTMLButtonElement)

      dispose()
    }))

  test("inspected component props", () => {
    const collectOwnerDetails = getModule()

    createRoot(dispose => {
      let elementMap = getElementsMap()

      let owner!: Solid.Owner
      const TestComponent = (props: {
        count: number
        children: JSX.Element
        nested: { foo: number; bar: string }
      }) => {
        owner = getOwner()!
        return <div>{props.children}</div>
      }
      createRenderEffect(() => (
        <TestComponent count={123} nested={{ foo: 1, bar: "2" }}>
          <button>Click me</button>
        </TestComponent>
      ))

      const { details } = collectOwnerDetails(owner, {
        elementMap,
        inspectedProps: new Set(["nested"]),
        signalUpdateHandler: () => {},
      })

      dispose()

      expect(details).toEqual({
        id: "2",
        name: "TestComponent",
        type: NodeType.Component,
        signals: [],
        sources: [],
        path: ["1", "0"],
        value: { type: ValueType.Element, value: { id: "0", name: "DIV" } },
        props: {
          proxy: false,
          record: {
            count: { type: ValueType.Number, value: 123 },
            children: { type: ValueType.Getter, value: "children" },
            nested: {
              type: ValueType.Object,
              value: 2,
              children: {
                foo: { type: ValueType.Number, value: 1 },
                bar: { type: ValueType.String, value: "2" },
              },
            },
          },
        },
      })

      expect(elementMap.get("0")).toBeInstanceOf(HTMLDivElement)
    })
  })
})
