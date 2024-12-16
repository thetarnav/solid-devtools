import {type FalsyValue} from '@solid-primitives/utils'
import {getSdtId, ObjectType} from '../main/id.ts'
import setup from '../main/setup.ts'
import * as utils from '../main/utils.ts'
import {
    type EncodedValue,
    INFINITY,
    NAN,
    NEGATIVE_INFINITY,
    type NodeID,
    type Solid,
    UNDEFINED,
    ValueType,
} from '../types.ts'

// globals
let Deep: boolean
let List: EncodedValue[]
let Seen: Map<unknown, number>
let InStore: boolean
let HandleStore: ((node: Solid.StoreNode, nodeId: NodeID) => void) | FalsyValue
let IgnoreNextSeen: boolean

const encodeNonObject = (value: unknown): EncodedValue => {
    switch (typeof value) {
        case 'number':
            if (value === Infinity) return [ValueType.Number, INFINITY]
            if (value === -Infinity) return [ValueType.Number, NEGATIVE_INFINITY]
            if (isNaN(value)) return [ValueType.Number, NAN]
            return [ValueType.Number, value]
        case 'boolean':
            return [ValueType.Boolean, value]
        case 'string':
            return [ValueType.String, value]
        case 'symbol':
            return [ValueType.Symbol, value.description || '']
        case 'function':
            return [ValueType.Function, value.name]
        case 'object':
            return [ValueType.Null, null]
        case 'bigint':
        case 'undefined':
            return [ValueType.Null, UNDEFINED]
    }
}

function encode(value: unknown): number {
    const ignoreNextStore = IgnoreNextSeen
    if (ignoreNextStore) IgnoreNextSeen = false
    else {
        const seen = Seen.get(value)
        if (seen !== undefined) return seen
    }

    // Non-Objects
    if (!value || typeof value !== 'object') {
        const index = List.push(encodeNonObject(value)) - 1
        Seen.set(value, index)
        return index
    }

    const encoded: EncodedValue = [] as any
    const index = List.push(encoded) - 1
    ignoreNextStore || Seen.set(value, index)

    // HTML Elements
    if (value instanceof Element) {
        ;(encoded as EncodedValue<ValueType.Element>)[0] = ValueType.Element
        ;(encoded as EncodedValue<ValueType.Element>)[1] = `${getSdtId(
            value,
            ObjectType.Element,
        )}:${value.localName}`
    }
    // Store Nodes
    else if (!ignoreNextStore && utils.isStoreNode(value)) {
        // might still pass in a proxy
        const node = setup.store.unwrap(value)
        // set unwrapped as seen as well
        if (node !== value) Seen.set(node, index)
        const id = getSdtId(node, ObjectType.StoreNode)
        !InStore && HandleStore && HandleStore(node, id)
        const wasInStore = InStore
        InStore = IgnoreNextSeen = true
        ;(encoded as EncodedValue<ValueType.Store>)[0] = ValueType.Store
        ;(encoded as EncodedValue<ValueType.Store>)[1] = `${id}:${encode(node)}`
        InStore = wasInStore
    }
    // Arrays
    else if (Array.isArray(value)) {
        ;(encoded as EncodedValue<ValueType.Array>)[0] = ValueType.Array
        ;(encoded as EncodedValue<ValueType.Array>)[1] = Deep ? value.map(encode) : value.length
    } else {
        const name = Object.prototype.toString.call(value).slice(8, -1)
        // normal objects (records)
        if (name === 'Object') {
            ;(encoded as EncodedValue<ValueType.Object>)[0] = ValueType.Object
            if (Deep) {
                const data: Record<string, number> = ((
                    encoded as EncodedValue<ValueType.Object>
                )[1] = {})
                for (const [key, descriptor] of Object.entries(
                    Object.getOwnPropertyDescriptors(value),
                )) {
                    data[key] = descriptor.get ? -1 : encode(descriptor.value)
                }
            } else {
                ;(encoded as EncodedValue<ValueType.Object>)[1] = Object.keys(value).length
            }
        }
        // custom objects
        else {
            ;(encoded as EncodedValue<ValueType.Instance>)[0] = ValueType.Instance
            ;(encoded as EncodedValue<ValueType.Instance>)[1] = name
        }
    }

    return index
}

/**
 * Encodes any value to a JSON-serializable object.
 * @param value
 * @param deep shallow, or deep encoding
 * @param nodeMap for HTML elements and store nodes, to assign a unique ID to each element
 * @param handleStore handle encountered store nodes
 * @returns encoded value
 */
export function encodeValue(
    value: unknown,
    deep: boolean,
    handleStore?: typeof HandleStore,
    inStore = false,
): EncodedValue[] {
    Deep = deep
    List = []
    Seen = new Map()
    InStore = inStore
    HandleStore = handleStore

    encode(value)
    const result = List

    Deep = List = Seen = HandleStore = InStore = undefined!

    return result as any
}
