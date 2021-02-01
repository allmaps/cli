#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const mkdirp = require('mkdirp')

const argv = require('yargs')
  .options({
    host: {
      alias: 'h',
      describe: 'Hostname, for use in @id field in info.json',
      default: 'http://localhost:8080'
    },
    image: {
      alias: 'i',
      describe: 'Image filename',
      demandOption: true
    },
    output: {
      alias: 'o',
      describe: 'Output directory',
      demandOption: true
    }
  })
  .help('help')
  .argv

const basename = path.basename(argv.image, path.extname(argv.image))
const outputPath = path.join(argv.output, basename)

mkdirp.sync(outputPath)

sharp(argv.image)
  .jpeg()
  .tile({
    size: 512,
    layout: 'iiif'
  })
  .toFile(outputPath, (err, info) => {
    if (err) {
      console.error(err)
    }

    const imageInfoFilename = path.join(outputPath, 'info.json')
    const imageInfo = JSON.parse(fs.readFileSync(imageInfoFilename))

    let host = argv.host
    if (host.endsWith('/')) {
      host = host.substring(0, host.length - 1)
    }

    imageInfo['@id'] = imageInfo['@id'].replace('https://example.com', host)
    fs.writeFileSync(imageInfoFilename, JSON.stringify(imageInfo, null, 2))

    console.log('Done...')
  })
