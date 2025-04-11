/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable max-len */
import { Context, Logger, Schema } from 'koishi'
import { ModelService } from './service/model'
import { createLogger } from 'koishi-plugin-chatluna/utils/logger'
import { plugins } from './plugins'

export let logger: Logger

export function apply(ctx: Context, config: Config) {
    ctx.on('ready', async () => {
        ctx.plugin(ModelService)
        logger = createLogger(ctx, 'chatluna-actions')
        await plugins(ctx, config)
    })
}

export const inject = {
    required: ['chatluna']
}

export interface Config {
    commands: {
        enabled: boolean
        model: string
        command: string
        description: string
        promptType: 'instruction' | 'preset'
        prompt?: string
        preset?: string
    }[]
    interceptCommands: {
        interceptPosition: 'before' | 'after'
        enabled: boolean
        model: string
        command: string
        promptType: 'instruction' | 'preset'
        prompt?: string
        preset?: string
    }[]
}

export const Config = Schema.intersect([
    Schema.object({
        commands: Schema.array(
            Schema.object({
                command: Schema.string().description('注册的一级指令名称'),
                model: Schema.dynamic('model').description(
                    '执行此命令使用的模型'
                ),
                enabled: Schema.boolean()
                    .default(true)
                    .description('是否启用此命令'),
                description: Schema.string()
                    .default('')
                    .description('指令的描述'),
                promptType: Schema.union(['instruction', 'preset'])
                    .default('instruction')
                    .description('提示词类型(instruction: 指令，preset: 预设)'),
                preset: Schema.dynamic('preset').default('无'),
                prompt: Schema.string().role('textarea').default('')
            })
        )
            .default([])
            .description('注册的命令列表'),

        interceptCommands: Schema.array(
            Schema.object({
                interceptPosition: Schema.union(['after'])
                    .default('after')
                    .description('拦截位置(after: 命令响应后，命令发送前)'),
                enabled: Schema.boolean()
                    .default(true)
                    .description('是否启用此命令拦截'),
                model: Schema.dynamic('model').description(
                    '执行此命令使用的模型'
                ),
                command: Schema.string().description('拦截的指令名称'),
                promptType: Schema.union(['instruction', 'preset'])
                    .default('instruction')
                    .description('提示词类型(instruction: 指令，preset: 预设)'),
                preset: Schema.dynamic('preset').default('无'),
                prompt: Schema.string().role('textarea').default('')
            })
        )
            .default([])
            .description('拦截渲染的命令列表')
    }).description('基础配置')
]) as unknown as Schema<Config>

export const name = 'chatluna-actions'
