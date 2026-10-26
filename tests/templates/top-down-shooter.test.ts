import { getTemplate } from "../../src/registry";
import { registerTemplateTests } from "../helpers";

const info = getTemplate("top-down-shooter");
if (!info) {
  throw new Error(
    "template top-down-shooter is not registered in src/registry.ts",
  );
}

registerTemplateTests(info, ["src/scenes/GameScene.ts"]);
