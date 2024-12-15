import * as babel from '@babel/core'
import * as t     from '@babel/types'
import * as debug from '@solid-devtools/debugger/types'
import * as path  from 'node:path'

export const enum DevtoolsModule {
    Main  = 'solid-devtools',
    Setup = 'solid-devtools/setup',
}

export function getProgram(path: babel.NodePath): babel.NodePath<t.Program> {
    while (!path.isProgram()) {
        path = path.parentPath!
    }
    return path
}

export function importFromRuntime(path: babel.NodePath, name: string, as: string): void {
    const program = getProgram(path)
    program.unshiftContainer('body', [
        t.importDeclaration(
            [t.importSpecifier(t.identifier(as), t.identifier(name))],
            t.stringLiteral('solid-devtools/setup'),
        ),
    ])
}


const NAME_ID      = /* @__PURE__ */ t.identifier('name')
const UNDEFINED_ID = /* @__PURE__ */ t.identifier('undefined')

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

export const namePlugin: babel.PluginObj<any> = {
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

export const SET_COMPONENT_LOC = 'setComponentLocation'
export const SET_COMPONENT_LOC_LOCAL = `_$${SET_COMPONENT_LOC}`

const isUpperCase = (s: string): boolean => /^[A-Z]/.test(s)

const getLocationAttribute = (filePath: string, line: number, column: number): debug.LocationAttr =>
    `${filePath}:${line}:${column}`

function getNodeLocationAttribute(
    node: t.Node,
    state: {filename?: unknown},
    isJSX = false,
): string | undefined {
    if (!node.loc || typeof state.filename !== 'string') return
    return getLocationAttribute(
        path.relative(process.cwd(), state.filename),
        node.loc.start.line,
        // 2 is added to place the caret after the "<" character
        node.loc.start.column + (isJSX ? 2 : 0),
    )
}

let transformCurrentFile = false
let importedRuntime      = false

function importComponentSetter(path: babel.NodePath): void {
    if (importedRuntime) return
    importFromRuntime(path, SET_COMPONENT_LOC, SET_COMPONENT_LOC_LOCAL)
    importedRuntime = true
}

export type JsxLocationPluginConfig = {
    jsx: boolean
    components: boolean
}

export function jsxLocationPlugin(config: JsxLocationPluginConfig): babel.PluginObj<any> {

    const projectPathAst = babel.template(
        `globalThis.${debug.WINDOW_PROJECTPATH_PROPERTY} = %%loc%%;`)({
            loc: t.stringLiteral(process.cwd()),
        }
    ) as t.Statement

    const buildMarkComponent = babel.template(
        `${SET_COMPONENT_LOC_LOCAL}(%%loc%%);`
    ) as (...args: Parameters<ReturnType<typeof babel.template>>) => t.Statement

    return {
        name: '@solid-devtools/location',
        visitor: {
            Program(path, state) {
                transformCurrentFile = false
                importedRuntime = false
                // target only project files
                if (typeof state.filename !== 'string' || !state.filename.includes(process.cwd())) return
                transformCurrentFile = true
    
                // inject projectPath variable
                path.node.body.push(projectPathAst)
            },
            ...(config.jsx && {
                JSXOpeningElement(path, state) {
                    const {openingElement} = path.container as t.JSXElement
                    if (!transformCurrentFile || openingElement.name.type !== 'JSXIdentifier') return
    
                    // Filter native elements
                    if (isUpperCase(openingElement.name.name)) return
    
                    const location = getNodeLocationAttribute(openingElement, state, true)
                    if (!location) return
    
                    openingElement.attributes.push(
                        t.jsxAttribute(
                            t.jsxIdentifier(debug.LOCATION_ATTRIBUTE_NAME),
                            t.stringLiteral(location),
                        ),
                    )
                },
            }),
            ...(config.components && {
                FunctionDeclaration(path, state) {
                    if (!transformCurrentFile || !path.node.id || !isUpperCase(path.node.id.name))
                        return
    
                    const location = getNodeLocationAttribute(path.node, state)
                    if (!location) return
    
                    importComponentSetter(path)
    
                    path.node.body.body.unshift(buildMarkComponent({loc: t.stringLiteral(location)}))
                },
                VariableDeclarator(path, state) {

                    const {init, id} = path.node

                    if (!(
                        transformCurrentFile &&
                        'name' in id && isUpperCase(id.name) &&
                        init &&
                        (init.type === 'FunctionExpression' ||
                         init.type === 'ArrowFunctionExpression') &&
                        init.body.type === 'BlockStatement'
                    )) {
                        return
                    }
    
                    const location = getNodeLocationAttribute(path.node, state)
                    if (!location) return
    
                    importComponentSetter(path)
    
                    init.body.body.unshift(buildMarkComponent({loc: t.stringLiteral(location)}))
                },
            }),
        }
    }
}
