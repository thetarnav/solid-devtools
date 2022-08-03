import { traverse } from "@babel/core"
import generate from "@babel/generator"
import { parse } from "@babel/parser"
import { storeOverwriteName, storeOverwriteNamespace } from "../src/utils"
import plugin from "../src/wrapStores"

function assertTransform(src: string, expectedOutput: string) {
  const ast = parse(src, {
    sourceType: "module",
    plugins: ["jsx"],
  })

  traverse(ast, plugin.visitor)
  const res = generate(ast)

  expect(res.code).toBe(expectedOutput)
}

describe("createStore", () => {
  test("named import", () => {
    const src = /*javascript*/ `import { createStore } from "solid-js/store";`

    const expectedOutput = /*javascript*/ `import { createStore as ${storeOverwriteName}0 } from "solid-js/store";

const createStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};`

    assertTransform(src, expectedOutput)
  })

  test("renamed import", () => {
    const src = /*javascript*/ `import { createStore as createSolidStore } from "solid-js/store";`

    const expectedOutput = /*javascript*/ `import { createStore as ${storeOverwriteName}0 } from "solid-js/store";

const createSolidStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};`

    assertTransform(src, expectedOutput)
  })
})

describe("createMutable", () => {
  test("named import", () => {
    const src = /*javascript*/ `import { createMutable } from "solid-js/store";`

    const expectedOutput = /*javascript*/ `import { createMutable as ${storeOverwriteName}0 } from "solid-js/store";

const createMutable = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};`

    assertTransform(src, expectedOutput)
  })

  test("renamed import", () => {
    const src = /*javascript*/ `import { createMutable as createSolidStore } from "solid-js/store";`

    const expectedOutput = /*javascript*/ `import { createMutable as ${storeOverwriteName}0 } from "solid-js/store";

const createSolidStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};`

    assertTransform(src, expectedOutput)
  })
})

test("namespace import", () => {
  const src = /*javascript*/ `import * as Store from "solid-js/store";`

  const expectedOutput = /*javascript*/ `import * as ${storeOverwriteNamespace} from "solid-js/store";
const ${storeOverwriteName}0 = ${storeOverwriteNamespace}.createStore;
const ${storeOverwriteName}1 = ${storeOverwriteNamespace}.createMutable;
const Store = { ...${storeOverwriteNamespace}
};

Store.createStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};

Store.createMutable = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}1(wrappedObj, options);
};`

  assertTransform(src, expectedOutput)
})

test("both", () => {
  const src = /*javascript*/ `import { createMutable, createStore } from "solid-js/store";`

  const expectedOutput = /*javascript*/ `import { createMutable as ${storeOverwriteName}0, createStore as ${storeOverwriteName}1 } from "solid-js/store";

const createMutable = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};

const createStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}1(wrappedObj, options);
};`

  assertTransform(src, expectedOutput)
})
