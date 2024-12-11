import type {NodePath} from '@babel/core'
import * as t from '@babel/types'

export const enum DevtoolsModule {
    Main  = 'solid-devtools',
    Setup = 'solid-devtools/setup',
}

export function getProgram(path: NodePath): NodePath<t.Program> {
    while (!path.isProgram()) {
        path = path.parentPath!
    }
    return path
}

export function importFromRuntime(path: NodePath, name: string, as: string): void {
    const program = getProgram(path)
    program.unshiftContainer('body', [
        t.importDeclaration(
            [t.importSpecifier(t.identifier(as), t.identifier(name))],
            t.stringLiteral('solid-devtools/setup'),
        ),
    ])
}
