import { readFile } from 'fs/promises';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { PlayerParser } from '../src/gesdep/parsers/playerParser.js';
import { ParsingError } from '../src/shared/errors.js';

const fixturePath = join(process.cwd(), 'tests/fixtures/player-page.html');

describe('PlayerParser', () => {
  it('parses player details from the fixture HTML', async () => {
    const html = await readFile(fixturePath, 'utf8');
    const parser = new PlayerParser();

    expect(parser.parse('3532EB3E6AD61628', html)).toEqual({
      id: '3532EB3E6AD61628',
      shortName: 'SAMU',
      fullName: 'SAMUEL ESTEBAN COMPAIRED',
      fields: {
        dorsal: '9',
        equipo: 'JUVENIL PREFERENTE',
        fecha_nacimiento: '17/10/2008',
        edad: '17',
        extracomunitario: 'No',
        teléfonos: '608917546',
        nacionalidad: 'ESPAÑOLA',
        lateralidad: 'Derecho',
        'estadistica_conv.': '25',
        'estadistica_tit.': '22',
        'estadistica_supl.': '3',
        'estadistica_s/jug.': '0',
        'estadistica_no_conv.': '2',
        estadistica_minutos: '1887',
        estadistica_goles: '1',
        género: 'Masculino',
        representante: 'Desconocido',
        grupo_sanguíneo: '0-',
        observaciones: 'Nuevo fichaje temporada 14-15.',
        posiciones: 'Marcador Central, Medio Centro'
      }
    });
  });

  it('throws a typed parsing error when the structure is invalid', () => {
    const parser = new PlayerParser();

    expect(() => parser.parse('player-1', '<html><body><div>missing content</div></body></html>')).toThrowError(ParsingError);
  });
});
