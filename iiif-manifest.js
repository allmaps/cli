#!/usr/bin/env node

const axios = require('axios')

const argv = require('yargs')
  .options({
    manifest: {
      alias: 'm',
      demandOption: true
    },
    image: {
      alias: 'i',
      demandOption: true,
      array: true
    }
  })
  .help('help')
  .argv

const manifestId = argv.manifest
const imageUrls = argv.image

const promises = imageUrls
  .map((url) => axios.get(url).then((response) => response.data))

Promise.all(promises)
  .then((images) => {
    const manifest = createManifest(manifestId, images)
    console.log(JSON.stringify(manifest, null, 2))
  })

function createManifest (manifestId, images) {
  return {
    '@context': 'http://iiif.io/api/presentation/2/context.json',
    '@type': 'sc:Manifest',
    '@id': manifestId,
    sequences: [
      {
        '@type': 'sc:Sequence',
        canvases: images.map(({'@id': imageId, width, height, profile}, index) => ({
          '@id': `${manifestId}#canvas/${index}`,
          '@type': 'sc:Canvas',
          width,
          height,
          images: [
            {
              '@id': `${manifestId}#annotation/${index}`,
              '@type': 'oa:Annotation',
              motivation: 'sc:painting',
              width,
              height,
              on: `${manifestId}#canvas/${index}`,
              resource: {
                '@id': `${imageId}/full/full/0/default.jpg`,
                '@type': 'dctypes:Image',
                width,
                height,
                service: {
                  '@context': 'http://iiif.io/api/image/2/context.json',
                  '@id': imageId,
                  profile
                }
              }
            }
          ]
        }))
      }
    ]
  }
}
