/**
 * Tier 1 & Tier 2 Unit Tests: Settings Manager & Gemini API Key Storage
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { maskApiKey, ClientSettingsStore } from '../verification/verify-ac3-ai-quizzing.ts';
import { MockGeminiClient } from '../mocks/mock-gemini.ts';

describe('Settings Manager (Tier 1: Feature Coverage)', () => {
  beforeEach(() => {
    ClientSettingsStore.clear();
  });

  it('T1.1: should store and retrieve Gemini API key', () => {
    const rawKey = 'AIzaSyDemoTestingKey1234567890';
    ClientSettingsStore.setItem('vibe_todos_gemini_api_key', rawKey);
    const retrieved = ClientSettingsStore.getItem('vibe_todos_gemini_api_key');
    assert.equal(retrieved, rawKey);
  });

  it('T1.2: should mask API key for safe UI rendering', () => {
    const rawKey = 'AIzaSySecretApiKey999988887777';
    const masked = maskApiKey(rawKey);
    assert.ok(masked.startsWith('AIzaSy'));
    assert.ok(masked.endsWith('7777'));
    assert.ok(masked.includes('••••'));
    assert.ok(!masked.includes('SecretApiKey'));
  });

  it('T1.3: should persist and retrieve default LLM model selection', () => {
    ClientSettingsStore.setItem('vibe_todos_gemini_model', 'gemini-2.5-flash');
    assert.equal(ClientSettingsStore.getItem('vibe_todos_gemini_model'), 'gemini-2.5-flash');
  });

  it('T1.4: should successfully ping and validate a valid Gemini API key', async () => {
    const res = await MockGeminiClient.testConnection('AIzaSyValidDemoKey1234');
    assert.strictEqual(res.valid, true);
    assert.ok(res.message.includes('Successfully connected'));
  });
});

describe('Settings Manager Boundaries & Edge Cases (Tier 2)', () => {
  it('T2.1: should mask short keys without throwing out of bounds exception', () => {
    const shortKey = 'AIza';
    const masked = maskApiKey(shortKey);
    assert.equal(masked, '••••••••');
  });

  it('T2.2: should reject empty key on connection test', async () => {
    const res = await MockGeminiClient.testConnection('');
    assert.strictEqual(res.valid, false);
    assert.ok(res.message.includes('empty'));
  });

  it('T2.3: should identify invalid/revoked keys during test connection', async () => {
    const res = await MockGeminiClient.testConnection('INVALID_KEY');
    assert.strictEqual(res.valid, false);
    assert.ok(res.message.includes('401'));
  });
});
