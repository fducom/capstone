#!/usr/bin/env bash

../../../node_modules/.bin/cross-env TS_NODE_FILES=1 TS_NODE_CACHE_DIRECTORY=.cache node -r ts-node/register index.ts
