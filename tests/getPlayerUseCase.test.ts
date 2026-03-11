import { describe, expect, it, vi } from 'vitest';
import { GetPlayerUseCase } from '../src/application/getPlayerUseCase.js';
import { PlayerNavigator } from '../src/application/getPlayerUseCase.js';

const mockedPlayerHtml = `
  <div class="page-content-inner">
    <span id="ctl00_ContentPlaceHolder1_lblFichajug">
      <table class="table">
        <tr>
          <td><span>7 - Mario</span> - GARCIA LOPEZ, MARIO</td>
          <td align="right">Cadete A</td>
        </tr>
      </table>
      <div class="row">
        <table>
          <tr>
            <td align="right">Fecha nacimiento:&nbsp;</td>
            <td>01/01/2010</td>
          </tr>
        </table>
      </div>
    </span>
    <span id="ctl00_ContentPlaceHolder1_lblDeporOtrosDatos">
      <div>Dorsal:&nbsp;</div><div>7</div><div class="clearfix"></div>
    </span>
  </div>
`;

describe('GetPlayerUseCase', () => {
  it('returns normalized player payload from navigator HTML', async () => {
    const navigator: PlayerNavigator = {
      fetchPlayerHtml: vi.fn().mockResolvedValue(mockedPlayerHtml)
    };

    const useCase = new GetPlayerUseCase({ navigator });
    await expect(useCase.execute('PLAYER-1')).resolves.toEqual({
      item: {
        id: 'PLAYER-1',
        shortName: 'Mario',
        fullName: 'GARCIA LOPEZ, MARIO',
        fields: {
          dorsal: '7',
          equipo: 'Cadete A',
          fecha_nacimiento: '01/01/2010'
        }
      },
      meta: {
        source: 'gesdep'
      }
    });
  });
});
