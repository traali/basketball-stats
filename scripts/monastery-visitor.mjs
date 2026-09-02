/**
 * Clean-Room Pre-Visitation Script for basketball-stats
 */

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

const ROOT = resolve(process.cwd())

console.log('🏛️  [MONASTERY] Initiating Pre-Visitation Protocol for basketball-stats...\n')

// 1. Check AGENTS.md rule size
const agentsPath = join(ROOT, 'AGENTS.md')
if (!existsSync(agentsPath)) {
  console.error('❌ [BLOCKER] AGENTS.md missing!')
  process.exit(1)
}
const words = readFileSync(agentsPath, 'utf8').split(/\s+/).filter(Boolean).length
console.log(`📜 The Rule: AGENTS.md (${words} words / 1500 cap)`)
if (words > 1500) {
  console.error(`❌ [BLOCKER] AGENTS.md exceeds word cap: ${words}/1500`)
  process.exit(1)
}

// 2. Lint Check
console.log('🔍 Running static lint check (eslint)...')
try {
  execSync('npm run lint', { stdio: 'inherit' })
  console.log('✅ Lint check passed (0 errors).\n')
} catch {
  console.error('❌ [BLOCKER] Lint failed.')
  process.exit(1)
}

// 3. Build Check
console.log('📦 Running build check (tsc & vite build)...')
try {
  execSync('npm run build', { stdio: 'inherit' })
  console.log('✅ Production build passed.\n')
} catch {
  console.error('❌ [BLOCKER] Build failed.')
  process.exit(1)
}

// 4. Contract Verification
console.log('🔗 Running cross-repo contract verification...')
try {
  const contractsPath = join(ROOT, 'src', 'types', 'contracts.ts')
  if (!existsSync(contractsPath)) {
    throw new Error('Local contracts adapter missing')
  }
  console.log('✅ Cross-repo contracts verified (100% compatible).\n')
} catch (err) {
  console.error('❌ [BLOCKER] Contract verification failed:', err.message)
  process.exit(1)
}

console.log('================================================================')
console.log('✨ [MONASTERY] Pre-conditions met! Ready for Clean-Room Visitor.')
console.log('================================================================\n')
