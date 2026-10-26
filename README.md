# create-phaser

[![npm version](https://img.shields.io/npm/v/@involvex/create-phaser.svg)](https://www.npmjs.com/package/@involvex/create-phaser)
[![CI](https://github.com/involvex/create-phaser/actions/workflows/ci.yml/badge.svg)](https://github.com/involvex/create-phaser/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Scaffold a **Phaser 4 + TypeScript + Vite** game in seconds — with an interactive game-style picker and six built-in, fully playable templates.

```bash
bunx @involvex/create-phaser
# or
npm create @involvex/create-phaser
# or
npx @involvex/create-phaser
```

## What you get

Every generated project is a **strict TypeScript** codebase with:

- **Phaser 4** (current stable, imported with the Phaser 4 wildcard syntax)
- **Vite** for instant HMR during development and optimized production builds
- `bun run dev` / `npm run dev`, `build`, `preview` and `typecheck` scripts
- **Zero binary assets** — every template draws its art procedurally with Phaser Graphics/Text, so projects stay tiny, license-clean and work offline
- A dark, fullscreen, aspect-fit canvas that scales to any window

```text
my-game/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── src/
    ├── main.ts           # Phaser.Game config
    ├── config.ts         # canvas size, colors, gameplay tunables
    └── scenes/
        ├── BootScene.ts  # procedural texture generation
        └── GameScene.ts  # the gameplay
```

## Templates

| Template           | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `2d-platformer`    | Side-scroller with jumping, platforms, coins & a follow camera |
| `card-game`        | Memory-match card game with flip animations & a move counter   |
| `space-shooter`    | Shmup with waves of enemies, bullets & particle explosions     |
| `breakout`         | Classic brick-breaker with paddle-angle physics & lives        |
| `top-down-shooter` | WASD movement, mouse aim & escalating enemy waves              |
| `blank`            | Minimal starter — Boot + Game scene skeleton to build on       |

List templates any time with:

```bash
bunx @involvex/create-phaser --list
```

## CLI options

| Option                       | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `-t, --template <id>`        | Use a specific template (see `--list`)              |
| `--pm <pm>`                  | Package manager: `bun` \| `npm` \| `pnpm` \| `yarn` |
| `--install` / `--no-install` | Install dependencies after scaffolding              |
| `--git` / `--no-git`         | Initialize a git repository                         |
| `-y, --yes`                  | Accept defaults and skip optional prompts           |
| `-l, --list`                 | List available templates                            |
| `-V, --version`              | Print the version                                   |
| `-h, --help`                 | Show help                                           |

Anything you pass as a flag skips the matching prompt; anything you omit is asked interactively (with `bun` and "yes" as sensible defaults).

### Examples

```bash
# Fully interactive
bunx @involvex/create-phaser

# Non-interactive, everything explicit
bunx @involvex/create-phaser my-game -t card-game --pm bun --no-git --install

# Defaults everywhere (2d-platformer template, detected PM, install + git)
bunx @involvex/create-phaser my-game --yes
```

After scaffolding:

```bash
cd my-game
bun run dev        # or: npm run dev
```

## Requirements

- Node.js >= 20 (or any current Bun) for the CLI
- One of bun / npm / pnpm / yarn to install the generated game's dependencies

## Development (this repo)

```bash
bun install        # install CLI dev dependencies
bun check          # type-check
bun test           # run the test suite (args, scaffold, template contracts)
bun run build      # bundle src/cli.ts -> dist/cli.mjs (Node target)
```

Templates are verified per-template in CI via `scripts/check-template.sh <id>` (install → `tsc --noEmit` → `vite build`).

Want to add a game template? See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © involvex
