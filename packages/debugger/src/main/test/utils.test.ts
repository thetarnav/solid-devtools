import {
    createComponent,
    createComputed,
    createEffect,
    createMemo,
    createRenderEffect,
    createRoot,
} from 'solid-js'
import { describe, expect, it } from 'vitest'
import { NodeType } from '../constants'
import solidApi from '../solid-api'
import { Solid } from '../types'
import { getOwnerType } from '../utils'

const { getOwner } = solidApi

describe('getOwnerType', () => {
    it('identifies Component', () => {
        let owner!: Solid.Owner
        createRoot(dispose => {
            createComponent(() => {
                owner = getOwner()!
                return ''
            }, {})
            dispose()
        })
        expect(getOwnerType(owner)).toBe(NodeType.Component)
    })
    it('identifies Effect', () =>
        createRoot(dispose => {
            createEffect(() => {
                expect(getOwnerType(getOwner()!)).toBe(NodeType.Effect)
                dispose()
            })
        }))
    it('identifies Memo', () =>
        createRoot(dispose => {
            createMemo(() => expect(getOwnerType(getOwner()!)).toBe(NodeType.Memo))
            dispose()
        }))
    it('identifies Computation', () =>
        createRoot(dispose => {
            createComputed(() => expect(getOwnerType(getOwner()!)).toBe(NodeType.Computation))
            dispose()
        }))
    it('identifies Render Effect', () =>
        createRoot(dispose => {
            createRenderEffect(() => expect(getOwnerType(getOwner()!)).toBe(NodeType.Render))
            dispose()
        }))
    it('identifies Root', () =>
        createRoot(dispose => {
            expect(getOwnerType(getOwner()!)).toBe(NodeType.Root)
            dispose()
        }))
})
