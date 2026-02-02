import { describe, it, expect } from 'vitest';
import { ADDON_ID, PANEL_ID, PARAM_KEY, EVENTS, DEFAULT_CONFIG } from './constants';

describe('constants', () => {
  it('exports ADDON_ID', () => {
    expect(ADDON_ID).toBe('tambook');
  });

  it('exports PANEL_ID with addon prefix', () => {
    expect(PANEL_ID).toBe('tambook/panel');
  });

  it('exports PARAM_KEY', () => {
    expect(PARAM_KEY).toBe('tambook');
  });

  describe('EVENTS', () => {
    it('has SEND_MESSAGE event', () => {
      expect(EVENTS.SEND_MESSAGE).toBe('tambook/send-message');
    });

    it('has THREAD_UPDATE event', () => {
      expect(EVENTS.THREAD_UPDATE).toBe('tambook/thread-update');
    });

    it('has COMPONENT_GENERATED event', () => {
      expect(EVENTS.COMPONENT_GENERATED).toBe('tambook/component-generated');
    });

    it('has CLEAR_THREAD event', () => {
      expect(EVENTS.CLEAR_THREAD).toBe('tambook/clear-thread');
    });

    it('has ERROR event', () => {
      expect(EVENTS.ERROR).toBe('tambook/error');
    });

    it('has COMPONENTS_REGISTERED event', () => {
      expect(EVENTS.COMPONENTS_REGISTERED).toBe('tambook/components-registered');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('has default apiUrl', () => {
      expect(DEFAULT_CONFIG.apiUrl).toBe('http://localhost:3030');
    });
  });
});
