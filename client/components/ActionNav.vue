<template>
    <div :class="$style.container" :style="containerPosition">
        <div
            :class="$style.header"
            @mousedown="startMove"
            @touchstart="startMove"
        >
            <IconMove :class="$style.move" />
        </div>
        <div :class="$style.body">
            <div v-if="commands.length > 0" :class="$style.section">
                <div :class="$style.sectionTitle">Commands</div>
                <div
                    v-for="(item, i) in commands"
                    :key="'cmd-' + i"
                    :class="[
                        $style.item,
                        activeItem === 'cmd-' + item.command
                            ? $style.active
                            : ''
                    ]"
                    @click="toCmd(item.command, 'commands')"
                >
                    {{ item.command }}
                </div>
            </div>
            <div v-if="interceptCommands.length > 0" :class="$style.section">
                <div :class="$style.sectionTitle">Intercepts</div>
                <div
                    v-for="(item, i) in interceptCommands"
                    :key="'int-' + i"
                    :class="[
                        $style.item,
                        activeItem === 'int-' + item.command
                            ? $style.active
                            : ''
                    ]"
                    @click="toCmd(item.command, 'interceptCommands')"
                >
                    {{ item.command }}
                </div>
            </div>
            <div
                v-if="commands.length === 0 && interceptCommands.length === 0"
                :class="$style.empty"
            >
                No actions configured
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { inject, reactive, onUnmounted, computed, ComputedRef, ref } from 'vue'
import IconMove from '../icons/IconMove.vue'
import type { Config } from '../../src/config'

const containerPosition = computed(() => {
    return {
        top: mouseInfo.top + 'px',
        right: mouseInfo.right + 'px'
    }
})

const mouseInfo = reactive({
    ing: false,
    top: 100,
    right: 20,
    startTop: 0,
    startRight: 0,
    startX: 0,
    startY: 0,
    width: 0,
    height: 0
})

const onMousemove = (event: MouseEvent | TouchEvent) => {
    if (event instanceof TouchEvent) {
        event = event.touches[0] as any as MouseEvent
    }
    if (!mouseInfo.ing) {
        return
    }

    // Calculate new position
    let newTop = mouseInfo.startTop + (event.clientY - mouseInfo.startY)
    let newRight = mouseInfo.startRight - (event.clientX - mouseInfo.startX)

    // Boundary checks
    const boundary = document.querySelector('.plugin-view')?.getBoundingClientRect()
    
    let minTop = 0
    let maxTop = window.innerHeight - mouseInfo.height
    let minRight = 0
    let maxRight = window.innerWidth - mouseInfo.width

    if (boundary) {
        minTop = boundary.top
        maxTop = boundary.bottom - mouseInfo.height
        // right is distance from right edge of window
        // element.right = window.innerWidth - right
        // element.left = window.innerWidth - right - width
        
        // Constraint: element.right <= boundary.right
        // window.innerWidth - right <= boundary.right
        // right >= window.innerWidth - boundary.right
        minRight = window.innerWidth - boundary.right

        // Constraint: element.left >= boundary.left
        // window.innerWidth - right - width >= boundary.left
        // right <= window.innerWidth - boundary.left - width
        maxRight = window.innerWidth - boundary.left - mouseInfo.width
    }

    if (newTop < minTop) newTop = minTop
    if (newTop > maxTop) newTop = maxTop
    if (newRight < minRight) newRight = minRight
    if (newRight > maxRight) newRight = maxRight

    mouseInfo.top = newTop
    mouseInfo.right = newRight
}

const startMove = (event: MouseEvent | TouchEvent) => {
    if (event instanceof TouchEvent) {
        event = event.touches[0] as any as MouseEvent
    }

    // Get current dimensions
    const rect = (event.target as HTMLElement)
        .closest(`.${useCssModule().container}`)
        ?.getBoundingClientRect()
    if (rect) {
        mouseInfo.width = rect.width
        mouseInfo.height = rect.height
    }

    mouseInfo.startTop = mouseInfo.top
    mouseInfo.startRight = mouseInfo.right
    mouseInfo.startX = event.clientX
    mouseInfo.startY = event.clientY
    mouseInfo.ing = true
}

const endMove = () => {
    mouseInfo.ing = false
}

window.addEventListener('mousemove', onMousemove)
window.addEventListener('mouseup', endMove)
window.addEventListener('touchmove', onMousemove)
window.addEventListener('touchend', endMove)

