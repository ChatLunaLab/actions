import { Context } from '@koishijs/client'
import ActionDetailsLoader from './ActionDetailsLoader.vue'

export default (ctx: Context) => {
    ctx.slot({
        type: 'plugin-details',
        component: ActionDetailsLoader,
        order: -999
    })
}
