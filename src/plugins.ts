import { Context } from 'koishi'
import { Config } from '.'
// import start
import { apply as commands } from './plugins/commands'
import { apply as config } from './plugins/config'
// import end

export async function plugins(ctx: Context, parent: Config) {
    type Command = (ctx: Context, config: Config) => PromiseLike<void> | void

    const middlewares: Command[] =
        // middleware start
        [commands, config] // middleware end

    for (const middleware of middlewares) {
        await middleware(ctx, parent)
    }
}
