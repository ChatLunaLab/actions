import { Context, h } from 'koishi'
import { Config, logger } from '..'
import type {} from '../service/model'
import { HumanMessage } from '@langchain/core/messages'
import {
    getCurrentWeekday,
    getMessageContent,
    getNotEmptyString
} from 'koishi-plugin-chatluna/utils/string'
import { PromptTemplate } from '@langchain/core/prompts'

export function apply(ctx: Context, config: Config) {
    const enabledCommands = config.commands.filter((command) => command.enabled)

    for (const command of enabledCommands) {
        ctx.command(
            command.command + ' <message:text>',
            command.description
        ).action(async ({ session }, message) => {
            if (
                command.model === null ||
                ctx.chatluna.platform.findModel(command.model) == null
            ) {
                return '此命令没有选择模型，请联系管理员配置模型并重置。'
            }

            logger.debug(`Received command: ${command.command} ${message}`)

            if (message == null || message === '') {
                message = '[ ]'
            }

            const elements = h.parse(message)

            const transformedMessage =
                await ctx.chatluna.messageTransformer.transform(
                    session,
                    elements,
                    command.model
                )

            const inputPrompt = PromptTemplate.fromTemplate(
                command.inputPrompt ?? '{input}'
            )

            const formattedInputPrompt = await inputPrompt.format({
                input: getMessageContent(transformedMessage.content)
            })

            const finalMessageContent =
                typeof transformedMessage.content === 'string'
                    ? formattedInputPrompt
                    : transformedMessage.content.map((part) => {
                          if (part.type !== 'text') {
                              return part
                          }
                          part.text = formattedInputPrompt
                          return part
                      })

            const humanMessage = new HumanMessage({
                content: finalMessageContent,
                name: transformedMessage.name,
                id: session.userId,
                additional_kwargs: {
                    ...transformedMessage.additional_kwargs
                }
            })

            const preset =
                command.promptType === 'instruction'
                    ? command.prompt
                    : ctx.chatluna.preset.getPreset(command.preset)

            const [chain, llm] = await ctx.chatluna_action_model
                .getChain(
                    command.command,
                    command.model,
                    preset,
                    command.chatMode
                )
                .then((ref) => ref.value)

            const chatLunaConfig = ctx.chatluna.config

            const result = await chain.invoke(
                {
                    input: humanMessage,
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
                },
                {
                    metadata: {
                        session,
                        model: llm,
                        userId: session.userId
                    }
                }
            )

            if (
                typeof result.content === 'string' &&
                result.content.length < 10
            ) {
                logger.debug(`Command result: ${result.content}`)
            }

            const mdRenderer = await ctx.chatluna.renderer.getRenderer('text')

            return await mdRenderer
                .render(
                    {
                        content: result.content
                    },
                    {
                        type: 'text'
                    }
                )
                .then((rendered) => {
                    return rendered.element
                })
        })
    }

    const enabledInterceptCommands = config.interceptCommands.filter(
        (command) => command.enabled
    )

    ctx.before('send', async (session, options) => {
        let scope: string = session.scope ?? options?.session?.['scope']

        if (scope == null) {
            return
        }

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

        if (
            interceptCommand.model === null ||
            ctx.chatluna.platform.findModel(interceptCommand.model) == null
        ) {
            return
        }

        const preset =
            interceptCommand.promptType === 'instruction'
                ? interceptCommand.prompt
                : ctx.chatluna.preset.getPreset(interceptCommand.preset)

        const [chain, llm] = await ctx.chatluna_action_model
            .getChain(
                interceptCommand.command,
                interceptCommand.model,
                preset,
                interceptCommand.chatMode
            )
            .then((ref) => ref.value)

        const chatLunaConfig = ctx.chatluna.config

        const transformedMessage =
            await ctx.chatluna.messageTransformer.transform(
                session,
                session.elements,
                interceptCommand.model
            )

        const inputPrompt = PromptTemplate.fromTemplate(
            interceptCommand.inputPrompt ?? '{input}'
        )

        const formattedInputPrompt = await inputPrompt.format({
            input: getMessageContent(transformedMessage.content)
        })

        const humanMessage = new HumanMessage({
            content:
                typeof transformedMessage.content === 'string'
                    ? formattedInputPrompt
                    : transformedMessage.content.map((part) => {
                          if (part.type !== 'text') {
                              return part
                          }
                          part.text = formattedInputPrompt
                          return part
                      }),
            name: transformedMessage.name,
            id: session.userId,
            additional_kwargs: {
                ...transformedMessage.additional_kwargs
            }
        })

        const result = await chain.invoke(
            {
                input: humanMessage,
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
            },
            {
                metadata: {
                    session,
                    model: llm,
                    userId: session.userId
                }
            }
        )

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
