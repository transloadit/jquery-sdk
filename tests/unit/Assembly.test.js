import { beforeEach, describe, expect, it, vi } from 'vitest'
import Assembly from '../../js/lib/Assembly'

vi.mock('socket.io-client', () => ({
  connect: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    close: vi.fn(),
  })),
}))

describe('Assembly', () => {
  let assembly
  let mockOpts

  beforeEach(() => {
    mockOpts = {
      status: {
        assembly_id: 'test_id',
        assembly_url: 'http://test.com',
        assembly_ssl_url: 'https://test.com',
        tus_url: 'https://tus.test.com',
        websocket_url: 'wss://test.com',
        instance: 'test_instance',
      },
      instance: 'test_instance',
      service: 'https://api.transloadit.com',
      wait: false,
      requireUploadMetaData: false,
      protocol: 'https://',
      onStart: vi.fn(),
      onExecuting: vi.fn(),
      onSuccess: vi.fn(),
      onCancel: vi.fn(),
      onError: vi.fn(),
      onUpload: vi.fn(),
      onResult: vi.fn(),
      i18n: { translate: vi.fn() },
      $: {
        jsonp: vi.fn(),
      },
    }
    assembly = new Assembly(mockOpts)
    // Mock the _createSocket method
    assembly._createSocket = vi.fn((cb) => cb())
  })

  it('should initialize with correct properties', () => {
    expect(assembly._id).toBe('test_id')
    expect(assembly._httpUrl).toBe('http://test.com')
    expect(assembly._httpsUrl).toBe('https://test.com')
    expect(assembly._tusUrl).toBe('https://tus.test.com')
    expect(assembly._websocketUrl).toBe('wss://test.com')
    expect(assembly._instance).toBe('test_instance')
  })

  it('should create a socket on init', () => {
    const mockCb = vi.fn()
    assembly.init(mockCb)
    expect(mockCb).toHaveBeenCalled()
  })

  it('should handle assembly request', () => {
    const mockCb = vi.fn()
    assembly._assemblyRequest(null, mockCb)
    expect(assembly.$.jsonp).toHaveBeenCalled()
  })

  it('should handle successful poll', () => {
    const mockAssembly = { ok: 'ASSEMBLY_COMPLETED' }
    assembly._handleSuccessfulPoll(mockAssembly)
    expect(assembly._onSuccess).toHaveBeenCalledWith(mockAssembly)
  })

  // Add more tests for other methods...
})
