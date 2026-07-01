/**
 * update-results.js
 * Consulta football-data.org y genera results.js para la porra del Mundial 2026.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const API_KEY     = process.env.FOOTBALL_API_KEY;
const COMPETITION = 'WC';
const OUT_FILE    = path.join(__dirname, 'results.js');

if (!API_KEY) { console.error('❌  Falta FOOTBALL_API_KEY'); process.exit(1); }

const TEAM_ES = {
  'Algeria':'Argelia','Argentina':'Argentina','Australia':'Australia','Austria':'Austria',
  'Belgium':'Bélgica','Bosnia & Herzegovina':'Bosnia y Herzegovina','Bosnia-Herzegovina':'Bosnia y Herzegovina',
  'Bosnia and Herzegovina':'Bosnia y Herzegovina','Brazil':'Brasil','Canada':'Canadá',
  'Cape Verde':'Cabo Verde','Cape Verde Islands':'Cabo Verde','Colombia':'Colombia',
  'Croatia':'Croacia','Curaçao':'Curazao','Curacao':'Curazao','Czech Republic':'República Checa',
  'Czechia':'República Checa','DR Congo':'RD del Congo','Congo DR':'RD del Congo',
  'Democratic Republic of Congo':'RD del Congo','Ecuador':'Ecuador','Egypt':'Egipto',
  'England':'Inglaterra','France':'Francia','Germany':'Alemania','Ghana':'Ghana',
  'Haiti':'Haití','Iran':'Irán','Iraq':'Irak','Ivory Coast':'Costa de Marfil',
  "Côte d'Ivoire":'Costa de Marfil','Japan':'Japón','Jordan':'Jordania','Mexico':'México',
  'Morocco':'Marruecos','Netherlands':'Países Bajos','New Zealand':'Nueva Zelanda',
  'Norway':'Noruega','Panama':'Panamá','Paraguay':'Paraguay','Portugal':'Portugal',
  'Qatar':'Catar','Saudi Arabia':'Arabia Saudí','Scotland':'Escocia','Senegal':'Senegal',
  'South Africa':'Sudáfrica','South Korea':'Corea del Sur','Korea Republic':'Corea del Sur',
  'Spain':'España','Sweden':'Suecia','Switzerland':'Suiza','Tunisia':'Túnez',
  'Turkey':'Turquía','Türkiye':'Turquía','USA':'Estados Unidos','United States':'Estados Unidos',
  'Uruguay':'Uruguay','Uzbekistan':'Uzbekistán',
};

function es(name) { return TEAM_ES[name] || name || ''; }

function groupLetter(raw) {
  if (!raw) return '';
  let m = raw.match(/GROUP_([A-Z]+)/);
  if (m) return m[1];
  m = raw.match(/Group\s+([A-Z]+)/i);
  if (m) return m[1].toUpperCase();
  m = raw.match(/^([A-L])$/);
  if (m) return m[1];
  return '';
}

const QUINIELA_MATCHES = [
  { team1: 'México',   team2: 'Corea del Sur' },
  { team1: 'Escocia',  team2: 'Marruecos'     },
  { team1: 'Uruguay',  team2: 'España'         },
].map(m => ({ ...m, key: [m.team1, m.team2].sort().join('__'), teams: new Set([m.team1, m.team2]) }));

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

  // ── Grupos ────────────────────────────────────────────────────────────────
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

  const groupStandings = {};
  for (const standing of standingsData.standings || []) {
    if (standing.type !== 'TOTAL') continue;
    const letter = groupLetter(standing.group);
    if (!letter) continue;
    const total    = totalByGroup[letter]    || 6;
    const finished = finishedByGroup[letter] || 0;
    if (finished < total) {
      console.log(`  Grupo ${letter}: ${finished}/${total} jugados — pendiente`);
      continue;
    }
    groupStandings[letter] = standing.table.map(row => es(row.team.name));
    console.log(`  Grupo ${letter}: ✅ → ${groupStandings[letter].join(', ')}`);
  }

  // ── Quiniela 1X2 ──────────────────────────────────────────────────────────
  const quiniela1x2 = Object.fromEntries(QUINIELA_MATCHES.map(m => [m.key, '']));
  for (const match of allMatches) {
    if (match.stage !== 'GROUP_STAGE' || match.status !== 'FINISHED') continue;
    const home = es(match.homeTeam?.name);
    const away = es(match.awayTeam?.name);
    const qm = QUINIELA_MATCHES.find(m => m.teams.has(home) && m.teams.has(away));
    if (!qm) continue;
    const hg = match.score?.fullTime?.home ?? 0;
    const ag = match.score?.fullTime?.away ?? 0;
    if (hg === ag) {
      quiniela1x2[qm.key] = 'X';
    } else {
      const winner = hg > ag ? home : away;
      quiniela1x2[qm.key] = winner === qm.team1 ? '1' : '2';
    }
    console.log(`  Quiniela [${qm.key}]: ${home} ${hg}-${ag} ${away} → "${quiniela1x2[qm.key]}"`);
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

  // koMatches: solo partidos TERMINADOS, con team1/team2/winner (no home/away)
  const koMatches = { round32:[], round16:[], quarterfinals:[], semifinals:[], thirdPlace:[], final:[] };
  // koParticipants: todos los partidos KO (terminados o no), para saber quién participa en cada ronda
  const koParticipants = { round32:[], round16:[], quarterfinals:[], semifinals:[], thirdPlace:[], final:[] };

  let champion = '', runnerUp = '', thirdPlaceWinner = '';

  for (const match of allMatches) {
    const roundKey = STAGE_MAP[match.stage];
    if (!roundKey) continue;

    const team1  = es(match.homeTeam?.name);
    const team2  = es(match.awayTeam?.name);

    // Todos los partidos KO (para saber quién llega a cada ronda)
    if (team1 || team2) {
      koParticipants[roundKey].push({ match: match.id, team1, team2 });
    }

    // Solo los terminados para saber el ganador
    if (match.status !== 'FINISHED') continue;
    const winner = match.score?.winner === 'HOME_TEAM' ? team1
                 : match.score?.winner === 'AWAY_TEAM' ? team2 : '';

    const entry = { match: match.id, team1, team2, winner };

    if (roundKey === 'final') {
      koMatches.final.push(entry);
      champion  = winner;
      runnerUp  = winner === team1 ? team2 : team1;
    } else if (roundKey === 'thirdPlace') {
      koMatches.thirdPlace.push(entry);
      thirdPlaceWinner = winner;
    } else {
      koMatches[roundKey].push(entry);
    }
  }

  // Array simple de ganadores por ronda (los que PASAN a la siguiente)
  // round32 winners → los que juegan en round16
  // etc.
  const round32winners = koMatches.round32.map(m => m.winner).filter(Boolean);
  const round16winners = koMatches.round16.map(m => m.winner).filter(Boolean);
  const qfWinners      = koMatches.quarterfinals.map(m => m.winner).filter(Boolean);
  const sfWinners      = koMatches.semifinals.map(m => m.winner).filter(Boolean);

  const semifinalists = allMatches
    .filter(m => m.stage === 'SEMI_FINALS')
    .flatMap(m => [es(m.homeTeam?.name), es(m.awayTeam?.name)])
    .filter(Boolean);
  const finalists = champion && runnerUp ? [champion, runnerUp] : [];

  // ── Mejores terceros ──────────────────────────────────────────────────────
  const thirdTeams = [];
  for (const standing of standingsData.standings || []) {
    if (standing.type !== 'TOTAL') continue;
    const letter = groupLetter(standing.group);
    if (!groupStandings[letter]) continue;
    const row = standing.table.find(r => r.position === 3);
    if (row) thirdTeams.push({ name: es(row.team.name), points: row.points, gd: row.goalDifference, gf: row.goalsFor });
  }
  thirdTeams.sort((a,b) => b.points-a.points || b.gd-a.gd || b.gf-a.gf);
  const thirdPlace = thirdTeams.slice(0,8).map(t => t.name);

  // ── Construir RESULTS ─────────────────────────────────────────────────────
  const RESULTS = {
    groups: groupStandings,
    thirdPlace,
    quiniela1x2,
    knockout: {
      // Arrays simples de GANADORES por ronda (los que avanzan)
      round32:       round32winners,   // ganadores de R32 = participantes en R16
      round16:       round16winners,   // ganadores de R16 = participantes en QF
      quarterfinals: qfWinners,
      semifinals:    sfWinners,
      champion,
      runnerUp,
      finalists,
      thirdPlaceWinner,
      final:         champion,
      thirdPlace:    thirdPlaceWinner,
      // Participantes en cada ronda (team1+team2, terminados o no)
      participants: {
        round32:       koParticipants.round32,
        round16:       koParticipants.round16,
        quarterfinals: koParticipants.quarterfinals,
        semifinals:    koParticipants.semifinals,
        thirdPlace:    koParticipants.thirdPlace,
        final:         koParticipants.final,
      },
      // Matches terminados con team1/team2/winner
      matches: koMatches,
    },
    semifinalists,
    finalists,
    champion,
    runnerUp,
    thirdPlaceWinner,
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
  console.log(`   Grupos cerrados:    ${Object.keys(groupStandings).length}/12`);
  console.log(`   Quiniela 1X2:       ${Object.values(quiniela1x2).filter(v=>v).length}/3`);
  console.log(`   R32 jugados:        ${koMatches.round32.length}/16`);
  console.log(`   R16 jugados:        ${koMatches.round16.length}/8`);
  console.log(`   Campeón:            ${champion || '(pendiente)'}`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
