#!/usr/bin/env bash
# Transloadit jQuery SDK. Copyright (c) 2014, Transloadit Ltd.
#
# This file
#  - runs js test scenarios
#  - concatenating a pre & post script
#
# Also, since casper's --include arguments are just one big mess, but
# we still want to share code accross scenarios, we'll do it ourselves.
#
# Run like:
#
#   ./run.sh
#
# to make it iterate over all test- files. Or, for a selection of files, type:
#
#   ./run.sh <fn_pattern>
#
# Authors:
#  - Tim Koschützki <tim@transloadit.com>

set -o pipefail
# set -o errexit
set -o nounset
# set -o xtrace

__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
__root="$(dirname "${__dir}")"

pattern="${1:-system/test-*.js}"
testhost="${2:-127.0.0.1:3000}"

# Start server
node tests/server.js &
sleep 2

pushd "${__dir}"
  exitcode=0
  for file in `find ./ -type f -wholename \*${pattern}\*`; do
    basename="$(basename "${file}")"

    if [ "${basename}" = "_pre.js" ]; then
      continue;
    fi
    if [ "${basename}" = "_post.js" ]; then
      continue;
    fi

    rm -f ./screen-* 2>/dev/null  || true

    tmpfile="/tmp/casper-${basename}"
    echo "${tmpfile}"
    pushd "${__root}" > /dev/null
      cat "${__dir}/_pre.js" "${__dir}/${file}" "${__dir}/_post.js" | "./node_modules/.bin/babel" --out-file "${tmpfile}" --presets=es2015
    popd > /dev/null
    "${__root}/node_modules/casperjs/bin/casperjs" \
      test \
      "${tmpfile}" \
      --ignore-ssl-errors=yes \
      --testhost=${testhost} \
      --failscreen=./screen-fail.png || exitcode=$?

    if [ "${exitcode}" -gt 0 ]; then
      echo "--> Please \`open tests/screen-fail.png\` for the fail screen"
      echo "--> Please \`open tests/screen-*.png\` for all screens"
      echo "--> Type \`make test filter=${basename}\` to isolate this test"
      break
    fi
  done

popd

curl http://${testhost}/shutdown || true

exit ${exitcode}
