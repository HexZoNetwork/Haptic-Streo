# Maintainer Notes

Dokumen ini untuk maintainer internal.

## Release Build

1. `npm run pack:tarballs`
2. Output: `release/tarballs/*.tgz`

## npm Publish

1. `npm run publish:dry-run`
2. `npm login`
3. `npm run publish:packages`

## Local Installer Test

1. `npm run install:cli`
2. `npm run uninstall:cli`
