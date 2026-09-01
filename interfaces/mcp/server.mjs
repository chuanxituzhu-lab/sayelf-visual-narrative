import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  generateOutput,
  listScenes,
  oneClick,
  series,
  generateComposedOutput
} from "../../core/compiler.mjs";

const outputEnum = z.enum(["image", "storyboard", "both"]);
const languageEnum = z.enum(["zh", "en", "bilingual"]);
const ratioEnum = z.enum(["1:1", "4:5", "3:4", "9:16", "16:9"]);
const styleEnum = z.enum(["natural", "contrast", "impact"]);
const server = new McpServer({ name: "hidden-nature-window", version: "0.14.0" });

function result(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

server.tool("hidden_window_list_scenes", "List available natural-scene presets.", {}, async () => result(listScenes()));

server.tool(
  "hidden_window_generate_prompt",
  "Generate image, storyboard, or both from one SceneSpec while preserving Enter → Enclose → Guide → Reveal.",
  {
    scene: z.string(),
    output: outputEnum.default("image"),
    language: languageEnum.default("zh"),
    visual_style: styleEnum.default("natural"),
    aspect_ratio: ratioEnum.default("9:16"),
    seed: z.number().int().optional(),
    emotion: z.string().optional(),
    window: z.string().optional(),
    hook: z.string().optional()
  },
  async ({ scene, output, language, visual_style, aspect_ratio, seed, emotion, window, hook }) => {
    const overrides = {};
    if (emotion) overrides.emotion = emotion;
    if (window) overrides.window = window;
    if (hook) overrides.hook = hook;
    return result(generateOutput({
      scene,
      output,
      language,
      visualStyle: visual_style,
      aspectRatio: aspect_ratio,
      seed: seed ?? Date.now(),
      overrides
    }));
  }
);

server.tool(
  "hidden_window_one_click",
  "One-click generation with selectable image, storyboard, or both outputs.",
  {
    output: outputEnum.default("image"),
    language: languageEnum.default("zh"),
    visual_style: styleEnum.default("natural"),
    aspect_ratio: ratioEnum.default("9:16"),
    seed: z.number().int().optional()
  },
  async ({ output, language, visual_style, aspect_ratio, seed }) => result(oneClick({
    output,
    language,
    visualStyle: visual_style,
    aspectRatio: aspect_ratio,
    seed: seed ?? Date.now()
  }))
);

server.tool(
  "hidden_window_compose_scene",
  "Compose a new SceneSpec and compile it to image, storyboard, or both.",
  {
    plant: z.enum(["bamboo","lotus","reeds","maple","snow_branches","grass","fern"]).default("grass"),
    location: z.enum(["forest","pond","mountain","wetland","garden","coast","field"]).default("field"),
    emotion: z.enum(["calm","longing","mystery","freedom","renewal","solitude"]).default("calm"),
    mode: z.enum(["auto", "random", "manual"]).default("manual"),
    window: z.string().optional(),
    hook: z.string().optional(),
    output: outputEnum.default("image"),
    language: languageEnum.default("zh"),
    visual_style: styleEnum.default("natural"),
    aspect_ratio: ratioEnum.default("9:16"),
    seed: z.number().int().optional()
  },
  async ({ plant, location, emotion, mode, window, hook, output, language, visual_style, aspect_ratio, seed }) =>
    result(await generateComposedOutput({
      input: { plant, location, emotion, mode, window, hook },
      output,
      language,
      visualStyle: visual_style,
      aspectRatio: aspect_ratio,
      seed: seed ?? Date.now()
    }))
);

server.tool(
  "hidden_window_generate_series",
  "Generate a same-scene series using the selected output contract.",
  {
    scene: z.string(),
    output: outputEnum.default("image"),
    language: languageEnum.default("zh"),
    visual_style: styleEnum.default("natural"),
    aspect_ratio: ratioEnum.default("9:16"),
    count: z.number().int().min(1).max(50).default(6),
    seed: z.number().int().default(1)
  },
  async ({ scene, output, language, visual_style, aspect_ratio, count, seed }) =>
    result(series({
      scene,
      output,
      language,
      visualStyle: visual_style,
      aspectRatio: aspect_ratio,
      count,
      seed
    }))
);

await server.connect(new StdioServerTransport());
