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
const COMPETITION  = 'WC';
const OUT_FILE     = path.join(__dirname, 'results.js');

if (!API_KEY) {
  console.error('❌  Falta la variable de entorno FOOTBALL_API_KEY');
  process.exit(1);
}

// ─── Mapeo inglés → español ───────────────────────────────────────────────────
// Incluye todas las variantes que puede devolver football-data.org
const TEAM_ES = {
  'Algeria':                  'Argelia',
  'Argentina':                'Argentina',
  'Australia':                'Australia',
  'Austria':                  'Austria',
  'Belgium':                  'Bélgica',
  'Bosnia & Herzegovina':     'Bosnia y Herzegovina',
  'Bosnia-Herzegovina':       'Bosnia y Herzegovina',
  'Bosnia and Herzegovina':   'Bosnia y Herzegovina',
  'Brazil':                   'Brasil',
  'Canada':                   'Canadá',
  'Cape Verde':               'Cabo Verde',
  'Cape Verde Islands':       'Cabo Verde',
  'Colombia':                 'Colombia',
  'Croatia':                  'Croacia',
  'Curaçao':                  'Curazao',
  'Curacao':                  'Curazao',
  'Czech Republic':           'República Checa',
  'Czechia':                  'República Checa',
  'DR Congo':                 'RD del Congo',
  'Congo DR':                 'RD del Congo',
  'Democratic Republic of Congo': 'RD del Congo',
  'Ecuador':                  'Ecuador',
  'Egypt':                    'Egipto',
  'England':                  'Inglaterra',
  'France':                   'Francia',
  'Germany':                  'Alemania',
  'Ghana':                    'Ghana',
  'Haiti':                    'Haití',
  'Iran':                     'Irán',
  'Iraq':                     'Irak',
  'Ivory Coast':              'Costa de Marfil',
  "Côte d'Ivoire":            'Costa de Marfil',
  'Japan':                    'Japón',
  'Jordan':                   'Jordania',
  'Mexico':                   'México',
  'Morocco':                  'Marruecos',
  'Netherlands':              'Países Bajos',
  'New Zealand':              'Nueva Zelanda',
  'Norway':                   'Noruega',
  'Panama':                   'Panamá',
  'Paraguay':                 'Paraguay',
  'Portugal':                 'Portugal',
  'Qatar':                    'Catar',
  'Saudi Arabia':             'Arabia Saudí',
  'Scotland':                 'Escocia',
  'Senegal':                  'Senegal',
  'South Africa':             'Sudáfrica',
  'South Korea':              'Corea del Sur',
  'Korea Republic':           'Corea del Sur',
  'Spain':                    'España',
  'Sweden':                   'Suecia',
  'Switzerland':              'Suiza',
  'Tunisia':                  'Túnez',
  'Turkey':                   'Turquía',
  'Türkiye':                  'Turquía',
  'USA':                      'Estados Unidos',
  'United States':            'Estados Unidos',
  'Uruguay':                  'Uruguay',
  'Uzbekistan':               'Uzbekistán',
};

// Partidos de la quiniela 1X2 (mismos que en app.js)
const QUINIELA_MATCHES = [
  { team1: 'México',   team2: 'Corea del Sur' },
  { team1: 'Escocia',  team2: 'Marruecos'     },
  { team1: 'Uruguay',  team2: 'España'         },
].map(m => ({ ...m, key: [m.team1, m.team2].sort().join('__') }));

// Partidos por grupo: cuántos partidos tiene cada grupo de 4 equipos
const MATCHES_PER_GROUP = 6; // 4 equipos → C(4,2) = 6 partidos

// ─── Utilidades ───────────────────────────────────────────────────────────────
function es(name) {
  if (!name) return '';
  return TEAM_ES[name] || name;
}

