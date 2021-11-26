#!/bin/bash

SRCDIR=${top_srcdir:-$(realpath $(dirname $0)/../..)}
PID_FILE=/tmp/keymanutil-tests-pids

if ! which Xvfb > /dev/null || ! which Xephyr > /dev/null || ! which metacity > /dev/null; then
  echo "Please install Xvfb, Xephyr and metacity before running these tests!"
  exit 1
fi

function cleanup() {
  if [ -f $PID_FILE ]; then
    echo
    echo "Shutting down processes..."
    bash $PID_FILE > /dev/null 2>&1
    rm $PID_FILE
    rm -rf $TEMP_DATA_DIR
    echo "Finished shutdown of processes."
  fi
}

echo > $PID_FILE

trap cleanup EXIT SIGINT

echo "Starting Xvfb..."
Xvfb -screen 0 1024x768x24 :33 &> /dev/null &
echo "kill -9 $!" >> $PID_FILE
sleep 1
echo "Starting Xephyr..."
DISPLAY=:33 Xephyr :32 -screen 1024x768 &> /dev/null &
echo "kill -9 $!" >> $PID_FILE
sleep 1
echo "Starting metacity"
metacity --display=:32 &> /dev/null &
echo "kill -9 $!" >> $PID_FILE

export DISPLAY=:32

# Install schema to temporary directory. This removes the build dependency on the keyman package.
TEMP_DATA_DIR=$(mktemp --directory)
SCHEMA_DIR=$TEMP_DATA_DIR/glib-2.0/schemas
export XDG_DATA_DIRS=$TEMP_DATA_DIR:$XDG_DATA_DIRS

mkdir -p $SCHEMA_DIR
cp $SRCDIR/../keyman-config/com.keyman.gschema.xml $SCHEMA_DIR/
glib-compile-schemas $SCHEMA_DIR

export GSETTINGS_BACKEND=memory

./keymanutil-tests $@