#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const sleep = require('util').promisify(setTimeout)
const axios = require('axios')
const sharp = require('sharp')

const DEFAULT_EXTENSION = '.png'

const IMAGE_EXTENSIONS = [
  '.tif',
  '.tiff',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp'
]

const isCli = require.main === module

function arrayOfLength (length) {
  return Array.from({length}).map((_, index) => index)
}

async function fetchUrl (url, config) {
  return axios({
    method: 'get',
    url,
    ...config
  }).then((response) => response.data)
}

async function fetchTile (url, ms = 2000) {
  const tile = await fetchUrl(url, {
    responseType: 'arraybuffer'
  })

  await sleep(ms)

  return tile
}

function getImageUri (map) {
  return map.imageService['@id']
}

function getImageBasename (map) {
  const imageUri = getImageUri(map)
  return imageUri.split('/').slice(-1)[0]
}

async function iiifImageInDirectory (map, sourceDir) {
  const imageBasename = getImageBasename(map)

  const filenames = fs.readdirSync(sourceDir, {
    withFileTypes: true
  })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)

  for (let index = 0; index < filenames.length; index++) {
    const filename = filenames[index]
    const extension = path.extname(filename)
    const fileBasename = path.basename(filename, extension)

    if (fileBasename === imageBasename && IMAGE_EXTENSIONS.includes(extension)) {
      return path.join(sourceDir, `${imageBasename}${extension}`)
    }
  }
}

async function getIiifImageFilename (map, outputDir, sourceDir) {
  if (sourceDir) {
    const filename = iiifImageInDirectory(map, sourceDir)
    if (filename) {
      return filename
    } else {
      throw new Error('Image not found')
    }
  } else {
    try {
      const image = await getIiifImage(map)
      const filename = path.join(outputDir, `${getImageBasename(map)}${DEFAULT_EXTENSION}`)

      await image
        .toFormat('png')
        .toFile(filename)

      return filename
    } catch (err) {
      console.error(err.message)
    }
  }
}

function getTileWidth (imageWidth, tileWidth, regionX, scaleFactor = 1) {
  if (regionX + tileWidth * scaleFactor > imageWidth) {
    tileWidth = Math.floor((imageWidth - regionX + scaleFactor - 1) / scaleFactor)
  }

  return tileWidth
}

function getTileHeight (imageHeight, tileHeight, regionY, scaleFactor = 1) {
  if (regionY + tileHeight * scaleFactor > imageHeight) {
    tileHeight = Math.floor((imageHeight - regionY + scaleFactor - 1) / scaleFactor)
  }

  return tileHeight
}

// TODO: move to IIIF lib
function getIiifTileUrlSuffix (tile) {
  const region = `${tile.regionX},${tile.regionY},${tile.regionWidth},${tile.regionHeight}`
  const size = `${tile.regionWidth},`

  return `${region}/${size}/0/default.jpg`
}

async function getIiifImage (map) {
  const baseUrl = getImageUri(map)

  const imageInformation = await fetchUrl(`${baseUrl}/info.json`)

  // TODO: use sizes

  // TODO: use rendering
  // However, then we need the manifest...
  // https://purl.stanford.edu/vg994wz9415/iiif/manifest
  // "rendering": [
  //   {
  //     "@id": "https://stacks.stanford.edu/file/vg994wz9415/vg994wz9415_0001.jp2",
  //     "label": "Original source file (19.1 MB)",
  //     "format": "image/jp2"
  //   }
  // ],

  const imageWidth = imageInformation.width
  const imageHeight = imageInformation.height

  const tileset = imageInformation.tiles[0]

  const tileWidth = tileset.width
  const tileHeight = tileset.height || tileWidth

  if (!tileset.scaleFactors.includes(1)) {
    throw new Error('Cannot download tiles at 100% of the image size')
  }

  const tiles = arrayOfLength(Math.ceil(imageWidth / tileWidth))
    .map((tileXIndex) => arrayOfLength(Math.ceil(imageHeight / tileHeight))
      .map((tileYIndex) => ({
        regionX: tileXIndex * tileWidth,
        regionY: tileYIndex * tileHeight,
        regionWidth: getTileWidth(imageWidth, tileWidth, tileXIndex * tileWidth),
        regionHeight: getTileHeight(imageHeight, tileHeight, tileYIndex * tileHeight),
        tileWidth,
        tileHeight
      }))
    )
    .flat()
    .map((tile) => ({
      ...tile,
      tileUrl: `${baseUrl}/${getIiifTileUrlSuffix(tile)}`
    }))

  const tileImages = []

  for (let index = 0; index < tiles.length; index++) {
    console.error(`Downloading tile ${index + 1}/${tiles.length}`)
    const tile = tiles[index]

    const image = await fetchTile(tile.tileUrl)

    tileImages.push({
      ...tile,
      image
    })
  }

  const image = await sharp({
    create: {
      width: imageWidth,
      height: imageHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
    .composite(tileImages.map((tileImage) => ({
      input: tileImage.image,
      left: tileImage.regionX,
      top: tileImage.regionY
    })))

  return image
}

if (isCli) {
  // TODO: check stdin, otherwise use argv!
  getIiifImage()
} else {
  module.exports = {
    getIiifImage,
    getIiifImageFilename,
    iiifImageInDirectory,
    getImageBasename
  }
}