// Extrae solo la letra del grupo: "GROUP_A" → "A", "Group A" → "A"
function groupLetter(raw) {
  if (!raw) return '';
  // Formato "GROUP_A"
  let m = raw.match(/^GROUP_([A-Z]+)$/);
  if (m) return m[1];
  // Formato "Group A"
  m = raw.match(/^Group\s+([A-Z]+)$/i);
  if (m) return m[1].toUpperCase();
  return raw;
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
          return reject(new Error(`HTTP ${res.statusCode} — ${data.slice(0, 300)}`));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

// ─── Lógica principal ─────────────────────────────────────────────────────────
async function main() {
  console.log('🔄  Consultando football-data.org...\n');

  // 1. Partidos — los necesitamos para saber si un grupo está cerrado
  const matchesData = await apiGet('matches');
  const allMatches  = matchesData.matches || [];

  // Contar partidos FINISHED por grupo
  const finishedByGroup = {};
  for (const match of allMatches) {
    if (match.stage !== 'GROUP_STAGE') continue;
    const letter = groupLetter(match.group);
    if (!letter) continue;
    if (!finishedByGroup[letter]) finishedByGroup[letter] = 0;
    if (match.status === 'FINISHED') finishedByGroup[letter]++;
  }

  // 2. Standings
  const standingsData = await apiGet('standings');
  const groupStandings = {};  // solo grupos con todos los partidos jugados

  for (const standing of standingsData.standings || []) {
    if (standing.type !== 'TOTAL') continue;
    const letter = groupLetter(standing.group);
    if (!letter) continue;

    const played = finishedByGroup[letter] || 0;
    if (played < MATCHES_PER_GROUP) {
      console.log(`   Grupo ${letter}: ${played}/${MATCHES_PER_GROUP} partidos — pendiente, se ignora`);
      continue;
    }

    groupStandings[letter] = standing.table.map(row => es(row.team.name));
    console.log(`   Grupo ${letter}: ✅ cerrado → ${groupStandings[letter].join(', ')}`);
  }

  // 3. Quiniela 1X2
  const quiniela1x2 = {};
  for (const qm of QUINIELA_MATCHES) {
    quiniela1x2[qm.key] = '';
  }

  for (const match of allMatches) {
    if (match.stage !== 'GROUP_STAGE') continue;
    if (match.status !== 'FINISHED') continue;

    const home = es(match.homeTeam?.name);
    const away = es(match.awayTeam?.name);
    const key1 = [home, away].sort().join('__');

    const qm = QUINIELA_MATCHES.find(m => m.key === key1);
    if (!qm) continue;

    const hg = match.score?.fullTime?.home ?? 0;
    const ag = match.score?.fullTime?.away ?? 0;
    const [sorted1] = [home, away].sort();

    if (hg > ag) {
      quiniela1x2[key1] = home === sorted1 ? '1' : '2';
    } else if (ag > hg) {
      quiniela1x2[key1] = away === sorted1 ? '1' : '2';
    } else {
      quiniela1x2[key1] = 'X';
    }
  }

  // 4. Eliminatorias
  const knockoutRounds = {
    round32:       [],
    round16:       [],
    quarterfinals: [],
    semifinals:    [],
  };
  const koMatches = {
    round32:       [],
    round16:       [],
    quarterfinals: [],
    semifinals:    [],
    thirdPlace:    [],
    final:         [],
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

  let champion         = '';
  let runnerUp         = '';
  let thirdPlaceWinner = '';

  for (const match of allMatches) {
    const roundKey = STAGE_MAP[match.stage];
    if (!roundKey) continue;
    if (match.status !== 'FINISHED') continue;

    const home       = es(match.homeTeam?.name);
    const away       = es(match.awayTeam?.name);
    const winnerName = match.score?.winner === 'HOME_TEAM' ? home
                     : match.score?.winner === 'AWAY_TEAM' ? away
                     : '';

    const entry = { match: match.id, home, away, winner: winnerName };

    if (roundKey === 'final') {
      koMatches.final.push(entry);
      champion = winnerName;
      runnerUp = winnerName === home ? away : home;
    } else if (roundKey === 'thirdPlace') {
      koMatches.thirdPlace.push(entry);
      thirdPlaceWinner = winnerName;
    } else {
      koMatches[roundKey].push(entry);
      if (winnerName) knockoutRounds[roundKey].push(winnerName);
    }
  }

  // Semifinalistas
  const semifinalists = [];
  for (const m of allMatches.filter(m => m.stage === 'SEMI_FINALS')) {
    if (m.homeTeam?.name) semifinalists.push(es(m.homeTeam.name));
    if (m.awayTeam?.name) semifinalists.push(es(m.awayTeam.name));
  }
  const finalists = champion && runnerUp ? [champion, runnerUp] : [];

  // 5. Mejores terceros — solo si hay grupos cerrados suficientes
  const thirdTeams = [];
  for (const standing of standingsData.standings || []) {
    if (standing.type !== 'TOTAL') continue;
    const letter = groupLetter(standing.group);
    if (!groupStandings[letter]) continue; // grupo aún no cerrado, ignorar
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
  thirdTeams.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
  const thirdPlace = thirdTeams.slice(0, 8).map(t => t.name);

  // ─── Construir RESULTS ────────────────────────────────────────────────────
  const RESULTS = {
    groups: groupStandings,
    thirdPlace,
    quiniela1x2,
    knockout: {
      ...knockoutRounds,
      champion,
      runnerUp,
      finalists,
      thirdPlaceWinner,
      final:      champion,
      thirdPlace: thirdPlaceWinner,
      matches:    koMatches,
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

  // ─── Escribir results.js ──────────────────────────────────────────────────
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

  const gruposRellenos = Object.keys(groupStandings).length;
  console.log(`   Grupos cerrados:    ${gruposRellenos}/12`);
  console.log(`   Quiniela 1X2:       ${Object.values(quiniela1x2).filter(v => v).length}/3 partidos`);
  console.log(`   Campeón:            ${champion || '(pendiente)'}`);
}

main().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
