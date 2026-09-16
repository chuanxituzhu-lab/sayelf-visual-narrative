import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateOutput,
  listScenes,
  oneClick,
  series,
  generateComposedOutput
} from "../../core/compiler.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../web");
const assetsRoot = path.resolve(__dirname, "../../assets");
const port = Number(process.env.PORT || 4178);
const host = process.env.HOST || "127.0.0.1";

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "access-control-allow-origin": "*" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body, null, 2));
}

function asSeed(value, fallback = Date.now()) {
  return Number.isInteger(value) ? value : fallback;
}

function withLegacyImageFields(contract) {
  const image = contract.outputs?.image;
  return image ? { ...contract, ...image, outputs: contract.outputs, errors: contract.errors } : contract;
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, "");

  try {
    if (req.method === "GET" && req.url === "/v1/scenes") {
      return send(res, 200, { scenes: listScenes() });
    }
    if (req.method === "POST" && req.url === "/v1/prompt") {
      const body = await readJson(req);
      return send(res, 200, withLegacyImageFields(generateOutput({
        scene: body.scene,
        output: body.output || "image",
        language: body.language || "zh",
        seed: asSeed(body.seed),
        overrides: body.overrides || {},
        visualStyle: body.visual_style || body.visualStyle || "natural",
        aspectRatio: body.aspect_ratio || body.aspectRatio || "9:16"
      })));
    }
    if (req.method === "POST" && req.url === "/v1/one-click") {
      const body = await readJson(req);
      return send(res, 200, withLegacyImageFields(oneClick({
        output: body.output || "image",
        language: body.language || "zh",
        seed: asSeed(body.seed),
        visualStyle: body.visual_style || body.visualStyle || "natural",
        aspectRatio: body.aspect_ratio || body.aspectRatio || "9:16"
      })));
    }
    if (req.method === "POST" && req.url === "/v1/compose") {
      const body = await readJson(req);
      return send(res, 200, withLegacyImageFields(await generateComposedOutput({
        input: { ...(body.input || {}), mode: body.mode || body.input?.mode },
        output: body.output || "image",
        language: body.language || "zh",
        seed: asSeed(body.seed),
        visualStyle: body.visual_style || body.visualStyle || "natural",
        aspectRatio: body.aspect_ratio || body.aspectRatio || "9:16"
      })));
    }
    if (req.method === "POST" && req.url === "/v1/series") {
      const body = await readJson(req);
      return send(res, 200, {
        items: series({
          scene: body.scene,
          output: body.output || "image",
          language: body.language || "zh",
          count: Number.isInteger(body.count) ? body.count : 6,
          seed: Number.isInteger(body.seed) ? body.seed : 1,
          overrides: body.overrides || {},
          visualStyle: body.visual_style || body.visualStyle || "natural",
          aspectRatio: body.aspect_ratio || body.aspectRatio || "9:16"
        })
      });
    }
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      return send(res, 200, fs.readFileSync(path.join(webRoot, "index.html"), "utf8"), "text/html; charset=utf-8");
    }
    if (req.method === "GET" && req.url === "/app.js") {
      return send(res, 200, fs.readFileSync(path.join(webRoot, "app.js"), "utf8"), "text/javascript; charset=utf-8");
    }
    if (req.method === "GET" && req.url === "/assets/nature-window-preview.png") {
      return send(res, 200, fs.readFileSync(path.join(assetsRoot, "nature-window-preview.png")), "image/png");
    }
    if (req.method === "GET" && req.url === "/assets/sayelf-logo.png") {
      return send(res, 200, fs.readFileSync(path.join(assetsRoot, "sayelf-logo.png")), "image/png");
    }
    return send(res, 404, { error: "not_found" });
  } catch (error) {
    return send(res, 400, { error: error.message, code: error.code || "BAD_REQUEST", details: error.details });
  }
});

server.listen(port, host, () => {
  console.log(`Hidden Nature Window WebUI/API: http://${host}:${port}`);
});
