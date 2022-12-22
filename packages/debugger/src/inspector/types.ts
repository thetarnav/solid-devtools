import type { NodeID } from '../main/types'

export const INFINITY = 'Infinity'
export const NEGATIVE_INFINITY = 'NegativeInfinity'
export const NAN = 'NaN'
export const UNDEFINED = 'undefined'

export enum ValueType {
  Number = 'number',
  Boolean = 'boolean',
  String = 'string',
  Null = 'null',
  Symbol = 'symbol',
  Array = 'array',
  Object = 'object',
  Function = 'function',
  Getter = 'getter',
  Element = 'element',
  Instance = 'instance',
  Store = 'store',
}

type EncodedValueDataMap = {
  [ValueType.Null]: null | typeof UNDEFINED
  [ValueType.Array]: number | number[]
  [ValueType.Object]: number | { [key: string]: number }
  [ValueType.Number]: number | typeof INFINITY | typeof NEGATIVE_INFINITY | typeof NAN
  [ValueType.Boolean]: boolean
  [ValueType.String]: string
  [ValueType.Symbol]: string
  [ValueType.Function]: string
  [ValueType.Getter]: string
  [ValueType.Element]: `${NodeID}:${string}`
  [ValueType.Instance]: string
  [ValueType.Store]: `${NodeID}:${number}`
}

export type EncodedValueMap = {
  [T in ValueType]: [type: T, data: EncodedValueDataMap[T]]
}
export type EncodedValue<T extends ValueType = ValueType> = EncodedValueMap[T]

export type {
  InspectorUpdate,
  SetInspectedNodeData,
  ToggleInspectedValueData,
  ValueNodeUpdate,
  StoreNodeUpdate,
  ProxyPropsUpdate,
} from '.'
