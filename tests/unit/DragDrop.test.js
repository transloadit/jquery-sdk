import { beforeEach, describe, expect, it, vi } from 'vitest'
import DragDrop from '../../js/lib/DragDrop'

describe('DragDrop', () => {
  let dragDrop
  let mockOpts

  beforeEach(() => {
    mockOpts = {
      $el: {
        on: vi.fn(),
        removeClass: vi.fn(),
        addClass: vi.fn(),
      },
      onFileAdd: vi.fn(),
      onDrop: vi.fn(),
    }
    dragDrop = new DragDrop(mockOpts)
  })

  it('should initialize with correct properties', () => {
    expect(dragDrop._$el).toBe(mockOpts.$el)
    expect(dragDrop._onFileAdd).toBe(mockOpts.onFileAdd)
    expect(dragDrop._onDrop).toBe(mockOpts.onDrop)
  })

  it('should bind events on initialization', () => {
    expect(mockOpts.$el.on).toHaveBeenCalledTimes(5)
  })

  it('should handle dragEnter event', () => {
    const mockEvent = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    }
    dragDrop.dragEnterCb(mockEvent)
    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })

  it('should handle drop event', () => {
    const mockEvent = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
      originalEvent: {
        dataTransfer: {
          files: [{ name: 'test.jpg' }],
        },
      },
    }
    dragDrop.dropCb(mockEvent)
    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockOpts.$el.removeClass).toHaveBeenCalledWith('hover')
    expect(mockOpts.onFileAdd).toHaveBeenCalledWith({ name: 'test.jpg' })
    expect(mockOpts.onDrop).toHaveBeenCalledWith(mockEvent)
  })

  // Add more tests for other methods...
})
