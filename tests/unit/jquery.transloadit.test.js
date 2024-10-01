import jQuery from 'jquery'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Ensure global.window and window.jQuery are defined before importing Uploader
global.window = global
window.jQuery = jQuery
window.$ = jQuery // If needed

import Uploader from '../../js/lib/jquery.transloadit'

// Mock dependencies
vi.mock('../../js/lib/Assembly', () => {
  return vi.fn()
})
vi.mock('../../js/lib/Modal', () => {
  return vi.fn()
})
vi.mock('../../js/lib/DragDrop', () => {
  return vi.fn()
})
vi.mock('../../js/lib/FilePreview', () => {
  return vi.fn()
})
vi.mock('../../js/lib/InternetConnectionChecker', () => {
  return vi.fn(() => ({
    start: vi.fn(),
  }))
})
vi.mock('../../js/lib/I18n', () => {
  return vi.fn(() => ({
    translate: vi.fn((key) => key),
  }))
})
vi.mock('tus-js-client', () => {
  return {
    Upload: vi.fn(() => ({
      start: vi.fn(),
      abort: vi.fn(),
    })),
  }
})

describe('Uploader class', () => {
  let $form
  let uploader
  let options

  beforeEach(() => {
    // Create a mock form element
    $form = jQuery('<form></form>')

    // Define default options
    options = {
      service: 'https://api2.transloadit.com/',
      params: {
        auth: { key: 'YOUR_TRANSLOADIT_AUTH_KEY' },
        template_id: 'YOUR_TEMPLATE_ID',
      },
      signature: 'YOUR_SIGNATURE',
      fields: '*',
      debug: true,
    }

    // Initialize the uploader with the form and options
    uploader = new Uploader({ $: jQuery })
    uploader.init($form, options)
  })

  it('should initialize correctly', () => {
    expect(uploader._$form).toBe($form)
    expect(uploader._options).toBeDefined()
    expect(uploader._options.service).toBe(options.service)
    expect(uploader._params).toBeNull()
  })

  it('should start uploading when start method is called', () => {
    // Mock necessary methods
    uploader._createAssembly = vi.fn((cb) => cb(null, {}))
    uploader._setupAssemblyObj = vi.fn()
    uploader._startUploading = vi.fn()

    uploader.start()

    expect(uploader._createAssembly).toHaveBeenCalled()
    expect(uploader._setupAssemblyObj).toHaveBeenCalled()
    expect(uploader._startUploading).toHaveBeenCalled()
  })

  it('should handle errors during assembly creation', () => {
    const error = new Error('Assembly creation failed')
    uploader._errorOut = vi.fn()
    uploader._createAssembly = vi.fn((cb) => cb(error))

    uploader.start()

    expect(uploader._createAssembly).toHaveBeenCalled()
    expect(uploader._errorOut).toHaveBeenCalledWith(error)
  })

  it('should process form fields correctly', () => {
    // Add input fields to the form
    $form.append('<input type="text" name="testField" value="testValue" />')

    // Prepare form data
    uploader._prepareFormData()
    console.log('FormData after _prepareFormData:', uploader._formData)

    // Now append filtered form fields
    uploader._appendFilteredFormFields()
    console.log('FormData after _appendFilteredFormFields:', uploader._formData)

    // Check if the form data is initialized
    if (!uploader._formData) {
      throw new Error('FormData is not initialized')
    }

    // Check if the form data includes the testField
    const formDataEntries = Array.from(uploader._formData.entries())
    console.log('FormData entries:', formDataEntries)
    const testFieldEntry = formDataEntries.find(
      ([key, value]) => key === 'testField' && value === 'testValue',
    )
    expect(testFieldEntry).toBeDefined()
  })

  it('should abort upload when cancel is called', () => {
    uploader._abortUpload = vi.fn()
    uploader.reset = vi.fn()
    uploader._modal = { hide: vi.fn(), renderCancelling: vi.fn() }
    uploader._assembly = { cancel: vi.fn() }

    uploader.cancel()

    expect(uploader._abortUpload).toHaveBeenCalled()
    expect(uploader.reset).toHaveBeenCalled()
    expect(uploader._modal.renderCancelling).toHaveBeenCalled()
    expect(uploader._assembly.cancel).toHaveBeenCalled()
  })

  // Add more tests to cover other methods and scenarios
})
