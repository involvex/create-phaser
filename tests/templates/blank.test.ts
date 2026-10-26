import {getTemplate} from '../../src/registry'
import {registerTemplateTests} from '../helpers'

const info = getTemplate('blank')
if (!info) {
	throw new Error('template blank is not registered in src/registry.ts')
}

registerTemplateTests(info, [
	'src/scenes/BootScene.ts',
	'src/scenes/GameScene.ts',
])
