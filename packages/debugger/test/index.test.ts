import { attachDebugger } from "../src"
import { isServer } from "@solid-primitives/utils"
import { DEV } from "solid-js"

describe("test", () => {
	it("should work", () => {
		expect(true).toBe(true)
	})
	it("it's not a server", () => {
		expect(isServer).toBe(false)
	})
	it("runs in dev", () => {
		expect(typeof DEV.writeSignal).toBe("function")
	})
})
