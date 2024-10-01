import { beforeEach, describe, expect, it, vi } from 'vitest'
import InternetConnectionChecker from '../../js/lib/InternetConnectionChecker'

describe('InternetConnectionChecker', () => {
  let checker
  let mockOpts

  beforeEach(() => {
    mockOpts = {
      onDisconnect: vi.fn(),
      onReconnect: vi.fn(),
    }
    checker = new InternetConnectionChecker(mockOpts)
    global.window = {
      addEventListener: vi.fn(),
      navigator: {
        onLine: true,
      },
    }
  })

  it('should initialize with correct properties', () => {
    expect(checker._onDisconnect).toBe(mockOpts.onDisconnect)
    expect(checker._onReconnect).toBe(mockOpts.onReconnect)
    expect(checker._isOnline).toBe(true)
  })

  it('should start listening for online/offline events', () => {
    checker.start()
    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should handle going offline', () => {
    window.navigator.onLine = false
    checker.onlineCheck()
    expect(checker._isOnline).toBe(false)
    expect(mockOpts.onDisconnect).toHaveBeenCalled()
  })

  it('should handle coming back online', () => {
    checker._isOnline = false
    window.navigator.onLine = true
    checker.onlineCheck()
    expect(checker._isOnline).toBe(true)
    expect(mockOpts.onReconnect).toHaveBeenCalled()
  })

  it('should return correct online status', () => {
    expect(checker.isOnline()).toBe(true)
    checker._isOnline = false
    expect(checker.isOnline()).toBe(false)
  })
})
