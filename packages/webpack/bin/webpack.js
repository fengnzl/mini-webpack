#!/usr/bin/env node

import webpack from "../src/webpack.js";

const compiler = webpack();

compiler.run();
