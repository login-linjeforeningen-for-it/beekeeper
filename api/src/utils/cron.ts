import checkMaxConnectionsCron from './query/maxConnections.ts'
import monitor from './status/monitor.ts'

export default function cron() {
    checkMaxConnectionsCron()
    setInterval(async() => {
        monitor()
    }, 60000)
}
