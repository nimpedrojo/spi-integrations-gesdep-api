import { describe, expect, it } from 'vitest';
import { TeamWorkStatsParser } from '../src/gesdep/parsers/teamWorkStatsParser.js';

const html = `
  <html>
    <body>
      <select id="ctl00_ContentPlaceHolder1_cmbEquipos">
        <option value="1">Equipo 1</option>
        <option value="636" selected>Juvenil Preferente</option>
      </select>
      <input id="ctl00_ContentPlaceHolder1_txtDesde" value="2026-03-01" />
      <input id="ctl00_ContentPlaceHolder1_txtHasta" value="2026-03-07" />
      <script>
        $('#graf3').highcharts({
          xAxis: { categories: ['Rondos','Partidillo','Trabajo Táctico'] },
          series: [{ name: 'Minutos', data: [141,140,157] }]
        });
      </script>
      <span id="ctl00_ContentPlaceHolder1_lblTop20">
        <table>
          <tr>
            <td><a href="frmejerficha.aspx?id=EX-1"><img src="/img-1.jpg" /></a></td>
            <td><div class="font-blue">#1 Rondo por equipos 1</div><div>65 Minutos</div></td>
          </tr>
          <tr>
            <td><a href="frmejerficha.aspx?id=EX-2"><img src="/img-2.jpg" /></a></td>
            <td><div class="font-blue">#2 Partidillo</div><div>35 Minutos</div></td>
          </tr>
        </table>
      </span>
    </body>
  </html>
`;

describe('TeamWorkStatsParser', () => {
  it('parses methods and top exercises from Gesdep HTML', () => {
    const parser = new TeamWorkStatsParser();

    expect(parser.parse(html)).toEqual({
      teamId: '636',
      teamName: 'Juvenil Preferente',
      from: '2026-03-01',
      to: '2026-03-07',
      methods: [
        { method: 'Rondos', minutes: 141 },
        { method: 'Partidillo', minutes: 140 },
        { method: 'Trabajo Táctico', minutes: 157 }
      ],
      topExercises: [
        { rank: 1, exerciseId: 'EX-1', title: 'Rondo por equipos 1', minutes: 65, imageUrl: '/img-1.jpg' },
        { rank: 2, exerciseId: 'EX-2', title: 'Partidillo', minutes: 35, imageUrl: '/img-2.jpg' }
      ]
    });
  });
});
