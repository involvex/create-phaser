import type {TemplateInfo} from './types'

/**
 * Metadata for every template bundled under templates/<id>.
 *
 * To ship a new template:
 *   1. create the full template directory under templates/<id>
 *   2. add an entry here (the list order is the picker order)
 *   3. add tests/templates/<id>.test.ts calling registerTemplateTests()
 */
export const TEMPLATES: TemplateInfo[] = [
	{
		id: '2d-platformer',
		name: '2D Platformer',
		description:
			'Side-scroller with jumping, platforms, coins & a follow camera',
	},
	{
		id: 'card-game',
		name: 'Card Game',
		description: 'Memory-match card game with flip animations & a move counter',
	},
	{
		id: 'space-shooter',
		name: 'Space Shooter',
		description: 'Shmup with waves of enemies, bullets & particle explosions',
	},
	{
		id: 'breakout',
		name: 'Breakout',
		description: 'Classic brick-breaker with paddle-angle physics & lives',
	},
	{
		id: 'top-down-shooter',
		name: 'Top-Down Shooter',
		description: 'WASD movement, mouse aim & escalating enemy waves',
	},
	{
		id: 'blank',
		name: 'Blank',
		description: 'Minimal starter - Boot + Game scene skeleton to build on',
	},
]

export const DEFAULT_TEMPLATE_ID = '2d-platformer'

export function getTemplate(id: string): TemplateInfo | undefined {
	const lower = id.toLowerCase()
	return TEMPLATES.find(t => t.id === lower)
}

/** Aligned one-line list used by the --list output. */
export function formatTemplateList(): string {
	const width = Math.max(...TEMPLATES.map(t => t.id.length))
	return TEMPLATES.map(t => `  ${t.id.padEnd(width)}  ${t.description}`).join(
		'\n',
	)
}
