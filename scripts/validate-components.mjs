import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./validate-components.ts', import.meta.url))
const loader = fileURLToPath(new URL('./register-ts.mjs', import.meta.url))
const result = spawnSync(
  process.execPath,
  ['--experimental-strip-types', '--import', loader, script, ...process.argv.slice(2)],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 1)
