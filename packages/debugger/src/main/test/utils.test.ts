import * as s from 'solid-js'
import * as vi from 'vitest'
import {NodeType} from '../constants'
import api from '../solid-api'
import {Solid} from '../types'
import {getOwnerType} from '../utils'

vi.describe('getOwnerType', () => {
    const tests = {
        Component: () => {
            let owner!: Solid.Owner
            s.createComponent(() => {
                owner = api.getOwner()!
                return ''
            }, {})
            vi.expect(getOwnerType(owner)).toBe(NodeType.Component)
        },
        Effect: () => {
            s.createEffect(() => {
                vi.expect(getOwnerType(api.getOwner()!)).toBe(NodeType.Effect)
            })
        },
        Memo: () => {
            s.createMemo(() => vi.expect(getOwnerType(api.getOwner()!)).toBe(NodeType.Memo))
        },
        Computation: () => {
            s.createComputed(() =>
                vi.expect(getOwnerType(api.getOwner()!)).toBe(NodeType.Computation),
            )
        },
        Render: () => {
            s.createRenderEffect(() =>
                vi.expect(getOwnerType(api.getOwner()!)).toBe(NodeType.Render),
            )
        },
        Root: () => {
            s.createRoot(dispose => {
                vi.expect(getOwnerType(api.getOwner()!)).toBe(NodeType.Root)
                dispose()
            })
        },
        Context: () => {
            let memo!: Solid.Owner
            const Ctx = s.createContext(0)
            Ctx.Provider({
                value: 1,
                get children() {
                    memo = api.getOwner()!
                    return ''
                },
            })
            const ctx = memo.owner!
            vi.expect(getOwnerType(ctx)).toBe(NodeType.Context)
            vi.expect(ctx.owned).toHaveLength(2)
            vi.expect(getOwnerType(ctx.owned![0]!)).toBe(NodeType.Memo)
            vi.expect(getOwnerType(ctx.owned![1]!)).toBe(NodeType.Memo)
            vi.expect(ctx.owned![0]!).toBe(memo)
        },
    }

    const apis: Record<string, (cb: () => void) => void> = {
        root: cb => {
            let dispose!: () => void
            s.createRoot(d => {
                dispose = d
                cb()
            })
            api.onCleanup(dispose)
        },
        memo: s.createMemo,
        effect: s.createEffect,
        render: s.createRenderEffect,
        computed: s.createComputed,
        component: cb => {
            s.createComponent(() => {
                cb()
                return ''
            }, {})
        },
        context: cb => {
            const Ctx = s.createContext(0)
            Ctx.Provider({
                value: 1,
                get children() {
                    cb()
                    return ''
                },
            })
        },
    }

    for (const [wrapper_name, wrapper] of Object.entries(apis)) {
        vi.describe('under ' + wrapper_name, () => {
            for (const [name, test] of Object.entries(tests)) {
                vi.test('identifies ' + name, () => {
                    s.createRoot(d => {
                        wrapper(test)
                        d()
                    })
                })
            }
        })
    }
})
