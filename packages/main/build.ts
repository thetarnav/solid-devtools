import * as path      from 'node:path'
import * as url       from 'node:url'
import * as esb       from 'esbuild'

import      pkg       from './package.json' with {type: 'json'}
import      solid_pkg from 'solid-js/package.json' with {type: 'json'}

import * as build     from '../../build_shared.ts'


const filename = url.fileURLToPath(import.meta.url)
const dirname  = path.dirname(filename)

const src_dirname  = path.join(dirname, `src`)
const dist_dirname = path.join(dirname, `dist`)

const entry_index_filename      = path.join(src_dirname, `index.ts`)
const entry_setup_filename      = path.join(src_dirname, `setup.ts`)
const entry_index_noop_filename = path.join(src_dirname, `index_noop.ts`)
const entry_setup_noop_filename = path.join(src_dirname, `setup_noop.ts`)
const entry_vite_filename       = path.join(src_dirname, `vite.ts`)
const entry_babel_filename      = path.join(src_dirname, `babel.ts`)

const pkg_filename = path.join(dirname, 'package.json')


export default () => {

    const external = build.get_external_deps_from_pkg(pkg_filename)
    const is_dev   = build.get_is_dev_from_args()
    const common   = build.get_common_esbuild_options(is_dev, dist_dirname)

    const esb_options: esb.BuildOptions[] = [{
        /* Browser */
        ...common,
        entryPoints: {
            index:      entry_index_filename,
            setup:      entry_setup_filename,
            index_noop: entry_index_noop_filename,
            setup_noop: entry_setup_noop_filename,
        },
        external:    external,
        define:      {
            ...common.define,
            'process.env.CLIENT_VERSION':         JSON.stringify(pkg.version),
            'process.env.SOLID_VERSION':          JSON.stringify(solid_pkg.version),
            'process.env.EXPECTED_SOLID_VERSION': JSON.stringify(pkg.peerDependencies['solid-js'].match(/\d+.\d+.\d+/)![0]),
        },
    }, {
        /* Node */
        ...common,
        entryPoints: {
            vite:  entry_vite_filename,
            babel: entry_babel_filename,
        },
        external:    external,
        platform:    'node',
    }]

    return esb_options
}
