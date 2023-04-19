/* eslint-disable no-console */
// see https://developer.chrome.com/docs/devtools/console/format-style/
// to gen a overview of how to style console messages

import { getNodeName, getNodeType, getOwnerType, isSolidMemo } from '@solid-devtools/debugger'
import { NODE_TYPE_NAMES, NodeType, Solid, UNKNOWN } from '@solid-devtools/debugger/types'
import { dedupeArray } from '@solid-devtools/shared/utils'
import { getDiffMap, getStackDiffMap } from './utils'

export type NodeState = {
  type: NodeType
  typeName: string
  name: string
}

export type NodeStateWithValue = NodeState & { value: unknown }

export const UNUSED = Symbol('unused')

export type ComputationState = {
  owned: Solid.Computation[]
  owner: Solid.Owner | NodeState | null | typeof UNUSED
  prev: unknown | typeof UNUSED
  value: unknown | typeof UNUSED
  sources: (Solid.Computation | Solid.Signal)[]
  causedBy: NodeStateWithValue[] | null
}

export const STYLES = {
  bold: 'font-weight: bold; font-size: 1.1em;',
  ownerName:
    'font-weight: bold; font-size: 1.1em; background: rgba(153, 153, 153, 0.3); padding: 0.1em 0.3em; border-radius: 4px;',
  grayBackground: 'background: rgba(153, 153, 153, 0.3); padding: 0 0.2em; border-radius: 4px;',
  signalUnderline: 'text-decoration: orange wavy underline;',
  new: 'color: orange; font-style: italic',
}

export const inGray = (text: unknown) => `\x1B[90m${text}\x1B[m`
export const styleTime = (time: number) => `\x1B[90;3m${time} ms\x1B[m`

export const getNameStyle = (type: NodeType): string =>
  type === NodeType.Signal ? STYLES.signalUnderline : STYLES.grayBackground

export function getValueSpecifier(v: unknown) {
  if (typeof v === 'object') return ' %o'
  if (typeof v === 'function') return ' %O'
  return ''
}

export function getNodeState(owner: Solid.Owner | Solid.Signal | NodeState): NodeState {
  if ('type' in owner && 'typeName' in owner && 'name' in owner) return owner
  const type = getNodeType(owner)
  return {
    type,
    typeName: NODE_TYPE_NAMES[type],
    name: getNodeName(owner) ?? UNKNOWN,
  }
}
export function getNodeStateWithValue(
  owner: Solid.Computation | Solid.Signal | NodeStateWithValue,
): NodeStateWithValue {
  if ('type' in owner && 'typeName' in owner && 'name' in owner) return owner
  const type = getNodeType(owner)
  return {
    type,
    typeName: NODE_TYPE_NAMES[type],
    name: getNodeName(owner) ?? UNKNOWN,
    value: owner.value,
  }
}

export function createAlignedTextWidth<T extends string>(): [
  getPaddedText: (text: string) => T,
  updateWidth: (text: string) => number,
] {
  let width = 0
  return [text => text.padEnd(width) as T, text => (width = Math.max(text.length, width))]
}

export function paddedForEach<T, I extends string>(
  list: readonly T[],
  getPaddedValue: (item: T, index: number) => I,
  callback: (paddedValue: I, item: T, index: number) => void,
): void {
  const [getPaddedText, updateWidth] = createAlignedTextWidth<I>()
  const mapped: [T, I][] = list.map((item, index) => {
    const paddedValue = getPaddedValue(item, index)
    updateWidth(paddedValue)
    return [item, paddedValue]
  })
  mapped.forEach(([item, paddedValue], index) => callback(getPaddedText(paddedValue), item, index))
}

export const getComputationCreatedLabel = (
  type: string,
  name: string,
  timeElapsed: number,
): string[] => [
  `%c${type} %c${name}%c created  ${styleTime(timeElapsed)}`,
  '',
  STYLES.ownerName,
  '',
]
export const getComputationRerunLabel = (name: string, timeElapsed: number): string[] => [
  `%c${name}%c re-executed  ${styleTime(timeElapsed)}`,
  STYLES.ownerName,
  '',
]
export const getOwnerDisposedLabel = (name: string): string[] => [
  `%c${name}%c disposed`,
  STYLES.ownerName,
  '',
]

