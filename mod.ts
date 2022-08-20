import * as esbuild from "https://deno.land/x/esbuild@v0.15.5/mod.js";
import { serve } from "https://deno.land/std@0.152.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.152.0/http/file_server.ts";
import { join } from "https://deno.land/std@0.152.0/path/mod.ts";
import { join as joinUrl } from "https://deno.land/std@0.152.0/path/posix.ts";
import { ensureDir } from "https://deno.land/std@0.152.0/fs/mod.ts";
import { Buffer } from "https://deno.land/std@0.152.0/io/buffer.ts";

interface Options {
  entry: string;
  port?: number;
}

const cache_path = "./cache/";

async function build(file: string) {
  if (!(await exists(join(cache_path, file)))) {
    const content = await downloadText(file);

    try {
      const { code } = await esbuild.transform(content, {
        loader: "tsx",
      });
      await Deno.writeTextFile(join(cache_path, file), code);
    } catch (error) {
      console.log(error);
    }
  }
}

async function buildCss(file: string) {
  if (!(await exists(join(cache_path, file)))) {
    const content = await downloadText(file);
    const code = `
      const style = document.createElement('style')
      style.textContent = atob("${btoa(content)}")
      document.head.appendChild(style)
      `;
    await Deno.writeTextFile(join(cache_path, file), code);
  }
}

async function buildAsset(file: string) {
  if (!(await exists(join(cache_path, file)))) {
    const blob = await download(file);
    const code = `
        const path = "${joinUrl("__assets__", file)}"
        export default path
        `;
    await Deno.writeTextFile(join(cache_path, file), code);
    const unit8arr = new Buffer(await blob.arrayBuffer()).bytes();
    await ensureDir(join(cache_path, "__assets__"));
    await Deno.writeFile(join(cache_path, "__assets__", file), unit8arr);
  }
}

async function downloadText(file: string) {
  const root = new URL(".", opts.entry);
  root.pathname = join(root.pathname, file);
  const content = await fetch(root);
  return await content.text();
}

async function download(file: string) {
  const root = new URL(".", opts.entry);
  root.pathname = join(root.pathname, file);
  const content = await fetch(root);
  return await content.blob();
}

async function handler(req: Request) {
  const url = new URL(req.url);
  await ensureDir(cache_path);
  try {
    if (url.pathname === "/") {
      await generateIndex();
      return await serveFile(req, join(cache_path, "index.html"));
    }
    if (url.pathname.startsWith("/__assets__")) {
      return await serveFile(req, join(cache_path, url.pathname));
    }
    if (url.pathname.endsWith(".ts") || url.pathname.endsWith(".tsx")) {
      await build(url.pathname);
      const headers = new Headers();
      headers.append("content-type", "application/javascript");
      return new Response(
        await Deno.readTextFile(join(cache_path, url.pathname)),
        {
          headers,
        }
      );
    }
    if (url.pathname.endsWith(".css")) {
      await buildCss(url.pathname);
      const headers = new Headers();
      headers.append("content-type", "application/javascript");
      return new Response(
        await Deno.readTextFile(join(cache_path, url.pathname)),
        {
          headers,
        }
      );
    }
    await buildAsset(url.pathname);
    const headers = new Headers();
    headers.append("content-type", "application/javascript");
    return new Response(
      await Deno.readTextFile(join(cache_path, url.pathname)),
      {
        headers,
      }
    );
  } catch (_error) {
    const headers = new Headers();
    headers.append("content-type", "text/html");
    return new Response(
      `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
        File not found!
    </body>
    </html>`,
      {
        headers,
      }
    );
  }
}

async function generateIndex() {
  const indexPath = join(cache_path, "index.html");
  if (await exists(indexPath)) {
    return;
  }
  const url = new URL(opts.entry);
  const root = new URL(".", opts.entry);
  const code = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body>
        <script type="module" src="./${url.pathname.replace(
          root.pathname,
          ""
        )}"></script>
    </body>
    </html>`;

  await Deno.writeTextFile(indexPath, code);
}

let opts!: Options;

export function busad(options: Options) {
  opts = options;
  serve(handler, { port: options.port ?? 3000 });
}

async function exists(filepath: string) {
  try {
    await Deno.stat(filepath);
    return true;
  } catch (_error) {
    return false;
  }
}
