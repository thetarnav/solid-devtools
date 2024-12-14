import * as path      from 'node:path'
import * as url       from 'node:url'
import * as fs        from 'node:fs'
import * as assert    from 'node:assert/strict'
import * as threads   from 'node:worker_threads'
import * as esb       from 'esbuild'
import      ts        from 'typescript'

type Worker_Data = {
    is_dev:       boolean,
    dist_dirname: string,
    ts_entries:   string[],
}

const filename = url.fileURLToPath(import.meta.url)
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
    }
}

function main() {
    
	if (threads.isMainThread)
        return

	/* Worker - runs the ts program	*/

    const data = threads.workerData as Worker_Data

	const port = threads.parentPort
	assert.ok(port != null)

	const options = get_tsc_options(data.dist_dirname)

	/* Watch - never terminates */
	if (data.is_dev) {
		const host = ts.createWatchCompilerHost(
			data.ts_entries,
			options,
			ts.sys,
			undefined,
			report_diagnostic,
			report_watch_status_changed,
		)
		ts.createWatchProgram(host)
	}
	/* Emit once and exit */
	else {
		let begin = performance.now()
		ts.createProgram(data.ts_entries, options).emit()
		// eslint-disable-next-line no-console
		console.log(`DTS complete in ${(performance.now()-begin).toFixed(2)}ms`)
		process.exit(0)
	}
}

export async function build(
	options:      esb.BuildOptions[],
	ts_entries:   string[],
    is_dev:       boolean,
	dist_dirname: string = path.join(process.cwd(), `dist`),
): Promise<void> {

	/* Clear dist when building to prod */
	if (!is_dev) {
		fs.rmSync(dist_dirname, {recursive: true, force: true})
	}

	const worker = new threads.Worker(filename, {
        workerData: {is_dev, dist_dirname, ts_entries} satisfies Worker_Data
    })

	worker.on('error', (error) => {
		// eslint-disable-next-line no-console
		console.error(`Worker error:`, error)
	})

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

const format_host: ts.FormatDiagnosticsHost = {
	getCurrentDirectory:  () => process.cwd(),
	getCanonicalFileName: (fileName) => fileName,
	getNewLine:           () => ts.sys.newLine
}

function report_diagnostic(diagnostic: ts.Diagnostic) {
	// eslint-disable-next-line no-console
	console.error(ts.formatDiagnostic(diagnostic, format_host))
}
function report_diagnostics(diagnostics: ts.Diagnostic[]) {
	// eslint-disable-next-line no-console
	console.error(ts.formatDiagnostics(diagnostics, format_host))
}
function report_watch_status_changed(diagnostic: ts.Diagnostic) {
	// eslint-disable-next-line no-console
	console.info(ts.formatDiagnostic(diagnostic, format_host))
}

export function get_tsc_options(dist_dirname: string): ts.CompilerOptions {

	let ts_config_file = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json')
	if (!ts_config_file) throw Error('tsconfig.json not found')

	let {config, error} = ts.readConfigFile(ts_config_file, ts.sys.readFile)
	if (error) {
		report_diagnostic(error)
	}
	
	let {options, errors} = ts.parseJsonConfigFileContent(config, ts.sys, process.cwd())
	if (errors.length > 0) {
		report_diagnostics(errors)
	}

	return {
		...options,
		outDir:              dist_dirname,
		emitDeclarationOnly: true,
		noEmit:              false,
		noEmitOnError:       false,
		declaration:         true,
		sourceMap:           true,
	}
}


main()