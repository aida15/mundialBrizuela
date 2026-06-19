/**
 * update-results.js — v3
 * Consulta football-data.org y genera results.js para la porra del Mundial 2026.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_KEY     = process.env.FOOTBALL_API_KEY;
const COMPETITION = 'WC';
const OUT_FILE    = path.join(__dirname, 'results.js');

if (!API_KEY) { console.error('❌  Falta FOOTBALL_API_KEY'); process.exit(1); }

// ─── Mapeo inglés → español ───────────────────────────────────────────────────
const TEAM_ES = {
  'Algeria':                      'Argelia',
  'Argentina':                    'Argentina',
  'Australia':                    'Australia',
  'Austria':                      'Austria',
  'Belgium':                      'Bélgica',
  'Bosnia & Herzegovina':         'Bosnia y Herzegovina',
  'Bosnia-Herzegovina':           'Bosnia y Herzegovina',
  'Bosnia and Herzegovina':       'Bosnia y Herzegovina',
  'Brazil':                       'Brasil',
  'Canada':                       'Canadá',
  'Cape Verde':                   'Cabo Verde',
  'Cape Verde Islands':           'Cabo Verde',
  'Colombia':                     'Colombia',
  'Croatia':                      'Croacia',
  'Curaçao':                      'Curazao',
  'Curacao':                      'Curazao',
  'Czech Republic':               'República Checa',
  'Czechia':                      'República Checa',
  'DR Congo':                     'RD del Congo',
  'Congo DR':                     'RD del Congo',
  'Democratic Republic of Congo': 'RD del Congo',
  'Ecuador':                      'Ecuador',
  'Egypt':                        'Egipto',
  'England':                      'Inglaterra',
  'France':                       'Francia',
  'Germany':                      'Alemania',
  'Ghana':                        'Ghana',
  'Haiti':                        'Haití',
  'Iran':                         'Irán',
  'Iraq':                         'Irak',
  'Ivory Coast':                  'Costa de Marfil',
  "Côte d'Ivoire":                'Costa de Marfil',
  'Japan':                        'Japón',
  'Jordan':                       'Jordania',
  'Mexico':                       'México',
  'Morocco':                      'Marruecos',
  'Netherlands':                  'Países Bajos',
  'New Zealand':                  'Nueva Zelanda',
  'Norway':                       'Noruega',
  'Panama':                       'Panamá',
  'Paraguay':                     'Paraguay',
  'Portugal':                     'Portugal',
  'Qatar':                        'Catar',
  'Saudi Arabia':                 'Arabia Saudí',
  'Scotland':                     'Escocia',
  'Senegal':                      'Senegal',
  'South Africa':                 'Sudáfrica',
  'South Korea':                  'Corea del Sur',
  'Korea Republic':               'Corea del Sur',
  'Spain':                        'España',
  'Sweden':                       'Suecia',
  'Switzerland':                  'Suiza',
  'Tunisia':                      'Túnez',
  'Turkey':                       'Turquía',
  'Türkiye':                      'Turquía',
  'USA':                          'Estados Unidos',
  'United States':                'Estados Unidos',
  'Uruguay':                      'Uruguay',
  'Uzbekistan':                   'Uzbekistán',
};

function es(name) { return TEAM_ES[name] || name || ''; }

// Extrae la letra del grupo de cualquier formato que devuelva la API
function groupLetter(raw) {
  if (!raw) return '';
  let m = raw.match(/GROUP_([A-Z]+)/);
  if (m) return m[1];
  m = raw.match(/Group\s+([A-Z]+)/i);
  if (m) return m[1].toUpperCase();
  // Si es solo "A", "B"...
  m = raw.match(/^([A-L])$/);
  if (m) return m[1];
  return '';
}

// ─── Partidos de quiniela 1X2 ─────────────────────────────────────────────────
// IMPORTANTE: team1 y team2 son los nombres en español tal como aparecen
// en la app. La clave se genera ordenando alfabéticamente ambos nombres.
// El valor "1" significa que gana el equipo que queda PRIMERO al ordenar
// alfabéticamente, "2" el que queda segundo, "X" empate.
// Esto es independiente de quién sea local o visitante en el partido real.
const QUINIELA_MATCHES = [
  { teamA: 'Corea del Sur', teamB: 'México'   }, // clave: Corea del Sur__México  → "1"=Corea, "2"=México
  { teamA: 'Escocia',       teamB: 'Marruecos' }, // clave: Escocia__Marruecos     → "1"=Escocia, "2"=Marruecos
  { teamA: 'España',        teamB: 'Uruguay'   }, // clave: España__Uruguay        → "1"=España, "2"=Uruguay
].map(m => {
  const sorted = [m.teamA, m.teamB].sort();
  return {
    key:   sorted.join('__'),
    first: sorted[0],   // el que vale "1"
    second: sorted[1],  // el que vale "2"
    teams: new Set([m.teamA, m.teamB]),
  };
});

function apiGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://api.football-data.org/v4/competitions/${COMPETITION}/${endpoint}`;
    console.log(`  GET ${url}`);
    https.get(url, { headers: { 'X-Auth-Token': API_KEY } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0,300)}`));
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('🔄  Consultando football-data.org...\n');

  const [matchesData, standingsData] = await Promise.all([
    apiGet('matches'),
    apiGet('standings'),
  ]);

  const allMatches = matchesData.matches || [];

  // ── Contar partidos finalizados por grupo ──────────────────────────────────
  const finishedByGroup = {};
  const totalByGroup    = {};
  for (const match of allMatches) {
    if (match.stage !== 'GROUP_STAGE') continue;
    const letter = groupLetter(match.group);
    if (!letter) continue;
    totalByGroup[letter]    = (totalByGroup[letter]    || 0) + 1;
    if (match.status === 'FINISHED')
      finishedByGroup[letter] = (finishedByGroup[letter] || 0) + 1;
  }
  console.log('  Partidos por grupo:', JSON.stringify(finishedByGroup));

  // ── Standings: solo grupos con todos los partidos jugados ─────────────────
  const groupStandings = {};
  for (const standing of standingsData.standings || []) {
    if (standing.type !== 'TOTAL') continue;
    const letter = groupLetter(standing.group);
    if (!letter) { console.log(`  ⚠️  No se pudo extraer letra de grupo: "${standing.group}"`); continue; }

    const total    = totalByGroup[letter]    || 6;
    const finished = finishedByGroup[letter] || 0;
    if (finished < total) {
      console.log(`  Grupo ${letter}: ${finished}/${total} jugados — pendiente`);
      continue;
    }
    groupStandings[letter] = standing.table.map(row => es(row.team.name));
    console.log(`  Grupo ${letter}: ✅ cerrado → ${groupStandings[letter].join(', ')}`);
  }

  // ── Quiniela 1X2 ──────────────────────────────────────────────────────────
  const quiniela1x2 = Object.fromEntries(QUINIELA_MATCHES.map(m => [m.key, '']));

  for (const match of allMatches) {
    if (match.stage !== 'GROUP_STAGE' || match.status !== 'FINISHED') continue;

    const home = es(match.homeTeam?.name);
    const away = es(match.awayTeam?.name);

    // Buscamos si este partido corresponde a alguno de la quiniela
    const qm = QUINIELA_MATCHES.find(m => m.teams.has(home) && m.teams.has(away));
    if (!qm) continue;

    const hg = match.score?.fullTime?.home ?? 0;
    const ag = match.score?.fullTime?.away ?? 0;

    let winner = '';
    if      (hg > ag) winner = home;
    else if (ag > hg) winner = away;
    // empate → winner queda ''

    if (winner === '') {
      quiniela1x2[qm.key] = 'X';
    } else if (winner === qm.first) {
      quiniela1x2[qm.key] = '1';
    } else {
      quiniela1x2[qm.key] = '2';
    }

    console.log(`  Quiniela [${qm.key}]: ${home} ${hg}-${ag} ${away} → "${quiniela1x2[qm.key]}" (gana ${winner || 'nadie/empate'})`);
  }

  // ── Eliminatorias ─────────────────────────────────────────────────────────
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

  const knockoutRounds = { round32:[], round16:[], quarterfinals:[], semifinals:[] };
  const koMatches = { round32:[], round16:[], quarterfinals:[], semifinals:[], thirdPlace:[], final:[] };
  let champion = '', runnerUp = '', thirdPlaceWinner = '';

  for (const match of allMatches) {
    const roundKey = STAGE_MAP[match.stage];
    if (!roundKey || match.status !== 'FINISHED') continue;

    const home = es(match.homeTeam?.name);
    const away = es(match.awayTeam?.name);
    const winner = match.score?.winner === 'HOME_TEAM' ? home
                 : match.score?.winner === 'AWAY_TEAM' ? away : '';
    const entry = { match: match.id, home, away, winner };

    if (roundKey === 'final') {
      koMatches.final.push(entry);
      champion = winner;
      runnerUp = winner === home ? away : home;
    } else if (roundKey === 'thirdPlace') {
      koMatches.thirdPlace.push(entry);
      thirdPlaceWinner = winner;
    } else {
      koMatches[roundKey].push(entry);
      if (winner) knockoutRounds[roundKey].push(winner);
    }
  }

  const semifinalists = allMatches
    .filter(m => m.stage === 'SEMI_FINALS')
    .flatMap(m => [es(m.homeTeam?.name), es(m.awayTeam?.name)])
    .filter(Boolean);
  const finalists = champion && runnerUp ? [champion, runnerUp] : [];

  // ── Mejores terceros (solo grupos cerrados) ───────────────────────────────
  const thirdTeams = [];
  for (const standing of standingsData.standings || []) {
    if (standing.type !== 'TOTAL') continue;
    const letter = groupLetter(standing.group);
    if (!groupStandings[letter]) continue;
    const row = standing.table.find(r => r.position === 3);
    if (row) thirdTeams.push({
      name: es(row.team.name),
      points: row.points,
      gd: row.goalDifference,
      gf: row.goalsFor,
    });
  }
  thirdTeams.sort((a,b) => b.points-a.points || b.gd-a.gd || b.gf-a.gf);
  const thirdPlace = thirdTeams.slice(0,8).map(t => t.name);

  // ── Construir y escribir RESULTS ──────────────────────────────────────────
  const RESULTS = {
    groups: groupStandings,
    thirdPlace,
    quiniela1x2,
    knockout: {
      ...knockoutRounds,
      champion, runnerUp, finalists, thirdPlaceWinner,
      final: champion, thirdPlace: thirdPlaceWinner,
      matches: koMatches,
    },
    semifinalists, finalists,
    champion, runnerUp, thirdPlaceWinner,
    awards: { topScorer:'', topAssister:'', goldenGlove:'', topScoringTeam:'', mostConcededTeam:'' },
  };

  const now = new Date().toISOString();
  fs.writeFileSync(OUT_FILE, `/* ============================================================
   Resultados oficiales del Mundial 2026.
   Generado automáticamente por update-results.js
   Última actualización: ${now}
   ============================================================ */

const RESULTS = ${JSON.stringify(RESULTS, null, 2)};
`, 'utf8');

  console.log(`\n✅  results.js actualizado (${now})`);
  console.log(`   Grupos cerrados: ${Object.keys(groupStandings).length}/12`);
  console.log(`   Quiniela 1X2:    ${Object.values(quiniela1x2).filter(v=>v).length}/3`);
  console.log(`   Campeón:         ${champion || '(pendiente)'}`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
