import { describe, expect, it, vi } from 'vitest';
import { ListTeamsUseCase } from '../src/application/listTeamsUseCase.js';
import { TeamsNavigator } from '../src/application/listTeamsUseCase.js';

const mockedListHtml = `
  <span id="ctl00_lblTemporada">STADIUM VENECIA TEMPORADA 2025-26</span>
  <span id="ctl00_ContentPlaceHolder1_lblEquipos">Equipos activos</span>
  <span id="ctl00_ContentPlaceHolder1_lblListaEqui">
    <div>
      <a href="frmequipos.aspx?idequ=TEAM-10">
        <table>
          <tr>
            <td>Cadete A</td>
            <td align="right">CDA</td>
          </tr>
        </table>
      </a>
    </div>
  </span>
`;

const mockedDetailHtml = `
  <span id="ctl00_ContentPlaceHolder1_lblDatos">
    <table>
      <tr>
        <td align="right">Categoría:&nbsp;</td>
        <td><b>Cadete</b></td>
      </tr>
    </table>
  </span>
  <span id="ctl00_ContentPlaceHolder1_lblListaJuga">
    <div class="table-responsive">
      <table class="table table-bordered">
        <tr onclick="document.location = &quot;/v3/forms/players/frmjugadores.aspx?idjug=PLAYER-1&quot;">
          <td></td>
          <td>
            <div>Mario</div>
            <div>GARCIA LOPEZ, MARIO</div>
          </td>
        </tr>
      </table>
    </div>
  </span>
`;

describe('ListTeamsUseCase', () => {
  it('returns normalized basic teams payload from navigator HTML', async () => {
    const navigator: TeamsNavigator = {
      fetchTeamsHtml: vi.fn().mockResolvedValue(mockedListHtml),
      fetchTeamHtml: vi.fn().mockResolvedValue(mockedDetailHtml),
      fetchTeamHtmlBatch: vi.fn().mockResolvedValue({
        'TEAM-10': mockedDetailHtml
      })
    };

    const useCase = new ListTeamsUseCase({ navigator });
    await expect(useCase.execute()).resolves.toEqual({
      items: [
        {
          id: 'TEAM-10',
          name: 'Cadete A',
          category: null,
          season: '2025-26',
          status: 'active'
        }
      ],
      meta: {
        source: 'gesdep',
        count: 1
      }
    });
  });

  it('returns normalized extended teams payload from navigator HTML', async () => {
    const navigator: TeamsNavigator = {
      fetchTeamsHtml: vi.fn().mockResolvedValue(mockedListHtml),
      fetchTeamHtml: vi.fn().mockResolvedValue(mockedDetailHtml),
      fetchTeamHtmlBatch: vi.fn().mockResolvedValue({
        'TEAM-10': mockedDetailHtml
      })
    };

    const useCase = new ListTeamsUseCase({ navigator });
    await expect(useCase.executeExtended()).resolves.toEqual({
      items: [
        {
          id: 'TEAM-10',
          name: 'Cadete A',
          category: 'Cadete',
          season: '2025-26',
          status: 'active',
          players: [
            {
              id: 'PLAYER-1',
              shortName: 'Mario',
              fullName: 'GARCIA LOPEZ, MARIO'
            }
          ]
        }
      ],
      meta: {
        source: 'gesdep',
        count: 1
      }
    });
  });
});
