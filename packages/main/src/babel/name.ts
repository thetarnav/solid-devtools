import {type PluginObj} from '@babel/core'
import * as t from '@babel/types'

const NAME_ID      = t.identifier('name')
const UNDEFINED_ID = t.identifier('undefined')

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
    node:    t.CallExpression,
    arg_idx: number,
    name:    string,
): void {

    let name_property = t.objectProperty(NAME_ID, t.stringLiteral(name))

    // fill in-between arguments with undefined
    while (node.arguments.length < arg_idx) {
        node.arguments.push(UNDEFINED_ID)
    }

    // no options argument
    if (node.arguments.length === arg_idx) {
        node.arguments.push(t.objectExpression([name_property]))
    }
    else {
        // existing options argument
        const options = node.arguments[arg_idx]!
        if (options.type !== 'ObjectExpression') {
            return
        }

        // Check there isn't already a "name" property
        if (options.properties.some(prop =>
            prop.type     === 'ObjectProperty' &&
            prop.key.type === 'Identifier' &&
            prop.key.name === NAME_ID.name,
        )) {
            return
        }

        options.properties.unshift(name_property)
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

const SOURCE_TYPES = {
    returning: new Set<Source>(['createSignal', 'createMemo', 'createStore', 'createMutable']),
    effect:    new Set<Source>(['createEffect', 'createRenderEffect', 'createComputed']),
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

const OPTIONS_ARG_POS: Record<Source, number> = {
    createSignal      : 1,
    createMemo        : 2,
    createStore       : 1,
    createMutable     : 1,
    createEffect      : 2,
    createRenderEffect: 2,
    createComputed    : 2,
}

function getTarget(
    node: Comparable,
    sources: typeof Sources,
    includedOptions: ReadonlySet<Source>,
): Source | undefined {
    return Object.entries(sources).find(([sourcesKey, someSources]) =>
        includedOptions.has(sourcesKey) &&
        someSources.some(source => equal(node, source))
    )?.[0] as Source | undefined
}

let Sources: Record<Source, Comparable[]>
let FileWithImports: boolean = false

export const namePlugin: PluginObj<any> = {
    name: '@solid-devtools/autoname',
    visitor: {
        Program() {
            Sources = {
                createSignal      : [],
                createMemo        : [],
                createStore       : [],
                createMutable     : [],
                createEffect      : [],
                createRenderEffect: [],
                createComputed    : [],
            }
            FileWithImports = false
        },

        // Track imported references to sources
        ImportDeclaration(path) {

            const source = path.node.source.value
            const targets = SOURCE_MODULES[source]
            if (!targets) return

            for (const s of path.node.specifiers) {
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
                    const name = s.imported.type === 'Identifier' ? s.imported.name : s.imported.value
                    if (targets.has(name)) {
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

            for (const decl of path.node.declarations) {

                // Check initializer is a call to createSignal/createMemo/createStore/createMutable
                if (!decl.init || decl.init.type !== 'CallExpression') continue

                const target = getTarget(decl.init.callee, Sources, SOURCE_TYPES.returning)
                if (!target) continue

                let name: string

                // Check declaration is either identifier or [identifier, ...]
                if (decl.id.type === 'Identifier') {
                    name = decl.id.name
                }
                else if (decl.id.type === 'ArrayPattern' && decl.id.elements[0]?.type === 'Identifier') {
                    name = decl.id.elements[0].name
                }
                else {
                    continue
                }

                addNameToOptions(decl.init, OPTIONS_ARG_POS[target], name)
            }
        },

        CallExpression(path) {
            if (!FileWithImports) return

            const target = getTarget(path.node.callee, Sources, SOURCE_TYPES.effect)
            if (!target) return

            let name: string | undefined

            let parent = path.parentPath
            for (let i = 0; i < 5; i++) {

                if (parent.node.type        === 'CallExpression' &&
                    parent.node.callee.type === 'Identifier'
                ) {
                    name = `to_${parent.node.callee.name}`
                    break
                }

                if ((parent.node.type === 'FunctionDeclaration' ||
                     parent.node.type === 'VariableDeclarator') &&
                    parent.node.id?.type === 'Identifier'
                ) {
                    name = `in_${parent.node.id.name}`
                    break
                }

                if (parent.parentPath) {
                    parent = parent.parentPath
                } else {
                    break
                }
            }

            if (name) {
                addNameToOptions(path.node, 2, name)
            }
        },
    },
}