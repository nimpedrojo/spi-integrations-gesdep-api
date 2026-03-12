import { readFile } from 'fs/promises';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { TeamsParser } from '../src/gesdep/parsers/teamsParser.js';
import { ParsingError } from '../src/shared/errors.js';

const fixturePath = join(process.cwd(), 'tests/fixtures/teams-page.html');

describe('TeamsParser', () => {
  it('parses teams from the fixture HTML', async () => {
    const html = await readFile(fixturePath, 'utf8');
    const parser = new TeamsParser();

    expect(parser.parse(html)).toEqual([
      {
        id: '7C088565EB855345',
        name: 'JUVENIL PREFERENTE',
        category: null,
        season: '2025-26',
        status: 'active'
      },
      {
        id: '16A1FF67E07BE37D',
        name: '1ª JUVENIL',
        category: null,
        season: '2025-26',
        status: 'active'
      }
    ]);
  });

  it('parses team detail players from the fixture HTML', async () => {
    const html = await readFile(fixturePath, 'utf8');
    const parser = new TeamsParser();

    expect(parser.parseTeamDetails(html)).toEqual({
      category: 'Juvenil',
      players: [
        {
          id: '3532EB3E6AD61628',
          shortName: 'JUAN',
          fullName: 'BENITO FERNANDEZ, JUAN'
        },
        {
          id: '8524CE5A2F109799',
          shortName: 'HÉCTOR',
          fullName: 'CANTALAPIEDRA VIELA, HÉCTOR'
        }
      ]
    });
  });

  it('parses team detail player references from the fixture HTML', async () => {
    const html = await readFile(fixturePath, 'utf8');
    const parser = new TeamsParser();

    expect(parser.parseTeamDetailsWithReferences(html)).toEqual({
      category: 'Juvenil',
      players: [
        {
          id: '3532EB3E6AD61628',
          shortName: 'JUAN',
          fullName: 'BENITO FERNANDEZ, JUAN',
          detailPath: '/v3/forms/players/frmjugadores.aspx?idjug=3532EB3E6AD61628'
        },
        {
          id: '8524CE5A2F109799',
          shortName: 'HÉCTOR',
          fullName: 'CANTALAPIEDRA VIELA, HÉCTOR',
          detailPath: '/v3/forms/players/frmjugadores.aspx?idjug=8524CE5A2F109799'
        }
      ]
    });
  });

  it('throws a typed parsing error when the structure is invalid', () => {
    const parser = new TeamsParser();

    expect(() => parser.parse('<html><body><div>missing table</div></body></html>')).toThrowError(ParsingError);
  });
});
