import { describe, expect, it } from 'vitest'
import I18n from '../../js/lib/I18n'

describe('I18n', () => {
  it('should initialize with default locale', () => {
    const i18n = new I18n('en')
    expect(i18n._locale).toBe('en')
  })

  it('should initialize with custom translations', () => {
    const customTranslations = {
      'test.key': 'Test Value',
    }
    const i18n = new I18n('custom', customTranslations)
    expect(i18n._locale).toBe('custom')
    expect(i18n._dict.custom).toEqual(customTranslations)
  })

  it('should translate a key', () => {
    const i18n = new I18n('en')
    const translated = i18n.translate('errors.unknown')
    expect(translated).toBe('There was an unknown error.')
  })

  it('should handle missing translations', () => {
    const i18n = new I18n('en')
    const translated = i18n.translate('non.existent.key')
    expect(translated).toBe('non.existent.key')
  })

  it('should handle translations with arguments', () => {
    const i18n = new I18n('en')
    const translated = i18n.translate('errors.MAX_FILES_EXCEEDED', 5)
    expect(translated).toBe('Please select at most 5 files.')
  })
})
