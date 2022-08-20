# Busad

Build and Serve your app with Deno!


```ts
import { busad } from "https://deno.land/x/busad@0.1.0-alpha.0/mod.ts";

busad({
  source: {
    repo: "aoiste/deno_test_app",
    entry: "main.tsx",
  },
}).serve();
```