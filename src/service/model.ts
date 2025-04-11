import { Context, Service } from 'koishi'
import { Config } from '..'
import { PresetTemplate } from 'koishi-plugin-chatluna/llm-core/prompt'
import { AIMessageChunk, SystemMessage } from '@langchain/core/messages'
import { parseRawModelName } from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'
import {
    ChatLunaChatPrompt,
    ChatLunaChatPromptFormat
} from 'koishi-plugin-chatluna/llm-core/chain/prompt'
import { Runnable, RunnableConfig } from '@langchain/core/runnables'

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
        prompt: (() => Promise<PresetTemplate>) | string
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
                          messages: [new SystemMessage(prompt)],
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
                llm.getModelMaxContextSize()
        })

        const chain = chatPrompt.pipe(llm)

        this._chains[key] = chain

        return chain
    }
}

declare module 'koishi' {
    interface Context {
        chatluna_action_model: ModelService
    }
}
