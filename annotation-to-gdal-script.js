#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const { getIiifImageFilename, getImageBasename } = require('./iiif-image')
const { parseJson } = require('./lib/cli.js')
const { gdalwarp, gdalmerge, gdal2tiles } = require('./lib/gdal.js')

const { parse: parseAnnotation } = require('@allmaps/annotation')
const { createTransformer, toWorld } = require('@allmaps/transform')

const argv = require('yargs')
  .options({
    annotation: {
      alias: 'a',
      describe: 'Annotation filename, with georeferencing data'
    },
    dir: {
      alias: 'd',
      describe: 'Directory to look for images in - instead of downloading them from their IIIF source'
    },
    'output-dir': {
      alias: 'o',
      describe: 'Output directory',
      default: './output'
    },
    'source-dir': {
      alias: 's',
      describe: 'Directory with source images'
    }
  })
  .help('help')
  .argv

const outputDir = argv['output-dir']
const sourceDir = argv['source-dir']

async function run () {
  let annotation
  if (argv.annotation) {
    annotation = JSON.parse(fs.readFileSync(argv.annotation))
  } else {
    annotation = await parseJson()
  }

  let annotationId
  if (annotation['@id']) {
    annotationId = annotation['@id'].split('/').slice(-1)[0]
  } else {
    // TODO: check file extention!
    annotationId = path.basename(argv.annotation, '.json')
  }

  // TODO: use regular for loop to avoid parallellisssssm
  const maps = await Promise.all(parseAnnotation(annotation).map(async (map) => {
    const transformArgs = createTransformer(map.gcps)

    const geoMask = {
      type: 'Polygon',
      coordinates: [map.pixelMask.map((point) => toWorld(transformArgs, point))]
    }

    return {
      gcps: map.gcps,
      pixelMask: map.pixelMask,
      geoMask,
      imageFilename: await getIiifImageFilename(map, outputDir, sourceDir),
      basename: getImageBasename(map)
    }
  }))

  const gdalwarpScript = maps
    .map((map) => gdalwarp(map.imageFilename, map.basename, outputDir,
      map.gcps, map.geoMask))
    .join('\n')

  let gdalScripts = [
    gdalwarpScript
  ]

  if (maps.length === 1) {
    const outputTiff = `${maps[0].basename}-warped.tif`
    const gdal2tilesScript = gdal2tiles(outputDir, outputTiff, maps[0].basename)

    gdalScripts = [
      ...gdalScripts,
      gdal2tilesScript
    ]
  } else {
    const outputTiff = `${annotationId}.tif`
    const inputTiffs = maps.map((map) => `${map.basename}-warped.tif`)

    const gdalmergeScript = gdalmerge(outputDir, inputTiffs, outputTiff)
    const gdal2tilesScript = gdal2tiles(outputDir, outputTiff, annotationId)

    gdalScripts = [
      ...gdalScripts,
      gdalmergeScript,
      gdal2tilesScript
    ]
  }

  console.log(gdalScripts.join('\n'))
}

run()
