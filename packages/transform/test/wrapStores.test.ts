import { storeOverwriteName, storeOverwriteNamespace } from "../src/utils"
import plugin from "../src/wrapStores"
import { assertTransform } from "./utils"

describe("createStore", () => {
  test("named import", () => {
    const src = `import { createStore } from "solid-js/store";`

    const expectedOutput = `import { createStore as ${storeOverwriteName}0 } from "solid-js/store";

const createStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};`

    assertTransform(src, expectedOutput, plugin)
  })

  test("renamed import", () => {
    const src = `import { createStore as createSolidStore } from "solid-js/store";`

    const expectedOutput = `import { createStore as ${storeOverwriteName}0 } from "solid-js/store";

const createSolidStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};`

    assertTransform(src, expectedOutput, plugin)
  })
})

describe("createMutable", () => {
  test("named import", () => {
    const src = `import { createMutable } from "solid-js/store";`

    const expectedOutput = `import { createMutable as ${storeOverwriteName}0 } from "solid-js/store";

const createMutable = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};`

    assertTransform(src, expectedOutput, plugin)
  })

  test("renamed import", () => {
    const src = `import { createMutable as createSolidStore } from "solid-js/store";`

    const expectedOutput = `import { createMutable as ${storeOverwriteName}0 } from "solid-js/store";

const createSolidStore = (obj, options) => {
  let wrappedObj = obj;

  if (typeof window.$sdt_wrapStore === "function") {
    wrappedObj = window.$sdt_wrapStore(obj);
  }

  return ${storeOverwriteName}0(wrappedObj, options);
};`

    assertTransform(src, expectedOutput, plugin)
  })
})

test("namespace import", () => {
  const src = `import * as Store from "solid-js/store";`

  const expectedOutput = `import * as ${storeOverwriteNamespace} from "solid-js/store";
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

  assertTransform(src, expectedOutput, plugin)
})

test("both", () => {
  const src = `import { createMutable, createStore } from "solid-js/store";`

  const expectedOutput = `import { createMutable as ${storeOverwriteName}0, createStore as ${storeOverwriteName}1 } from "solid-js/store";

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

  assertTransform(src, expectedOutput, plugin)
})
