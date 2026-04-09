#!/usr/bin/env node

import { runMain } from "citty";
import { main } from "./cli/index.ts";

void runMain(main);
