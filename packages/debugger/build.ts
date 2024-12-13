import * as path      from 'node:path'
import * as url       from 'node:url'
import * as fs        from 'node:fs'
import * as assert    from 'node:assert/strict'
import * as threads   from 'node:worker_threads'
import * as esb       from 'esbuild'
import      ts        from 'typescript'
import * as esb_solid from 'esbuild-plugin-solid'


const filename = url.fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)

const src_dirname  = path.join(dirname, `src`)
const dist_dirname = path.join(dirname, `dist`)

const entry_index_filename = path.join(src_dirname, `index.ts`)
const entry_setup_filename = path.join(src_dirname, `setup.ts`)
const entry_types_filename = path.join(src_dirname, `types.ts`)

const is_dev = process.argv.includes('--watch')


function main() {

	/* Clear dist when building to prod */
	if (!is_dev && threads.isMainThread) {
		fs.rmSync(dist_dirname, {recursive: true, force: true})
	}

	run_emit_js()
	run_emit_dts()
}

async function run_emit_js() {

	if (!threads.isMainThread)
		return

	const pkg = (await import('./package.json', {with: {type: 'json'}})).default
	const external = Object.keys({...pkg.peerDependencies, ...pkg.dependencies})

	const common: esb.BuildOptions = {
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

	const options: esb.BuildOptions[] = [{
		/* Normal */
		...common,
		entryPoints: {
			index: entry_index_filename,
			types: entry_types_filename,
		},
		plugins:     [esb_solid.solidPlugin()],
		external:    external,
	}, {
		/* Bundled */
		...common,
		entryPoints: {
			bundled: entry_index_filename,
		},
		plugins:     [esb_solid.solidPlugin()],
	}, {
        /* Setup */
		...common,
		entryPoints: {
			setup: entry_setup_filename,
		},
		external:    external,
    }]

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

function run_emit_dts() {

	/* Main thread - spawns a worker */
	if (threads.isMainThread) {

		const worker = new threads.Worker(filename, {argv: process.argv})

		worker.on('error', (error) => {
			// eslint-disable-next-line no-console
			console.error(`Worker error:`, error)
		})

	}
	/* Worker - runs the ts program	*/
	else {

		const entry_files = [
			entry_index_filename,
			entry_setup_filename,
			entry_types_filename,
		]

		const port = threads.parentPort
		assert.ok(port != null)

		const options = get_tsc_options()

		/* Watch - never terminates */
		if (is_dev) {
			const host = ts.createWatchCompilerHost(
				entry_files,
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
			ts.createProgram(entry_files, options).emit()
			// eslint-disable-next-line no-console
			console.log(`DTS complete in ${(performance.now()-begin).toFixed(2)}ms`)
			process.exit(0)
		}
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

export function get_tsc_options(): ts.CompilerOptions {

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