import { SolidOwner, getOwner, NodeType } from "@shared/graph"
import {
	createComponent,
	createComputed,
	createEffect,
	createMemo,
	createRenderEffect,
	createRoot,
} from "solid-js"
import { getOwnerType } from "../src/utils"

describe("getOwnerType", () => {
	it("identifies Component", () => {
		let owner!: SolidOwner
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
