import { Context, Schema } from 'koishi'
import { Config } from '..'
import type {} from '../service/model'
import { PlatformService } from 'koishi-plugin-chatluna/llm-core/platform/service'
import { ModelType } from 'koishi-plugin-chatluna/llm-core/platform/types'

export async function apply(ctx: Context, config: Config) {
    ctx.on('chatluna/model-added', async (service) => {
        ctx.schema.set('model', Schema.union(getModelNames(service)))
        const presets = await ctx.chatluna.preset.getAllPreset(false)
        ctx.schema.set(
            'preset',
            Schema.union(presets.map((preset) => Schema.const(preset)))
        )
    })

    ctx.on('chatluna/model-removed', async (service) => {
        ctx.schema.set('model', Schema.union(getModelNames(service)))
        const presets = await ctx.chatluna.preset.getAllPreset(false)
        ctx.schema.set(
            'preset',
            Schema.union(presets.map((preset) => Schema.const(preset)))
        )
    })

    ctx.schema.set('model', Schema.union(getModelNames(ctx.chatluna.platform)))
    const presets = await ctx.chatluna.preset.getAllPreset(false)
    ctx.schema.set(
        'preset',
        Schema.union(presets.map((preset) => Schema.const(preset)))
    )
}

function getModelNames(service: PlatformService) {
    return service.getAllModels(ModelType.llm).map((m) => Schema.const(m))
}
