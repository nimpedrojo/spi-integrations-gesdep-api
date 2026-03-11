export const selectors = {
  login: {
    path: '/v3/login.aspx',
    username: '#txtNombre',
    password: '#txtContra',
    submit: '#btnEntrar',
    success: '#ctl00_lblUsuario'
  },
  teams: {
    path: '/v3/forms/competitions/frmEquipos.aspx',
    ready: '#ctl00_ContentPlaceHolder1_lblListaEqui',
    list: '#ctl00_ContentPlaceHolder1_lblListaEqui',
    item: '> div',
    link: '> a[href*="frmequipos.aspx?idequ="]',
    name: 'tr:first-child td:first-child',
    code: 'tr:first-child td:last-child',
    activePanelTitle: '#ctl00_ContentPlaceHolder1_lblEquipos',
    season: '#ctl00_lblTemporada',
    detailSummary: '#ctl00_ContentPlaceHolder1_lblDatos',
    detailPlayers: '#ctl00_ContentPlaceHolder1_lblListaJuga',
    detailPlayerRow: 'tr[onclick*="idjug="]',
    detailPlayerShortName: 'td:nth-child(2) > div:first-child',
    detailPlayerFullName: 'td:nth-child(2) > div:nth-child(2)'
  },
  players: {
    path: '/v3/forms/players/frmjugadores.aspx',
    ready: '.page-content-inner',
    card: '#ctl00_ContentPlaceHolder1_lblFichajug',
    headerRow: '#ctl00_ContentPlaceHolder1_lblFichajug table.table tr',
    sportFieldsTables: '#ctl00_ContentPlaceHolder1_lblFichajug .row table',
    statsTable: '#ctl00_ContentPlaceHolder1_lblFichajug .table-responsive table',
    otherSportData: '#ctl00_ContentPlaceHolder1_lblDeporOtrosDatos',
    observations: '#ctl00_ContentPlaceHolder1_txtObservaciones',
    positions: '#ctl00_ContentPlaceHolder1_lblPosiciones'
  }
};
