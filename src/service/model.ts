import { Context, Service } from 'koishi'
import { Config } from '..'
import { PresetTemplate } from 'koishi-plugin-chatluna/llm-core/prompt'
import { AIMessageChunk, SystemMessage } from '@langchain/core/messages'
import { parseRawModelName } from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'
import {
    ChatLunaChatPrompt,
    ChatLunaChatPromptFormat
} from 'koishi-plugin-chatluna/llm-core/chain/prompt'
import {
    Runnable,
    RunnableConfig,
    RunnableLambda
} from '@langchain/core/runnables'
import {
    AgentExecutor,
    createOpenAIAgent
} from 'koishi-plugin-chatluna/llm-core/agent'

export class ModelService extends Service {
    private _chains: Record<
        string,
        Runnable<
            ChatLunaChatPromptFormat,
            AIMessageChunk,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            RunnableConfig<Record<string, any>>
        >
    > = {}

    constructor(ctx: Context, config: Config) {
        super(ctx, 'chatluna_action_model')
    }

    async getChain(
        key: string,
        model: string,
        prompt: (() => Promise<PresetTemplate>) | string,
        chatMode: 'chat' | 'plugin' = 'chat'
    ) {
        if (this._chains[key]) {
            return this._chains[key]
        }

        const currentPreset =
            typeof prompt === 'string'
                ? async () =>
                      ({
                          triggerKeyword: [key],
                          rawText: prompt,
                          messages:
                              prompt != null || prompt.trim().length > 0
                                  ? [new SystemMessage(prompt)]
                                  : [],
                          config: {}
                      }) satisfies PresetTemplate
                : (prompt as () => Promise<PresetTemplate>)

        const [platform, currentModelName] = parseRawModelName(model)
        const llm = await this.ctx.chatluna.createChatModel(
            platform,
            currentModelName
        )

        const chatPrompt = new ChatLunaChatPrompt({
            preset: currentPreset,
            tokenCounter: (text) => llm.getNumTokens(text),
            sendTokenLimit:
                llm.invocationParams().maxTokenLimit ??
                llm.getModelMaxContextSize(),
            variableService: this.ctx.chatluna.variable
        })

        if (chatMode === 'plugin') {
            const embeddings = await this._createEmbeddings()
            const tools = await Promise.all(
                this.ctx.chatluna.platform
                    .getTools()
                    .map((tool) =>
                        this.ctx.chatluna.platform
                            .getTool(tool)
                            .createTool({ model: llm, embeddings })
                    )
            )

            const executor = AgentExecutor.fromAgentAndTools({
                tags: ['openai-functions'],
                agent: createOpenAIAgent({
                    llm,
                    tools,
                    prompt: chatPrompt
                }),
                tools,
                memory: undefined,
                verbose: false
            })

            this._chains[key] = RunnableLambda.from(async (input) => {
                const output = await executor.invoke(input)
                return new AIMessageChunk({
                    content: output.output
                })
            })
        } else {
            const chain = chatPrompt.pipe(llm)

            this._chains[key] = chain
        }

        return this._chains[key]
    }

    private async _createEmbeddings() {
        const [platform, modelName] = parseRawModelName(
            this.ctx.chatluna.config.defaultEmbeddings
        )

        return await this.ctx.chatluna.createEmbeddings(platform, modelName)
    }
}

declare module 'koishi' {
    interface Context {
        chatluna_action_model: ModelService
    }
}
