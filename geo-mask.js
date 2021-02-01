#!/usr/bin/env node

const fs = require('fs')

const annotationParser = require('@allmaps/annotation')
const transform = require('@allmaps/transform')

// TODO: also accept annotation from stdin
const argv = require('yargs')
  .options({
    annotation: {
      alias: 'a',
      describe: 'Path to georeference annotation',
      demandOption: true
    }
  })
  .help('help')
  .argv

const annotation = JSON.parse(fs.readFileSync(argv.annotation))

const maps = annotationParser.parse(annotation)

const features = maps.map((map) => {
  const transformArgs = transform.createTransformer(map.gcps)

  const geoMask = map.pixelMask
    .map((point) => transform.toWorld(transformArgs, point))

  return {
    type: 'Feature',
    properties: {
      id: map.id,
      source: map.source,
      imageService: map.imageService
    },
    geometry: {
      type: 'Polygon',
      coordinates: [geoMask]
    }
  }
})

const geojson = {
  type: 'FeatureCollection',
  features
}

console.log(JSON.stringify(geojson, null, 2))
