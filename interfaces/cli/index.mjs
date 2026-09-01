#!/usr/bin/env node
import {
  generateOutput,
  listScenes,
  oneClick,
  series,
  generateComposedOutput,
  renderOutputContract
} from "../../core/compiler.mjs";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function seedArg(fallback) {
  const raw = arg("seed");
  return raw === undefined ? fallback : Number(raw);
}

function printOutput(output) {
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }
  if (Array.isArray(output)) {
    console.log(output.map(item => item.contract ? renderOutputContract(item) : item.prompt).join("\n\n"));
    return;
  }
  console.log(output.contract ? renderOutputContract(output) : output.prompt);
}

const cmd = process.argv[2] || "help";

try {
  if (cmd === "scenes") {
    console.log(JSON.stringify(listScenes(), null, 2));
  } else if (cmd === "generate") {
    const output = arg("output", "image");
    const result = generateOutput({
      scene: arg("scene"),
      output,
      language: arg("lang", "zh"),
      visualStyle: arg("visual-style", "natural"),
      aspectRatio: arg("ratio", "9:16"),
      seed: seedArg(Date.now())
    });
    printOutput(result);
  } else if (cmd === "one-click") {
    const result = oneClick({
      output: arg("output", "image"),
      language: arg("lang", "zh"),
      visualStyle: arg("visual-style", "natural"),
      aspectRatio: arg("ratio", "9:16"),
      seed: seedArg(Date.now())
    });
    printOutput(result);
  } else if (cmd === "compose") {
    const result = await generateComposedOutput({
      output: arg("output", "image"),
      language: arg("lang", "zh"),
      visualStyle: arg("visual-style", "natural"),
      aspectRatio: arg("ratio", "9:16"),
      seed: seedArg(Date.now()),
      input: {
        mode: arg("mode", "manual"),
        plant: arg("plant", "grass"),
        location: arg("location", "field"),
        emotion: arg("emotion", "calm"),
        window: arg("window"),
        hook: arg("hook")
      }
    });
    printOutput(result);
  } else if (cmd === "series") {
    const result = series({
      scene: arg("scene"),
      output: arg("output", "image"),
      language: arg("lang", "zh"),
      count: Number(arg("count", "6")),
      seed: Number(arg("seed", "1")),
      visualStyle: arg("visual-style", "natural"),
      aspectRatio: arg("ratio", "9:16")
    });
    printOutput(result);
  } else {
    console.log(`Hidden Nature Window v0.14.0

Commands:
  scenes
  generate --scene <id> [--output image|storyboard|both] [--ratio 9:16] [--visual-style natural|contrast|impact] [--lang zh|en|bilingual] [--seed N] [--json]
  one-click [--output image|storyboard|both] [--ratio 9:16] [--visual-style natural|contrast|impact] [--lang zh|en|bilingual] [--seed N] [--json]
  compose [--output image|storyboard|both] [--mode auto|random|manual] [--plant grass] [--location field] [--emotion calm] [--ratio 9:16] [--lang zh|en|bilingual] [--seed N] [--json]
  series --scene <id> [--output image|storyboard|both] [--count 6] [--ratio 9:16] [--visual-style natural|contrast|impact] [--lang zh|en|bilingual] [--seed N] [--json]
`);
  }
} catch (error) {
  console.error(JSON.stringify({ error: error.message, code: error.code || "ERROR", details: error.details }, null, 2));
  process.exit(1);
}
