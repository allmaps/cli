function parseJson () {
  return new Promise((resolve, reject) => {
    let input = ''

    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', (chunk) => {
      input += chunk
    })

    process.stdin.on('end', function () {
      try {
        const data = JSON.parse(input)
        resolve(data)
      } catch (err) {
        reject(err)
      }
    })
  })
}

module.exports = {
  parseJson
}
