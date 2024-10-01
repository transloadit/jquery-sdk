import { describe, it, expect, beforeEach, vi } from 'vitest'
import FilePreview from '../../js/lib/FilePreview'

describe('FilePreview', () => {
  let filePreview
  let mockOpts
  let $mockElement

  beforeEach(() => {
    $mockElement = {
      appendTo: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      data: vi.fn().mockReturnThis(),
      find: vi.fn().mockReturnThis(),
      each: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
    }

    mockOpts = {
      $: vi.fn(() => $mockElement),
      $el: {
        on: vi.fn(),
      },
      onFileRemove: vi.fn(),
    }

    filePreview = new FilePreview(mockOpts)
    filePreview._$ul = $mockElement // Manually set _$ul for testing
  })

  it('should initialize with correct properties', () => {
    expect(filePreview.$).toBe(mockOpts.$)
    expect(filePreview._$el).toBe(mockOpts.$el)
    expect(filePreview.onFileRemove).toBe(mockOpts.onFileRemove)
  })

  it('should add a file to the preview', () => {
    const mockFile = { name: 'test.jpg', size: 1024 }
    filePreview.addFile(mockFile)
    expect(mockOpts.$).toHaveBeenCalledWith(expect.stringContaining('test.jpg'))
  })

  it('should remove a file from the preview', () => {
    const mockFile = { name: 'test.jpg', size: 1024, lastModified: 123456789 }
    filePreview.removeFile(mockFile)
    expect(filePreview._$ul.find).toHaveBeenCalledWith('li')
  })

  it('should remove all files from the preview', () => {
    filePreview.removeAllFiles()
    expect(filePreview._$ul.find).toHaveBeenCalledWith('li')
    expect(filePreview._$ul.find().remove).toHaveBeenCalled()
  })

  // Add more tests for other methods...
})
