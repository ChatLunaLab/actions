import { Context, h } from 'koishi'
import { Config, logger } from '..'
import type {} from '../service/model'
import { HumanMessage } from '@langchain/core/messages'
import {} from '..'
import {
    getCurrentWeekday,
    getMessageContent,
    getNotEmptyString
} from 'koishi-plugin-chatluna/utils/string'

export function apply(ctx: Context, config: Config) {
    const enabledCommands = config.commands.filter((command) => command.enabled)

    for (const command of enabledCommands) {
        ctx.command(
            command.command + ' <message: string>',
            command.description
        ).action(async ({ session }, message) => {
            logger.debug(`Received command: ${command.command} ${message}`)
            const preset =
                command.promptType === 'instruction'
                    ? command.prompt
                    : () => ctx.chatluna.preset.getPreset(command.preset)
            const chain = await ctx.chatluna_action_model.getChain(
                command.command,
                command.model,
                preset
            )

            const chatLunaConfig = ctx.chatluna.config

            const result = await chain.invoke({
                input: new HumanMessage(message),
                chat_history: [],
                variables: {
                    name: chatLunaConfig.botNames[0],
                    date: new Date().toLocaleString(),
                    bot_id: session.bot.selfId,
                    is_group: (
                        !session.isDirect || session.guildId != null
                    ).toString(),
                    is_private: session.isDirect?.toString(),
                    user_id:
                        session.author?.user?.id ??
                        session.event?.user?.id ??
                        '0',
                    user: getNotEmptyString(
                        session.author?.nick,
                        session.author?.name,
                        session.event.user?.name,
                        session.username
                    ),
                    noop: '',
                    time: new Date().toLocaleTimeString(),
                    weekday: getCurrentWeekday()
                }
            })

            logger.debug(`Command result: ${result.content}`)

            return getMessageContent(result.content)
        })
    }

    const enabledInterceptCommands = config.interceptCommands.filter(
        (command) => command.enabled
    )

    ctx.before('send', async (session, options) => {
        let scope: string = session.scope ?? options.session['scope']
        // remove last
        scope = scope.split('.').slice(1, -1).join('.')
        const command = ctx.$commander.resolve(scope, session)

        if (!command) {
            return
        }

        const interceptCommand = enabledInterceptCommands.find(
            (interceptCommand) => interceptCommand.command === command.name
        )

        if (!interceptCommand) {
            return
        }

        const preset =
            interceptCommand.promptType === 'instruction'
                ? interceptCommand.prompt
                : () => ctx.chatluna.preset.getPreset(interceptCommand.preset)
        const chain = await ctx.chatluna_action_model.getChain(
            interceptCommand.command,
            interceptCommand.model,
            preset
        )

        const chatLunaConfig = ctx.chatluna.config

        // TODO: parse image
        const result = await chain.invoke({
            input: new HumanMessage(session.content),
            chat_history: [],
            variables: {
                name: chatLunaConfig.botNames[0],
                date: new Date().toLocaleString(),
                bot_id: session.bot.selfId,
                is_group: (
                    !session.isDirect || session.guildId != null
                ).toString(),
                is_private: session.isDirect?.toString(),
                user_id:
                    session.author?.user?.id ?? session.event?.user?.id ?? '0',
                user: getNotEmptyString(
                    session.author?.nick,
                    session.author?.name,
                    session.event.user?.name,
                    session.username
                ),
                noop: '',
                time: new Date().toLocaleTimeString(),
                weekday: getCurrentWeekday()
            }
        })

        logger.debug(`Command result: ${result.content}`)

        const llmResult = getMessageContent(result.content)

        // replace text to llm result

        let elements = session.elements

        let findTextElement = false
        for (const element of elements) {
            if (element.type === 'text') {
                element.attrs.content = llmResult
                element.attrs.x = 0
                findTextElement = true
                break
            }
        }

        if (!findTextElement) {
            elements.push(h('text', { content: llmResult }))
        } else {
            elements = elements.filter(
                (element) =>
                    element.type !== 'text' ||
                    (element.type === 'text' && element.attrs['x'] === 0)
            )
        }

        session.elements = elements
    })
}
