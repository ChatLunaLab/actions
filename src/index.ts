/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable max-len */
import { Context, Logger } from 'koishi'
import { ModelService } from './service/model'
import { createLogger } from 'koishi-plugin-chatluna/utils/logger'
import { plugins } from './plugins'
import { Config } from './config'

export let logger: Logger

export function apply(ctx: Context, config: Config) {
    ctx.plugin(ModelService, config)

    logger = createLogger(ctx, 'chatluna-actions')

    ctx.inject(['chatluna_action_model'], async (ctx) => {
        await plugins(ctx, config)
    })
}

export const inject = {
    required: ['chatluna']
}

export * from './config'
