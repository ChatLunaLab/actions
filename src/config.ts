import { Schema } from 'koishi'

export interface Config {
    commands: {
        enabled: boolean
        model: string
        command: string
        description: string
        chatMode: 'chat' | 'plugin'
        promptType: 'instruction' | 'preset'
        prompt?: string
        preset?: string
        inputPrompt?: string
        registerAsTool?: boolean
        allowExecuteWithoutMessage?: boolean
    }[]
    interceptCommands: {
        interceptPosition: 'before' | 'after'
        enabled: boolean
        model: string
        chatMode: 'chat' | 'plugin'
        command: string
        promptType: 'instruction' | 'preset'
        prompt?: string
        preset?: string
        inputPrompt?: string
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
                chatMode: Schema.union(['chat', 'plugin'])
                    .default('chat')
                    .description(
                        '指令的聊天模式(chat: 聊天模式，plugin: Agent 模式)'
                    ),
                promptType: Schema.union(['instruction', 'preset'])
                    .default('instruction')
                    .description('提示词类型(instruction: 指令，preset: 预设)'),
                preset: Schema.dynamic('preset')
                    .default('无')
                    .description('选择使用的预设'),
                prompt: Schema.string()
                    .role('textarea')
                    .default('')
                    .description('自定义提示词'),
                inputPrompt: Schema.string()
                    .role('textarea')
                    .default('{input}')
                    .description('自定义输入提示词'),
                registerAsTool: Schema.boolean()
                    .default(false)
                    .description('是否注册为 ChatLuna 工具'),
                allowExecuteWithoutMessage: Schema.boolean()
                    .default(false)
                    .description('是否允许无参数直接执行命令')
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
                chatMode: Schema.union(['chat', 'search', 'plugin'])
                    .default('chat')
                    .description(
                        '指令的聊天模式(chat: 聊天模式，plugin: Agent 模式)'
                    ),
                promptType: Schema.union(['instruction', 'preset'])
                    .default('instruction')
                    .description('提示词类型(instruction: 指令，preset: 预设)'),
                preset: Schema.dynamic('preset')
                    .default('无')
                    .description('选择使用的预设'),
                prompt: Schema.string()
                    .role('textarea')
                    .default('')
                    .description('自定义提示词'),
                inputPrompt: Schema.string()
                    .role('textarea')
                    .default('{input}')
                    .description('自定义输入提示词')
            })
        )
            .default([])
            .description('拦截渲染的命令列表')
    }).description('基础配置')
]) as unknown as Schema<Config>

export const name = 'chatluna-actions'
