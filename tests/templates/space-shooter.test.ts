import { getTemplate } from "../../src/registry";
import { registerTemplateTests } from "../helpers";

const info = getTemplate("space-shooter");
if (!info) {
  throw new Error(
    "template space-shooter is not registered in src/registry.ts",
  );
}

registerTemplateTests(info, ["src/scenes/GameScene.ts"]);
