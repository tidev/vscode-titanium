#! /usr/bin/env sh

# npm scripts are run as "nobody" which screws up the extensions detection of the appc cli
# So, run via this shell script
node ./out/test/integration/runTests.js
