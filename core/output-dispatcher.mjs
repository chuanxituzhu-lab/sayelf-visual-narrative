import { loadRegistry, enabledPlugins } from "./plugin-loader.mjs";
import { createContinuityAnchor, createOutputContract, selectedOutputTypes, VISUAL_GRAMMAR } from "./contracts.mjs";
import * as imageOutput from "../plugins/outputs/image/index.mjs";
import * as storyboardOutput from "../plugins/outputs/storyboard/index.mjs";

const BUILTIN_OUTPUTS = new Map([
  ["image-output", imageOutput],
  ["storyboard-output", storyboardOutput],
  ["./plugins/outputs/image/index.mjs", imageOutput],
  ["./plugins/outputs/storyboard/index.mjs", storyboardOutput]
]);

export function loadOutputPlugins() {
  const registry = loadRegistry();
  const plugins = [];
  const errors = [];
  for (const record of enabledPlugins("output-provider")) {
    const plugin = BUILTIN_OUTPUTS.get(record.module) || BUILTIN_OUTPUTS.get(record.id);
    if (!plugin || typeof plugin.compile !== "function" || plugin.outputType !== record.output) {
      errors.push({
        plugin: record.id,
        code: "OUTPUT_PLUGIN_LOAD_FAILED",
        message: `Unable to load output plugin: ${record.id}`
      });
      continue;
    }
    plugins.push({ ...plugin, registry: record });
  }
  if (!registry.plugins.some(plugin => plugin.type === "output-provider")) {
    errors.push({
      plugin: "registry",
      code: "NO_OUTPUT_PLUGINS",
      message: "No output-provider is registered"
    });
  }
  return { plugins, errors };
}

function errorFor(type, error) {
  return {
    output: type,
    code: error.code || "OUTPUT_PLUGIN_FAILED",
    message: error.message
  };
}

export function compileOutputs(context, { output = "image", plugins } = {}) {
  const loaded = plugins ? { plugins, errors: [] } : loadOutputPlugins();
  const selected = selectedOutputTypes(output);
  const result = {};
  const errors = [...loaded.errors];
  const continuity = context.continuity || createContinuityAnchor(context);
  const pluginContext = { ...context, continuity };

  for (const type of selected) {
    const plugin = loaded.plugins.find(item => item.outputType === type || item.id === type);
    if (!plugin) {
      errors.push({ output: type, code: "OUTPUT_PLUGIN_UNAVAILABLE", message: `Output plugin unavailable: ${type}` });
      continue;
    }
    try {
      result[type] = plugin.compile(pluginContext);
    } catch (error) {
      errors.push(errorFor(type, error));
    }
  }

  if (!Object.keys(result).length) {
    const error = new Error(errors.map(item => item.message).join("; ") || "No output was compiled");
    error.code = "OUTPUT_FAILED";
    error.details = errors;
    throw error;
  }

  return createOutputContract({
    output,
    language: context.language,
    source: context.source,
    scene_id: context.scene_id,
    scene: context.scene,
    seed: context.seed,
    variation: context.variation,
    outputs: result,
    continuity,
    errors
  });
}

export { VISUAL_GRAMMAR };
