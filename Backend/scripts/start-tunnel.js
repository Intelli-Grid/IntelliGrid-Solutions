/**
 * Start Backend with Public Tunnel for Webhook Testing
 * Uses 'localtunnel' to expose localhost:10000
 */

import localtunnel from 'localtunnel'
import { spawn } from 'child_process'

// 1. Start the Backend Server
const server = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: './Backend' // Important: Run from Backend directory
})

// 2. Create Tunnel
const port = 10000

console.log('🔄 Starting tunnel...')

const tunnel = await localtunnel({ port: port, subdomain: 'intelligrid-test' })

console.log('\n==================================================')
console.log('🌍 PUBLIC URL FOR WEBHOOKS:')
console.log(`${tunnel.url}/api/v1/payment/paypal/webhook`)
console.log('==================================================\n')

tunnel.on('close', () => {
    console.log('Tunnel closed')
})

server.on('close', () => {
    tunnel.close()
})
