import type {RawArgs} from './types'

export class ArgError extends Error {}

export const HELP = `  create-phaser - scaffold a TypeScript Phaser game project

  Usage
    $ bunx @involvex/create-phaser [project-name] [options]
    $ npm create @involvex/create-phaser [project-name]

  Options
    -t, --template <id>   use a specific template (see --list)
        --pm <pm>         package manager: bun | npm | pnpm | yarn
        --install         install dependencies after scaffolding
        --no-install      skip dependency installation
        --git             initialize a git repository
        --no-git          skip git initialization
    -y, --yes             accept defaults and skip optional prompts
    -l, --list            list available templates
    -V, --version         print the version
    -h, --help            show this help

  Examples
    $ bunx @involvex/create-phaser
    $ bunx @involvex/create-phaser my-game -t card-game --pm bun
    $ bunx @involvex/create-phaser my-game --yes`

export function parse(argv: string[]): RawArgs {
	const args: RawArgs = {
		yes: false,
		list: false,
		help: false,
		version: false,
	}
	const positionals: string[] = []

	const consumeValue = (flag: string, index: number): string => {
		const next = argv[index]
		if (next === undefined) {
			throw new ArgError(`Missing value for ${flag}`)
		}
		return next
	}

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i] as string

		if (arg === '--') {
			positionals.push(...argv.slice(i + 1))
			break
		}

		if (arg.startsWith('--')) {
			const known = ['--template', '--pm']
			const value = known.includes(arg) ? consumeValue(arg, ++i) : undefined
			switch (arg) {
				case '--template':
					args.template = value
					break
				case '--pm':
					args.pm = value
					break
				case '--install':
					args.install = true
					args.noInstall = false
					break
				case '--no-install':
					args.noInstall = true
					args.install = false
					break
				case '--git':
					args.git = true
					args.noGit = false
					break
				case '--no-git':
					args.noGit = true
					args.git = false
					break
				case '--yes':
					args.yes = true
					break
				case '--list':
					args.list = true
					break
				case '--help':
					args.help = true
					break
				case '--version':
					args.version = true
					break
				default:
					throw new ArgError(`Unknown option "${arg}" (see --help)`)
			}
			continue
		}

		if (arg.startsWith('-') && arg.length > 1) {
			let value: string | undefined
			if (arg === '-t') {
				value = consumeValue(arg, ++i)
			}
			switch (arg) {
				case '-t':
					args.template = value
					break
				case '-y':
					args.yes = true
					break
				case '-l':
					args.list = true
					break
				case '-h':
				case '-?':
					args.help = true
					break
				case '-V':
					args.version = true
					break
				default:
					throw new ArgError(`Unknown option "${arg}" (see --help)`)
			}
			continue
		}

		positionals.push(arg)
	}

	if (positionals.length > 1) {
		throw new ArgError(
			`Expected at most one project name, got: ${positionals.join(', ')}`,
		)
	}
	if (positionals.length === 1) {
		args.projectName = positionals[0]
	}
	return args
}