onUnmounted(() => {
    window.removeEventListener('mousemove', onMousemove)
    window.removeEventListener('mouseup', endMove)
    window.removeEventListener('touchmove', onMousemove)
    window.removeEventListener('touchend', endMove)
})

const current = inject<ComputedRef<{ config: Config }>>(
    'manager.settings.current'
)
const commands = computed(() => current.value?.config?.commands || [])
const interceptCommands = computed(
    () => current.value?.config?.interceptCommands || []
)

const activeItem = ref('')

const toCmd = (cmd: string, type: 'commands' | 'interceptCommands') => {
    activeItem.value = (type === 'commands' ? 'cmd-' : 'int-') + cmd

    // Find the element in the DOM
    // We look for .k-schema-left that contains the array key (e.g. "commands[") and "command" field
    // And the input value matches the cmd

    const nodes = document.querySelectorAll('.k-schema-left')
    for (let i = 0; i < nodes.length; i++) {
        const item = nodes[i] as HTMLElement
        // Check if it belongs to the correct array and is the 'command' field
        // The innerHTML check is a heuristic based on how Koishi renders schema paths/labels
        // Usually it renders something like "commands[0].command" in a hidden way or debug info,
        // or we rely on the structure.
        // Let's try to find the input with the value.

        const input = item.nextElementSibling?.querySelector('input')
        if (input && input.value === cmd) {
            // Now verify it's the right section
            // We can check if a parent or previous sibling indicates "commands" or "interceptCommands"
            // But simpler: check if the item text or context implies it.
            // In network-data-getter: item.innerHTML.includes("sources[")

            if (
                item.innerHTML.includes(`${type}[`) &&
                item.innerHTML.includes('command')
            ) {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' })
                return
            }

            // Fallback: if innerHTML doesn't have the path (it might not in production build),
            // we might need another way. But let's stick to the heuristic that worked for network-data-getter for now.
            // It seems Koishi console puts the schema path in the label or somewhere accessible.
        }
    }
}

// Use CSS Module for class names
const useCssModule = () => {
    // This is a hack because useCssModule might not be available in <script setup> directly without import
    // But we are using :class="$style.xxx" so it's fine.
    // For the startMove querySelector, we need the actual class name.
    // In Vue 3 <style module>, we can access $style in template.
    // In script, we can use useCssModule() from 'vue'.
    return { container: 'container' } // Placeholder, actual logic in template uses $style
}
</script>

<style module lang="scss">
.container {
    position: absolute;
    z-index: 1000;
    width: 200px;
    max-height: 70vh;
    background: var(--k-card-bg);
    border-radius: 8px;
    box-shadow: var(--k-card-shadow);
    display: flex;
    flex-direction: column;
    border: 1px solid var(--k-card-border);
    font-family:
        'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
        'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
    user-select: none;
    overflow: hidden;
    transition: box-shadow 0.3s ease;

    &:hover {
        box-shadow: var(--k-card-shadow-hover, 0 4px 16px rgba(0, 0, 0, 0.15));
    }

    .header {
        padding: 4px 8px;
        border-bottom: 1px solid var(--k-color-divider, #ebeef5);
        background-color: var(--k-hover-bg);
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: move;
        transition: background-color 0.2s;

        &:hover {
            background-color: var(--k-activity-bg);
        }

        .move {
            color: var(--k-text-light);
            cursor: grab;
            transition: color 0.2s;
            &:active {
                cursor: grabbing;
                color: var(--k-color-primary);
            }
        }
    }

    .body {
        overflow-y: auto;
        padding: 4px 0;

        &::-webkit-scrollbar {
            width: 6px;
        }
        &::-webkit-scrollbar-thumb {
            background: var(--k-scroll-thumb);
            border-radius: 3px;
        }
        &::-webkit-scrollbar-track {
            background: transparent;
        }
    }

    .section {
        margin-bottom: 4px;
    }

    .sectionTitle {
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        color: var(--k-text-light);
        background-color: var(--k-bg-light);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .item {
        padding: 8px 16px;
        font-size: 13px;
        color: var(--k-text-normal);
        cursor: pointer;
        transition:
            background-color 0.2s,
            color 0.2s;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-left: 3px solid transparent;

        &:hover {
            background-color: var(--k-hover-bg);
            color: var(--k-text-active);
        }

        &.active {
            color: var(--k-color-primary);
            background-color: var(--k-activity-bg);
            font-weight: 500;
            border-left-color: var(--k-color-primary);
        }
    }

    .empty {
        padding: 20px;
        text-align: center;
        color: var(--k-text-light);
        font-size: 13px;
        font-style: italic;
    }
}
</style>

