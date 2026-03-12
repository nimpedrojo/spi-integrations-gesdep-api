import { describe, expect, it } from 'vitest';
import { buildPlayerDetailUrl } from '../src/gesdep/actions/gesdepClient.js';

describe('GesdepClient player detail URL', () => {
  it('builds the player detail URL using idjug', () => {
    const url = buildPlayerDetailUrl('PLAYER-123');

    expect(url.pathname).toBe('/v3/forms/players/frmjugadores.aspx');
    expect(url.searchParams.get('idjug')).toBe('PLAYER-123');
    expect(url.searchParams.get('idj')).toBeNull();
  });
});
