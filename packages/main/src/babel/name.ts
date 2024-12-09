import {PluginObj} from '@babel/core'
import * as t from '@babel/types'

const nameId = t.identifier('name')
const undefinedId = t.identifier('undefined')

type Comparable = t.Identifier | t.V8IntrinsicIdentifier | t.PrivateName | t.Expression
function equal(a: Comparable, b: Comparable): boolean {
    if (a.type !== b.type) return false
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (a.type) {
    case 'Identifier':
    case 'V8IntrinsicIdentifier':
        return a.name === (b as t.Identifier).name
    case 'PrivateName':
        return a.id === (b as t.PrivateName).id
    case 'MemberExpression':
        return equal(a.object,   (b as t.MemberExpression).object) &&
               equal(a.property, (b as t.MemberExpression).property)
    default: // other type of Expression
        return false
    }
}

function addNameToOptions(
    node: t.CallExpression,
    argIndex: number,
    getNameProperty: () => t.ObjectProperty | undefined,
): void {
    // fill in-between arguments with undefined
    while (node.arguments.length < argIndex) {
        node.arguments.push(undefinedId)
    }
    if (node.arguments.length === argIndex) {
        // no options argument
        const nameProperty = getNameProperty()
        nameProperty && node.arguments.push(t.objectExpression([nameProperty]))
    } else {
        // existing options argument
        const options = node.arguments[argIndex]!
        if (options.type !== 'ObjectExpression') return
        // Check there isn't already a "name" property
        if (
            options.properties.some(
                property =>
                    property.type === 'ObjectProperty' &&
                    property.key.type === 'Identifier' &&
                    property.key.name === nameId.name,
            )
        ) {
            return
        }

        const nameProperty = getNameProperty()
        nameProperty && options.properties.unshift(nameProperty)
    }
}

type Source =
    | 'createSignal'
    | 'createMemo'
    | 'createStore'
    | 'createMutable'
    | 'createEffect'
    | 'createRenderEffect'
    | 'createComputed'

const SOURCE_TYPES: Record<'returning' | 'effect', ReadonlySet<Source>> = {
    returning: new Set<Source>(['createSignal', 'createMemo', 'createStore', 'createMutable']),
    effect: new Set<Source>(['createEffect', 'createRenderEffect', 'createComputed']),
}

const SOURCE_MODULES: Record<string, ReadonlySet<Source>> = {
    'solid-js': new Set<Source>([
        'createSignal',
        'createMemo',
        'createEffect',
        'createRenderEffect',
        'createComputed',
    ]),
    'solid-js/store': new Set<Source>(['createStore', 'createMutable']),
}

const OPTIONS_ARG: Record<Source, number> = {
    createSignal: 1,
    createMemo: 2,
    createStore: 1,
    createMutable: 1,
    createEffect: 2,
    createRenderEffect: 2,
    createComputed: 2,
}

function getTarget(
    node: Comparable,
    sources: typeof Sources,
    includedOptions: ReadonlySet<Source>,
): Source | undefined {
    return Object.entries(sources).find(
        ([sourcesKey, someSources]) =>
            includedOptions.has(sourcesKey as Source) &&
            someSources.some(source => equal(node, source)),
    )?.[0] as Source | undefined
}

let Sources: Record<Source, Comparable[]>
let FileWithImports: boolean = false

export const namePlugin: PluginObj<any> = {
    name: '@solid-devtools/name',
    visitor: {
        Program() {
            Sources = {
                createSignal: [],
                createMemo: [],
                createStore: [],
                createMutable: [],
                createEffect: [],
                createRenderEffect: [],
                createComputed: [],
            }
            FileWithImports = false
        },

        // Track imported references to sources
        ImportDeclaration(path) {
            const node = path.node
            const source = node.source.value
            const targets = SOURCE_MODULES[source]
            if (!targets) return

            for (const s of node.specifiers) {
                // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
                switch (s.type) {
                    // import * as local from "solid-js"
                    case 'ImportNamespaceSpecifier':
                        for (const target of targets) {
                            Sources[target].push(t.memberExpression(s.local, t.identifier(target)))
                            FileWithImports = true
                        }
                        break
                    // import { createSignal } from "solid-js"
                    // import { createSignal as local } from "solid-js"
                    // import { "createSignal" as local } from "solid-js"
                    case 'ImportSpecifier': {
                        const name =
                            s.imported.type === 'Identifier' ? s.imported.name : s.imported.value
                        if (targets.has(name as Source)) {
                            Sources[name as Source].push(s.local)
                            FileWithImports = true
                        }
                        break
                    }
                }
            }
        },

        VariableDeclaration(path) {
            if (!FileWithImports) return

            const declarations = path.node.declarations
            for (const declaration of declarations) {
                // Check initializer is a call to createSignal/createMemo/createStore/createMutable
                const init = declaration.init
                if (!init || init.type !== 'CallExpression') continue

                const target = getTarget(init.callee, Sources, SOURCE_TYPES.returning)
                if (!target) continue

                // Modify call to include name in options
                addNameToOptions(init, OPTIONS_ARG[target], () => {
                    // Check declaration is either identifier or [identifier, ...]
                    const id = declaration.id
                    const name = (() => {
                        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
                        switch (id.type) {
                            case 'Identifier':
                                return id.name
                            case 'ArrayPattern': {
                                if (!id.elements.length) return
                                const first = id.elements[0]
                                if (!first) return
                                if (first.type !== 'Identifier') return
                                return first.name
                            }
                        }
                    })()

                    return name ? t.objectProperty(nameId, t.stringLiteral(name)) : undefined
                })
            }
        },

        CallExpression(path) {
            if (!FileWithImports) return

            const node = path.node
            const target = getTarget(node.callee, Sources, SOURCE_TYPES.effect)
            if (!target) return

            // Modify call to include name in options
            addNameToOptions(node, 2, () => {
                let name: string | undefined

                let parentPath = path.parentPath as typeof path.parentPath | null
                for (let i = 0; i < 5; i++) {
                    if (!parentPath) return
                    if (
                        parentPath.node.type === 'CallExpression' &&
                        parentPath.node.callee.type === 'Identifier'
                    ) {
                        name = `to_${parentPath.node.callee.name}`
                        break
                    }
                    if (
                        (parentPath.node.type === 'FunctionDeclaration' ||
                            parentPath.node.type === 'VariableDeclarator') &&
                        parentPath.node.id?.type === 'Identifier'
                    ) {
                        name = `in_${parentPath.node.id.name}`
                        break
                    }
                    parentPath = parentPath.parentPath
                }
                if (!name) return

                return t.objectProperty(nameId, t.stringLiteral(name))
            })
        },
    },
}