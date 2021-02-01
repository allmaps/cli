# Allmaps - Command Line Tools

Clone this repository:

    git clone https://github.com/allmaps/cli.git

Then, install the dependencies:

    npm install

__TODO__:

  - [ ] Add script to create annotation from command line args (GCPs, pixel mask)
  - [ ] Turn multiple maps into single GeoTIFF or map tile set
  - [ ] Turn `iiif-image.js` into CLI tool (accept args)

__To run the examples in this README, clone the [`cli-examples`](https://github.com/allmaps/cli-examples) repository in the same directory where you have cloned this repository.__

## IIIF tiles from image files

Example:

    ./iiif-tiles.js -i ../cli-examples/NL-RtSA_4201_I-138-02-5.jpg -o ../cli-examples/iiif

## IIIF Manifest from IIIF Images

Example:

    ./iiif-manifest.js -m 'https://rotterdamspubliek.nl/iiif/manifest/test' \
      -i https://rotterdamspubliek.nl/iiif/863C7B0202ED49629FF21D3CC48E7A24/info.json \
      -i https://rotterdamspubliek.nl/iiif/A136B927DA744CD2BEA9F1A3FF2271BA/info.json \

## GeoJSON mask from georeference annotation

Example:

    ./geo-mask.js -a ../cli-examples/NL-RtSA_4201_I-138-02-5.json

## Map tiles from image files and georeferencing annotations

Examples:

    ./annotation-to-gdal-script.js -a ../cli-examples/NL-RtSA_4201_I-138-02-5.json \
        -s ../cli-examples -o ../cli-examples/tiles | bash
