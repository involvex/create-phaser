import {afterAll, describe, expect, it} from 'bun:test'
import {existsSync, readFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {
	copyTemplate,
	isDirNonEmpty,
	patchPackageJson,
	sanitizeProjectName,
} from '../src/scaffold'

const fixturesTemplatesDir = join(import.meta.dir, 'fixtures', 'templates')
const dests: string[] = []

/** Prefer D:\tmp\opencode as sandbox temp when present, else fall back to os.tmpdir(). */
const tempBase = existsSync('D:\\tmp\\opencode')
	? 'D:\\tmp\\opencode'
	: tmpdir()

afterAll(() => {
	for (const dest of dests) {
		rmSync(dest, {recursive: true, force: true})
	}
})

function makeDest(prefix: string): string {
	const dest = join(tempBase, `${prefix}-${randomUUID().slice(0, 8)}`)
	dests.push(dest)
	return dest
}

describe('sanitizeProjectName', () => {
	it('slugifies spaces and mixed case', () => {
		expect(sanitizeProjectName('My Game')).toBe('my-game')
	})

	it('slugifies underscores', () => {
		expect(sanitizeProjectName('spaced_name')).toBe('spaced-name')
	})

	it('strips invalid characters', () => {
		expect(sanitizeProjectName('Weird$$Name!!')).toBe('weirdname')
	})

	it('collapses repeated separators and strips leading/trailing separators', () => {
		expect(sanitizeProjectName('--weird..name--')).toBe('weird.name')
		expect(sanitizeProjectName('too__many___dashes')).toBe('too-many-dashes')
	})

	it('leaves already clean names untouched', () => {
		expect(sanitizeProjectName('my-phaser-game')).toBe('my-phaser-game')
	})

	it('allows numeric leading names (valid npm names)', () => {
		expect(sanitizeProjectName('42game')).toBe('42game')
	})
})

describe('isDirNonEmpty', () => {
	it('is false for missing directories', () => {
		expect(isDirNonEmpty(join(tmpdir(), 'create-phaser-missing-dir'))).toBe(
			false,
		)
	})
})

describe('copyTemplate', () => {
	it('renames _gitignore to .gitignore and excludes .keep', async () => {
		const dest = makeDest('cp-rename')
		await copyTemplate({
			templateId: 'demo',
			templatesDir: fixturesTemplatesDir,
			dest,
			projectName: 'my-game',
		})

		expect(existsSync(join(dest, '.gitignore'))).toBe(true)
		expect(existsSync(join(dest, '_gitignore'))).toBe(false)
		expect(existsSync(join(dest, '.keep'))).toBe(false)
		const gitignore = readFileSync(join(dest, '.gitignore'), 'utf8')
		expect(gitignore).toContain('node_modules/')
	})

	it('substitutes projectName and projectTitle placeholders in text files', async () => {
		const dest = makeDest('cp-subst')
		await copyTemplate({
			templateId: 'demo',
			templatesDir: fixturesTemplatesDir,
			dest,
			projectName: 'neon-dash',
		})

		const readme = readFileSync(join(dest, 'README.md'), 'utf8')
		expect(readme).toContain('# neon-dash')
		expect(readme).toContain('Welcome to Neon Dash!')

		const html = readFileSync(join(dest, 'index.html'), 'utf8')
		expect(html).toContain('<title>neon-dash — Neon Dash</title>')
		expect(readme).not.toContain('{{')
	})

	it('patches package.json name and private after copying', async () => {
		const dest = makeDest('cp-patch')
		await copyTemplate({
			templateId: 'demo',
			templatesDir: fixturesTemplatesDir,
			dest,
			projectName: 'my-game',
		})
		await patchPackageJson(dest, 'my-game')

		const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
		expect(pkg.name).toBe('my-game')
		expect(pkg.private).toBe(true)
		expect(pkg.scripts.dev).toBe('vite')
	})

	it('throws for unknown template ids', async () => {
		const dest = makeDest('cp-unknown')
		let threw = false
		try {
			await copyTemplate({
				templateId: 'does-not-exist',
				templatesDir: fixturesTemplatesDir,
				dest,
				projectName: 'x',
			})
		} catch {
			threw = true
		}
		expect(threw).toBe(true)
		expect(existsSync(join(dest, 'README.md'))).toBe(false)
	})
})
