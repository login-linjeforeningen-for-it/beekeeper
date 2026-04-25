import checkMaxConnectionsCron from './query/maxConnections.ts'
import monitor from './status/monitor.ts'
import { startScout } from './scouterbee/run.ts'

export default function cron() {
    checkMaxConnectionsCron()
    void startScout()
    setInterval(async() => {
        monitor()
    }, 60000)
}
