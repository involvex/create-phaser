import { getTemplate } from "../../src/registry";
import { registerTemplateTests } from "../helpers";

const info = getTemplate("breakout");
if (!info) {
  throw new Error("template breakout is not registered in src/registry.ts");
}

registerTemplateTests(info, ["src/scenes/GameScene.ts"]);
