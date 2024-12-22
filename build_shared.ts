import * as fs        from 'node:fs'
import * as esb       from 'esbuild'

function is_env_truthy(value: string | undefined): boolean {
    if (!value) return false
    value = value.toLowerCase().trim()
    return value === 'true'
        || value === '"1"'
        || value === '1'
        || value === 'yes'
        || value === 'y'
}

export const CI = is_env_truthy(process.env['CI'])
               || is_env_truthy(process.env['GITHUB_ACTIONS'])
               || !!process.env['TURBO_HASH']

// type Worker_Data = {
//     is_dev:     boolean,
//     base_path:  string,
//     dist_path:  string,
//     ts_entries: string[],
// }

export type Package_Json = {
    name:              string,
    version:           string,
    peerDependencies?: Record<string, string>,
    devDependencies?:  Record<string, string>,
    dependencies?:     Record<string, string>,
    exports?:          Record<string, {
        import: {
            types:   string,
            default: string,
        }
    }>
}

// TODO use only what is in pkg json
export const DEFAULT_EXTERNAL_DEPS: string[] = [
    'solid-js',
    'solid-js/*',
    '@solid-devtools/shared/*',
]

export function get_external_deps_from_pkg(pkg_filename: string): string[] {
    let pkg = JSON.parse(fs.readFileSync(pkg_filename) as any) as Package_Json
    return [...DEFAULT_EXTERNAL_DEPS, ...Object.keys({...pkg.peerDependencies, ...pkg.dependencies})]
}

export function get_is_dev_from_args(): boolean {
    return process.argv.includes('--watch')
}

export function get_common_esbuild_options(is_dev: boolean, dist_dirname: string): esb.BuildOptions {
    return {
        platform:    'browser',
        format:      'esm',
        target:      'esnext',
        sourcemap:   is_dev,
        outdir:      dist_dirname,
        bundle:      true,
        splitting:   true,
        treeShaking: !is_dev,
        logLevel:    is_dev ? 'info' : 'warning',
        color:       true,
        dropLabels:  [is_dev ? 'PROD' : 'DEV'],
    }
}
