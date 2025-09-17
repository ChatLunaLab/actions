import { Context, Schema } from 'koishi'
import { Config } from '..'
import type {} from '../service/model'
import { modelSchema } from 'koishi-plugin-chatluna/utils/schema'

export async function apply(ctx: Context, config: Config) {
    modelSchema(ctx)
    const updatePresets = async () => {
        const presets = await ctx.chatluna.preset.getAllPreset(false)
        ctx.schema.set(
            'preset',
            Schema.union(presets.map((preset) => Schema.const(preset)))
        )
    }

    ctx.on('chatluna/model-added', async (service) => {
        await updatePresets()
    })

    ctx.on('chatluna/model-removed', async (service) => {
        await updatePresets()
    })

    await updatePresets()
}
