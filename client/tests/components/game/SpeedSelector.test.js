import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpeedSelector from '../../../src/components/game/SpeedSelector.vue'

// Only test the speed → score multiplier mapping (business rule) and the emit
// contract. Pure rendering is covered by E2E.

describe('SpeedSelector', () => {
  it.each([
    [1.0, '1x'],
    [1.2, '1.5x'],
    [1.5, '2x'],
    [2.0, '3x']
  ])('speed %s maps to score multiplier %s', (speed, expected) => {
    const wrapper = mount(SpeedSelector, { props: { modelValue: speed } })
    expect(wrapper.text()).toContain(`得分倍率: ${expected}`)
  })

  it('defaults to 1x multiplier for unknown speed values', () => {
    const wrapper = mount(SpeedSelector, { props: { modelValue: 99 } })
    expect(wrapper.text()).toContain('得分倍率: 1x')
  })

  it('emits update:modelValue when a speed is clicked', async () => {
    const wrapper = mount(SpeedSelector, { props: { modelValue: 1.0 } })
    await wrapper.find('[data-testid="speed-option-2"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[2.0]])
  })
})
