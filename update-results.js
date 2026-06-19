/**
 * update-results.js
 * ─────────────────
 * Consulta la API de football-data.org para el Mundial 2026 (WC2026)
 * y sobreescribe results.js con los datos reales al momento de ejecutarse.
 *
 * Uso local:   FOOTBALL_API_KEY=tu_clave node update-results.js
 * En CI:       Lo llama el GitHub Action automáticamente.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_KEY      = process.env.FOOTBALL_API_KEY;
const COMPETITION  = 'WC';   // código del Mundial en football-data.org
const OUT_FILE     = path.join(__dirname, 'results.js');

if (!API_KEY) {
  console.error('❌  Falta la variable de entorno FOOTBALL_API_KEY');
  process.exit(1);
}

// ─── Mapeo inglés → español (mismo que usa app.js) ───────────────────────────
const TEAM_ES = {
  'Algeria':              'Argelia',
  'Argentina':            'Argentina',
  'Australia':            'Australia',
  'Austria':              'Austria',
  'Belgium':              'Bélgica',
  'Bosnia & Herzegovina': 'Bosnia y Herzegovina',
  'Brazil':               'Brasil',
  'Canada':               'Canadá',
  'Cape Verde':           'Cabo Verde',
  'Colombia':             'Colombia',
  'Croatia':              'Croacia',
  'Curaçao':              'Curazao',
  'Czech Republic':       'República Checa',
  'DR Congo':             'RD del Congo',
  'Ecuador':              'Ecuador',
  'Egypt':                'Egipto',
  'England':              'Inglaterra',
  'France':               'Francia',
  'Germany':              'Alemania',
  'Ghana':                'Ghana',
  'Haiti':                'Haití',
  'Iran':                 'Irán',
  'Iraq':                 'Irak',
  'Ivory Coast':          'Costa de Marfil',
  'Japan':                'Japón',
  'Jordan':               'Jordania',
  'Mexico':               'México',
  'Morocco':              'Marruecos',
  'Netherlands':          'Países Bajos',
  'New Zealand':          'Nueva Zelanda',
  'Norway':               'Noruega',
  'Panama':               'Panamá',
  'Paraguay':             'Paraguay',
  'Portugal':             'Portugal',
  'Qatar':                'Catar',
  'Saudi Arabia':         'Arabia Saudí',
  'Scotland':             'Escocia',
  'Senegal':              'Senegal',
  'South Africa':         'Sudáfrica',
  'South Korea':          'Corea del Sur',
  'Spain':                'España',
  'Sweden':               'Suecia',
  'Switzerland':          'Suiza',
  'Tunisia':              'Túnez',
  'Turkey':               'Turquía',
  'USA':                  'Estados Unidos',
  'Uruguay':              'Uruguay',
  'Uzbekistan':           'Uzbekistán',
  // Alternativas que puede devolver la API
  'United States':        'Estados Unidos',
  'Korea Republic':       'Corea del Sur',
  'Czechia':              'República Checa',
  'Côte d\'Ivoire':       'Costa de Marfil',
};

// Partidos de la quiniela 1X2 (mismos que en app.js)
const QUINIELA_MATCHES = [
  { team1: 'México',   team2: 'Corea del Sur' },
  { team1: 'Escocia',  team2: 'Marruecos'     },
  { team1: 'Uruguay',  team2: 'España'         },
].map(m => ({ ...m, key: [m.team1, m.team2].sort().join('__') }));

// ─── Utilidades ──────────────────────────────────────────────────────────────
function es(name) {
  if (!name) return '';
  return TEAM_ES[name] || name;
}

function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://api.football-data.org/v4/competitions/${COMPETITION}/${endpoint}`;
    console.log(`  GET ${url}`);
    const req = https.get(url, {
      headers: { 'X-Auth-Token': API_KEY }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} — ${data.slice(0, 200)}`));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

// ─── Lógica principal ────────────────────────────────────────────────────────
async function main() {
  console.log('🔄  Consultando football-data.org...\n');

  // 1. Standings (clasificación de grupos)
  const standingsData = await apiGet('standings');
  const groupStandings = {};   // { 'A': ['España','Marruecos',...], ... }

  for (const standing of standingsData.standings || []) {
    if (standing.type !== 'TOTAL') continue;
    const letter = standing.group?.replace('GROUP_', '') ?? '';
    if (!letter) continue;
    // La API devuelve los equipos ya ordenados por posición
    groupStandings[letter] = standing.table.map(row => es(row.team.name));
  }

  // 2. Partidos (para quiniela 1X2 y eliminatorias)
  const matchesData = await apiGet('matches');
  const allMatches  = matchesData.matches || [];

  // 2a. Quiniela 1X2
  const quiniela1x2 = {};
  for (const qm of QUINIELA_MATCHES) {
    quiniela1x2[qm.key] = ''; // vacío por defecto
  }

  for (const match of allMatches) {
    if (match.stage !== 'GROUP_STAGE') continue;
    if (match.status !== 'FINISHED') continue;

    const home = es(match.homeTeam.name);
    const away = es(match.awayTeam.name);
    const key1 = [home, away].sort().join('__');

    const qm = QUINIELA_MATCHES.find(m => m.key === key1);
    if (!qm) continue;

    const hg = match.score?.fullTime?.home ?? 0;
    const ag = match.score?.fullTime?.away ?? 0;
    // La clave está ordenada alfabéticamente; necesitamos saber cuál es team1/team2
    const [sorted1] = [home, away].sort();
    if (hg > ag) {
      quiniela1x2[key1] = home === sorted1 ? '1' : '2';
    } else if (ag > hg) {
      quiniela1x2[key1] = away === sorted1 ? '1' : '2';
    } else {
      quiniela1x2[key1] = 'X';
    }
  }

  // 2b. Eliminatorias
  const knockoutRounds = {
    round32:      [],
    round16:      [],
    quarterfinals:[],
    semifinals:   [],
  };
  const koMatches = {
    round32:      [],
    round16:      [],
    quarterfinals:[],
    semifinals:   [],
    thirdPlace:   [],
    final:        [],
  };

  const STAGE_MAP = {
    'ROUND_OF_32':    'round32',
    'LAST_32':        'round32',
    'ROUND_OF_16':    'round16',
    'LAST_16':        'round16',
    'QUARTER_FINALS': 'quarterfinals',
    'SEMI_FINALS':    'semifinals',
    'THIRD_PLACE':    'thirdPlace',
    'FINAL':          'final',
  };

  let champion      = '';
  let runnerUp      = '';
  let thirdPlaceWinner = '';

  for (const match of allMatches) {
    const roundKey = STAGE_MAP[match.stage];
    if (!roundKey) continue;
    if (match.status !== 'FINISHED') continue;

    const home   = es(match.homeTeam.name);
    const away   = es(match.awayTeam.name);
    const hg     = match.score?.fullTime?.home ?? 0;
    const ag     = match.score?.fullTime?.away ?? 0;
    // En eliminatorias se puede ir a penaltis; la API indica el ganador
    const winnerName = match.score?.winner === 'HOME_TEAM' ? home
                     : match.score?.winner === 'AWAY_TEAM' ? away
                     : '';

    const entry = { match: match.id, home, away, winner: winnerName };

    if (roundKey === 'final') {
      koMatches.final.push(entry);
      champion  = winnerName;
      runnerUp  = winnerName === home ? away : home;
    } else if (roundKey === 'thirdPlace') {
      koMatches.thirdPlace.push(entry);
      thirdPlaceWinner = winnerName;
    } else {
      koMatches[roundKey].push(entry);
      if (winnerName) knockoutRounds[roundKey].push(winnerName);
    }
  }

  // Semifinalistas y finalistas
  const semifinalists = [];
  for (const m of allMatches.filter(m => m.stage === 'SEMI_FINALS')) {
    if (m.homeTeam?.name) semifinalists.push(es(m.homeTeam.name));
    if (m.awayTeam?.name) semifinalists.push(es(m.awayTeam.name));
  }
  const finalists = champion && runnerUp ? [champion, runnerUp] : [];

  // 3. Mejores terceros (los 8 terceros de grupo con más puntos)
  //    La API no los da directamente; los calculamos ordenando los terceros por pts/GD/GF
  const thirdTeams = [];
  for (const standing of standingsData.standings || []) {
    if (standing.type !== 'TOTAL') continue;
    const row = standing.table.find(r => r.position === 3);
    if (row) {
      thirdTeams.push({
        name:   es(row.team.name),
        points: row.points,
        gd:     row.goalDifference,
        gf:     row.goalsFor,
      });
    }
  }
  thirdTeams.sort((a, b) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf
  );
  const thirdPlace = thirdTeams.slice(0, 8).map(t => t.name);

  // ─── Construir objeto RESULTS ─────────────────────────────────────────────
  const RESULTS = {
    groups:      groupStandings,
    thirdPlace,
    quiniela1x2,
    knockout: {
      ...knockoutRounds,
      champion,
      runnerUp,
      finalists,
      thirdPlaceWinner,
      final:       champion,   // nombre del ganador de la final
      thirdPlace:  thirdPlaceWinner,
      matches:     koMatches,
    },
    semifinalists,
    finalists,
    champion,
    runnerUp,
    thirdPlaceWinner,
    awards: {
      topScorer:        '',
      topAssister:      '',
      goldenGlove:      '',
      topScoringTeam:   '',
      mostConcededTeam: '',
    },
  };

  // ─── Serializar y escribir results.js ────────────────────────────────────
  const now = new Date().toISOString();
  const content = `/* ============================================================
   Resultados oficiales del Mundial 2026.
   Generado automáticamente por update-results.js
   Última actualización: ${now}
   ============================================================ */

const RESULTS = ${JSON.stringify(RESULTS, null, 2)};
`;

  fs.writeFileSync(OUT_FILE, content, 'utf8');
  console.log(`\n✅  results.js actualizado (${now})`);

  // Resumen rápido
  const gruposRellenos = Object.values(groupStandings).filter(g => g.length > 0).length;
  console.log(`   Grupos con datos:   ${gruposRellenos}/12`);
  console.log(`   Quiniela 1X2:       ${Object.entries(quiniela1x2).filter(([,v]) => v).length}/3 partidos`);
  console.log(`   Campeón:            ${champion || '(pendiente)'}`);
}

main().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
