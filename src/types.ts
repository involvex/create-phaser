export const PACKAGE_MANAGERS = ['bun', 'npm', 'pnpm', 'yarn'] as const

export type PackageManager = (typeof PACKAGE_MANAGERS)[number]

export interface TemplateInfo {
	/** kebab-case id, used with -t/--template and as templates/<id> directory name */
	id: string
	/** human display name shown in prompts and --list */
	name: string
	/** one-line description for the picker and --list */
	description: string
}

/** Everything the CLI needs to scaffold a project. */
export interface ScaffoldPlan {
	projectName: string
	templateId: string
	pm: PackageManager
	install: boolean
	git: boolean
	/** remove an existing non-empty target directory instead of failing */
	overwrite: boolean
}

/** Parsed command line state before prompts fill in the gaps. */
export interface RawArgs {
	projectName?: string
	template?: string
	pm?: string
	/** --install was given explicitly */
	install?: boolean
	/** --no-install was given explicitly */
	noInstall?: boolean
	/** --git was given explicitly */
	git?: boolean
	/** --no-git was given explicitly */
	noGit?: boolean
	yes: boolean
	list: boolean
	help: boolean
	version: boolean
}
