#!/bin/bash

debug=""
if [ "$1" == "-d" ]; then
    debug="--map"
fi
coffee --compile --output js/ $debug src/*.coffee
