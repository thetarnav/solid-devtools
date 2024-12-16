// import * as url       from 'node:url'
import * as fs        from 'node:fs'
import * as cp        from 'node:child_process'
// import * as path      from 'node:path'    
// import * as assert    from 'node:assert/strict'
// import * as threads   from 'node:worker_threads'
import * as esb       from 'esbuild'
// import      ts        from 'typescript'

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

// const filename = url.fileURLToPath(import.meta.url)
// const dirname  = path.dirname(filename)

export const DEFAULT_EXTERNAL_DEPS: string[] = [
    'solid-js',
    'solid-js/*',
    '@solid-devtools/shared/*',
]

export function get_external_deps_from_pkg(pkg_filename: string): string[] {
    let pkg = JSON.parse(fs.readFileSync(pkg_filename) as any) as any
    let deps = Object.keys({...pkg?.peerDependencies, ...pkg?.dependencies})
    deps.push(...DEFAULT_EXTERNAL_DEPS)
    return deps
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
        logLevel:    is_dev ? 'debug' : 'warning',
        color:       true,
    }
}

export async function build(
    options:    esb.BuildOptions[],
    is_dev:     boolean,
    base_path:  string,
    dist_path:  string,
): Promise<void> {

    /* Clear dist when building to prod */
    if (!is_dev) {
        fs.rmSync(dist_path, {recursive: true, force: true})
    }

    let tsc_args = []

    if (CI) {
        tsc_args.push('--noEmitOnError')
    }
    if (is_dev) {
        tsc_args.push('--watch', '--preserveWatchOutput')
    }

    let tsc_process = cp.spawn('tsc', tsc_args, {
        cwd:   base_path,
        stdio: 'inherit',
    })

    tsc_process.on('error', error => {
        // eslint-disable-next-line no-console
        console.error('TSC process error:', error)
        if (!is_dev) process.exit(1)
    })

    // const worker = new threads.Worker(filename, {
    //     workerData: {is_dev, dist_path, base_path, ts_entries} satisfies Worker_Data,
    //     argv: process.argv,
    //     env:  process.env,
    // })

    // worker.on('error', (error) => {
    //     // eslint-disable-next-line no-console
    //     console.error(`Worker error:`, error)
    // })

    /* Watch - never terminates */
    if (is_dev) {
        for (const option of options) {
            esb.context(option)
               .then(ctx => ctx.watch())
        }
    }
    /* Build once - wait for all to finish */
    else {
        let begin = performance.now()
        await Promise.all(options.map(option => esb.build(option)))
        // eslint-disable-next-line no-console
        console.log(`JS built in ${(performance.now()-begin).toFixed(2)}ms`)    
    }
}

// function main() {
    
//     if (threads.isMainThread)
//         return

//     /* Worker - runs the ts program    */

//     const data = threads.workerData as Worker_Data

//     const port = threads.parentPort
//     assert.ok(port != null)

//     const options = get_tsc_options(data.base_path)

//     /* Watch - never terminates */
//     if (data.is_dev) {
//         const host = ts.createWatchCompilerHost(
//             data.ts_entries,
//             options,
//             ts.sys,
//             undefined,
//             report_diagnostic,
//             report_watch_status_changed,
//         )
//         ts.createWatchProgram(host)
//     }
//     /* Emit once and exit */
//     else {
//         let begin = performance.now()
//         ts.createProgram(data.ts_entries, options).emit()
//         // eslint-disable-next-line no-console
//         console.log(`DTS complete in ${(performance.now()-begin).toFixed(2)}ms`)
//         process.exit(0)
//     }
// }

// const format_host: ts.FormatDiagnosticsHost = {
//     getCurrentDirectory:  () => process.cwd(),
//     getCanonicalFileName: filename => filename,
//     getNewLine:           () => ts.sys.newLine
// }

// function report_diagnostic(diagnostic: ts.Diagnostic) {
//     // eslint-disable-next-line no-console
//     console.error(ts.formatDiagnosticsWithColorAndContext([diagnostic], format_host))
// }
// function report_diagnostics(diagnostics: ts.Diagnostic[]) {
//     // eslint-disable-next-line no-console
//     console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, format_host))
// }
// function report_watch_status_changed(diagnostic: ts.Diagnostic) {
//     // eslint-disable-next-line no-console
//     console.info(ts.formatDiagnosticsWithColorAndContext([diagnostic], format_host))
// }

// export function get_tsc_options(base_path: string): ts.CompilerOptions {

//     let ts_config_file = ts.findConfigFile(base_path, ts.sys.fileExists)
//     if (!ts_config_file) throw Error('tsconfig.json not found')

//     let {config, error} = ts.readConfigFile(ts_config_file, ts.sys.readFile)
//     if (error) {
//         report_diagnostic(error)
//     }
    
//     let {options, errors} = ts.parseJsonConfigFileContent(config, ts.sys, base_path)
//     if (errors.length > 0) {
//         report_diagnostics(errors)
//     }

//     return {
//         ...options,
//         emitDeclarationOnly: true,
//         noEmit:              false,
//         noEmitOnError:       CI,
//         declaration:         true,
//         declarationMap:      true,
//     }
// }


// main()