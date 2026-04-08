import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NeonButton from '../NeonButton.vue'

describe('NeonButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(NeonButton, {
      slots: { default: '点击我' }
    })
    expect(wrapper.text()).toContain('点击我')
  })

  it('applies primary class by default', () => {
    const wrapper = mount(NeonButton)
    expect(wrapper.classes()).toContain('neon-btn--primary')
  })

  it('applies default class when type is default', () => {
    const wrapper = mount(NeonButton, {
      props: { type: 'default' }
    })
    expect(wrapper.classes()).toContain('neon-btn--default')
  })

  it('is disabled when loading', () => {
    const wrapper = mount(NeonButton, {
      props: { loading: true }
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('emits click event', async () => {
    const wrapper = mount(NeonButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
