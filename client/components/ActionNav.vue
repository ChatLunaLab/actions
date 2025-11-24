<template>
    <div :class="[$style.container, isCollapsed ? $style.collapsed : '']" :style="containerPosition">
        <div
            :class="$style.header"
            @mousedown="startMove"
            @touchstart="startMove"
        >
            <IconMove :class="$style.move" />
            <div :class="$style.toggle" @click="toggleCollapse" @mousedown.stop @touchstart.stop>
                <IconChevronDown />
            </div>
        </div>
        <div :class="$style.body">
            <div v-if="commands.length > 0" :class="$style.section">
                <div :class="$style.sectionTitle">Commands</div>
                <div
                    v-for="(item, i) in commands"
                    :key="'cmd-' + i"
                    v-show="item?.command"
                    :class="[
                        $style.item,
                        activeItem === 'cmd-' + item?.command
                            ? $style.active
                            : ''
                    ]"
                    @click="toCmd(item?.command, 'commands')"
                >
                    {{ item?.command }}
                </div>
            </div>
            <div v-if="interceptCommands.length > 0" :class="$style.section">
                <div :class="$style.sectionTitle">Intercepts</div>
                <div
                    v-for="(item, i) in interceptCommands"
                    :key="'int-' + i"
                    v-show="item?.command"
                    :class="[
                        $style.item,
                        activeItem === 'int-' + item?.command
                            ? $style.active
                            : ''
                    ]"
                    @click="toCmd(item?.command, 'interceptCommands')"
                >
                    {{ item?.command }}
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
import { inject, reactive, onUnmounted, computed, ComputedRef, ref, watch } from 'vue'
import IconMove from '../icons/IconMove.vue'
import IconChevronDown from '../icons/IconChevronDown.vue'
import type { Config } from '../../src/config'

const isCollapsed = ref(false)

const toggleCollapse = (e: MouseEvent) => {
    e.stopPropagation()
    isCollapsed.value = !isCollapsed.value
}

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
    observer?.disconnect()
})

const current = inject<ComputedRef<{ config: Config }>>(
    'manager.settings.current'
)
const commands = computed(() => current.value?.config?.commands || [])
const interceptCommands = computed(
    () => current.value?.config?.interceptCommands || []
)

const activeItem = ref('')

const toCmd = (cmd: string | undefined, type: 'commands' | 'interceptCommands') => {
    if (!cmd) return

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

// Scroll Spy Logic
const elementMap = new Map<Element, string>()
let observer: IntersectionObserver | null = null

const initObserver = () => {
    if (observer) {
        observer.disconnect()
        elementMap.clear()
    }

    const options = {
        root: null, // Use viewport
        rootMargin: '-40% 0px -40% 0px', // Trigger in the middle 20% of screen
        threshold: 0
    }

    observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const id = elementMap.get(entry.target)
                if (id) {
                    activeItem.value = id
                }
            }
        }
    }, options)

    // Helper to scan DOM
    const scan = (list: any[], prefix: string, type: string) => {
        if (!list.length) return
        const nodes = document.querySelectorAll('.k-schema-left')
        for (let i = 0; i < nodes.length; i++) {
            const item = nodes[i] as HTMLElement
            const input = item.nextElementSibling?.querySelector('input')
            if (input) {
                const val = input.value
                if (!val) continue
                const found = list.find(c => c?.command === val)
                if (found) {
                     if (item.innerHTML.includes(`${type}[`) && item.innerHTML.includes('command')) {
                         const id = prefix + val
                         observer?.observe(item)
                         elementMap.set(item, id)
                     }
                }
            }
        }
    }

    scan(commands.value, 'cmd-', 'commands')
    scan(interceptCommands.value, 'int-', 'interceptCommands')
}

// Watch for data changes to re-init observer
watch(() => [commands.value, interceptCommands.value], () => {
    // Delay to allow DOM to update
    setTimeout(initObserver, 1000) 
}, { immediate: true })

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
    max-width: 90vw; /* Max width constraint */
    max-height: 70vh; /* Max height constraint */
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

    /* Mobile adaptation */
    @media (max-width: 768px) {
        width: 160px; /* Smaller default width on mobile */
        max-height: 50vh; /* Smaller max height on mobile */
    }

    &:hover {
        box-shadow: var(--k-card-shadow-hover, 0 4px 16px rgba(0, 0, 0, 0.15));
    }

    .header {
        padding: 4px 8px;
        border-bottom: 1px solid var(--k-color-divider, #ebeef5);
        background-color: var(--k-hover-bg);
        display: flex;
        justify-content: space-between; /* Changed to space-between */
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

        .toggle {
            cursor: pointer;
            color: var(--k-text-light);
            transition: transform 0.3s ease, color 0.2s;
            display: flex;
            align-items: center;

            &:hover {
                color: var(--k-text-active);
            }
        }
    }

    .body {
        overflow-y: auto;
        padding: 4px 0;
        transition: max-height 0.3s ease, opacity 0.3s ease;
        opacity: 1;

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

    &.collapsed {
        max-height: 32px !important; /* Adjust based on header height */
        
        .header {
            border-bottom: none;
        }

        .body {
            max-height: 0;
            padding: 0;
            opacity: 0;
            overflow: hidden;
        }

        .toggle {
            transform: rotate(-90deg);
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
        /* Word wrap changes */
        white-space: normal; /* Allow wrapping */
        word-break: break-word; /* Break long words */
        overflow-wrap: anywhere; /* Ensure wrapping happens */
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

