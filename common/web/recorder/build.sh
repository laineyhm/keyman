#!/usr/bin/env bash
#
# Compiles development-related KeymanWeb resources for use with developing/running tests.
#   - the Recorder module (for engine tests)
#   - the DOM module (for touch-alias and element-interface tests)

set -eu

## START STANDARD BUILD SCRIPT INCLUDE
# adjust relative paths as necessary
THIS_SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
. "${THIS_SCRIPT%/*}/../../../resources/build/build-utils.sh"
## END STANDARD BUILD SCRIPT INCLUDE

. "$KEYMAN_ROOT/resources/shellHelperFunctions.sh"

################################ Main script ################################


builder_describe \
  "Compiles the web-oriented utility function module." \
  "@/common/web/keyman-version" \
  configure \
  clean \
  build \
  ":module      Builds recorder-core module" \
  ":proctor     Builds headless-testing, node-oriented 'proctor' component"

builder_describe_outputs \
  configure          "/node_modules" \
  configure:module   "/node_modules" \
  configure:proctor  "/node_modules" \
  build:module    "/common/web/recorder/build/index.js" \
  build:proctor   "/common/web/recorder/build/nodeProctor/index.js"

builder_parse "$@"

if builder_start_action configure; then
  verify_npm_setup
  builder_finish_action success configure
fi

if builder_start_action clean:module; then
  tsc -b --clean "$THIS_SCRIPT_PATH/src/tsconfig.json"
  builder_finish_action success clean:module
fi

if builder_start_action clean:proctor; then
  tsc -b --clean "$THIS_SCRIPT_PATH/src/nodeProctor.tsconfig.json"
  builder_finish_action success clean:proctor
fi

if builder_start_action build:module; then
  tsc --build "$THIS_SCRIPT_PATH/src/tsconfig.json"
  builder_finish_action success build:module
fi

if builder_start_action build:proctor; then
  tsc --build "$THIS_SCRIPT_PATH/src/nodeProctor.tsconfig.json"
  builder_finish_action success build:proctor
fi