# Busad

Build and Serve your app with Deno!

this project is in a very early stage, you can try it by running `deno run -A https://deno.land/x/busad@0.1.0-alpha.1/demo.ts`, and use query `?branch=test` to switch branch

```ts
import { busad } from "https://deno.land/x/busad@0.1.0-alpha.1/mod.ts";

busad({
  source: {
    repo: "aoiste/deno_test_app",
    entry: "main.tsx",
  },
}).serve();
```