import jwt from 'jsonwebtoken'
import process from 'node:process'

const args = process.argv.slice(2)
let scopes = 'admin'
let expirationHours = 24

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--scope' && args[i + 1]) {
    scopes = args[i + 1]
    i++
  }
  else if (args[i] === '--exp' && args[i + 1]) {
    const expStr = args[i + 1]
    const match = expStr.match(/^(\d+)h?$/)
    if (match) {
      expirationHours = parseInt(match[1], 10)
    }
    i++
  }
}

const jwtSecret = process.env.JWT_SECRET || 'your-secret-key'

const payload = {
  scope: scopes,
  sub: 'starkow',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (expirationHours * 3600),
}

const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' })

console.log(token)
