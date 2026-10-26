import {readdirSync} from 'node:fs'
import path from 'node:path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import {DEFAULT_TEMPLATE_ID, TEMPLATES, getTemplate} from './registry'
import {isDirNonEmpty, sanitizeProjectName} from './scaffold'
import {detectPackageManager, isPackageManager} from './install'
import {PACKAGE_MANAGERS} from './types'
import type {PackageManager, RawArgs, ScaffoldPlan} from './types'

export const DEFAULT_PROJECT_NAME = 'my-phaser-game'

export function cancel(): never {
	p.cancel('Operation cancelled.')
	process.exit(0)
}

export function fail(message: string): never {
	p.log.error(message)
	process.exit(1)
}

export class Cancelled extends Error {
	constructor() {
		super('cancelled')
	}
}

async function confirm(message: string): Promise<boolean> {
	const answer = await p.confirm({message, initialValue: true})
	if (p.isCancel(answer)) {
		throw new Cancelled()
	}
	return answer as boolean
}

/**
 * Build the full scaffold plan from raw args, asking only for the pieces the
 * user did not already provide on the command line. With --yes every missing
 * piece takes its default.
 */
export async function resolvePlan(
	cwd: string,
	raw: RawArgs,
): Promise<ScaffoldPlan> {
	// 1. project name ----------------------------------------------------------
	let projectName: string
	if (raw.projectName !== undefined) {
		projectName = sanitizeProjectName(raw.projectName)
		if (!projectName) {
			fail(`"${raw.projectName}" is not a valid project/name.`)
		}
		if (projectName !== raw.projectName) {
			p.log.warn(`Sanitized project name to "${projectName}".`)
		}
	} else if (raw.yes) {
		projectName = DEFAULT_PROJECT_NAME
	} else {
		const answer = await p.text({
			message: 'Project name',
			placeholder: DEFAULT_PROJECT_NAME,
			defaultValue: DEFAULT_PROJECT_NAME,
			validate: value =>
				sanitizeProjectName(value ?? '')
					? undefined
					: 'Letters, numbers, dots and dashes only - the name is slugified automatically.',
		})
		if (p.isCancel(answer)) {
			throw new Cancelled()
		}
		projectName = sanitizeProjectName(answer as string)
		if (projectName !== (answer as string).trim().toLowerCase()) {
			p.log.info(`Using "${projectName}" as the project name.`)
		}
	}

	// 2. target directory conflict -------------------------------------------
	const targetDir = path.resolve(cwd, projectName)
	let overwrite = false
	if (isDirNonEmpty(targetDir)) {
		if (raw.yes) {
			fail(
				`Target directory "${targetDir}" is not empty. Remove it or pick another name.`,
			)
		}
		const action = await p.select({
			message: `Directory "${projectName}" already exists and is not empty. What should we do?`,
			options: [
				{value: 'cancel', label: 'Cancel'},
				{value: 'overwrite', label: 'Overwrite (delete existing contents)'},
			],
			initialValue: 'cancel',
		})
		if (p.isCancel(action) || action === 'cancel') {
			throw new Cancelled()
		}
		overwrite = true
	}

	// 3. game template ---------------------------------------------------------
	let templateId: string
	if (raw.template !== undefined) {
		const known = getTemplate(raw.template)
		if (!known) {
			fail(
				`Unknown template "${raw.template}". Available: ${TEMPLATES.map(t => t.id).join(', ')}`,
			)
		}
		templateId = known.id
	} else if (raw.yes) {
		templateId = DEFAULT_TEMPLATE_ID
	} else {
		const answer = await p.select({
			message: 'Which game style do you want to build?',
			options: TEMPLATES.map(t => ({
				value: t.id,
				label: t.name,
				hint: t.description,
			})),
			initialValue: DEFAULT_TEMPLATE_ID,
		})
		if (p.isCancel(answer)) {
			throw new Cancelled()
		}
		templateId = answer as string
	}

	// 4. package manager -------------------------------------------------------
	let pm: PackageManager
	if (raw.pm !== undefined) {
		if (!isPackageManager(raw.pm)) {
			fail(
				`Unknown package manager "${raw.pm}". Available: ${PACKAGE_MANAGERS.join(', ')}`,
			)
		}
		pm = raw.pm
	} else if (raw.yes) {
		pm = detectPackageManager(targetDir, cwd)
	} else {
		const detected = detectPackageManager(targetDir, cwd)
		const answer = await p.select({
			message: 'Package manager',
			options: PACKAGE_MANAGERS.map(m => ({
				value: m,
				label: m,
				hint: m === detected ? 'detected' : undefined,
			})),
			initialValue: detected,
		})
		if (p.isCancel(answer)) {
			throw new Cancelled()
		}
		pm = answer as PackageManager
	}

	// 5. install & git -----------------------------------------------------------
	const install =
		raw.install === true || raw.noInstall === true
			? raw.install === true
			: raw.yes
				? true
				: await confirm('Install dependencies?')

	const git =
		raw.git === true || raw.noGit === true
			? raw.git === true
			: raw.yes
				? true
				: await confirm('Initialize a git repository?')

	return {projectName, templateId, pm, install, git, overwrite}
}