export function logPrevValue(prev: unknown): void {
  console.log(`${inGray('Previous =')}${getValueSpecifier(prev)}`, prev)
}

export const logComputationDetails = ({
  causedBy,
  owner,
  owned,
  sources,
  prev,
  value,
}: Readonly<ComputationState>) => {
  // Owner
  if (owner !== UNUSED) {
    const label = inGray('Owner:')
    if (!owner) console.log(label, null)
    else {
      const { name } = getNodeState(owner)
      console.log(`${label} %c${name}`, STYLES.grayBackground)
    }
  }

  // Value
  if (value !== UNUSED) console.log(`${inGray('Value =')}${getValueSpecifier(value)}`, value)
  if (prev !== UNUSED) logPrevValue(prev)

  // Caused By
  if (causedBy && causedBy.length) {
    if (causedBy.length === 1) {
      const cause = causedBy[0]!
      console.log(
        `%c${inGray('Caused By:')} %c${cause.name}%c ${inGray('=')}`,
        '',
        getNameStyle(cause.type),
        '',
        cause.value,
      )
    } else {
      console.groupCollapsed(inGray('Caused By:'), causedBy.length)
      causedBy.forEach(cause => {
        console.log(`%c${cause.name}%c ${inGray('=')}`, getNameStyle(cause.type), '', cause.value)
      })
      console.groupEnd()
    }
  }

  // Sources
  if (sources.length) {
    console.groupCollapsed(inGray('Sources:'), sources.length)
    sources.forEach(source => {
      const { type, name } = getNodeState(source)
      console.log(`%c${name}%c ${inGray('=')}`, getNameStyle(type), '', source.value)
    })
    console.groupEnd()
  } else {
    console.log(inGray('Sources:'), 0)
  }

  // Owned
  if (owned.length) {
    console.groupCollapsed(inGray('Owned:'), owned.length)
    logOwnerList(owned)
    console.groupEnd()
  } else {
    console.log(inGray('Owned:'), 0)
  }
}

export const logComputation = (groupLabel: string[], state: Readonly<ComputationState>) => {
  console.groupCollapsed(...groupLabel)
  logComputationDetails(state)
  console.groupEnd()
}

export function logOwned(
  ownerState: NodeState,
  owned: Readonly<Solid.Computation[]>,
  prevOwned: Readonly<Solid.Computation[]>,
) {
  console.groupCollapsed(
    `Owned by the %c${ownerState.name}%c ${ownerState.typeName}:`,
    STYLES.ownerName,
    '',
    owned.length,
  )

  logOwnersDiff(prevOwned, owned, 'stack', owner => {
    const sources = owner.sources ? dedupeArray(owner.sources) : []
    const usesPrev = !!owner.fn.length
    const usesValue = usesPrev || isSolidMemo(owner)
    logComputationDetails({
      owner: ownerState,
      owned: owner.owned ?? [],
      sources,
      prev: UNUSED,
      value: usesValue ? owner.value : UNUSED,
      causedBy: null,
    })
  })

  console.groupEnd()
}

export function logSignalsInitialValues(signals: Solid.Signal[]) {
  console.groupCollapsed('Signals initial values:')
  signals.forEach(logSignalValue)
  console.groupEnd()
}

export function logInitialValue(node: Solid.Signal | NodeStateWithValue): void {
  const { type, typeName, value, name } = getNodeStateWithValue(node)
  console.log(
    `%c${typeName} %c${name}%c initial value ${inGray('=')}${getValueSpecifier(value)}`,
    '',
    `${STYLES.bold} ${getNameStyle(type)}`,
    '',
    value,
  )
}

export function logSignalValue(signal: Solid.Signal | NodeStateWithValue): void {
  const { type, typeName, name, value } = getNodeStateWithValue(signal)
  console.log(
    `${inGray(typeName)} %c${name}%c ${inGray('=')}${getValueSpecifier(value)}`,
    `${getNameStyle(type)}`,
    '',
    value,
  )
}

