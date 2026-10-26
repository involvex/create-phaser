import pc from 'picocolors'

const palette: Array<(s: string) => string> = [pc.cyan, pc.blue, pc.magenta]

function gradient(text: string): string {
	return [...text].map((ch, i) => palette[i % palette.length]!(ch)).join('')
}

/** Fancy one-liner banner printed above the prompt session. */
export function banner(version: string): string {
	return [
		'',
		`  ${pc.bold(gradient('create-phaser'))}  ${pc.dim(`v${version}`)}`,
		`  ${pc.dim('Scaffold a Phaser 4 - TypeScript - Vite game project')}`,
		'',
	].join('\n')
}
