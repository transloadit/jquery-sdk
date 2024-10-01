import { describe, it, expect, beforeEach, vi } from 'vitest'
import Modal from '../../js/lib/Modal'

describe('Modal', () => {
  let modal
  let mockOpts
  let $mockElement

  beforeEach(() => {
    $mockElement = {
      appendTo: vi.fn().mockReturnThis(),
      find: vi.fn().mockReturnThis(),
      hide: vi.fn().mockReturnThis(),
      html: vi.fn().mockReturnThis(),
      show: vi.fn().mockReturnThis(),
      toggle: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnThis(),
      css: vi.fn().mockReturnThis(),
      data: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
      addClass: vi.fn().mockReturnThis(),
      removeClass: vi.fn().mockReturnThis(),
      toggleClass: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      expose: vi.fn().mockReturnThis(), // Add mock for expose method
      click: vi.fn().mockReturnThis(), // Add mock for click method
    }

    const mockJQuery = vi.fn(() => $mockElement)
    mockJQuery.extend = vi.fn((target, ...sources) => {
      return Object.assign(target, ...sources)
    })

    mockOpts = {
      i18n: {
        translate: vi.fn((key) => key),
      },
      onClose: vi.fn(),
      $: mockJQuery,
    }

    // Mock the mask plugin
    mockOpts.$.mask = {
      close: vi.fn(),
    }

    modal = new Modal(mockOpts)
  })

  it('should initialize with correct properties', () => {
    expect(modal._i18n).toBe(mockOpts.i18n)
    expect(modal.onClose).toBe(mockOpts.onClose)
    expect(modal.$).toBe(mockOpts.$)
  })

  it('should show the modal', () => {
    modal.show()
    expect(modal._$modal).toBeDefined()
    expect(mockOpts.$).toHaveBeenCalledWith(expect.stringContaining('transloadit'))
    expect(mockOpts.$.extend).toHaveBeenCalled()
    expect(modal._$modal.$error.hide).toHaveBeenCalled()
    expect(modal._$modal.$errorDetails.hide).toHaveBeenCalled()
    expect(modal._$modal.$errorDetailsToggle.hide).toHaveBeenCalled()
    expect(modal._$modal.expose).toHaveBeenCalled()
    expect(modal._$modal.$close.click).toHaveBeenCalled()
  })

  it('should hide the modal', () => {
    modal.show() // First show the modal

    // Store a reference to _$modal before hiding
    const $modal = modal._$modal

    modal.hide()

    expect(modal.$.mask.close).toHaveBeenCalled()
    expect($modal.remove).toHaveBeenCalled() // Check remove was called on the stored reference
    expect(modal._$modal).toBeNull()
  })

  it('should render error', () => {
    modal.show() // First show the modal
    const err = { message: 'Test error' }
    modal.renderError(err)
    expect(modal._$modal.$error.html).toHaveBeenCalledWith('Test error')
    expect(modal._$modal.$error.show).toHaveBeenCalled()
  })

  it('should render progress', () => {
    modal.show() // First show the modal
    modal.renderProgress(50, 100)
    expect(modal._$modal.$progressBar.css).toHaveBeenCalledWith('width', '50%')
  })

  // Add more tests for other methods...
})
