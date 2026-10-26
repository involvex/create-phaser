import {getTemplate} from '../../src/registry'
import {registerTemplateTests} from '../helpers'

const info = getTemplate('2d-platformer')
if (!info) {
	throw new Error('template 2d-platformer is not registered in src/registry.ts')
}

registerTemplateTests(info, [
	'src/scenes/BootScene.ts',
	'src/scenes/GameScene.ts',
])
