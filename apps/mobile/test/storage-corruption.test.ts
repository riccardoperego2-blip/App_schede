import { mmkv, mmkvJson } from '../src/lib/storage/mmkv';

describe('mmkvJson corruption recovery', () => {
  beforeEach(() => {
    mmkv.delete('test.key');
    mmkv.delete('__quarantine__:test.key');
  });

  it('returns undefined and quarantines unparseable JSON', () => {
    mmkv.set('test.key', '{not json');
    expect(mmkvJson.get('test.key')).toBeUndefined();
    expect(mmkv.getString('test.key')).toBeUndefined();
    expect(mmkv.getString('__quarantine__:test.key')).toBe('{not json');
  });

  it('decoder rejects bad shape and quarantines the value', () => {
    mmkvJson.set('test.key', { wrong: 'shape' });
    const decode = (value: unknown): { ok: true } | null =>
      value && typeof value === 'object' && (value as { ok?: unknown }).ok === true
        ? (value as { ok: true })
        : null;
    expect(mmkvJson.getWithDecoder('test.key', decode)).toBeUndefined();
    expect(mmkv.getString('test.key')).toBeUndefined();
    expect(mmkv.getString('__quarantine__:test.key')).toContain('"wrong"');
  });

  it('accepts shapes that pass the decoder', () => {
    mmkvJson.set('test.key', { ok: true });
    const decode = (value: unknown): { ok: true } | null =>
      value && typeof value === 'object' && (value as { ok?: unknown }).ok === true
        ? (value as { ok: true })
        : null;
    expect(mmkvJson.getWithDecoder('test.key', decode)).toEqual({ ok: true });
    expect(mmkv.getString('__quarantine__:test.key')).toBeUndefined();
  });
});
