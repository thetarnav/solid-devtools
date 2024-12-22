import * as url  from 'node:url'
import * as fs   from 'node:fs'
import * as cp   from 'node:child_process'
import * as path from 'node:path'    
import * as esb  from 'esbuild'

import {
    get_is_dev_from_args,
    type Package_Json,
} from './build_shared.ts'


const is_dev = get_is_dev_from_args()

const filename = url.fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)


/*
 Spawn separate tsc process
*/
{
    let tsc_args = ['pnpm', 'build:types']
    
    if (is_dev) {
        tsc_args.push('--watch', '--preserveWatchOutput')
    }
    
    let tsc_process = cp.spawn(tsc_args[0]!, tsc_args.slice(1), {stdio: 'inherit'})
    
    tsc_process.on('error', error => {
        // eslint-disable-next-line no-console
        console.error('TSC process error:', error)
        if (!is_dev) process.exit(1)
    })
}


/*
 Build all packages with esbuild
 using options exported from /packages/ * /build.ts
*/

const packages_dirname = path.join(dirname, 'packages')

const packages_dirents = fs.readdirSync(packages_dirname, {withFileTypes: true})
const packages_names = []
for (let dirent of packages_dirents) {
    if (dirent.isDirectory() && dirent.name !== 'types' && dirent.name !== 'dist') {
        packages_names.push(dirent.name)
    }
}

type Build_Task = {
    promise: Promise<void>
    resolve: () => void
    done:    boolean
}
function make_build_task(): Build_Task {
    let task: Build_Task = {} as any
    task.promise = new Promise(resolve => {task.resolve = () => {task.done = true; resolve()}})
    return task
}

type Build_Config = {
    pkg_json: Package_Json
    options:  esb.BuildOptions
    task:     Build_Task
}
let configs: Build_Config[] = []

for (let name of packages_names) {

    let pkg_path = path.join(packages_dirname, name)

    let pkg_json_path = path.join(pkg_path, 'package.json')
    let pkg_json      = JSON.parse(fs.readFileSync(pkg_json_path) as any) as Package_Json
    
    let build_path   = path.join(pkg_path, 'build.ts')
    let options_list = (await import(build_path)).default() as esb.BuildOptions[]

    for (let options of options_list) {
        configs.push({pkg_json, options, task: make_build_task()})
    }
}

for (let config of configs) {

    let deps_pkg = config.pkg_json.dependencies || {}
    let deps_external = config.options.external || []
    let deps_configs = new Map<string, Build_Config>()

    /*
     Find which internal dependencies build needs to wait on
     Only necessary when the dependency is not parked as "external"
     and bundled in with the package
    */
    for (let dep_name of Object.keys(deps_pkg)) {
        if (deps_external.includes(dep_name)) continue
        
        let dep_config = configs.find(c => c.pkg_json.name === dep_name)
        if (dep_config) deps_configs.set(dep_name, dep_config)
    }

    let deps_plugin: esb.Plugin = {
        name: 'wait-for-deps',
        setup(build) {

            let begin = performance.now()

            build.onStart(() => {
                if (config.task.done) {
                    config.task = make_build_task()
                }
                begin = performance.now()
            })

            build.onEnd(() => {
                // eslint-disable-next-line no-console
                console.log(`\x1b[36m${config.pkg_json.name}\x1b[0m built in \x1b[33m${(performance.now()-begin).toFixed()}ms\x1b[0m`)
                config.task.resolve()
            })

            /* Wait for each dependency to be done when requested */
            for (let dep of deps_configs.values()) {
                build.onResolve({filter: new RegExp('^'+dep.pkg_json.name)}, async args => {
                    if (!dep.task.done) {
                        // eslint-disable-next-line no-console
                        console.log(`\x1b[36m${config.pkg_json.name}\x1b[0m waits on \x1b[36m${args.path}\x1b[0m`)
                        await dep.task.promise
                    }
                    return null
                })
            }
        },
    }

    config.options.plugins = [
        ...(config.options.plugins || []),
        deps_plugin,
    ]
}

/* Watch - never terminates */
if (is_dev) {
    for (let c of configs) {
        esb.context(c.options)
            .then(ctx => ctx.watch())
    }
}
/* Build once - wait for all to finish */
else {
    await Promise.all(configs.map(c => esb.build(c.options)))
}
