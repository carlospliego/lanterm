const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'buildNumber.json')
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
data.build++
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
console.log(`Build number: ${data.build}`)
