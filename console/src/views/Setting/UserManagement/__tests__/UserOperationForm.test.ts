import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import UserOperationForm from '../UserOperationForm.vue'

const mocks = vi.hoisted(() => ({
  getUserDetail: vi.fn(),
  addUser: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('@/api/user', () => ({
  userApi: {
    getUserDetail: mocks.getUserDetail,
    addUser: mocks.addUser,
    updateUser: mocks.updateUser,
  },
}))

const openForm = async (userId: number, mode: 'create' | 'edit') => {
  const wrapper = mount(UserOperationForm, { attachTo: document.body })
  await (wrapper.vm as unknown as { open: (id: number, mode: string) => Promise<void> }).open(
    userId,
    mode,
  )
  await flushPromises()
  return wrapper
}

const passwordInputs = () => document.body.querySelectorAll('input[type="password"]')

const submit = async () => {
  const submitButton = [...document.body.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Submit',
  )
  submitButton?.click()
  await flushPromises()
}

describe('UserOperationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    mocks.getUserDetail.mockResolvedValue({
      success: true,
      data: { username: 'operator', is_active: true, role: { id: 2 } },
    })
    mocks.updateUser.mockResolvedValue({ success: true })
  })

  it('offers password fields when creating a user', async () => {
    const wrapper = await openForm(0, 'create')

    expect(passwordInputs()).toHaveLength(2)
    wrapper.unmount()
  })

  it('offers no password fields when editing a user', async () => {
    const wrapper = await openForm(7, 'edit')

    expect(passwordInputs()).toHaveLength(0)
    wrapper.unmount()
  })

  it('submits only the role and enabled state when editing a user', async () => {
    const wrapper = await openForm(7, 'edit')

    await submit()

    await vi.waitFor(() => expect(mocks.updateUser).toHaveBeenCalledTimes(1))
    expect(mocks.updateUser).toHaveBeenCalledWith(7, { role_id: 2, is_active: true })
    wrapper.unmount()
  })
})