export function logSignalValueUpdate(
  { name, type }: NodeState,
  value: unknown,
  prev: unknown,
  observers?: Solid.Computation[],
): void {
  console.groupCollapsed(
    `%c${name}%c updated ${inGray('=')}${getValueSpecifier(value)}`,
    `${STYLES.bold} ${getNameStyle(type)}`,
    '',
    value,
  )
  logPrevValue(prev)
  observers && logCausedUpdates(observers)
  console.groupEnd()
}

function logCausedUpdates(observers: Solid.Computation[]): void {
  if (!observers.length) return
  console.groupCollapsed(inGray('Caused Updates:'), observers.length)
  logOwnerList(observers)
  console.groupEnd()
}

export function logObservers(
  signalName: string,
  observers: Solid.Computation[],
  prevObservers: Solid.Computation[],
): void {
  const label = [
    `%c${signalName}%c observers changed:`,
    `${STYLES.bold} ${STYLES.signalUnderline}`,
    '',
    observers.length,
  ]
  if (!observers.length && !prevObservers.length) return console.log(...label)
  console.groupCollapsed(...label)
  logOwnersDiff(prevObservers, observers, 'thorow')
  console.groupEnd()
}

function logOwnersDiff<T extends Solid.Owner>(
  from: readonly T[],
  to: readonly T[],
  diff: 'thorow' | 'stack',
  logGroup?: (owner: T) => void,
): void {
  const [getMark, owners] = diff === 'thorow' ? getDiffMap(from, to) : getStackDiffMap(from, to)

  paddedForEach(
    owners,
    owner => NODE_TYPE_NAMES[getOwnerType(owner)],
    (type, owner) => {
      const mark = getMark(owner)
      const name = getNodeName(owner)
      const label = (() => {
        if (mark === 'added')
          return [`${inGray(type)} %c${name}%c  new`, STYLES.grayBackground, STYLES.new]
        if (mark === 'removed')
          return [
            `${inGray(type)} %c${name}`,
            'background: rgba(153, 153, 153, 0.15); padding: 0 0.2em; border-radius: 4px; text-decoration: line-through; color: #888',
          ]
        return [`${inGray(type)} %c${name}`, STYLES.grayBackground]
      })()
      if (logGroup) {
        console.groupCollapsed(...label)
        logGroup(owner)
        console.groupEnd()
      } else console.log(...label)
    },
  )
}

export function logOwnerList<T extends Solid.Owner>(
  owners: readonly T[],
  logGroup?: (owner: T) => void,
): void {
  paddedForEach(
    owners,
    owner => NODE_TYPE_NAMES[getOwnerType(owner)],
    (type, owner) => {
      const label = [`${inGray(type)} %c${getNodeName(owner)}`, STYLES.grayBackground]
      if (logGroup) {
        console.groupCollapsed(...label)
        logGroup(owner)
        console.groupEnd()
      } else console.log(...label)
    },
  )
}

//
// PROPS
//

export function getPropsInitLabel(state: NodeState, proxy: boolean, empty: boolean): string[] {
  const { type, typeName, name } = state
  return [
    `%c${typeName} %c${name}%c created with ${empty ? 'empty' : ''}${proxy ? 'dynamic ' : ''}props`,
    '',
    getNameStyle(type),
    '',
  ]
}

export function getPropsKeyUpdateLabel({ name, type }: NodeState, empty: boolean): any[] {
  return [
    `Dynamic props of %c${name}%c ${empty ? 'are empty now' : 'updated keys:'}`,
    getNameStyle(type),
    '',
  ]
}

export function getPropLabel(
  type: 'Getter' | 'Value',
  name: string,
  value: unknown,
  occurrence: 'added' | 'removed' | null,
): any[] {
  // stayed
  if (occurrence === null)
    return [`${inGray(type)} ${name} ${inGray('=')}${getValueSpecifier(value)}`, value]
  // added
  if (occurrence === 'added')
    return [
      `${inGray(type)} ${name}%c new ${inGray('=')}${getValueSpecifier(value)}`,
      STYLES.new,
      value,
    ]
  // removed
  return [`${inGray(type)} %c${name}`, 'text-decoration: line-through; color: #888']
}
