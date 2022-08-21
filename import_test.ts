import { parseDeno, parseDenoPath, rewriteDenoImports } from "./import.ts";

console.log(parseDenoPath("/@deno/std@0.152.0/path/mod.ts"));
console.log(parseDeno("https://deno.land/std@0.152.0/path/mod.ts"));
console.log(parseDeno("https://deno.land/std@0.152.0/path/mod.ts"));
console.log(parseDeno("https://deno.land/std/path/mod.ts"));
console.log(parseDeno("https://deno.land/x/path/mod.ts"));
console.log(parseDeno("https://deno.land/x/path@0.152.0/mod.ts"));
console.log(parseDeno("https://deno.land/x/path@v0.152.0/mod.ts"));
console.log(parseDeno("https://deno.land/x/path@v0.152.0-beta.1/mod.ts"));

console.log(
  rewriteDenoImports(
    `
  import { parseDeno, rewriteDenoImports } from "https://deno.land/std@0.152.0/path/mod.ts";
  import { parseDeno, rewriteDenoImports } from "https://deno.land/std/path/mod.ts";
  import { parseDeno, rewriteDenoImports } from "https://deno.land/x/path/mod.ts";
  import { parseDeno, rewriteDenoImports } from "https://deno.land/x/path@0.152.0/mod.ts";
  import { parseDeno, rewriteDenoImports } from "https://deno.land/x/path@v0.152.0/mod.ts";
  import { parseDeno, rewriteDenoImports } from "https://deno.land/x/path@v0.152.0-beta.1/mod.ts";
  import { test } from "./test.ts";
  import { test } from "../test.ts";
  `,
    "/@deno/std@0.152.0/path/mod.ts"
  )
);
