# Contributing to create-phaser

Thanks for wanting to add to `@involvex/create-phaser`! This document covers local development and the exact contract for shipping a new game template.

## Local development

Requirements: [Bun](https://bun.sh) >= 1.4, Node >= 20, git.

```bash
bun install
bun check          # type-check everything under src/, scripts/, tests/
bun test           # run the full suite
bun run build      # bundle the CLI into dist/cli.mjs
```

Try the CLI locally (always against the **built** dist):

```bash
bun run build
node dist/cli.mjs --list
node dist/cli.mjs try-me -t blank --no-install --no-git --yes
```

## Repository layout

```text
src/            CLI source (args, prompts, scaffold, install, git, registry)
scripts/        build.ts (bun build) and check-template.sh (CI)
templates/      one directory per game template (bundled into the npm package)
tests/          bun test suite; tests/templates/<id>.test.ts per template
```

## Adding a game template

1. **Create the directory** `templates/<id>/` (kebab-case id, e.g. `tower-defense`). It must contain exactly:

   ```text
   package.json  tsconfig.json  vite.config.ts  index.html
   README.md     _gitignore     src/main.ts  src/config.ts
   src/scenes/GameScene.ts
   ```

   Blank-style templates with a boot scene add `src/scenes/BootScene.ts`.

2. **Copy the shared scaffolding verbatim** from any existing template (e.g. `templates/space-shooter`):
   - `package.json` — keeps `"name": "{{projectName}}"`, `phaser ^4.2.1`, the four shared scripts
   - `tsconfig.json`, `vite.config.ts`, `index.html`, `_gitignore` — identical across templates

3. **Implement the game** following the house rules:
   - Import Phaser only via the Phaser 4 wildcard: `import * as Phaser from "phaser"`
   - **No binary assets** — draw with `Graphics.generateTexture`, `Text`, rectangles and tweens
   - All tunables (sizes, speeds, colors, spawn counts) live in `src/config.ts`
   - Canvas is `960×540`, `Phaser.Scale.FIT`, dark background
   - Strict TS: no `any`, no unused vars (tsconfig enforces both)

4. **Use placeholders** in `index.html` (title) and `README.md` (H1): `{{projectName}}` (slug) and `{{projectTitle}}` (title-cased). They are substituted when a user scaffolds a project. Do not add new placeholder tokens without updating `src/scaffold.ts`.

5. **Register it** in `src/registry.ts` — add an entry `{ id, name, description }`. The list order is the interactive picker order.

6. **Add the contract test** `tests/templates/<id>.test.ts`:

   ```ts
   import {getTemplate} from '../../src/registry'
   import {registerTemplateTests} from '../helpers'

   const info = getTemplate('<id>')
   if (!info) {
   	throw new Error('template <id> is not registered in src/registry.ts')
   }

   registerTemplateTests(info, ['src/scenes/GameScene.ts'])
   ```

7. **Verify locally**:

   ```bash
   bun check
   bun test tests/templates/<id>.test.ts
   bash scripts/check-template.sh <id>   # install + tsc + vite build in a temp copy
   ```

8. **Open a PR** with a short gameplay description and the controls you added.

### Template PR checklist

- [ ] All contract files present, no extra/asset files
- [ ] `{{projectName}}` / `{{projectTitle}}` placeholders intact
- [ ] Registered in `src/registry.ts`
- [ ] `bun check` and the template test pass
- [ ] `scripts/check-template.sh <id>` passes
- [ ] README documents controls and where to customize

## Releasing (maintainers)

1. Bump `version` in `package.json`
2. `bun run build && bun test`
3. Commit, tag `v<version>`, push with the tag — the `Publish` workflow runs tests and publishes to npm (`NPM_TOKEN` secret required)
