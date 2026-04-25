import { runOnePasswordScout } from './onePassword.ts'
import { runProjectScout } from './projects.ts'
import { ensureScout, getScout } from './state.ts'

export async function startScout() {
    await ensureScout()
    const state = getScout()
    if (state.onePassword.enabled) {
        scheduleAligned(runOnePasswordScout, state.onePassword.intervalMinutes)
    }
    if (state.projects.enabled) {
        scheduleAligned(() => runProjectScout(state.projectRoot), state.projects.intervalMinutes)
    }
}

function scheduleAligned(fn: () => void | Promise<void>, minutes: number) {
    const now = new Date()
    const next = new Date(now)
    next.setSeconds(0, 0)

    const remainder = next.getMinutes() % minutes
    if (remainder !== 0 || now.getSeconds() !== 0 || now.getMilliseconds() !== 0) {
        next.setMinutes(next.getMinutes() + (minutes - remainder || minutes))
    }

    const delay = next.getTime() - now.getTime()
    setTimeout(() => {
        void fn()
        setInterval(() => void fn(), minutes * 60 * 1000)
    }, delay)
}
