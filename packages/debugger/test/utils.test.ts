import { SolidOwner, getOwner, OwnerType } from "@shared/graph"
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
		expect(getOwnerType(owner)).toBe(OwnerType.Component)
	})
	it("identifies Effect", () =>
		createRoot(dispose => {
			createEffect(() => {
				expect(getOwnerType(getOwner()!)).toBe(OwnerType.Effect)
				dispose()
			})
		}))
	it("identifies Memo", () =>
		createRoot(dispose => {
			createMemo(() => expect(getOwnerType(getOwner()!)).toBe(OwnerType.Memo))
			dispose()
		}))
	it("identifies Computation", () =>
		createRoot(dispose => {
			createComputed(() => expect(getOwnerType(getOwner()!)).toBe(OwnerType.Computation))
			dispose()
		}))
	it("identifies Render Effect", () =>
		createRoot(dispose => {
			createRenderEffect(() => expect(getOwnerType(getOwner()!)).toBe(OwnerType.Render))
			dispose()
		}))
	it("identifies Root", () =>
		createRoot(dispose => {
			expect(getOwnerType(getOwner()!)).toBe(OwnerType.Root)
			dispose()
		}))
})
