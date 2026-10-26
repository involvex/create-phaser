import {getTemplate} from '../../src/registry'
import {registerTemplateTests} from '../helpers'

const info = getTemplate('card-game')
if (!info) {
	throw new Error('template card-game is not registered in src/registry.ts')
}

registerTemplateTests(info, ['src/scenes/GameScene.ts'])
