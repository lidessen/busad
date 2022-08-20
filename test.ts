import { busad } from "./mod.ts";

busad({
  source: {
    repo: "aoiste/deno_test_app",
    entry: "main.tsx",
  },
}).serve();
