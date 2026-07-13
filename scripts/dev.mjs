import { spawn } from 'node:child_process'

const vercel = spawn('npx', ['vercel', 'dev', '--listen', '3000'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
})

const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
})

function cleanup() {
  vercel.kill()
  vite.kill()
  process.exit()
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('exit', cleanup)

vercel.on('exit', (code) => {
  process.exitCode = code ?? 1
  cleanup()
})

vite.on('exit', (code) => {
  process.exitCode = code ?? 1
  cleanup()
})
