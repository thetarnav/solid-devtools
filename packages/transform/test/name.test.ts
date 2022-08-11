import plugin from "../src/name"
import wrapPlugin from "../src/wrapStores"
import { assertTransform } from "./utils"

// Positive tests
for (let [create, module] of [
  ["createSignal", "solid-js"],
  ["createStore", "solid-js/store"],
  ["createMutable", "solid-js/store"],
]) {
  describe(create, () => {
    for (let [type, importStatement, creator] of [
      ["named import", `import { ${create} } from "${module}";`, create],
      ["renamed import", `import { ${create} as foo } from "${module}";`, "foo"],
      ["namespace import", `import * as foo from "${module}";`, `foo.${create}`],
    ]) {
      describe(type, () => {
        test("no default value", () => {
          const src = `${importStatement}
  const signal = ${creator}();`

          const expectedOutput = `${importStatement}
const signal = ${creator}(undefined, {
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test("default value", () => {
          const src = `${importStatement}
const signal = ${creator}(5);`

          const expectedOutput = `${importStatement}
const signal = ${creator}(5, {
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test("empty options", () => {
          const src = `${importStatement}
const rest = {};
const signal = ${creator}(5, {});`

      const expectedOutput = `${importStatement}
const rest = {};
const signal = ${creator}(5, {
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test("options excluding name", () => {
          const src = `${importStatement}
const rest = {};
const signal = ${creator}(5, { equals: false, ...rest });`

          const expectedOutput = `${importStatement}
const rest = {};
const signal = ${creator}(5, {
  name: "signal",
  equals: false,
  ...rest
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test("options including name", () => {
          const src = `${importStatement}
const rest = {};
const signal = ${creator}(5, { equals: false, name: "foo", ...rest });`

          const expectedOutput = `${importStatement}
const rest = {};
const signal = ${creator}(5, {
  equals: false,
  name: "foo",
  ...rest
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test("array of length 1", () => {
          const src = `${importStatement}
const [signal] = ${creator}(5);`

          const expectedOutput = `${importStatement}
const [signal] = ${creator}(5, {
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })

        test("array of length 2", () => {
          const src = `${importStatement}
const [signal, setSignal] = ${creator}(5);`

          const expectedOutput = `${importStatement}
const [signal, setSignal] = ${creator}(5, {
  name: "signal"
});`

          assertTransform(src, expectedOutput, plugin)
        })
      })
    }
  })
}

// Negative tests
for (let [create, module] of [
  ["createSignal", "solid-js/store"],
  ["createStore", "solid-js"],
  ["createMutable", "solid-js"],
]) {
  describe(create, () => {
    test(`no import`, () => {
      const src = `const signal = ${create}();`

      assertTransform(src, src, plugin)
    })

    test(`incorrect import`, () => {
      const src = `import { ${create} } from "${module}";
const signal = ${create}();`

      assertTransform(src, src, plugin)
    })
  })
}

describe("wrapStores interaction", () => {
  test("named import", () => {
    const src = `import { createStore } from "solid-js/store";
const signal = createStore();`

    const expectedOutput = `import { createStore as $sdt_createStore0 } from "solid-js/store";

const createStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return $sdt_createStore0(wrappedObj, options);
};

const signal = createStore(undefined, {
  name: "signal"
});`

    assertTransform(src, expectedOutput, plugin, wrapPlugin)
  })
});
