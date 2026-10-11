import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./make-icons.py', import.meta.url))
const result = spawnSync('python3', [script], { stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status ?? 1)
