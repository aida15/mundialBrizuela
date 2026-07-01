/* ============================================================
   2026 FIFA World Cup Prediction Game - app.js
   Data fetched from openfootball/worldcup.json
   ============================================================ */

const DATA_SRC = 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026';
const LEADERBOARD_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTwtplM_3RIGPCdhcvoTaxtZroVzwplR7f16y4t-hUO6RDezlWd_0n6gcHiUEkveeJvHj813rySC6Fb/pub?output=csv';
const FORM_ID = '1FAIpQLSc2se8Xj_Hx-1Q1SFHyypy487EPfnQ3wTbW2pDkcDGefHdS0w';
const ENTRY_ID = 'entry.443364117';

// Cierre de apuestas: 11 de junio de 2026, 19:00 hora peninsular española (CEST = UTC+2 → 17:00 UTC).
const DEADLINE = new Date('2026-06-11T17:00:00Z');
const KICKOFF = new Date('2026-06-11T19:00:00Z'); // 21:00 hora peninsular (CEST)

function isSubmissionClosed() {
  return new Date() > DEADLINE;
}

const puntuaciones = {
  grupos: {
    posicion: {
      primero: 4,
      segundo: 3,
      tercero: 2,
      cuarto: 1
    },
    mejorTercero: 1
  },
  quiniela1x2: 1,
  eliminatorias: {
    round32: 2,
    round16: 3,
    quarterfinals: 5,
    semifinals: 10,
    finalist: 20,
    champion: 30,
    thirdPlace: 15
  },
  premios: {
    topScorer: 10,
    topAssister: 5,
    goldenGlove: 5,
    topScoringTeam: 5,
    mostConcededTeam: 8
  }
};

// Configuración declarativa de los 5 premios.
// `kind` indica si el valor seleccionable es un jugador (de AWARD_PLAYERS)
// o un equipo (de cualquier selección participante en el Mundial).
const AWARDS_CONFIG = [
  { key: 'topScorer',      selectId: 'awardTopScorer',      kind: 'player', emoji: '🥇', label: 'Máximo Goleador',          points: puntuaciones.premios.topScorer },
  { key: 'topAssister',    selectId: 'awardTopAssister',    kind: 'player', emoji: '🎯', label: 'Máximo Asistente',         points: puntuaciones.premios.topAssister },
  { key: 'goldenGlove',    selectId: 'awardGoldenGlove',    kind: 'player', emoji: '🧤', label: 'Guante de Oro (portero)',  points: puntuaciones.premios.goldenGlove },
  { key: 'topScoringTeam',    selectId: 'awardTopScoringTeam',    kind: 'team',   emoji: '⚽', label: 'Equipo Más Goleador',      points: puntuaciones.premios.topScoringTeam },
  { key: 'mostConcededTeam',  selectId: 'awardMostConcededTeam',  kind: 'team',   emoji: '🥅', label: 'Equipo Más Goleado',       points: puntuaciones.premios.mostConcededTeam }
];

const AWARD_SELECT_IDS = AWARDS_CONFIG.map(a => a.selectId);

// ---- Quiniela 1X2 ----
// 3 partidos predefinidos de la fase de grupos del Mundial 2026, elegidos al
// azar de antemano (uno de ellos garantizado de España). Se validan contra el
// calendario oficial (openfootball/worldcup.json) en `loadData` para asegurar
// que realmente son partidos de la fase de grupos.
// Formato 1X2: 1 = gana team1, X = empate, 2 = gana team2.
const QUINIELA_1X2_MATCHES = [
  { group: 'A', team1: 'México',   team2: 'Corea del Sur' },
  { group: 'C', team1: 'Escocia', team2: 'Marruecos'     },
  { group: 'H', team1: 'Uruguay',  team2: 'España'       }
].map(m => Object.assign(m, { key: [m.team1, m.team2].sort().join('__') }));

function emptyAwardsState() {
  const empty = {};
  AWARDS_CONFIG.forEach(a => { empty[a.key] = ''; });
  return empty;
}


// OUNTDOWN
function formatCountdown(ms) {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
}

function updateCountdowns() {
  const now = Date.now();

  const betEl = document.getElementById('cdBet');
  if (betEl) {
    const diff = DEADLINE.getTime() - now;
    betEl.textContent = diff > 0 ? formatCountdown(diff) : '¡Cerrado!';
    betEl.classList.toggle('countdown-finished', diff <= 0);
  }

  const kickEl = document.getElementById('cdKick');
  if (kickEl) {
    const diff = KICKOFF.getTime() - now;
    kickEl.textContent = diff > 0 ? formatCountdown(diff) : '¡Ya rueda el balón!';
    kickEl.classList.toggle('countdown-finished', diff <= 0);
  }
}



// Traducción al español de los nombres de selección tal como aparecen en
// openfootball/worldcup.json. Se aplica al cargar los datos para que toda la
// aplicación (grupos, eliminatorias, premios, etc.) muestre los países en español.
const TEAM_NAME_ES = {
  'Algeria': 'Argelia',
  'Argentina': 'Argentina',
  'Australia': 'Australia',
  'Austria': 'Austria',
  'Belgium': 'Bélgica',
  'Bosnia & Herzegovina': 'Bosnia y Herzegovina',
  'Brazil': 'Brasil',
  'Canada': 'Canadá',
  'Cape Verde': 'Cabo Verde',
  'Colombia': 'Colombia',
  'Croatia': 'Croacia',
  'Curaçao': 'Curazao',
  'Czech Republic': 'República Checa',
  'DR Congo': 'RD del Congo',
  'Ecuador': 'Ecuador',
  'Egypt': 'Egipto',
  'England': 'Inglaterra',
  'France': 'Francia',
  'Germany': 'Alemania',
  'Ghana': 'Ghana',
  'Haiti': 'Haití',
  'Iran': 'Irán',
  'Iraq': 'Irak',
  'Ivory Coast': 'Costa de Marfil',
  'Japan': 'Japón',
  'Jordan': 'Jordania',
  'Mexico': 'México',
  'Morocco': 'Marruecos',
  'Netherlands': 'Países Bajos',
  'New Zealand': 'Nueva Zelanda',
  'Norway': 'Noruega',
  'Panama': 'Panamá',
  'Paraguay': 'Paraguay',
  'Portugal': 'Portugal',
  'Qatar': 'Catar',
  'Saudi Arabia': 'Arabia Saudí',
  'Scotland': 'Escocia',
  'Senegal': 'Senegal',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Spain': 'España',
  'Sweden': 'Suecia',
  'Switzerland': 'Suiza',
  'Tunisia': 'Túnez',
  'Turkey': 'Turquía',
  'USA': 'Estados Unidos',
  'Uruguay': 'Uruguay',
  'Uzbekistan': 'Uzbekistán'
};

function translateTeamName(name) {
  if (!name) return name;
  return TEAM_NAME_ES[name] || name;
}

const FLAG_CODE = {
  'México':'mx','Sudáfrica':'za','Corea del Sur':'kr','República Checa':'cz',
  'Canadá':'ca','Bosnia y Herzegovina':'ba','Catar':'qa','Suiza':'ch',
  'Brasil':'br','Marruecos':'ma','Haití':'ht','Escocia':'gb-sct',
  'Estados Unidos':'us','Paraguay':'py','Australia':'au','Turquía':'tr',
  'Alemania':'de','Curazao':'cw','Costa de Marfil':'ci','Ecuador':'ec',
  'Países Bajos':'nl','Japón':'jp','Suecia':'se','Túnez':'tn',
  'Bélgica':'be','Egipto':'eg','Irán':'ir','Nueva Zelanda':'nz',
  'España':'es','Cabo Verde':'cv','Arabia Saudí':'sa','Uruguay':'uy',
  'Francia':'fr','Senegal':'sn','Irak':'iq','Noruega':'no',
  'Argentina':'ar','Argelia':'dz','Austria':'at','Jordania':'jo',
  'Portugal':'pt','RD del Congo':'cd','Uzbekistán':'uz','Colombia':'co',
  'Inglaterra':'gb-eng','Croacia':'hr','Ghana':'gh','Panamá':'pa',
  'Euskadi (País Vasco)':'es-pv'
};

const AWARD_PLAYERS = [

  // México
  { name: 'Guillermo Ochoa', country: 'México' },
  { name: 'Luis Malagón', country: 'México' },
  { name: 'Raúl Rangel', country: 'México' },
  { name: 'Jorge Sánchez', country: 'México' },
  { name: 'César Montes', country: 'México' },
  { name: 'Johan Vásquez', country: 'México' },
  { name: 'Edson Álvarez', country: 'México' },
  { name: 'Israel Reyes', country: 'México' },
  { name: 'Jesús Gallardo', country: 'México' },
  { name: 'Gerardo Arteaga', country: 'México' },
  { name: 'Néstor Araujo', country: 'México' },
  { name: 'Julián Araujo', country: 'México' },
  { name: 'Kevin Álvarez', country: 'México' },
  { name: 'Luis Romo', country: 'México' },
  { name: 'Erick Sánchez', country: 'México' },
  { name: 'Luis Chávez', country: 'México' },
  { name: 'Orbelín Pineda', country: 'México' },
  { name: 'Marcel Ruiz', country: 'México' },
  { name: 'Carlos Rodríguez', country: 'México' },
  { name: 'Hirving Lozano', country: 'México' },
  { name: 'Alexis Vega', country: 'México' },
  { name: 'Santiago Giménez', country: 'México' },
  { name: 'Henry Martín', country: 'México' },
  { name: 'Raúl Jiménez', country: 'México' },
  { name: 'Julián Quiñones', country: 'México' },
  { name: 'Uriel Antuna', country: 'México' },

  // Sudáfrica
  { name: 'Ronwen Williams', country: 'Sudáfrica' },
  { name: 'Ricardo Goss', country: 'Sudáfrica' },
  { name: 'Sipho Chaine', country: 'Sudáfrica' },
  { name: 'Mothobi Mvala', country: 'Sudáfrica' },
  { name: 'Siyanda Xulu', country: 'Sudáfrica' },
  { name: 'Nyiko Mobbie', country: 'Sudáfrica' },
  { name: 'Khuliso Mudau', country: 'Sudáfrica' },
  { name: 'Aubrey Modiba', country: 'Sudáfrica' },
  { name: 'Innocent Maela', country: 'Sudáfrica' },
  { name: 'Grant Kekana', country: 'Sudáfrica' },
  { name: 'Siyabonga Ngezana', country: 'Sudáfrica' },
  { name: 'Nkosinathi Sibisi', country: 'Sudáfrica' },
  { name: 'Teboho Mokoena', country: 'Sudáfrica' },
  { name: 'Sphephelo Sithole', country: 'Sudáfrica' },
  { name: 'Themba Zwane', country: 'Sudáfrica' },
  { name: 'Bongokuhle Hlongwane', country: 'Sudáfrica' },
  { name: 'Mihlali Mayambela', country: 'Sudáfrica' },
  { name: 'Patrick Maswanganyi', country: 'Sudáfrica' },
  { name: 'Thapelo Maseko', country: 'Sudáfrica' },
  { name: 'Percy Tau', country: 'Sudáfrica' },
  { name: 'Lyle Foster', country: 'Sudáfrica' },
  { name: 'Evidence Makgopa', country: 'Sudáfrica' },
  { name: 'Iqraam Rayners', country: 'Sudáfrica' },
  { name: 'Mduduzi Shabalala', country: 'Sudáfrica' },
  { name: 'Zakhele Lepasa', country: 'Sudáfrica' },
  { name: 'Oswin Appollis', country: 'Sudáfrica' },

  // Corea del Sur
  { name: 'Kim Seung-gyu', country: 'Corea del Sur' },
  { name: 'Jo Hyeon-woo', country: 'Corea del Sur' },
  { name: 'Song Bum-keun', country: 'Corea del Sur' },
  { name: 'Kim Min-jae', country: 'Corea del Sur' },
  { name: 'Kim Young-gwon', country: 'Corea del Sur' },
  { name: 'Kim Ju-sung', country: 'Corea del Sur' },
  { name: 'Jung Seung-hyun', country: 'Corea del Sur' },
  { name: 'Park Jin-seop', country: 'Corea del Sur' },
  { name: 'Kim Jin-su', country: 'Corea del Sur' },
  { name: 'Lee Myung-jae', country: 'Corea del Sur' },
  { name: 'Seol Young-woo', country: 'Corea del Sur' },
  { name: 'Hwang Jae-won', country: 'Corea del Sur' },
  { name: 'Hwang In-beom', country: 'Corea del Sur' },
  { name: 'Lee Jae-sung', country: 'Corea del Sur' },
  { name: 'Park Yong-woo', country: 'Corea del Sur' },
  { name: 'Hong Hyun-seok', country: 'Corea del Sur' },
  { name: 'Baek Seung-ho', country: 'Corea del Sur' },
  { name: 'Lee Kang-in', country: 'Corea del Sur' },
  { name: 'Bae Jun-ho', country: 'Corea del Sur' },
  { name: 'Son Heung-min', country: 'Corea del Sur' },
  { name: 'Hwang Hee-chan', country: 'Corea del Sur' },
  { name: 'Cho Gue-sung', country: 'Corea del Sur' },
  { name: 'Oh Hyeon-gyu', country: 'Corea del Sur' },
  { name: 'Jeong Sang-bin', country: 'Corea del Sur' },
  { name: 'Um Won-sang', country: 'Corea del Sur' },
  { name: 'Lee Dong-gyeong', country: 'Corea del Sur' },

  // República Checa
  { name: 'Jindřich Staněk', country: 'República Checa' },
  { name: 'Vítězslav Jaroš', country: 'República Checa' },
  { name: 'Matěj Kovář', country: 'República Checa' },
  { name: 'Tomáš Holeš', country: 'República Checa' },
  { name: 'Robin Hranáč', country: 'República Checa' },
  { name: 'Martin Vitík', country: 'República Checa' },
  { name: 'David Doudera', country: 'República Checa' },
  { name: 'David Jurásek', country: 'República Checa' },
  { name: 'Ladislav Krejčí', country: 'República Checa' },
  { name: 'David Zima', country: 'República Checa' },
  { name: 'Tomáš Vlček', country: 'República Checa' },
  { name: 'Vladimír Coufal', country: 'República Checa' },
  { name: 'Tomáš Souček', country: 'República Checa' },
  { name: 'Lukáš Provod', country: 'República Checa' },
  { name: 'Pavel Šulc', country: 'República Checa' },
  { name: 'Antonín Barák', country: 'República Checa' },
  { name: 'Michal Sadílek', country: 'República Checa' },
  { name: 'Adam Hložek', country: 'República Checa' },
  { name: 'Václav Černý', country: 'República Checa' },
  { name: 'Patrik Schick', country: 'República Checa' },
  { name: 'Tomáš Chorý', country: 'República Checa' },
  { name: 'Mojmír Chytil', country: 'República Checa' },
  { name: 'Matěj Jurásek', country: 'República Checa' },
  { name: 'Ondřej Lingr', country: 'República Checa' },
  { name: 'Petr Ševčík', country: 'República Checa' },
  { name: 'Lukáš Červ', country: 'República Checa' },
  
  // Canadá
  { name: 'Maxime Crépeau', country: 'Canadá' },
  { name: 'Dayne St. Clair', country: 'Canadá' },
  { name: 'Tom McGill', country: 'Canadá' },
  { name: 'Alphonso Davies', country: 'Canadá' },
  { name: 'Sam Adekugbe', country: 'Canadá' },
  { name: 'Richie Laryea', country: 'Canadá' },
  { name: 'Alistair Johnston', country: 'Canadá' },
  { name: 'Moïse Bombito', country: 'Canadá' },
  { name: 'Derek Cornelius', country: 'Canadá' },
  { name: 'Steven Vitória', country: 'Canadá' },
  { name: 'Joel Waterman', country: 'Canadá' },
  { name: 'Kamal Miller', country: 'Canadá' },
  { name: 'Stephen Eustáquio', country: 'Canadá' },
  { name: 'Ismaël Koné', country: 'Canadá' },
  { name: 'Mathieu Choinière', country: 'Canadá' },
  { name: 'Liam Fraser', country: 'Canadá' },
  { name: 'Niko Sigur', country: 'Canadá' },
  { name: 'Tajon Buchanan', country: 'Canadá' },
  { name: 'Jacob Shaffelburg', country: 'Canadá' },
  { name: 'Jonathan David', country: 'Canadá' },
  { name: 'Cyle Larin', country: 'Canadá' },
  { name: 'Jonathan Osorio', country: 'Canadá' },
  { name: 'Junior Hoilett', country: 'Canadá' },
  { name: 'Theo Bair', country: 'Canadá' },
  { name: 'Daniel Jebbison', country: 'Canadá' },
  { name: 'Ali Ahmed', country: 'Canadá' },

  // Bosnia y Herzegovina
  { name: 'Nikola Vasilj', country: 'Bosnia y Herzegovina' },
  { name: 'Ibrahim Šehić', country: 'Bosnia y Herzegovina' },
  { name: 'Vladan Kovačević', country: 'Bosnia y Herzegovina' },
  { name: 'Sead Kolašinac', country: 'Bosnia y Herzegovina' },
  { name: 'Amar Dedić', country: 'Bosnia y Herzegovina' },
  { name: 'Nihad Mujakić', country: 'Bosnia y Herzegovina' },
  { name: 'Dennis Hadžikadunić', country: 'Bosnia y Herzegovina' },
  { name: 'Anel Ahmedhodžić', country: 'Bosnia y Herzegovina' },
  { name: 'Adrian Leon Barišić', country: 'Bosnia y Herzegovina' },
  { name: 'Eldar Ćivić', country: 'Bosnia y Herzegovina' },
  { name: 'Toni Šunjić', country: 'Bosnia y Herzegovina' },
  { name: 'Sanjin Prcić', country: 'Bosnia y Herzegovina' },
  { name: 'Miralem Pjanić', country: 'Bosnia y Herzegovina' },
  { name: 'Edin Višća', country: 'Bosnia y Herzegovina' },
  { name: 'Rade Krunić', country: 'Bosnia y Herzegovina' },
  { name: 'Amir Hadžiahmetović', country: 'Bosnia y Herzegovina' },
  { name: 'Benjamin Tahirović', country: 'Bosnia y Herzegovina' },
  { name: 'Haris Tabaković', country: 'Bosnia y Herzegovina' },
  { name: 'Said Hamulić', country: 'Bosnia y Herzegovina' },
  { name: 'Edin Džeko', country: 'Bosnia y Herzegovina' },
  { name: 'Ermedin Demirović', country: 'Bosnia y Herzegovina' },
  { name: 'Smail Prevljak', country: 'Bosnia y Herzegovina' },
  { name: 'Dženan Pejčinović', country: 'Bosnia y Herzegovina' },
  { name: 'Luka Menalo', country: 'Bosnia y Herzegovina' },
  { name: 'Armin Gigović', country: 'Bosnia y Herzegovina' },
  { name: 'Ervin Zukanović', country: 'Bosnia y Herzegovina' },

  // Catar
  { name: 'Meshaal Barsham', country: 'Catar' },
  { name: 'Saad Al Sheeb', country: 'Catar' },
  { name: 'Yousef Hassan', country: 'Catar' },
  { name: 'Pedro Miguel', country: 'Catar' },
  { name: 'Bassam Al-Rawi', country: 'Catar' },
  { name: 'Boualem Khoukhi', country: 'Catar' },
  { name: 'Tarek Salman', country: 'Catar' },
  { name: 'Homam Ahmed', country: 'Catar' },
  { name: 'Sultan Al-Brake', country: 'Catar' },
  { name: 'Mohammed Abdulsamad', country: 'Catar' },
  { name: 'Jassem Gaber', country: 'Catar' },
  { name: 'Abdulkarim Hassan', country: 'Catar' },
  { name: 'Hassan Al-Haydos', country: 'Catar' },
  { name: 'Karim Boudiaf', country: 'Catar' },
  { name: 'Mostafa Meshaal', country: 'Catar' },
  { name: 'Abdulaziz Hatem', country: 'Catar' },
  { name: 'Assim Madibo', country: 'Catar' },
  { name: 'Akram Afif', country: 'Catar' },
  { name: 'Ismaeel Mohammad', country: 'Catar' },
  { name: 'Almoez Ali', country: 'Catar' },
  { name: 'Yusuf Abdurisag', country: 'Catar' },
  { name: 'Mohammed Muntari', country: 'Catar' },
  { name: 'Hashim Ali', country: 'Catar' },
  { name: 'Ahmed Alaaeldin', country: 'Catar' },
  { name: 'Ahmed Aledan', country: 'Catar' },
  { name: 'Khalid Muneer', country: 'Catar' },

  // Suiza
  { name: 'Yann Sommer', country: 'Suiza' },
  { name: 'Gregor Kobel', country: 'Suiza' },
  { name: 'Yvon Mvogo', country: 'Suiza' },
  { name: 'Manuel Akanji', country: 'Suiza' },
  { name: 'Nico Elvedi', country: 'Suiza' },
  { name: 'Ricardo Rodríguez', country: 'Suiza' },
  { name: 'Fabian Schär', country: 'Suiza' },
  { name: 'Silvan Widmer', country: 'Suiza' },
  { name: 'Cédric Zesiger', country: 'Suiza' },
  { name: 'Aurèle Amenda', country: 'Suiza' },
  { name: 'Becir Omeragic', country: 'Suiza' },
  { name: 'Edimilson Fernandes', country: 'Suiza' },
  { name: 'Granit Xhaka', country: 'Suiza' },
  { name: 'Remo Freuler', country: 'Suiza' },
  { name: 'Denis Zakaria', country: 'Suiza' },
  { name: 'Michel Aebischer', country: 'Suiza' },
  { name: 'Fabian Rieder', country: 'Suiza' },
  { name: 'Vincent Sierro', country: 'Suiza' },
  { name: 'Ardon Jashari', country: 'Suiza' },
  { name: 'Breel Embolo', country: 'Suiza' },
  { name: 'Xherdan Shaqiri', country: 'Suiza' },
  { name: 'Ruben Vargas', country: 'Suiza' },
  { name: 'Dan Ndoye', country: 'Suiza' },
  { name: 'Zeki Amdouni', country: 'Suiza' },
  { name: 'Renato Steffen', country: 'Suiza' },
  { name: 'Noah Okafor', country: 'Suiza' },

  // Brasil
  { name: 'Alisson Becker', country: 'Brasil' },
  { name: 'Ederson', country: 'Brasil' },
  { name: 'Bento', country: 'Brasil' },
  { name: 'Marquinhos', country: 'Brasil' },
  { name: 'Gabriel Magalhães', country: 'Brasil' },
  { name: 'Éder Militão', country: 'Brasil' },
  { name: 'Murillo', country: 'Brasil' },
  { name: 'Beraldo', country: 'Brasil' },
  { name: 'Danilo', country: 'Brasil' },
  { name: 'Vanderson', country: 'Brasil' },
  { name: 'Wendell', country: 'Brasil' },
  { name: 'Caio Henrique', country: 'Brasil' },
  { name: 'Abner', country: 'Brasil' },
  { name: 'Bruno Guimarães', country: 'Brasil' },
  { name: 'Casemiro', country: 'Brasil' },
  { name: 'André', country: 'Brasil' },
  { name: 'Lucas Paquetá', country: 'Brasil' },
  { name: 'Gerson', country: 'Brasil' },
  { name: 'João Gomes', country: 'Brasil' },
  { name: 'Vinícius Júnior', country: 'Brasil' },
  { name: 'Rodrygo', country: 'Brasil' },
  { name: 'Raphinha', country: 'Brasil' },
  { name: 'Endrick', country: 'Brasil' },
  { name: 'Neymar', country: 'Brasil' },
  { name: 'Gabriel Martinelli', country: 'Brasil' },
  { name: 'Savinho', country: 'Brasil' },

  // Haití
  { name: 'Johny Placide', country: 'Haití' },
  { name: 'Steeve Saint-Duc', country: 'Haití' },
  { name: 'Lossémy Karaboué', country: 'Haití' },
  { name: 'Ricardo Adé', country: 'Haití' },
  { name: 'Carlens Arcus', country: 'Haití' },
  { name: 'Andrew Jean-Baptiste', country: 'Haití' },
  { name: 'Garven-Michée Metusala', country: 'Haití' },
  { name: 'Jems Geffrard', country: 'Haití' },
  { name: 'Steven Saba', country: 'Haití' },
  { name: 'Zachary Brault-Guillard', country: 'Haití' },
  { name: 'Ronaldo Damus', country: 'Haití' },
  { name: 'Bryan Alceus', country: 'Haití' },
  { name: 'Danley Jean Jacques', country: 'Haití' },
  { name: 'Leverton Pierre', country: 'Haití' },
  { name: 'Carl Sainté', country: 'Haití' },
  { name: 'Frantzdy Pierrot', country: 'Haití' },
  { name: 'Wilde-Donald Guerrier', country: 'Haití' },
  { name: 'Derrick Etienne', country: 'Haití' },
  { name: 'Don Deedson Louicius', country: 'Haití' },
  { name: 'Duckens Nazon', country: 'Haití' },
  { name: 'Fafà Picault', country: 'Haití' },
  { name: 'Jean-Eudes Maurice', country: 'Haití' },
  { name: 'Jean Marc Alexandre', country: 'Haití' },
  { name: 'Mikael Cantave', country: 'Haití' },
  { name: 'Wilde-Donald Joseph', country: 'Haití' },

  // Marruecos
  { name: 'Yassine Bounou', country: 'Marruecos' },
  { name: 'Munir Mohamedi', country: 'Marruecos' },
  { name: 'Anas Zniti', country: 'Marruecos' },
  { name: 'Achraf Hakimi', country: 'Marruecos' },
  { name: 'Noussair Mazraoui', country: 'Marruecos' },
  { name: 'Romain Saïss', country: 'Marruecos' },
  { name: 'Nayef Aguerd', country: 'Marruecos' },
  { name: 'Jawad El Yamiq', country: 'Marruecos' },
  { name: 'Adam Masina', country: 'Marruecos' },
  { name: 'Yahya Attiat-Allah', country: 'Marruecos' },
  { name: 'Yahia Jabrane', country: 'Marruecos' },
  { name: 'Chadi Riad', country: 'Marruecos' },
  { name: 'Sofyan Amrabat', country: 'Marruecos' },
  { name: 'Azzedine Ounahi', country: 'Marruecos' },
  { name: 'Selim Amallah', country: 'Marruecos' },
  { name: 'Bilal El Khannouss', country: 'Marruecos' },
  { name: 'Ismael Saibari', country: 'Marruecos' },
  { name: 'Abdessamad Ezzalzouli', country: 'Marruecos' },
  { name: 'Amir Richardson', country: 'Marruecos' },
  { name: 'Hakim Ziyech', country: 'Marruecos' },
  { name: 'Youssef En-Nesyri', country: 'Marruecos' },
  { name: 'Soufiane Rahimi', country: 'Marruecos' },
  { name: 'Brahim Díaz', country: 'Marruecos' },
  { name: 'Ayoub El Kaabi', country: 'Marruecos' },
  { name: 'Zakaria Aboukhlal', country: 'Marruecos' },
  { name: 'Eliesse Ben Seghir', country: 'Marruecos' },

  // Escocia
  { name: 'Angus Gunn', country: 'Escocia' },
  { name: 'Craig Gordon', country: 'Escocia' },
  { name: 'Liam Kelly', country: 'Escocia' },
  { name: 'Andy Robertson', country: 'Escocia' },
  { name: 'Kieran Tierney', country: 'Escocia' },
  { name: 'Aaron Hickey', country: 'Escocia' },
  { name: 'Anthony Ralston', country: 'Escocia' },
  { name: 'Nathan Patterson', country: 'Escocia' },
  { name: 'John Souttar', country: 'Escocia' },
  { name: 'Grant Hanley', country: 'Escocia' },
  { name: 'Scott McKenna', country: 'Escocia' },
  { name: 'Jack Hendry', country: 'Escocia' },
  { name: 'Ryan Porteous', country: 'Escocia' },
  { name: 'Scott McTominay', country: 'Escocia' },
  { name: 'Callum McGregor', country: 'Escocia' },
  { name: 'John McGinn', country: 'Escocia' },
  { name: 'Billy Gilmour', country: 'Escocia' },
  { name: 'Stuart Armstrong', country: 'Escocia' },
  { name: 'Kenny McLean', country: 'Escocia' },
  { name: 'Lewis Ferguson', country: 'Escocia' },
  { name: 'Che Adams', country: 'Escocia' },
  { name: 'Lyndon Dykes', country: 'Escocia' },
  { name: 'Ryan Christie', country: 'Escocia' },
  { name: 'James Forrest', country: 'Escocia' },
  { name: 'Lawrence Shankland', country: 'Escocia' },
  { name: 'Tommy Conway', country: 'Escocia' },

  // Australia
  { name: 'Mathew Ryan', country: 'Australia' },
  { name: 'Joe Gauci', country: 'Australia' },
  { name: 'Lawrence Thomas', country: 'Australia' },
  { name: 'Harry Souttar', country: 'Australia' },
  { name: 'Kye Rowles', country: 'Australia' },
  { name: 'Cameron Burgess', country: 'Australia' },
  { name: 'Aziz Behich', country: 'Australia' },
  { name: 'Gethin Jones', country: 'Australia' },
  { name: 'Milos Degenek', country: 'Australia' },
  { name: 'Thomas Deng', country: 'Australia' },
  { name: 'Jordan Bos', country: 'Australia' },
  { name: 'Lewis Miller', country: 'Australia' },
  { name: 'Alessandro Circati', country: 'Australia' },
  { name: 'Aiden O\'Neill', country: 'Australia' },
  { name: 'Connor Metcalfe', country: 'Australia' },
  { name: 'Jackson Irvine', country: 'Australia' },
  { name: 'Riley McGree', country: 'Australia' },
  { name: 'Keanu Baccus', country: 'Australia' },
  { name: 'Patrick Yazbek', country: 'Australia' },
  { name: 'Cameron Devlin', country: 'Australia' },
  { name: 'Mitchell Duke', country: 'Australia' },
  { name: 'Kusini Yengi', country: 'Australia' },
  { name: 'Mohamed Toure', country: 'Australia' },
  { name: 'Brandon Borrello', country: 'Australia' },
  { name: 'Sammy Silvera', country: 'Australia' },
  { name: 'Craig Goodwin', country: 'Australia' },

  // Paraguay
  { name: 'Roberto Fernández', country: 'Paraguay' },
  { name: 'Carlos Coronel', country: 'Paraguay' },
  { name: 'Ángel González', country: 'Paraguay' },
  { name: 'Junior Alonso', country: 'Paraguay' },
  { name: 'Gustavo Gómez', country: 'Paraguay' },
  { name: 'Omar Alderete', country: 'Paraguay' },
  { name: 'Robert Rojas', country: 'Paraguay' },
  { name: 'Fabián Balbuena', country: 'Paraguay' },
  { name: 'Juan Cáceres', country: 'Paraguay' },
  { name: 'Ronaldo Martínez', country: 'Paraguay' },
  { name: 'Andrés Cubas', country: 'Paraguay' },
  { name: 'Blas Riveros', country: 'Paraguay' },
  { name: 'Saúl Salcedo', country: 'Paraguay' },
  { name: 'Damián Bobadilla', country: 'Paraguay' },
  { name: 'Mathías Villasanti', country: 'Paraguay' },
  { name: 'Diego Gómez', country: 'Paraguay' },
  { name: 'Richard Sánchez', country: 'Paraguay' },
  { name: 'Lorenzo Melgarejo', country: 'Paraguay' },
  { name: 'Julio Enciso', country: 'Paraguay' },
  { name: 'Miguel Almirón', country: 'Paraguay' },
  { name: 'Antonio Sanabria', country: 'Paraguay' },
  { name: 'Adam Bareiro', country: 'Paraguay' },
  { name: 'Gabriel Ávalos', country: 'Paraguay' },
  { name: 'Ramón Sosa', country: 'Paraguay' },
  { name: 'Alex Arce', country: 'Paraguay' },
  { name: 'Damián Martínez', country: 'Paraguay' },

  // Turquía
  { name: 'Uğurcan Çakır', country: 'Turquía' },
  { name: 'Mert Günok', country: 'Turquía' },
  { name: 'Altay Bayındır', country: 'Turquía' },
  { name: 'Merih Demiral', country: 'Turquía' },
  { name: 'Çağlar Söyüncü', country: 'Turquía' },
  { name: 'Samet Akaydin', country: 'Turquía' },
  { name: 'Zeki Çelik', country: 'Turquía' },
  { name: 'Ferdi Kadıoğlu', country: 'Turquía' },
  { name: 'Eren Elmalı', country: 'Turquía' },
  { name: 'Mert Müldür', country: 'Turquía' },
  { name: 'Abdülkerim Bardakcı', country: 'Turquía' },
  { name: 'Kaan Ayhan', country: 'Turquía' },
  { name: 'Hakan Çalhanoğlu', country: 'Turquía' },
  { name: 'Orkun Kökçü', country: 'Turquía' },
  { name: 'İsmail Yüksek', country: 'Turquía' },
  { name: 'Salih Özcan', country: 'Turquía' },
  { name: 'Kenan Yıldız', country: 'Turquía' },
  { name: 'Arda Güler', country: 'Turquía' },
  { name: 'İrfan Can Kahveci', country: 'Turquía' },
  { name: 'Cengiz Ünder', country: 'Turquía' },
  { name: 'Kerem Aktürkoğlu', country: 'Turquía' },
  { name: 'Barış Alper Yılmaz', country: 'Turquía' },
  { name: 'Yusuf Yazıcı', country: 'Turquía' },
  { name: 'Semih Kılıçsoy', country: 'Turquía' },
  { name: 'Bertuğ Yıldırım', country: 'Turquía' },

  // Estados Unidos
  { name: 'Matt Turner', country: 'Estados Unidos' },
  { name: 'Ethan Horvath', country: 'Estados Unidos' },
  { name: 'Patrick Schulte', country: 'Estados Unidos' },
  { name: 'Sergiño Dest', country: 'Estados Unidos' },
  { name: 'Antonee Robinson', country: 'Estados Unidos' },
  { name: 'Tim Ream', country: 'Estados Unidos' },
  { name: 'Chris Richards', country: 'Estados Unidos' },
  { name: 'Cameron Carter-Vickers', country: 'Estados Unidos' },
  { name: 'Miles Robinson', country: 'Estados Unidos' },
  { name: 'Joe Scally', country: 'Estados Unidos' },
  { name: 'Mark McKenzie', country: 'Estados Unidos' },
  { name: 'Auston Trusty', country: 'Estados Unidos' },
  { name: 'DeJuan Jones', country: 'Estados Unidos' },
  { name: 'Tyler Adams', country: 'Estados Unidos' },
  { name: 'Weston McKennie', country: 'Estados Unidos' },
  { name: 'Yunus Musah', country: 'Estados Unidos' },
  { name: 'Johnny Cardoso', country: 'Estados Unidos' },
  { name: 'Luca de la Torre', country: 'Estados Unidos' },
  { name: 'Gianluca Busio', country: 'Estados Unidos' },
  { name: 'Malik Tillman', country: 'Estados Unidos' },
  { name: 'Christian Pulisic', country: 'Estados Unidos' },
  { name: 'Tim Weah', country: 'Estados Unidos' },
  { name: 'Brenden Aaronson', country: 'Estados Unidos' },
  { name: 'Giovanni Reyna', country: 'Estados Unidos' },
  { name: 'Folarin Balogun', country: 'Estados Unidos' },
  { name: 'Ricardo Pepi', country: 'Estados Unidos' },

  // Curaçao
  { name: 'Eloy Room', country: 'Curazao' },
  { name: 'Kenton Kerr', country: 'Curazao' },
  { name: 'Jairzinho Pieter', country: 'Curazao' },
  { name: 'Cuco Martina', country: 'Curazao' },
  { name: 'Bart Vriends', country: 'Curazao' },
  { name: 'Sherel Floranus', country: 'Curazao' },
  { name: 'Juriën Gaari', country: 'Curazao' },
  { name: 'Armando Obispo', country: 'Curazao' },
  { name: 'Roshon van Eijma', country: 'Curazao' },
  { name: 'Rangelo Janga', country: 'Curazao' },
  { name: 'Shermar Martina', country: 'Curazao' },
  { name: 'Brendan Schoop', country: 'Curazao' },
  { name: 'Leandro Bacuna', country: 'Curazao' },
  { name: 'Roly Bonevacia', country: 'Curazao' },
  { name: 'Jurich Carolina', country: 'Curazao' },
  { name: 'Jurgen Locadia', country: 'Curazao' },
  { name: 'Tahith Chong', country: 'Curazao' },
  { name: 'Sontje Hansen', country: 'Curazao' },
  { name: 'Kevin Felida', country: 'Curazao' },
  { name: 'Bryan Linssen', country: 'Curazao' },
  { name: 'Brandley Kuwas', country: 'Curazao' },
  { name: 'Gervane Kastaneer', country: 'Curazao' },
  { name: 'Vurnon Anita', country: 'Curazao' },
  { name: 'Ar\'jany Martha', country: 'Curazao' },
  { name: 'Anthony van den Hurk', country: 'Curazao' },
  { name: 'Livano Comenencia', country: 'Curazao' },

  // Ecuador
  { name: 'Hernán Galíndez', country: 'Ecuador' },
  { name: 'Alexander Domínguez', country: 'Ecuador' },
  { name: 'Moisés Ramírez', country: 'Ecuador' },
  { name: 'Pervis Estupiñán', country: 'Ecuador' },
  { name: 'Ángelo Preciado', country: 'Ecuador' },
  { name: 'Piero Hincapié', country: 'Ecuador' },
  { name: 'Félix Torres', country: 'Ecuador' },
  { name: 'William Pacho', country: 'Ecuador' },
  { name: 'Joel Ordóñez', country: 'Ecuador' },
  { name: 'Xavier Arreaga', country: 'Ecuador' },
  { name: 'Robert Arboleda', country: 'Ecuador' },
  { name: 'Diego Palacios', country: 'Ecuador' },
  { name: 'Moisés Caicedo', country: 'Ecuador' },
  { name: 'Alan Franco', country: 'Ecuador' },
  { name: 'Patrickson Delgado', country: 'Ecuador' },
  { name: 'Jhojan Julio', country: 'Ecuador' },
  { name: 'Kendry Páez', country: 'Ecuador' },
  { name: 'Gonzalo Plata', country: 'Ecuador' },
  { name: 'Nilson Angulo', country: 'Ecuador' },
  { name: 'Enner Valencia', country: 'Ecuador' },
  { name: 'Kevin Rodríguez', country: 'Ecuador' },
  { name: 'Jeremy Sarmiento', country: 'Ecuador' },
  { name: 'Leonardo Campana', country: 'Ecuador' },
  { name: 'John Yeboah', country: 'Ecuador' },
  { name: 'Djorkaeff Reasco', country: 'Ecuador' },
  { name: 'Ángel Mena', country: 'Ecuador' },

  // Alemania
  { name: 'Marc-André ter Stegen', country: 'Alemania' },
  { name: 'Manuel Neuer', country: 'Alemania' },
  { name: 'Oliver Baumann', country: 'Alemania' },
  { name: 'Antonio Rüdiger', country: 'Alemania' },
  { name: 'Nico Schlotterbeck', country: 'Alemania' },
  { name: 'Jonathan Tah', country: 'Alemania' },
  { name: 'Waldemar Anton', country: 'Alemania' },
  { name: 'Benjamin Henrichs', country: 'Alemania' },
  { name: 'Joshua Kimmich', country: 'Alemania' },
  { name: 'David Raum', country: 'Alemania' },
  { name: 'Maximilian Mittelstädt', country: 'Alemania' },
  { name: 'Robin Koch', country: 'Alemania' },
  { name: 'Pascal Groß', country: 'Alemania' },
  { name: 'Toni Kroos', country: 'Alemania' },
  { name: 'Ilkay Gündoğan', country: 'Alemania' },
  { name: 'Robert Andrich', country: 'Alemania' },
  { name: 'Aleksandar Pavlović', country: 'Alemania' },
  { name: 'Florian Wirtz', country: 'Alemania' },
  { name: 'Jamal Musiala', country: 'Alemania' },
  { name: 'Leroy Sané', country: 'Alemania' },
  { name: 'Kai Havertz', country: 'Alemania' },
  { name: 'Niclas Füllkrug', country: 'Alemania' },
  { name: 'Deniz Undav', country: 'Alemania' },
  { name: 'Chris Führich', country: 'Alemania' },
  { name: 'Maximilian Beier', country: 'Alemania' },
  { name: 'Thomas Müller', country: 'Alemania' },

  // Costa de Marfil
  { name: 'Yahia Fofana', country: 'Costa de Marfil' },
  { name: 'Mohamed Koné', country: 'Costa de Marfil' },
  { name: 'Badra Ali Sangaré', country: 'Costa de Marfil' },
  { name: 'Serge Aurier', country: 'Costa de Marfil' },
  { name: 'Wilfried Singo', country: 'Costa de Marfil' },
  { name: 'Ghislain Konan', country: 'Costa de Marfil' },
  { name: 'Evan Ndicka', country: 'Costa de Marfil' },
  { name: 'Odilon Kossounou', country: 'Costa de Marfil' },
  { name: 'Willy Boly', country: 'Costa de Marfil' },
  { name: 'Eric Bailly', country: 'Costa de Marfil' },
  { name: 'Ousmane Diomandé', country: 'Costa de Marfil' },
  { name: 'Sinaly Diomandé', country: 'Costa de Marfil' },
  { name: 'Boubacar Kouassi', country: 'Costa de Marfil' },
  { name: 'Franck Kessié', country: 'Costa de Marfil' },
  { name: 'Seko Fofana', country: 'Costa de Marfil' },
  { name: 'Ibrahim Sangaré', country: 'Costa de Marfil' },
  { name: 'Yves Bissouma', country: 'Costa de Marfil' },
  { name: 'Lassine Diabaté', country: 'Costa de Marfil' },
  { name: 'Hamed Junior Traorè', country: 'Costa de Marfil' },
  { name: 'Jean Michaël Seri', country: 'Costa de Marfil' },
  { name: 'Sébastien Haller', country: 'Costa de Marfil' },
  { name: 'Nicolas Pépé', country: 'Costa de Marfil' },
  { name: 'Max Gradel', country: 'Costa de Marfil' },
  { name: 'Karim Konaté', country: 'Costa de Marfil' },
  { name: 'Simon Adingra', country: 'Costa de Marfil' },
  { name: 'Jérémie Boga', country: 'Costa de Marfil' },

  // Japón
  { name: 'Zion Suzuki', country: 'Japón' },
  { name: 'Daniel Schmidt', country: 'Japón' },
  { name: 'Keisuke Osako', country: 'Japón' },
  { name: 'Ko Itakura', country: 'Japón' },
  { name: 'Takehiro Tomiyasu', country: 'Japón' },
  { name: 'Hiroki Sakai', country: 'Japón' },
  { name: 'Yukinari Sugawara', country: 'Japón' },
  { name: 'Hiroki Itō', country: 'Japón' },
  { name: 'Shogo Taniguchi', country: 'Japón' },
  { name: 'Daiki Hashioka', country: 'Japón' },
  { name: 'Seiya Maikuma', country: 'Japón' },
  { name: 'Yuto Nagatomo', country: 'Japón' },
  { name: 'Wataru Endō', country: 'Japón' },
  { name: 'Hidemasa Morita', country: 'Japón' },
  { name: 'Ao Tanaka', country: 'Japón' },
  { name: 'Daichi Kamada', country: 'Japón' },
  { name: 'Reo Hatate', country: 'Japón' },
  { name: 'Junya Itō', country: 'Japón' },
  { name: 'Kaoru Mitoma', country: 'Japón' },
  { name: 'Takefusa Kubo', country: 'Japón' },
  { name: 'Daizen Maeda', country: 'Japón' },
  { name: 'Ayase Ueda', country: 'Japón' },
  { name: 'Takuma Asano', country: 'Japón' },
  { name: 'Shuto Machino', country: 'Japón' },
  { name: 'Keito Nakamura', country: 'Japón' },
  { name: 'Mao Hosoya', country: 'Japón' },

  // Países Bajos
  { name: 'Bart Verbruggen', country: 'Países Bajos' },
  { name: 'Mark Flekken', country: 'Países Bajos' },
  { name: 'Justin Bijlow', country: 'Países Bajos' },
  { name: 'Virgil van Dijk', country: 'Países Bajos' },
  { name: 'Stefan de Vrij', country: 'Países Bajos' },
  { name: 'Matthijs de Ligt', country: 'Países Bajos' },
  { name: 'Nathan Aké', country: 'Países Bajos' },
  { name: 'Lutsharel Geertruida', country: 'Países Bajos' },
  { name: 'Daley Blind', country: 'Países Bajos' },
  { name: 'Denzel Dumfries', country: 'Países Bajos' },
  { name: 'Jeremie Frimpong', country: 'Países Bajos' },
  { name: 'Micky van de Ven', country: 'Países Bajos' },
  { name: 'Jurriën Timber', country: 'Países Bajos' },
  { name: 'Jorrel Hato', country: 'Países Bajos' },
  { name: 'Frenkie de Jong', country: 'Países Bajos' },
  { name: 'Tijjani Reijnders', country: 'Países Bajos' },
  { name: 'Ryan Gravenberch', country: 'Países Bajos' },
  { name: 'Xavi Simons', country: 'Países Bajos' },
  { name: 'Joey Veerman', country: 'Países Bajos' },
  { name: 'Quinten Timber', country: 'Países Bajos' },
  { name: 'Mats Wieffer', country: 'Países Bajos' },
  { name: 'Memphis Depay', country: 'Países Bajos' },
  { name: 'Cody Gakpo', country: 'Países Bajos' },
  { name: 'Wout Weghorst', country: 'Países Bajos' },
  { name: 'Donyell Malen', country: 'Países Bajos' },
  { name: 'Brian Brobbey', country: 'Países Bajos' },

  // Suecia
  { name: 'Robin Olsen', country: 'Suecia' },
  { name: 'Kristoffer Nordfeldt', country: 'Suecia' },
  { name: 'Viktor Johansson', country: 'Suecia' },
  { name: 'Victor Lindelöf', country: 'Suecia' },
  { name: 'Isak Hien', country: 'Suecia' },
  { name: 'Gabriel Gudmundsson', country: 'Suecia' },
  { name: 'Emil Krafth', country: 'Suecia' },
  { name: 'Daniel Svensson', country: 'Suecia' },
  { name: 'Hjalmar Ekdal', country: 'Suecia' },
  { name: 'Linus Wahlqvist', country: 'Suecia' },
  { name: 'Carl Starfelt', country: 'Suecia' },
  { name: 'Joakim Nilsson', country: 'Suecia' },
  { name: 'Albin Ekdal', country: 'Suecia' },
  { name: 'Mattias Svanberg', country: 'Suecia' },
  { name: 'Yasin Ayari', country: 'Suecia' },
  { name: 'Jens Cajuste', country: 'Suecia' },
  { name: 'Jesper Karlsson', country: 'Suecia' },
  { name: 'Anthony Elanga', country: 'Suecia' },
  { name: 'Dejan Kulusevski', country: 'Suecia' },
  { name: 'Hugo Larsson', country: 'Suecia' },
  { name: 'Alexander Isak', country: 'Suecia' },
  { name: 'Viktor Gyökeres', country: 'Suecia' },
  { name: 'Marcus Berg', country: 'Suecia' },
  { name: 'Lucas Bergvall', country: 'Suecia' },
  { name: 'Emil Forsberg', country: 'Suecia' },
  { name: 'Jordan Larsson', country: 'Suecia' },

  // Túnez
  { name: 'Aymen Dahmen', country: 'Túnez' },
  { name: 'Bechir Ben Saïd', country: 'Túnez' },
  { name: 'Mouez Hassen', country: 'Túnez' },
  { name: 'Mohamed Dräger', country: 'Túnez' },
  { name: 'Ali Abdi', country: 'Túnez' },
  { name: 'Yan Valery', country: 'Túnez' },
  { name: 'Montassar Talbi', country: 'Túnez' },
  { name: 'Dylan Bronn', country: 'Túnez' },
  { name: 'Yassine Meriah', country: 'Túnez' },
  { name: 'Nader Ghandri', country: 'Túnez' },
  { name: 'Wajdi Kechrida', country: 'Túnez' },
  { name: 'Rami Kaib', country: 'Túnez' },
  { name: 'Aïssa Laïdouni', country: 'Túnez' },
  { name: 'Ellyes Skhiri', country: 'Túnez' },
  { name: 'Ferjani Sassi', country: 'Túnez' },
  { name: 'Hannibal Mejbri', country: 'Túnez' },
  { name: 'Mohamed Ali Ben Romdhane', country: 'Túnez' },
  { name: 'Anis Ben Slimane', country: 'Túnez' },
  { name: 'Naïm Sliti', country: 'Túnez' },
  { name: 'Wahbi Khazri', country: 'Túnez' },
  { name: 'Youssef Msakni', country: 'Túnez' },
  { name: 'Issam Jebali', country: 'Túnez' },
  { name: 'Seifeddine Jaziri', country: 'Túnez' },
  { name: 'Taha Yassine Khenissi', country: 'Túnez' },
  { name: 'Elias Achouri', country: 'Túnez' },
  { name: 'Hazem Mastouri', country: 'Túnez' },

  // Bélgica
  { name: 'Koen Casteels', country: 'Bélgica' },
  { name: 'Matz Sels', country: 'Bélgica' },
  { name: 'Thomas Kaminski', country: 'Bélgica' },
  { name: 'Jan Vertonghen', country: 'Bélgica' },
  { name: 'Wout Faes', country: 'Bélgica' },
  { name: 'Arthur Theate', country: 'Bélgica' },
  { name: 'Zeno Debast', country: 'Bélgica' },
  { name: 'Maxim De Cuyper', country: 'Bélgica' },
  { name: 'Timothy Castagne', country: 'Bélgica' },
  { name: 'Thomas Meunier', country: 'Bélgica' },
  { name: 'Sebastiaan Bornauw', country: 'Bélgica' },
  { name: 'Ameen Al-Dakhil', country: 'Bélgica' },
  { name: 'Kevin De Bruyne', country: 'Bélgica' },
  { name: 'Youri Tielemans', country: 'Bélgica' },
  { name: 'Amadou Onana', country: 'Bélgica' },
  { name: 'Orel Mangala', country: 'Bélgica' },
  { name: 'Arthur Vermeeren', country: 'Bélgica' },
  { name: 'Leandro Trossard', country: 'Bélgica' },
  { name: 'Jérémy Doku', country: 'Bélgica' },
  { name: 'Charles De Ketelaere', country: 'Bélgica' },
  { name: 'Romelu Lukaku', country: 'Bélgica' },
  { name: 'Loïs Openda', country: 'Bélgica' },
  { name: 'Dodi Lukebakio', country: 'Bélgica' },
  { name: 'Yannick Carrasco', country: 'Bélgica' },
  { name: 'Johan Bakayoko', country: 'Bélgica' },
  { name: 'Michy Batshuayi', country: 'Bélgica' },

  // Egipto
  { name: 'Mohamed El Shenawy', country: 'Egipto' },
  { name: 'Mohamed Sobhy', country: 'Egipto' },
  { name: 'Mohamed Abou Gabal', country: 'Egipto' },
  { name: 'Ahmed Hegazi', country: 'Egipto' },
  { name: 'Mahmoud Hamdy', country: 'Egipto' },
  { name: 'Mohamed Abdelmonem', country: 'Egipto' },
  { name: 'Omar Kamal', country: 'Egipto' },
  { name: 'Mohamed Hany', country: 'Egipto' },
  { name: 'Ahmed Fatouh', country: 'Egipto' },
  { name: 'Yasser Ibrahim', country: 'Egipto' },
  { name: 'Ahmed Sayed', country: 'Egipto' },
  { name: 'Karim Fouad', country: 'Egipto' },
  { name: 'Mohamed Elneny', country: 'Egipto' },
  { name: 'Hamdi Fathi', country: 'Egipto' },
  { name: 'Tarek Hamed', country: 'Egipto' },
  { name: 'Akram Tawfik', country: 'Egipto' },
  { name: 'Emam Ashour', country: 'Egipto' },
  { name: 'Mostafa Mohamed', country: 'Egipto' },
  { name: 'Trezeguet', country: 'Egipto' },
  { name: 'Marwan Attia', country: 'Egipto' },
  { name: 'Mohamed Salah', country: 'Egipto' },
  { name: 'Omar Marmoush', country: 'Egipto' },
  { name: 'Mostafa Fathi', country: 'Egipto' },
  { name: 'Ibrahim Adel', country: 'Egipto' },
  { name: 'Ahmed Sayed Zizo', country: 'Egipto' },
  { name: 'Hossam Hassan', country: 'Egipto' },

  // Irán
  { name: 'Alireza Beiranvand', country: 'Irán' },
  { name: 'Amir Abedzadeh', country: 'Irán' },
  { name: 'Payam Niazmand', country: 'Irán' },
  { name: 'Sadegh Moharrami', country: 'Irán' },
  { name: 'Ehsan Hajsafi', country: 'Irán' },
  { name: 'Milad Mohammadi', country: 'Irán' },
  { name: 'Shojae Khalilzadeh', country: 'Irán' },
  { name: 'Morteza Pouraliganji', country: 'Irán' },
  { name: 'Majid Hosseini', country: 'Irán' },
  { name: 'Aref Gholami', country: 'Irán' },
  { name: 'Hossein Kanaani', country: 'Irán' },
  { name: 'Ramin Rezaeian', country: 'Irán' },
  { name: 'Saeid Ezatolahi', country: 'Irán' },
  { name: 'Ahmad Nourollahi', country: 'Irán' },
  { name: 'Saman Ghoddos', country: 'Irán' },
  { name: 'Alireza Jahanbakhsh', country: 'Irán' },
  { name: 'Mehdi Torabi', country: 'Irán' },
  { name: 'Ali Karimi', country: 'Irán' },
  { name: 'Mohammad Mohebi', country: 'Irán' },
  { name: 'Soroush Rafiei', country: 'Irán' },
  { name: 'Mehdi Taremi', country: 'Irán' },
  { name: 'Sardar Azmoun', country: 'Irán' },
  { name: 'Karim Ansarifard', country: 'Irán' },
  { name: 'Ali Gholizadeh', country: 'Irán' },
  { name: 'Allahyar Sayyadmanesh', country: 'Irán' },
  { name: 'Shahab Zahedi', country: 'Irán' },

  // Nueva Zelanda
  { name: 'Oliver Sail', country: 'Nueva Zelanda' },
  { name: 'Alex Paulsen', country: 'Nueva Zelanda' },
  { name: 'Max Crocombe', country: 'Nueva Zelanda' },
  { name: 'Michael Boxall', country: 'Nueva Zelanda' },
  { name: 'Tyler Bindon', country: 'Nueva Zelanda' },
  { name: 'Nando Pijnaker', country: 'Nueva Zelanda' },
  { name: 'Liberato Cacace', country: 'Nueva Zelanda' },
  { name: 'Tim Payne', country: 'Nueva Zelanda' },
  { name: 'Francis de Vries', country: 'Nueva Zelanda' },
  { name: 'Finn Surman', country: 'Nueva Zelanda' },
  { name: 'Dane Ingham', country: 'Nueva Zelanda' },
  { name: 'Bill Tuiloma', country: 'Nueva Zelanda' },
  { name: 'Joe Bell', country: 'Nueva Zelanda' },
  { name: 'Marko Stamenić', country: 'Nueva Zelanda' },
  { name: 'Matthew Garbett', country: 'Nueva Zelanda' },
  { name: 'Ben Old', country: 'Nueva Zelanda' },
  { name: 'Sarpreet Singh', country: 'Nueva Zelanda' },
  { name: 'Callum McCowatt', country: 'Nueva Zelanda' },
  { name: 'Alex Greive', country: 'Nueva Zelanda' },
  { name: 'Elijah Just', country: 'Nueva Zelanda' },
  { name: 'Chris Wood', country: 'Nueva Zelanda' },
  { name: 'Kosta Barbarouses', country: 'Nueva Zelanda' },
  { name: 'Logan Rogerson', country: 'Nueva Zelanda' },
  { name: 'Eli Just', country: 'Nueva Zelanda' },
  { name: 'Storm Roux', country: 'Nueva Zelanda' },
  { name: 'Matthew Conroy', country: 'Nueva Zelanda' },

  // Cabo Verde
  { name: 'Vozinha', country: 'Cabo Verde' },
  { name: 'Márcio Rosa', country: 'Cabo Verde' },
  { name: 'Bruno Varela', country: 'Cabo Verde' },
  { name: 'Stopira', country: 'Cabo Verde' },
  { name: 'Diney Borges', country: 'Cabo Verde' },
  { name: 'Roberto Lopes', country: 'Cabo Verde' },
  { name: 'Logan Costa', country: 'Cabo Verde' },
  { name: 'Sidny Cabral', country: 'Cabo Verde' },
  { name: 'Steven Moreira', country: 'Cabo Verde' },
  { name: 'Jeffry Fortes', country: 'Cabo Verde' },
  { name: 'Diego Souza', country: 'Cabo Verde' },
  { name: 'Kevin Pina', country: 'Cabo Verde' },
  { name: 'Kenny Rocha', country: 'Cabo Verde' },
  { name: 'Laros Duarte', country: 'Cabo Verde' },
  { name: 'Patrick Andrade', country: 'Cabo Verde' },
  { name: 'Pedro Brito', country: 'Cabo Verde' },
  { name: 'Telmo Arcanjo', country: 'Cabo Verde' },
  { name: 'Ryan Mendes', country: 'Cabo Verde' },
  { name: 'Garry Rodrigues', country: 'Cabo Verde' },
  { name: 'Yannick Semedo', country: 'Cabo Verde' },
  { name: 'Jovane Cabral', country: 'Cabo Verde' },
  { name: 'Bebé', country: 'Cabo Verde' },
  { name: 'Júlio Tavares', country: 'Cabo Verde' },
  { name: 'Gilson Tavares', country: 'Cabo Verde' },
  { name: 'Willy Semedo', country: 'Cabo Verde' },
  { name: 'Dailon Livramento', country: 'Cabo Verde' },

  // Arabia Saudí
  { name: 'Mohammed Al-Owais', country: 'Arabia Saudí' },
  { name: 'Nawaf Al-Aqidi', country: 'Arabia Saudí' },
  { name: 'Ahmed Al-Kassar', country: 'Arabia Saudí' },
  { name: 'Saud Abdulhamid', country: 'Arabia Saudí' },
  { name: 'Yasser Al-Shahrani', country: 'Arabia Saudí' },
  { name: 'Sultan Al-Ghannam', country: 'Arabia Saudí' },
  { name: 'Ali Al-Bulaihi', country: 'Arabia Saudí' },
  { name: 'Hassan Tambakti', country: 'Arabia Saudí' },
  { name: 'Abdulelah Al-Amri', country: 'Arabia Saudí' },
  { name: 'Mohammed Al-Breik', country: 'Arabia Saudí' },
  { name: 'Ahmed Bamsaud', country: 'Arabia Saudí' },
  { name: 'Ali Lajami', country: 'Arabia Saudí' },
  { name: 'Salem Al-Dawsari', country: 'Arabia Saudí' },
  { name: 'Mohamed Kanno', country: 'Arabia Saudí' },
  { name: 'Abdullah Otayf', country: 'Arabia Saudí' },
  { name: 'Nasser Al-Dawsari', country: 'Arabia Saudí' },
  { name: 'Abdulrahman Ghareeb', country: 'Arabia Saudí' },
  { name: 'Hattan Bahebri', country: 'Arabia Saudí' },
  { name: 'Riyadh Sharahili', country: 'Arabia Saudí' },
  { name: 'Salman Al-Faraj', country: 'Arabia Saudí' },
  { name: 'Saleh Al-Shehri', country: 'Arabia Saudí' },
  { name: 'Firas Al-Buraikan', country: 'Arabia Saudí' },
  { name: 'Abdullah Al-Hamdan', country: 'Arabia Saudí' },
  { name: 'Haitham Asiri', country: 'Arabia Saudí' },
  { name: 'Abdullah Radif', country: 'Arabia Saudí' },
  { name: 'Musab Al-Juwayr', country: 'Arabia Saudí' },

  // España
  { name: 'Unai Simón', country: 'España' },
  { name: 'David Raya', country: 'España' },
  { name: 'Álex Remiro', country: 'España' },
  { name: 'Dani Carvajal', country: 'España' },
  { name: 'Pau Cubarsí', country: 'España' },
  { name: 'Aymeric Laporte', country: 'España' },
  { name: 'Robin Le Normand', country: 'España' },
  { name: 'Dean Huijsen', country: 'España' },
  { name: 'Marc Cucurella', country: 'España' },
  { name: 'Pedro Porro', country: 'España' },
  { name: 'Alejandro Grimaldo', country: 'España' },
  { name: 'Jesús Navas', country: 'España' },
  { name: 'Daniel Vivian', country: 'España' },
  { name: 'Rodri', country: 'España' },
  { name: 'Pedri', country: 'España' },
  { name: 'Mikel Merino', country: 'España' },
  { name: 'Fabián Ruiz', country: 'España' },
  { name: 'Aleix García', country: 'España' },
  { name: 'Gavi', country: 'España' },
  { name: 'Fermín López', country: 'España' },
  { name: 'Lamine Yamal', country: 'España' },
  { name: 'Nico Williams', country: 'España' },
  { name: 'Dani Olmo', country: 'España' },
  { name: 'Álvaro Morata', country: 'España' },
  { name: 'Álex Baena', country: 'España' },
  { name: 'Mikel Oyarzabal', country: 'España' },
  { name: 'Adrian Zurdito Garcia', country: 'España' },

  // Uruguay
  { name: 'Sergio Rochet', country: 'Uruguay' },
  { name: 'Santiago Mele', country: 'Uruguay' },
  { name: 'Franco Israel', country: 'Uruguay' },
  { name: 'Ronald Araújo', country: 'Uruguay' },
  { name: 'José María Giménez', country: 'Uruguay' },
  { name: 'Sebastián Cáceres', country: 'Uruguay' },
  { name: 'Mathías Olivera', country: 'Uruguay' },
  { name: 'Nahitan Nández', country: 'Uruguay' },
  { name: 'Guillermo Varela', country: 'Uruguay' },
  { name: 'Joaquín Piquerez', country: 'Uruguay' },
  { name: 'Santiago Bueno', country: 'Uruguay' },
  { name: 'Bruno Méndez', country: 'Uruguay' },
  { name: 'Fede Valverde', country: 'Uruguay' },
  { name: 'Manuel Ugarte', country: 'Uruguay' },
  { name: 'Rodrigo Bentancur', country: 'Uruguay' },
  { name: 'Nicolás de la Cruz', country: 'Uruguay' },
  { name: 'Giorgian de Arrascaeta', country: 'Uruguay' },
  { name: 'Maximiliano Araújo', country: 'Uruguay' },
  { name: 'Facundo Pellistri', country: 'Uruguay' },
  { name: 'Darwin Núñez', country: 'Uruguay' },
  { name: 'Maximiliano Gómez', country: 'Uruguay' },
  { name: 'Agustín Canobbio', country: 'Uruguay' },
  { name: 'Brian Rodríguez', country: 'Uruguay' },
  { name: 'Cristian Olivera', country: 'Uruguay' },
  { name: 'Luciano Rodríguez', country: 'Uruguay' },
  { name: 'Facundo Torres', country: 'Uruguay' },
  { name: 'Beatriz Jefa Perez', country: 'Uruguay' },

  // Francia
  { name: 'Mike Maignan', country: 'Francia' },
  { name: 'Brice Samba', country: 'Francia' },
  { name: 'Lucas Chevalier', country: 'Francia' },
  { name: 'Jules Koundé', country: 'Francia' },
  { name: 'William Saliba', country: 'Francia' },
  { name: 'Ibrahima Konaté', country: 'Francia' },
  { name: 'Dayot Upamecano', country: 'Francia' },
  { name: 'Theo Hernández', country: 'Francia' },
  { name: 'Lucas Hernández', country: 'Francia' },
  { name: 'Benjamin Pavard', country: 'Francia' },
  { name: 'Jonathan Clauss', country: 'Francia' },
  { name: 'Wesley Fofana', country: 'Francia' },
  { name: 'Castello Lukeba', country: 'Francia' },
  { name: 'Aurélien Tchouaméni', country: 'Francia' },
  { name: 'Eduardo Camavinga', country: 'Francia' },
  { name: 'Adrien Rabiot', country: 'Francia' },
  { name: 'Warren Zaïre-Emery', country: 'Francia' },
  { name: 'Youssouf Fofana', country: 'Francia' },
  { name: 'N\'Golo Kanté', country: 'Francia' },
  { name: 'Manu Koné', country: 'Francia' },
  { name: 'Kylian Mbappé', country: 'Francia' },
  { name: 'Ousmane Dembélé', country: 'Francia' },
  { name: 'Marcus Thuram', country: 'Francia' },
  { name: 'Michael Olise', country: 'Francia' },
  { name: 'Bradley Barcola', country: 'Francia' },
  { name: 'Désiré Doué', country: 'Francia' },

  // Irak
  { name: 'Jalal Hassan', country: 'Irak' },
  { name: 'Fahad Talib', country: 'Irak' },
  { name: 'Ahmed Basil', country: 'Irak' },
  { name: 'Hussein Ali', country: 'Irak' },
  { name: 'Merchas Doski', country: 'Irak' },
  { name: 'Zaid Tahseen', country: 'Irak' },
  { name: 'Saad Natiq', country: 'Irak' },
  { name: 'Ahmed Yahya', country: 'Irak' },
  { name: 'Manaf Younus', country: 'Irak' },
  { name: 'Akam Hashim', country: 'Irak' },
  { name: 'Frans Putros', country: 'Irak' },
  { name: 'Mustafa Nadhim', country: 'Irak' },
  { name: 'Ibrahim Bayesh', country: 'Irak' },
  { name: 'Amir Al-Ammari', country: 'Irak' },
  { name: 'Osama Rashid', country: 'Irak' },
  { name: 'Bashar Resan', country: 'Irak' },
  { name: 'Sherko Karim', country: 'Irak' },
  { name: 'Hussein Jabbar', country: 'Irak' },
  { name: 'Yousif Amyn', country: 'Irak' },
  { name: 'Zidane Iqbal', country: 'Irak' },
  { name: 'Aymen Hussein', country: 'Irak' },
  { name: 'Ali Al-Hamadi', country: 'Irak' },
  { name: 'Mohanad Ali', country: 'Irak' },
  { name: 'Hussein Ali Saeed', country: 'Irak' },
  { name: 'Mohammed Qasim', country: 'Irak' },
  { name: 'Hassan Abdulkareem', country: 'Irak' },

  // Noruega
  { name: 'Ørjan Nyland', country: 'Noruega' },
  { name: 'Egil Selvik', country: 'Noruega' },
  { name: 'Sten Grytebust', country: 'Noruega' },
  { name: 'Stefan Strandberg', country: 'Noruega' },
  { name: 'Leo Østigård', country: 'Noruega' },
  { name: 'Kristoffer Ajer', country: 'Noruega' },
  { name: 'Marcus Holmgren Pedersen', country: 'Noruega' },
  { name: 'Birger Meling', country: 'Noruega' },
  { name: 'Andreas Hanche-Olsen', country: 'Noruega' },
  { name: 'Julian Ryerson', country: 'Noruega' },
  { name: 'Fredrik André Bjørkan', country: 'Noruega' },
  { name: 'David Møller Wolfe', country: 'Noruega' },
  { name: 'Sander Berge', country: 'Noruega' },
  { name: 'Morten Thorsby', country: 'Noruega' },
  { name: 'Patrick Berg', country: 'Noruega' },
  { name: 'Fredrik Aursnes', country: 'Noruega' },
  { name: 'Mathias Normann', country: 'Noruega' },
  { name: 'Antonio Nusa', country: 'Noruega' },
  { name: 'Oscar Bobb', country: 'Noruega' },
  { name: 'Kristian Thorstvedt', country: 'Noruega' },
  { name: 'Erling Haaland', country: 'Noruega' },
  { name: 'Martin Ødegaard', country: 'Noruega' },
  { name: 'Alexander Sørloth', country: 'Noruega' },
  { name: 'Jørgen Strand Larsen', country: 'Noruega' },
  { name: 'Ola Solbakken', country: 'Noruega' },
  { name: 'Mohamed Elyounoussi', country: 'Noruega' },

  // Senegal
  { name: 'Édouard Mendy', country: 'Senegal' },
  { name: 'Seny Dieng', country: 'Senegal' },
  { name: 'Mory Diaw', country: 'Senegal' },
  { name: 'Kalidou Koulibaly', country: 'Senegal' },
  { name: 'Abdou Diallo', country: 'Senegal' },
  { name: 'Moussa Niakhaté', country: 'Senegal' },
  { name: 'Formose Mendy', country: 'Senegal' },
  { name: 'Ismail Jakobs', country: 'Senegal' },
  { name: 'Krépin Diatta', country: 'Senegal' },
  { name: 'Youssouf Sabaly', country: 'Senegal' },
  { name: 'El Hadji Malick Diouf', country: 'Senegal' },
  { name: 'Antoine Mendy', country: 'Senegal' },
  { name: 'Idrissa Gana Gueye', country: 'Senegal' },
  { name: 'Pape Matar Sarr', country: 'Senegal' },
  { name: 'Nampalys Mendy', country: 'Senegal' },
  { name: 'Pape Gueye', country: 'Senegal' },
  { name: 'Lamine Camara', country: 'Senegal' },
  { name: 'Pathé Ciss', country: 'Senegal' },
  { name: 'Iliman Ndiaye', country: 'Senegal' },
  { name: 'Habib Diarra', country: 'Senegal' },
  { name: 'Sadio Mané', country: 'Senegal' },
  { name: 'Ismaïla Sarr', country: 'Senegal' },
  { name: 'Boulaye Dia', country: 'Senegal' },
  { name: 'Nicolas Jackson', country: 'Senegal' },
  { name: 'Habib Diallo', country: 'Senegal' },
  { name: 'Chérif Ndiaye', country: 'Senegal' },

  // Argelia
  { name: 'Raïs M\'Bolhi', country: 'Argelia' },
  { name: 'Anthony Mandrea', country: 'Argelia' },
  { name: 'Alexis Guendouz', country: 'Argelia' },
  { name: 'Aïssa Mandi', country: 'Argelia' },
  { name: 'Ramy Bensebaini', country: 'Argelia' },
  { name: 'Youcef Atal', country: 'Argelia' },
  { name: 'Mohamed Farès', country: 'Argelia' },
  { name: 'Rayan Aït-Nouri', country: 'Argelia' },
  { name: 'Djamel Benlamri', country: 'Argelia' },
  { name: 'Hocine Benayada', country: 'Argelia' },
  { name: 'Mohamed-Amine Tougaï', country: 'Argelia' },
  { name: 'Houssem Aouar', country: 'Argelia' },
  { name: 'Ismaël Bennacer', country: 'Argelia' },
  { name: 'Nabil Bentaleb', country: 'Argelia' },
  { name: 'Adam Ounas', country: 'Argelia' },
  { name: 'Adam Zorgane', country: 'Argelia' },
  { name: 'Sofiane Feghouli', country: 'Argelia' },
  { name: 'Yacine Brahimi', country: 'Argelia' },
  { name: 'Saïd Benrahma', country: 'Argelia' },
  { name: 'Rachid Ghezzal', country: 'Argelia' },
  { name: 'Riyad Mahrez', country: 'Argelia' },
  { name: 'Islam Slimani', country: 'Argelia' },
  { name: 'Baghdad Bounedjah', country: 'Argelia' },
  { name: 'Amine Gouiri', country: 'Argelia' },
  { name: 'Mohamed Amoura', country: 'Argelia' },
  { name: 'Andy Delort', country: 'Argelia' },
  // Argentina
  { name: 'Emiliano Martínez', country: 'Argentina' },
  { name: 'Gerónimo Rulli', country: 'Argentina' },
  { name: 'Walter Benítez', country: 'Argentina' },
  { name: 'Cristian Romero', country: 'Argentina' },
  { name: 'Nicolás Otamendi', country: 'Argentina' },
  { name: 'Lisandro Martínez', country: 'Argentina' },
  { name: 'Nahuel Molina', country: 'Argentina' },
  { name: 'Marcos Acuña', country: 'Argentina' },
  { name: 'Nicolás Tagliafico', country: 'Argentina' },
  { name: 'Gonzalo Montiel', country: 'Argentina' },
  { name: 'Germán Pezzella', country: 'Argentina' },
  { name: 'Leonardo Balerdi', country: 'Argentina' },
  { name: 'Valentín Barco', country: 'Argentina' },
  { name: 'Rodrigo De Paul', country: 'Argentina' },
  { name: 'Leandro Paredes', country: 'Argentina' },
  { name: 'Enzo Fernández', country: 'Argentina' },
  { name: 'Alexis Mac Allister', country: 'Argentina' },
  { name: 'Exequiel Palacios', country: 'Argentina' },
  { name: 'Giovani Lo Celso', country: 'Argentina' },
  { name: 'Thiago Almada', country: 'Argentina' },
  { name: 'Lionel Messi', country: 'Argentina' },
  { name: 'Lautaro Martínez', country: 'Argentina' },
  { name: 'Julián Álvarez', country: 'Argentina' },
  { name: 'Ángel Di María', country: 'Argentina' },
  { name: 'Nicolás González', country: 'Argentina' },
  { name: 'Giuliano Simeone', country: 'Argentina' },

  // Austria
  { name: 'Patrick Pentz', country: 'Austria' },
  { name: 'Heinz Lindner', country: 'Austria' },
  { name: 'Niklas Hedl', country: 'Austria' },
  { name: 'David Alaba', country: 'Austria' },
  { name: 'Maximilian Wöber', country: 'Austria' },
  { name: 'Kevin Danso', country: 'Austria' },
  { name: 'Philipp Lienhart', country: 'Austria' },
  { name: 'Stefan Posch', country: 'Austria' },
  { name: 'Phillipp Mwene', country: 'Austria' },
  { name: 'Andreas Ulmer', country: 'Austria' },
  { name: 'Flavius Daniliuc', country: 'Austria' },
  { name: 'Leopold Querfeld', country: 'Austria' },
  { name: 'Marcel Sabitzer', country: 'Austria' },
  { name: 'Konrad Laimer', country: 'Austria' },
  { name: 'Florian Grillitsch', country: 'Austria' },
  { name: 'Nicolas Seiwald', country: 'Austria' },
  { name: 'Christoph Baumgartner', country: 'Austria' },
  { name: 'Patrick Wimmer', country: 'Austria' },
  { name: 'Romano Schmid', country: 'Austria' },
  { name: 'Marko Arnautović', country: 'Austria' },
  { name: 'Michael Gregoritsch', country: 'Austria' },
  { name: 'Maximilian Entrup', country: 'Austria' },
  { name: 'Junior Adamu', country: 'Austria' },
  { name: 'Karim Onisiwo', country: 'Austria' },
  { name: 'Andreas Weimann', country: 'Austria' },
  { name: 'Sasa Kalajdzic', country: 'Austria' },

  // Jordania
  { name: 'Yazeed Abulaila', country: 'Jordania' },
  { name: 'Abdullah Al-Fakhouri', country: 'Jordania' },
  { name: 'Suleiman Al-Faraj', country: 'Jordania' },
  { name: 'Bara\'a Marei', country: 'Jordania' },
  { name: 'Salem Al-Ajalin', country: 'Jordania' },
  { name: 'Yazan Al-Arab', country: 'Jordania' },
  { name: 'Abdallah Nasib', country: 'Jordania' },
  { name: 'Ihsan Haddad', country: 'Jordania' },
  { name: 'Ehsan Haddad', country: 'Jordania' },
  { name: 'Feras Shelbaieh', country: 'Jordania' },
  { name: 'Mahmoud Al-Mardi', country: 'Jordania' },
  { name: 'Saleh Rateb', country: 'Jordania' },
  { name: 'Noor Al-Rawabdeh', country: 'Jordania' },
  { name: 'Nizar Al-Rashdan', country: 'Jordania' },
  { name: 'Mahmoud Al-Mawas', country: 'Jordania' },
  { name: 'Rajaei Ayed', country: 'Jordania' },
  { name: 'Yazan Al-Naimat', country: 'Jordania' },
  { name: 'Mousa Al-Tamari', country: 'Jordania' },
  { name: 'Ali Olwan', country: 'Jordania' },
  { name: 'Anas Al-Awadat', country: 'Jordania' },
  { name: 'Mohammad Abu Hasheesh', country: 'Jordania' },
  { name: 'Hamza Al-Dardour', country: 'Jordania' },
  { name: 'Yousef Abu Jalbush', country: 'Jordania' },
  { name: 'Mohanad Abu Taha', country: 'Jordania' },
  { name: 'Mahmoud Al-Naber', country: 'Jordania' },
  { name: 'Ali Al-Mahmoud', country: 'Jordania' },

  // Colombia
  { name: 'David Ospina', country: 'Colombia' },
  { name: 'Camilo Vargas', country: 'Colombia' },
  { name: 'Álvaro Montero', country: 'Colombia' },
  { name: 'Daniel Muñoz', country: 'Colombia' },
  { name: 'Santiago Arias', country: 'Colombia' },
  { name: 'Davinson Sánchez', country: 'Colombia' },
  { name: 'Yerry Mina', country: 'Colombia' },
  { name: 'Jhon Lucumí', country: 'Colombia' },
  { name: 'Carlos Cuesta', country: 'Colombia' },
  { name: 'Johan Mojica', country: 'Colombia' },
  { name: 'Deiver Machado', country: 'Colombia' },
  { name: 'Cristian Borja', country: 'Colombia' },
  { name: 'Jefferson Lerma', country: 'Colombia' },
  { name: 'Richard Ríos', country: 'Colombia' },
  { name: 'Mateus Uribe', country: 'Colombia' },
  { name: 'James Rodríguez', country: 'Colombia' },
  { name: 'Juan Fernando Quintero', country: 'Colombia' },
  { name: 'Yaser Asprilla', country: 'Colombia' },
  { name: 'Kevin Castaño', country: 'Colombia' },
  { name: 'Jorge Carrascal', country: 'Colombia' },
  { name: 'Luis Díaz', country: 'Colombia' },
  { name: 'Jhon Arias', country: 'Colombia' },
  { name: 'Luis Sinisterra', country: 'Colombia' },
  { name: 'Jhon Córdoba', country: 'Colombia' },
  { name: 'Rafael Santos Borré', country: 'Colombia' },
  { name: 'Jhon Durán', country: 'Colombia' },

  // RD del Congo
  { name: 'Lionel Mpasi', country: 'RD del Congo' },
  { name: 'Timothy Fayulu', country: 'RD del Congo' },
  { name: 'Dimitry Bertaud', country: 'RD del Congo' },
  { name: 'Chancel Mbemba', country: 'RD del Congo' },
  { name: 'Gédéon Kalulu', country: 'RD del Congo' },
  { name: 'Arthur Masuaku', country: 'RD del Congo' },
  { name: 'Henock Inonga', country: 'RD del Congo' },
  { name: 'Aaron Tshibola', country: 'RD del Congo' },
  { name: 'Axel Tuanzebe', country: 'RD del Congo' },
  { name: 'Rocky Bushiri', country: 'RD del Congo' },
  { name: 'Ngal\'ayel Mukau', country: 'RD del Congo' },
  { name: 'Joris Kayembe', country: 'RD del Congo' },
  { name: 'Samuel Moutoussamy', country: 'RD del Congo' },
  { name: 'Charles Pickel', country: 'RD del Congo' },
  { name: 'Edo Kayembe', country: 'RD del Congo' },
  { name: 'Théo Bongonda', country: 'RD del Congo' },
  { name: 'Gaël Kakuta', country: 'RD del Congo' },
  { name: 'Yoane Wissa', country: 'RD del Congo' },
  { name: 'Cédric Bakambu', country: 'RD del Congo' },
  { name: 'Silas Katompa Mvumpa', country: 'RD del Congo' },
  { name: 'Fiston Mayele', country: 'RD del Congo' },
  { name: 'Meschack Elia', country: 'RD del Congo' },
  { name: 'Simon Banza', country: 'RD del Congo' },
  { name: 'Grady Diangana', country: 'RD del Congo' },
  { name: 'Dylan Batubinsika', country: 'RD del Congo' },
  { name: 'Noah Sadiki', country: 'RD del Congo' },

  // Portugal
  { name: 'Diogo Costa', country: 'Portugal' },
  { name: 'Rui Patrício', country: 'Portugal' },
  { name: 'José Sá', country: 'Portugal' },
  { name: 'Rúben Dias', country: 'Portugal' },
  { name: 'Pepe', country: 'Portugal' },
  { name: 'António Silva', country: 'Portugal' },
  { name: 'Gonçalo Inácio', country: 'Portugal' },
  { name: 'Diogo Dalot', country: 'Portugal' },
  { name: 'Nuno Mendes', country: 'Portugal' },
  { name: 'João Cancelo', country: 'Portugal' },
  { name: 'Nélson Semedo', country: 'Portugal' },
  { name: 'Danilo Pereira', country: 'Portugal' },
  { name: 'Renato Veiga', country: 'Portugal' },
  { name: 'Bruno Fernandes', country: 'Portugal' },
  { name: 'Bernardo Silva', country: 'Portugal' },
  { name: 'Vitinha', country: 'Portugal' },
  { name: 'João Neves', country: 'Portugal' },
  { name: 'Rúben Neves', country: 'Portugal' },
  { name: 'João Palhinha', country: 'Portugal' },
  { name: 'Otávio', country: 'Portugal' },
  { name: 'Cristiano Ronaldo', country: 'Portugal' },
  { name: 'Rafael Leão', country: 'Portugal' },
  { name: 'Pedro Neto', country: 'Portugal' },
  { name: 'Gonçalo Ramos', country: 'Portugal' },
  { name: 'João Félix', country: 'Portugal' },
  { name: 'Francisco Conceição', country: 'Portugal' },

  // Uzbekistán
  { name: 'Utkir Yusupov', country: 'Uzbekistán' },
  { name: 'Abduvohid Nematov', country: 'Uzbekistán' },
  { name: 'Vladimir Nazarov', country: 'Uzbekistán' },
  { name: 'Abdukodir Khusanov', country: 'Uzbekistán' },
  { name: 'Rustamjon Ashurmatov', country: 'Uzbekistán' },
  { name: 'Akmal Mozgovoy', country: 'Uzbekistán' },
  { name: 'Sherzod Nasrullaev', country: 'Uzbekistán' },
  { name: 'Khojiakbar Alijonov', country: 'Uzbekistán' },
  { name: 'Farrukh Sayfiev', country: 'Uzbekistán' },
  { name: 'Umar Eshmurodov', country: 'Uzbekistán' },
  { name: 'Egor Krimets', country: 'Uzbekistán' },
  { name: 'Anvarjon Fayzullaev', country: 'Uzbekistán' },
  { name: 'Otabek Shukurov', country: 'Uzbekistán' },
  { name: 'Jaloliddin Masharipov', country: 'Uzbekistán' },
  { name: 'Azizbek Turgunboev', country: 'Uzbekistán' },
  { name: 'Abbosbek Fayzullaev', country: 'Uzbekistán' },
  { name: 'Abdurauf Buriev', country: 'Uzbekistán' },
  { name: 'Oston Urunov', country: 'Uzbekistán' },
  { name: 'Jasurbek Yakhshiboev', country: 'Uzbekistán' },
  { name: 'Oybek Bozorov', country: 'Uzbekistán' },
  { name: 'Eldor Shomurodov', country: 'Uzbekistán' },
  { name: 'Igor Sergeev', country: 'Uzbekistán' },
  { name: 'Bobir Davlatov', country: 'Uzbekistán' },
  { name: 'Ulugbek Khoshimov', country: 'Uzbekistán' },
  { name: 'Khojimat Erkinov', country: 'Uzbekistán' },
  { name: 'Sardor Sobirov', country: 'Uzbekistán' },

  // Croacia
  { name: 'Dominik Livaković', country: 'Croacia' },
  { name: 'Ivica Ivušić', country: 'Croacia' },
  { name: 'Nediljko Labrović', country: 'Croacia' },
  { name: 'Joško Gvardiol', country: 'Croacia' },
  { name: 'Marin Pongračić', country: 'Croacia' },
  { name: 'Urtzyk Kalistenyk', country: 'Croacia' },
  { name: 'Josip Stanišić', country: 'Croacia' },
  { name: 'Josip Šutalo', country: 'Croacia' },
  { name: 'Borna Sosa', country: 'Croacia' },
  { name: 'Domagoj Vida', country: 'Croacia' },
  { name: 'Martin Erlić', country: 'Croacia' },
  { name: 'Josip Juranović', country: 'Croacia' },
  { name: 'Duje Ćaleta-Car', country: 'Croacia' },
  { name: 'Borna Barišić', country: 'Croacia' },
  { name: 'Luka Modrić', country: 'Croacia' },
  { name: 'Mateo Kovačić', country: 'Croacia' },
  { name: 'Marcelo Brozović', country: 'Croacia' },
  { name: 'Lovro Majer', country: 'Croacia' },
  { name: 'Mario Pašalić', country: 'Croacia' },
  { name: 'Nikola Vlašić', country: 'Croacia' },
  { name: 'Luka Sučić', country: 'Croacia' },
  { name: 'Andrej Kramarić', country: 'Croacia' },
  { name: 'Bruno Petković', country: 'Croacia' },
  { name: 'Marko Livaja', country: 'Croacia' },
  { name: 'Ivan Perišić', country: 'Croacia' },
  { name: 'Ante Budimir', country: 'Croacia' },
  { name: 'Igor Matanović', country: 'Croacia' },

  // Inglaterra
  { name: 'Jordan Pickford', country: 'Inglaterra' },
  { name: 'Aaron Ramsdale', country: 'Inglaterra' },
  { name: 'Dean Henderson', country: 'Inglaterra' },
  { name: 'Kyle Walker', country: 'Inglaterra' },
  { name: 'Trent Alexander-Arnold', country: 'Inglaterra' },
  { name: 'John Stones', country: 'Inglaterra' },
  { name: 'Marc Guéhi', country: 'Inglaterra' },
  { name: 'Harry Maguire', country: 'Inglaterra' },
  { name: 'Luke Shaw', country: 'Inglaterra' },
  { name: 'Kieran Trippier', country: 'Inglaterra' },
  { name: 'Ezri Konsa', country: 'Inglaterra' },
  { name: 'Reece James', country: 'Inglaterra' },
  { name: 'Levi Colwill', country: 'Inglaterra' },
  { name: 'Declan Rice', country: 'Inglaterra' },
  { name: 'Jude Bellingham', country: 'Inglaterra' },
  { name: 'Kobbie Mainoo', country: 'Inglaterra' },
  { name: 'Conor Gallagher', country: 'Inglaterra' },
  { name: 'Adam Wharton', country: 'Inglaterra' },
  { name: 'Curtis Jones', country: 'Inglaterra' },
  { name: 'Morgan Gibbs-White', country: 'Inglaterra' },
  { name: 'Harry Kane', country: 'Inglaterra' },
  { name: 'Bukayo Saka', country: 'Inglaterra' },
  { name: 'Phil Foden', country: 'Inglaterra' },
  { name: 'Cole Palmer', country: 'Inglaterra' },
  { name: 'Anthony Gordon', country: 'Inglaterra' },
  { name: 'Ollie Watkins', country: 'Inglaterra' },

  // Ghana
  { name: 'Lawrence Ati-Zigi', country: 'Ghana' },
  { name: 'Richard Ofori', country: 'Ghana' },
  { name: 'Frederick Asare', country: 'Ghana' },
  { name: 'Daniel Amartey', country: 'Ghana' },
  { name: 'Jonathan Mensah', country: 'Ghana' },
  { name: 'Alexander Djiku', country: 'Ghana' },
  { name: 'Mohammed Salisu', country: 'Ghana' },
  { name: 'Alidu Seidu', country: 'Ghana' },
  { name: 'Jerome Opoku', country: 'Ghana' },
  { name: 'Tariq Lamptey', country: 'Ghana' },
  { name: 'Gideon Mensah', country: 'Ghana' },
  { name: 'Baba Rahman', country: 'Ghana' },
  { name: 'Patric Pfeiffer', country: 'Ghana' },
  { name: 'Thomas Partey', country: 'Ghana' },
  { name: 'Mohammed Kudus', country: 'Ghana' },
  { name: 'Salis Abdul Samed', country: 'Ghana' },
  { name: 'Elisha Owusu', country: 'Ghana' },
  { name: 'Daniel-Kofi Kyereh', country: 'Ghana' },
  { name: 'Andre Ayew', country: 'Ghana' },
  { name: 'Majeed Ashimeru', country: 'Ghana' },
  { name: 'Mohammed Iddrisu', country: 'Ghana' },
  { name: 'Jordan Ayew', country: 'Ghana' },
  { name: 'Antoine Semenyo', country: 'Ghana' },
  { name: 'Iñaki Williams', country: 'Ghana' },
  { name: 'Ernest Nuamah', country: 'Ghana' },
  { name: 'Kamaldeen Sulemana', country: 'Ghana' },

  // Panamá
  { name: 'Orlando Mosquera', country: 'Panamá' },
  { name: 'Luis Mejía', country: 'Panamá' },
  { name: 'José Guerra', country: 'Panamá' },
  { name: 'Andrés Andrade', country: 'Panamá' },
  { name: 'Michael Murillo', country: 'Panamá' },
  { name: 'Edgardo Fariña', country: 'Panamá' },
  { name: 'Eric Davis', country: 'Panamá' },
  { name: 'Fidel Escobar', country: 'Panamá' },
  { name: 'Harold Cummings', country: 'Panamá' },
  { name: 'Jorge Gutiérrez', country: 'Panamá' },
  { name: 'César Blackman', country: 'Panamá' },
  { name: 'Carlos Harvey', country: 'Panamá' },
  { name: 'José Córdoba', country: 'Panamá' },
  { name: 'Aníbal Godoy', country: 'Panamá' },
  { name: 'Adalberto Carrasquilla', country: 'Panamá' },
  { name: 'Cristian Martínez', country: 'Panamá' },
  { name: 'Édgar Bárcenas', country: 'Panamá' },
  { name: 'Iván Anderson', country: 'Panamá' },
  { name: 'Cecilio Waterman', country: 'Panamá' },
  { name: 'Roderick Miller', country: 'Panamá' },
  { name: 'Freddy Góndola', country: 'Panamá' },
  { name: 'José Fajardo', country: 'Panamá' },
  { name: 'Ismael Díaz', country: 'Panamá' },
  { name: 'Tomás Rodríguez', country: 'Panamá' },
  { name: 'Eduardo Guerrero', country: 'Panamá' },
  { name: 'Azmahar Ariano', country: 'Panamá' },

];

// Los tres primeros jugadores de cada país en AWARD_PLAYERS son, por convención,
// los porteros de esa selección. Esto permite filtrar el premio "Guante de Oro"
// para que únicamente puedan elegirse porteros.
const AWARD_GOALKEEPERS = (() => {
  const perCountry = new Map();
  return AWARD_PLAYERS.filter(p => {
    const seen = perCountry.get(p.country) || 0;
    perCountry.set(p.country, seen + 1);
    return seen < 3;
  });
})();

function getAwardPlayersFor(cfg) {
  return cfg && cfg.key === 'goldenGlove' ? AWARD_GOALKEEPERS : AWARD_PLAYERS;
}

function getFlagClass(team) {
  if (!team) return '';
  const code = FLAG_CODE[team];
  return code ? 'fi fi-'+code : '';
}

let TEAMS_BY_GROUP = {};       // {A: [{name,flag,fifa},...], B: [...]}
let GROUP_NAMES = [];
let GROUP_MATCHES_BY_GROUP = {};  // group -> official scheduled matches, sorted by kickoff
let BRACKET_R32 = [];          // [{num,slot1:{type,group,groups?},slot2:{type,...}},...]
let KO_TREE = null;            // built bracket tree for rendering
let LOADED = false;
let tpAllocation = {};         // matchNum -> third-place team name (from FIFA table)

// FIFA ranking fallback for best-third tiebreakers.
// Lower number = better ranking. Update this list whenever you want to mirror a newer
// FIFA/Coca-Cola Men's World Ranking edition. Unknown teams fall back to 999.
const FIFA_RANKING_TIEBREAK = {
  'Argentina': 1,
  'Francia': 2,
  'España': 3,
  'Inglaterra': 4,
  'Brasil': 5,
  'Portugal': 6,
  'Países Bajos': 7,
  'Bélgica': 8,
  'Alemania': 9,
  'Croacia': 10,
  'Marruecos': 11,
  'Colombia': 12,
  'Uruguay': 13,
  'México': 14,
  'Estados Unidos': 15,
  'Senegal': 16,
  'Japón': 17,
  'Suiza': 18,
  'Irán': 19,
  'Corea del Sur': 20,
  'Austria': 21,
  'Australia': 22,
  'Catar': 23,
  'Noruega': 24,
  'Ecuador': 25,
  'Turquía': 26,
  'Canadá': 27,
  'Suecia': 28,
  'Panamá': 29,
  'Egipto': 30,
  'Argelia': 31,
  'Túnez': 32,
  'Paraguay': 33,
  'Costa de Marfil': 34,
  'Arabia Saudí': 35,
  'Escocia': 36,
  'Bosnia y Herzegovina': 37,
  'República Checa': 38,
  'Irak': 39,
  'Uzbekistán': 40,
  'Jordania': 41,
  'RD del Congo': 42,
  'Sudáfrica': 43,
  'Cabo Verde': 44,
  'Nueva Zelanda': 45,
  'Haití': 46,
  'Curazao': 47
};

function getTeamConductScore(team) {
  // The app does not ask for yellow/red cards, so every team is neutral by default.
  // If you later add cards, store a numeric conduct score here; higher wins.
  return state.teamConduct?.[team] ?? 0;
}

function getTeamFifaRank(team) {
  return FIFA_RANKING_TIEBREAK[team] ?? 999;
}

function compareBestThirdsByRanking(a, b) {
  // Sin resultados exactos de partidos solo nos quedan los rankings FIFA y
  // la letra del grupo. Sirve como orden por defecto cuando el usuario aún no
  // ha confirmado el orden de los mejores terceros.
  return (getTeamFifaRank(a.team) - getTeamFifaRank(b.team)) ||
    a.group.localeCompare(b.group);
}

function getAllThirdPlaceCandidates() {
  // Tercer puesto que cada grupo (con orden confirmado) tiene a día de hoy.
  return GROUP_NAMES
    .map(group => ({ group, team: state.groups[group]?.[2] || null }))
    .filter(item => item.team);
}

function ensureThirdPlaceRanking() {
  // Mantén state.thirdPlace sincronizado con los terceros vigentes de cada
  // grupo. Conserva el orden que el usuario haya arrastrado para los equipos
  // que sigan siendo terceros; añade los nuevos al final y descarta los que
  // ya no lo sean.
  const candidates = getAllThirdPlaceCandidates();
  const validSet = new Set(candidates.map(c => c.team));
  const existing = (state.thirdPlace || []).filter(team => validSet.has(team));
  const existingSet = new Set(existing);

  // Añade nuevos terceros respetando un orden estable: por ranking FIFA y
  // luego letra del grupo.
  const missing = candidates
    .filter(item => !existingSet.has(item.team))
    .sort(compareBestThirdsByRanking)
    .map(item => item.team);

  state.thirdPlace = [...existing, ...missing];

  if (state.thirdPlace.length < candidates.length) state.thirdPlaceConfirmed = false;
}

function getQualifiedThirdPlaceTeams() {
  // Los 8 primeros del ranking del usuario son los que pasan a 1/16.
  ensureThirdPlaceRanking();
  return state.thirdPlace.slice(0, 8);
}

function buildTPAllocation() {
  tpAllocation = {};
  ensureThirdPlaceRanking();

  const qualifiedTeams = getQualifiedThirdPlaceTeams();
  if (qualifiedTeams.length !== 8) return;

  // Necesitamos saber a qué grupo pertenece cada tercero clasificado para
  // poder usar TP_TABLE, exactamente igual que antes.
  const candidates = getAllThirdPlaceCandidates();
  const groupByTeam = {};
  candidates.forEach(item => { groupByTeam[item.team] = item.group; });

  const byGroup = {};
  qualifiedTeams.forEach(team => {
    const g = groupByTeam[team];
    if (g) byGroup[g] = team;
  });

  if (Object.keys(byGroup).length !== 8) return;

  const groups = Object.keys(byGroup).sort();
  const key = groups.join("");
  const order = TP_TABLE[key];

  if (!order) {
    console.warn("No TP_TABLE mapping found for:", key, groups);
    return;
  }

  TP_COLUMNS.forEach((matchNum, index) => {
    const group = String(order[index]).replace(/^3/, "");
    tpAllocation[matchNum] = byGroup[group] || null;
  });
}

// ---- State ----
let state = {
  groups: {},
  groupsConfirmed: {},      // group letter -> boolean, true cuando el usuario haya confirmado la ordenación
  thirdPlace: [],           // Ranking elegido por el usuario de los 12 terceros (top 8 clasifican)
  thirdPlaceConfirmed: false,
  quiniela1x2: {},          // matchKey -> '1' | 'X' | '2'
  matchTeams: {},           // matchId -> { team1, team2 }
  knockoutResults: {},      // matchId -> winner team name
  awards: emptyAwardsState()
};

const LOCAL_STORAGE_VERSION = '7';
const LOCAL_STORAGE_VERSION_KEY = 'wc2026_version';
const LOCAL_STORAGE_PICKS_KEY = 'wc2026_picks';
let localSaveTimer = null;

function normalizeLoadedState() {
  ensureGroupsInitialized();
  buildTPAllocation();
  computeMatchTeams();
}

function saveLocalPredictionNow() {
  try {
    const payload = buildPayload();
    payload._localDraftSavedAt = new Date().toISOString();
    localStorage.setItem(LOCAL_STORAGE_PICKS_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not save local prediction draft:', e);
  }
}

function saveLocalPredictionSoon() {
  clearTimeout(localSaveTimer);
  localSaveTimer = setTimeout(saveLocalPredictionNow, 250);
}

function clearLocalPrediction() {
  clearTimeout(localSaveTimer);
  try { localStorage.removeItem(LOCAL_STORAGE_PICKS_KEY); } catch (e) {}
}

function restoreLocalPrediction() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_PICKS_KEY);
    if (!saved) return false;

    const data = JSON.parse(saved);

    if (data.groups) {
      GROUP_NAMES.forEach(g => {
        if (Array.isArray(data.groups[g]) && data.groups[g].length) {
          state.groups[g] = data.groups[g].slice();
        }
      });
    }

    if (data.groupsConfirmed) {
      GROUP_NAMES.forEach(g => {
        if (data.groupsConfirmed[g]) state.groupsConfirmed[g] = true;
      });
    }

    if (Array.isArray(data.thirdPlace) && data.thirdPlace.length) {
      state.thirdPlace = data.thirdPlace.slice();
      state.thirdPlaceConfirmed = Boolean(data.thirdPlaceConfirmed);
    }

    if (data.quiniela1x2 && typeof data.quiniela1x2 === 'object') {
      const restored = {};
      QUINIELA_1X2_MATCHES.forEach(m => {
        const v = data.quiniela1x2[m.key] ?? data.quiniela1x2[m.legacyKey];
        if (v === '1' || v === 'X' || v === '2') restored[m.key] = v;
      });
      state.quiniela1x2 = restored;
    }

    if (data.knockout?.matches) {
      Object.values(data.knockout.matches).flat().forEach(match => {
        if (match?.match && match?.winner) {
          state.knockoutResults[match.match] = match.winner;
        }
      });
    } else if (data.knockout) {
      ['round32','round16','quarterfinals','semifinals'].forEach(round => {
        const treeArr = KO_TREE[round] || [];
        (data.knockout[round] || []).forEach((team, index) => {
          if (treeArr[index] && team) state.knockoutResults[treeArr[index].num] = team;
        });
      });
      if (data.knockout.final && KO_TREE.final?.[0]) state.knockoutResults[KO_TREE.final[0].num] = data.knockout.final;
      if (data.knockout.thirdPlace && KO_TREE.thirdPlace?.[0]) state.knockoutResults[KO_TREE.thirdPlace[0].num] = data.knockout.thirdPlace;
    }

    if (data.awards && typeof data.awards === 'object') {
      const merged = emptyAwardsState();
      AWARDS_CONFIG.forEach(a => {
        if (typeof data.awards[a.key] === 'string') merged[a.key] = data.awards[a.key];
      });
      state.awards = merged;
    }

    normalizeLoadedState();
    return true;
  } catch (e) {
    console.warn('Could not restore local prediction draft:', e);
    clearLocalPrediction();
    return false;
  }
}

function closeAwardDropdowns() {
  // Legacy no-op kept because older dropdown code called this from global listeners.
  // Awards now use the popup picker.
}

// ---- Fetch & Parse ----
async function loadData() {
  try {
    const resp = await fetch(DATA_SRC+'/worldcup.json');
    const data = await resp.json();

    // Extract group compositions from group-stage matches (early exit at 4 teams/group)
    TEAMS_BY_GROUP = {};
    const seen = {}, done = {};
    data.matches.forEach(m => {
      const g = m.group;
      if (!g || !g.startsWith('Group ')) return;
      // Translate team names to Spanish as early as possible so every downstream
      // consumer (groups, knockouts, awards, persistence...) works in Spanish.
      m.team1 = translateTeamName(m.team1);
      m.team2 = translateTeamName(m.team2);
      const letter = g.replace('Group ','');
      if (done[letter]) return;
      if (!TEAMS_BY_GROUP[letter]) TEAMS_BY_GROUP[letter] = [];
      if (!seen[letter]) seen[letter] = {};
      [m.team1, m.team2].forEach(t => {
        if (t && !seen[letter][t]) {
          seen[letter][t] = true;
          TEAMS_BY_GROUP[letter].push({ name: t, flag: '', fifa: '' });
        }
      });
      if (TEAMS_BY_GROUP[letter].length >= 4) done[letter] = true;
    });
    GROUP_NAMES = Object.keys(TEAMS_BY_GROUP).sort();

    // Official group-stage schedule from DATA_SRC, used for displaying matchdays in order
    GROUP_MATCHES_BY_GROUP = {};
    data.matches
      .filter(m => m.group && m.group.startsWith('Group '))
      .forEach((m, index) => {
        const letter = m.group.replace('Group ', '');
        if (!GROUP_MATCHES_BY_GROUP[letter]) GROUP_MATCHES_BY_GROUP[letter] = [];
        GROUP_MATCHES_BY_GROUP[letter].push({
          team1: m.team1,
          team2: m.team2,
          date: m.date || '',
          time: m.time || '',
          round: m.round || '',
          ground: m.ground || '',
          originalIndex: index,
          key: groupMatchKey(m.team1, m.team2)
        });
      });

    Object.keys(GROUP_MATCHES_BY_GROUP).forEach(group => {
      GROUP_MATCHES_BY_GROUP[group].sort((a, b) => {
        const dateCmp = String(a.date).localeCompare(String(b.date));
        if (dateCmp) return dateCmp;
        const timeCmp = String(a.time).localeCompare(String(b.time));
        if (timeCmp) return timeCmp;
        return a.originalIndex - b.originalIndex;
      });
    });

    // Initialize state groups
    GROUP_NAMES.forEach(g => {
      state.groups[g] = TEAMS_BY_GROUP[g].map(t => t.name);
    });
    ensureGroupsInitialized();

    // Validar que los 3 partidos de la quiniela 1X2 son realmente partidos
    // de la fase de grupos del calendario oficial. Si alguno no aparece, lo
    // dejamos visible en la consola para corregirlo (pero la app sigue
    // funcionando con el resto).
    QUINIELA_1X2_MATCHES.forEach(m => {
      const list = GROUP_MATCHES_BY_GROUP[m.group] || [];
      const found = list.find(x => x.key === m.key);
      if (!found) {
        console.warn('[quiniela1x2] El partido predefinido no se encontró en la fase de grupos oficial:', m);
      } else {
        m.date = found.date || '';
        m.time = found.time || '';
        m.round = found.round || '';
        m.ground = found.ground || '';
      }
    });

    // Build bracket using official 2026 FIFA structure
    KO_TREE = {
      round32: [
        {num:73,slot1:{type:'runner_up',group:'A'},slot2:{type:'runner_up',group:'B'}},
        {num:74,slot1:{type:'winner',group:'E'},slot2:{type:'third_place',groups:['A','B','C','D','F']}},
        {num:75,slot1:{type:'winner',group:'F'},slot2:{type:'runner_up',group:'C'}},
        {num:76,slot1:{type:'winner',group:'C'},slot2:{type:'runner_up',group:'F'}},
        {num:77,slot1:{type:'winner',group:'I'},slot2:{type:'third_place',groups:['C','D','F','G','H']}},
        {num:78,slot1:{type:'runner_up',group:'E'},slot2:{type:'runner_up',group:'I'}},
        {num:79,slot1:{type:'winner',group:'A'},slot2:{type:'third_place',groups:['C','E','F','H','I']}},
        {num:80,slot1:{type:'winner',group:'L'},slot2:{type:'third_place',groups:['E','H','I','J','K']}},
        {num:81,slot1:{type:'winner',group:'D'},slot2:{type:'third_place',groups:['B','E','F','I','J']}},
        {num:82,slot1:{type:'winner',group:'G'},slot2:{type:'third_place',groups:['A','E','H','I','J']}},
        {num:83,slot1:{type:'runner_up',group:'K'},slot2:{type:'runner_up',group:'L'}},
        {num:84,slot1:{type:'winner',group:'H'},slot2:{type:'runner_up',group:'J'}},
        {num:85,slot1:{type:'winner',group:'B'},slot2:{type:'third_place',groups:['E','F','G','I','J']}},
        {num:86,slot1:{type:'winner',group:'J'},slot2:{type:'runner_up',group:'H'}},
        {num:87,slot1:{type:'winner',group:'K'},slot2:{type:'third_place',groups:['D','E','I','J','L']}},
        {num:88,slot1:{type:'runner_up',group:'D'},slot2:{type:'runner_up',group:'G'}}
      ],
      round16: [
        {num:89,slot1:{type:'winner_of',matchNum:73},slot2:{type:'winner_of',matchNum:75}},
        {num:90,slot1:{type:'winner_of',matchNum:74},slot2:{type:'winner_of',matchNum:77}},
        {num:91,slot1:{type:'winner_of',matchNum:76},slot2:{type:'winner_of',matchNum:78}},
        {num:92,slot1:{type:'winner_of',matchNum:79},slot2:{type:'winner_of',matchNum:80}},
        {num:93,slot1:{type:'winner_of',matchNum:83},slot2:{type:'winner_of',matchNum:84}},
        {num:94,slot1:{type:'winner_of',matchNum:81},slot2:{type:'winner_of',matchNum:82}},
        {num:95,slot1:{type:'winner_of',matchNum:86},slot2:{type:'winner_of',matchNum:88}},
        {num:96,slot1:{type:'winner_of',matchNum:85},slot2:{type:'winner_of',matchNum:87}}
      ],
      quarterfinals: [
        {num:97,slot1:{type:'winner_of',matchNum:89},slot2:{type:'winner_of',matchNum:90}},
        {num:98,slot1:{type:'winner_of',matchNum:93},slot2:{type:'winner_of',matchNum:94}},
        {num:99,slot1:{type:'winner_of',matchNum:91},slot2:{type:'winner_of',matchNum:92}},
        {num:100,slot1:{type:'winner_of',matchNum:95},slot2:{type:'winner_of',matchNum:96}}
      ],
      semifinals: [
        {num:101,slot1:{type:'winner_of',matchNum:97},slot2:{type:'winner_of',matchNum:98}},
        {num:102,slot1:{type:'winner_of',matchNum:99},slot2:{type:'winner_of',matchNum:100}}
      ],
      thirdPlace: [
        {num:103,slot1:{type:'loser_of',matchNum:101},slot2:{type:'loser_of',matchNum:102}}
      ],
      final: [
        {num:104,slot1:{type:'winner_of',matchNum:101},slot2:{type:'winner_of',matchNum:102}}
      ]
    };
    BRACKET_R32 = KO_TREE.round32;
    LOADED = true;
    return true;
  } catch(e) {
    console.error('Failed to load tournament data:', e);
    showToast('No hay manera de cargar los datos del Mundial. Revisa la conexión (¿otra vez la VPN, en serio?).', true);
    return false;
  }
}

function findTeamGroup(teamName) {
  for (const g of GROUP_NAMES) {
    if (state.groups[g] && state.groups[g].includes(teamName)) return g;
  }
  return TEAMS_BY_GROUP ? Object.keys(TEAMS_BY_GROUP).find(g => TEAMS_BY_GROUP[g].some(t=>t.name===teamName)) : null;
}

function getTeamFlagClass(teamName) { return getFlagClass(teamName); }

// Helpers de partido conservados para compatibilidad: el resto de la app ya no
// se basa en resultados exactos, pero el bracket se sigue beneficiando de los
// metadatos (fechas, jornada, etc.) del fixture oficial si quisiéramos volver
// a mostrarlos.
function groupMatchKey(team1, team2) {
  return [team1, team2].sort().join('__');
}

function getGroupMatchList(group) {
  if (GROUP_MATCHES_BY_GROUP[group] && GROUP_MATCHES_BY_GROUP[group].length) {
    return GROUP_MATCHES_BY_GROUP[group];
  }
  const teams = (TEAMS_BY_GROUP[group] || []).map(t => t.name);
  const matches = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({ team1: teams[i], team2: teams[j], key: groupMatchKey(teams[i], teams[j]), date: '', time: '', round: '', ground: '' });
    }
  }
  return matches;
}

function formatMatchDate(match) {
  if (!match.date) return '';
  const date = new Date(match.date + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return match.date;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase();
}

function getMatchdayNumber(match, fallback) {
  const found = String(match.round || '').match(/\d+/);
  return found ? found[0] : String(fallback + 1);
}

function ensureGroupsInitialized() {
  if (!state.groups) state.groups = {};
  if (!state.groupsConfirmed) state.groupsConfirmed = {};

  GROUP_NAMES.forEach(group => {
    const teams = (TEAMS_BY_GROUP[group] || []).map(t => t.name);
    const current = Array.isArray(state.groups[group]) ? state.groups[group] : [];
    const valid = current.filter(t => teams.includes(t));
    const missing = teams.filter(t => !valid.includes(t));
    state.groups[group] = [...valid, ...missing];
  });

  // El ranking de mejores terceros depende de los terceros vigentes.
  ensureThirdPlaceRanking();
}

function calculateGroupStandings(group) {
  // Sin marcadores exactos no hay puntos reales; devolvemos una "tabla"
  // sintética en el orden que el usuario haya colocado (o, si aún no lo ha
  // hecho, el orden por defecto en el que vienen los equipos).
  ensureGroupsInitialized();
  const order = state.groups[group] || (TEAMS_BY_GROUP[group] || []).map(t => t.name);
  return order.map((team, index) => ({
    team,
    index,
    pts: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    played: 0,
    wins: 0
  }));
}

function isGroupComplete(group) {
  return Boolean(state.groupsConfirmed && state.groupsConfirmed[group]);
}

function moveArrayItem(arr, from, to) {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// Helper genérico de drag-and-drop para listas ordenables verticalmente.
// Llama a `onReorder(fromIndex, toIndex)` cuando el usuario suelta.
// Funciona con HTML5 DnD (escritorio) y con touchstart/move/end (móvil).
function attachSortable(container, itemSelector, onReorder) {
  let dragIndex = null;
  let touchDragEl = null;
  let touchPlaceholder = null;
  let touchStartY = 0;
  let touchStartTop = 0;

  function items() {
    return Array.from(container.querySelectorAll(itemSelector));
  }

  function indexOf(el) {
    return items().indexOf(el);
  }

  items().forEach(item => {
    item.setAttribute('draggable', 'true');
    item.classList.add('sortable-item');

    item.addEventListener('dragstart', e => {
      dragIndex = indexOf(item);
      item.classList.add('sortable-dragging');
      try { e.dataTransfer.setData('text/plain', String(dragIndex)); } catch (err) {}
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('sortable-dragging');
      items().forEach(el => el.classList.remove('sortable-over'));
      dragIndex = null;
    });

    item.addEventListener('dragover', e => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      item.classList.add('sortable-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('sortable-over');
    });

    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('sortable-over');
      const fromIdx = dragIndex;
      const toIdx = indexOf(item);
      if (fromIdx === null || fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
      onReorder(fromIdx, toIdx);
    });

    // --- Soporte táctil básico ---
    item.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      dragIndex = indexOf(item);
      touchDragEl = item;
      touchStartY = e.touches[0].clientY;
      touchStartTop = item.getBoundingClientRect().top;
      item.classList.add('sortable-dragging');
    }, { passive: true });

    item.addEventListener('touchmove', e => {
      if (!touchDragEl || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = y - touchStartY;
      touchDragEl.style.transform = `translateY(${dy}px)`;
      // Resalta el elemento bajo el dedo
      const otherEls = items();
      const targetEl = document.elementFromPoint(e.touches[0].clientX, y);
      otherEls.forEach(el => el.classList.toggle('sortable-over', el !== touchDragEl && el.contains(targetEl)));
      e.preventDefault();
    }, { passive: false });

    item.addEventListener('touchend', e => {
      if (!touchDragEl) return;
      const endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : touchStartY;
      const targetEl = document.elementFromPoint(
        (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : 0,
        endY
      );
      const otherEls = items();
      let toIdx = -1;
      otherEls.forEach((el, idx) => {
        if (el !== touchDragEl && el.contains(targetEl)) toIdx = idx;
      });

      touchDragEl.style.transform = '';
      touchDragEl.classList.remove('sortable-dragging');
      otherEls.forEach(el => el.classList.remove('sortable-over'));
      const fromIdx = dragIndex;
      touchDragEl = null;
      dragIndex = null;

      if (toIdx >= 0 && fromIdx !== null && fromIdx !== toIdx) {
        onReorder(fromIdx, toIdx);
      }
    });
  });

  container.addEventListener('dragover', e => e.preventDefault());
}

function openGroupResultsModal(group) {
  ensureGroupsInitialized();

  const modal = document.getElementById('predictionModal');
  const viewer = document.getElementById('predictionViewer');
  modal.style.display = 'flex';

  const initialOrder = (state.groups[group] || []).slice();
  let draft = initialOrder.slice();

  viewer.innerHTML = `
    <div class="group-results-editor group-order-editor">
      <h3>GRUPO ${group}</h3>
      <p class="group-modal-info">Arrastra (o usa las flechas ▲▼) para predecir el orden final del grupo. <strong>1º y 2º pasan directos a dieciseisavos</strong> · <strong>3º entra al sorteo de mejores terceros</strong> · <strong>4º queda eliminado</strong>.</p>
      <div class="group-order-list" id="groupOrderList"></div>
      <div class="group-modal-actions">
        <button type="button" class="toolbar-btn" id="cancelGroupResults">Cerrar</button>
        <button type="button" class="submit-btn" id="saveGroupResults">Guardar</button>
      </div>
    </div>
  `;

  const list = viewer.querySelector('#groupOrderList');

  function fateLabel(idx) {
    if (idx === 0) return { txt: 'Pasa como 1º', cls: 'fate-qualified' };
    if (idx === 1) return { txt: 'Pasa como 2º', cls: 'fate-qualified' };
    if (idx === 2) return { txt: 'Mejor tercero (sorteo)', cls: 'fate-third' };
    return { txt: 'Eliminado', cls: 'fate-out' };
  }

  function redraw() {
    list.innerHTML = '';
    draft.forEach((team, idx) => {
      const fate = fateLabel(idx);
      const row = document.createElement('div');
      row.className = 'group-team pos-' + (idx + 1) + (idx === 3 ? ' eliminated' : '') + (idx === 2 ? ' qualified-third' : '');
      row.dataset.index = String(idx);
      row.innerHTML = `
        <span class="position-badge">${idx + 1}</span>
        <span class="team-flag ${getTeamFlagClass(team)}"></span>
        <span class="team-name">${escapeHtml(team)}</span>
        <span class="group-team-fate ${fate.cls}">${fate.txt}</span>
        <span class="move-btns">
          <button type="button" class="move-up" aria-label="Subir" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="move-down" aria-label="Bajar" ${idx === draft.length - 1 ? 'disabled' : ''}>▼</button>
        </span>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('.move-up').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        draft = moveArrayItem(draft, idx, idx - 1);
        redraw();
      });
    });
    list.querySelectorAll('.move-down').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        draft = moveArrayItem(draft, idx, idx + 1);
        redraw();
      });
    });

    attachSortable(list, '.group-team', (fromIdx, toIdx) => {
      draft = moveArrayItem(draft, fromIdx, toIdx);
      redraw();
    });
  }

  redraw();

  document.getElementById('cancelGroupResults').addEventListener('click', closePredictionModal);
  document.getElementById('saveGroupResults').addEventListener('click', () => {
    const previousMatchTeams = cloneMatchTeamsSnapshot();
    state.groups[group] = draft.slice();
    state.groupsConfirmed[group] = true;
    ensureThirdPlaceRanking();
    buildTPAllocation();
    computeMatchTeams();
    cleanupKnockoutAfterGroupChange(previousMatchTeams);
    closePredictionModal();
    renderAll();
    saveLocalPredictionSoon();
  });
}


// ---- Compute match teams from group picks ----
function getSlotTeam(ref) {
  if (!ref) return null;
  if (ref.type === 'winner') return state.groups[ref.group] ? state.groups[ref.group][0] : null;
  if (ref.type === 'runner_up') return state.groups[ref.group] ? state.groups[ref.group][1] : null;
  if (ref.type === 'third_place') return tpAllocation[ref._matchNum] || null;
  if (ref.type === 'winner_of') return state.knockoutResults[ref.matchNum] || null;
  if (ref.type === 'loser_of') {
    const m = state.matchTeams[ref.matchNum];
    const w = state.knockoutResults[ref.matchNum];
    if (!m || !w) return null;
    return m.team1 === w ? m.team2 : m.team1;
  }
  return null;
}

function computeMatchTeams() {
  state.matchTeams = {};

  // R32: resolve from group picks + TP allocation
  KO_TREE.round32.forEach(m => {
    state.matchTeams[m.num] = {
      team1: getSlotTeam(Object.assign({}, m.slot1, {_matchNum: m.num})),
      team2: getSlotTeam(Object.assign({}, m.slot2, {_matchNum: m.num}))
    };
  });

  // R16: resolve winners
  (KO_TREE.round16 || []).forEach(m => {
    state.matchTeams[m.num] = {
      team1: getSlotTeam(m.slot1),
      team2: getSlotTeam(m.slot2)
    };
  });

  // QF
  (KO_TREE.quarterfinals || []).forEach(m => {
    state.matchTeams[m.num] = {
      team1: getSlotTeam(m.slot1),
      team2: getSlotTeam(m.slot2)
    };
  });

  // SF
  (KO_TREE.semifinals || []).forEach(m => {
    state.matchTeams[m.num] = {
      team1: getSlotTeam(m.slot1),
      team2: getSlotTeam(m.slot2)
    };
  });

  // Final
  if (KO_TREE.final && KO_TREE.final[0]) {
    const m = KO_TREE.final[0];
    state.matchTeams[m.num] = {
      team1: getSlotTeam(m.slot1),
      team2: getSlotTeam(m.slot2)
    };
  }

  // Third place
  if (KO_TREE.thirdPlace && KO_TREE.thirdPlace[0]) {
    const m = KO_TREE.thirdPlace[0];
    state.matchTeams[m.num] = {
      team1: getSlotTeam(m.slot1),
      team2: getSlotTeam(m.slot2)
    };
  }
}



// ---- Toast / Loading / Confetti ----
function showToast(msg, error) {
  const c = document.getElementById('toastContainer');
  const d = document.createElement('div');
  d.className = error ? 'error-toast' : 'success-toast';
  d.textContent = msg;
  c.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}

function showLoading(msg) {
  document.getElementById('loadingOverlay').style.display = 'flex';
  document.getElementById('loadingText').textContent = msg || 'Cargando...';
}
function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function fireConfetti() {
  const colors = ['#FFD700','#FF6B6B','#4CAF50','#64B5F6','#FF8A65','#BA68C8','#FFF176'];
  const c = document.getElementById('confettiContainer');
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random()*100+'%';
    p.style.width = (6+Math.random()*10)+'px';
    p.style.height = (6+Math.random()*10)+'px';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDuration = (2+Math.random()*3)+'s';
    p.style.animationDelay = Math.random()*0.5+'s';
    c.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }
}

// ---- Render Group Stage ----
function renderGroups() {
  ensureGroupsInitialized();

  const grid = document.getElementById('groupsGrid');
  grid.innerHTML = '';
  const qualifiedThirds = new Set(getQualifiedThirdPlaceTeams());

  GROUP_NAMES.forEach(g => {
    const complete = isGroupComplete(g);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'group-card group-card-clickable' + (complete ? ' group-complete' : ' group-empty');
    card.title = complete ? 'Editar orden del grupo ' + g : 'Predecir orden del grupo ' + g;

    const h3 = document.createElement('h3');
    h3.textContent = 'Grupo ' + g;
    card.appendChild(h3);

    const standings = calculateGroupStandings(g);
    standings.forEach((stat, idx) => {
      const team = stat.team;
      const isThird = idx === 2;
      const isFourth = idx === 3;
      const thirdQualified = complete && state.thirdPlaceConfirmed && qualifiedThirds.has(team);
      const eliminated = isFourth || (isThird && complete && state.thirdPlaceConfirmed && !qualifiedThirds.has(team));

      const row = document.createElement('div');
      row.className =
        'group-team pos-' + (idx + 1) +
        (eliminated ? ' eliminated' : '') +
        (isThird && thirdQualified ? ' qualified-third' : '') +
        (!complete ? ' group-team-unconfirmed' : '');

      const badge = document.createElement('span');
      badge.className = 'position-badge';
      badge.textContent = idx + 1;
      row.appendChild(badge);

      const flag = document.createElement('span');
      flag.className = 'team-flag ' + getTeamFlagClass(team);
      row.appendChild(flag);

      const name = document.createElement('span');
      name.className = 'team-name';
      name.textContent = team;
      row.appendChild(name);

      card.appendChild(row);
    });

    const hint = document.createElement('div');
    hint.className = 'group-card-hint';
    hint.textContent = complete ? '✏️ Editar orden' : '👉 Ordenar grupo';
    card.appendChild(hint);

    card.addEventListener('click', () => openGroupResultsModal(g));
    grid.appendChild(card);
  });
}

// ---- Render Quiniela 1X2 ----
function renderQuiniela1x2() {
  const container = document.getElementById('quiniela1x2Panel');
  if (!container) return;
  container.innerHTML = '';

  const panel = document.createElement('div');
  panel.className = 'quiniela1x2-panel';

  QUINIELA_1X2_MATCHES.forEach(m => {
    const pick = state.quiniela1x2?.[m.key] || null;
    const dateLabel = m.date
      ? formatMatchDate({ date: m.date, time: m.time })
      : '';

    const row = document.createElement('div');
    row.className = 'quiniela1x2-row' + (pick ? ' quiniela1x2-row-picked' : '');

    const labels = ['1', 'X', '2'];
    const titles = [m.team1 + ' gana', 'Empate', m.team2 + ' gana'];

    row.innerHTML = `
      <div class="quiniela1x2-meta">
        <span class="quiniela1x2-group">Grupo ${escapeHtml(m.group)}</span>
        ${dateLabel ? `<span class="quiniela1x2-date">${escapeHtml(dateLabel)}</span>` : ''}
      </div>
      <div class="quiniela1x2-match">
        <span class="quiniela1x2-team quiniela1x2-team-home">
          <span class="team-flag ${getTeamFlagClass(m.team1)}"></span>
          <span class="team-name">${escapeHtml(m.team1)}</span>
        </span>
        <span class="quiniela1x2-vs">vs</span>
        <span class="quiniela1x2-team quiniela1x2-team-away">
          <span class="team-name">${escapeHtml(m.team2)}</span>
          <span class="team-flag ${getTeamFlagClass(m.team2)}"></span>
        </span>
      </div>
      <div class="quiniela1x2-picks" role="group" aria-label="Pronóstico ${escapeHtml(m.team1)} vs ${escapeHtml(m.team2)}">
        ${labels.map((lbl, i) => `
          <button type="button"
                  class="quiniela1x2-pick-btn${pick === lbl ? ' quiniela1x2-pick-active' : ''}"
                  data-key="${escapeHtml(m.key)}"
                  data-pick="${lbl}"
                  aria-pressed="${pick === lbl ? 'true' : 'false'}"
                  title="${escapeHtml(titles[i])}">${lbl}</button>
        `).join('')}
      </div>
    `;

    panel.appendChild(row);
  });

  container.appendChild(panel);

  panel.querySelectorAll('.quiniela1x2-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const pick = btn.dataset.pick;
      if (!state.quiniela1x2) state.quiniela1x2 = {};
      if (state.quiniela1x2[key] === pick) {
        // Click sobre el mismo botón = deseleccionar
        delete state.quiniela1x2[key];
      } else {
        state.quiniela1x2[key] = pick;
      }
      renderQuiniela1x2();
      saveLocalPredictionSoon();
    });
  });
}

// ---- Render Best Thirds Panel ----
function renderBestThirds() {
  const container = document.getElementById('bestThirdsPanel');
  if (!container) return;

  ensureThirdPlaceRanking();
  container.innerHTML = '';

  const allConfirmed = GROUP_NAMES.every(g => isGroupComplete(g));
  const candidates = getAllThirdPlaceCandidates();

  if (!allConfirmed || candidates.length < GROUP_NAMES.length) {
    const note = document.createElement('p');
    note.className = 'note-text best-thirds-note';
    note.innerHTML = `Confirma el orden de los <strong>${GROUP_NAMES.length}</strong> grupos para poder ordenar los mejores terceros (ahora mismo confirmados: <strong>${GROUP_NAMES.filter(isGroupComplete).length}/${GROUP_NAMES.length}</strong>).`;
    container.appendChild(note);
    return;
  }

  const panel = document.createElement('div');
  panel.className = 'best-thirds-panel';
  panel.innerHTML = `
    <div class="best-thirds-status">
      ${state.thirdPlaceConfirmed
        ? '<span class="best-thirds-confirmed">✅ Ranking confirmado</span>'
        : '<span class="best-thirds-pending">⚠️ Pendiente de confirmar — arrastra los equipos y pulsa "Confirmar".</span>'}
    </div>
    <div class="best-thirds-list" id="bestThirdsList"></div>
    <div class="best-thirds-actions">
      <button type="button" class="toolbar-btn" id="bestThirdsAutoBtn">⚡ Orden automático (ranking FIFA)</button>
      <button type="button" class="submit-btn" id="bestThirdsConfirmBtn">✅ Confirmar ranking</button>
    </div>
  `;
  container.appendChild(panel);

  const list = panel.querySelector('#bestThirdsList');
  const groupByTeam = {};
  candidates.forEach(c => { groupByTeam[c.team] = c.group; });

  function renderList() {
    list.innerHTML = '';
    state.thirdPlace.forEach((team, idx) => {
      const qualifies = idx < 8;
      const row = document.createElement('div');
      row.className = 'best-third-row' + (qualifies ? ' best-third-qualified' : ' best-third-eliminated');
      row.dataset.team = team;
      row.innerHTML = `
        <span class="best-third-rank">${idx + 1}</span>
        <span class="best-third-status">${qualifies ? '✅' : '❌'}</span>
        <span class="team-flag ${getTeamFlagClass(team)}"></span>
        <span class="best-third-name">${escapeHtml(team)}</span>
        <span class="best-third-group">(3º Grupo ${groupByTeam[team] || '?'})</span>
        <span class="move-btns">
          <button type="button" class="move-up" aria-label="Subir" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="move-down" aria-label="Bajar" ${idx === state.thirdPlace.length - 1 ? 'disabled' : ''}>▼</button>
        </span>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('.move-up').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        state.thirdPlace = moveArrayItem(state.thirdPlace, idx, idx - 1);
        state.thirdPlaceConfirmed = false;
        renderAll();
        saveLocalPredictionSoon();
      });
    });
    list.querySelectorAll('.move-down').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        state.thirdPlace = moveArrayItem(state.thirdPlace, idx, idx + 1);
        state.thirdPlaceConfirmed = false;
        renderAll();
        saveLocalPredictionSoon();
      });
    });

    attachSortable(list, '.best-third-row', (fromIdx, toIdx) => {
      const previousMatchTeams = cloneMatchTeamsSnapshot();
      state.thirdPlace = moveArrayItem(state.thirdPlace, fromIdx, toIdx);
      state.thirdPlaceConfirmed = false;
      buildTPAllocation();
      computeMatchTeams();
      cleanupKnockoutAfterGroupChange(previousMatchTeams);
      renderAll();
      saveLocalPredictionSoon();
    });
  }

  renderList();

  panel.querySelector('#bestThirdsAutoBtn').addEventListener('click', () => {
    const previousMatchTeams = cloneMatchTeamsSnapshot();
    state.thirdPlace = candidates
      .slice()
      .sort(compareBestThirdsByRanking)
      .map(c => c.team);
    state.thirdPlaceConfirmed = false;
    buildTPAllocation();
    computeMatchTeams();
    cleanupKnockoutAfterGroupChange(previousMatchTeams);
    renderAll();
    saveLocalPredictionSoon();
  });

  panel.querySelector('#bestThirdsConfirmBtn').addEventListener('click', () => {
    const previousMatchTeams = cloneMatchTeamsSnapshot();
    state.thirdPlaceConfirmed = true;
    buildTPAllocation();
    computeMatchTeams();
    cleanupKnockoutAfterGroupChange(previousMatchTeams);
    renderAll();
    saveLocalPredictionSoon();
    showToast('Mejores terceros confirmados.');
  });
}

// ---- Render Third Place (legacy compact summary, optional) ----
function renderThirdPlace() {
  const container = document.getElementById('thirdPlacePicks');
  if (!container) return;

  ensureThirdPlaceRanking();
  container.innerHTML = '';

  const picked = getQualifiedThirdPlaceTeams();
  if (picked.length === 0) {
    container.innerHTML = '<p class="note-text">Aparecerán aquí cuando confirmes el orden de todos los grupos.</p>';
    return;
  }

  picked.forEach((team, i) => {
    const tag = document.createElement('span');
    tag.className = 'third-pick-tag';
    tag.innerHTML = '<span class="third-pick-num">'+(i+1)+'</span> ' +
      '<span class="'+getTeamFlagClass(team)+'"></span> ' + team;
    container.appendChild(tag);
  });
}

// ---- Render Bracket (tournament tree) ----
function getBracketDisplayOrder() {
  const r32Order = [];
  const r16Order = [];
  const qfOrder = [];

  KO_TREE.semifinals.forEach(sf => {
    [sf.slot1.matchNum, sf.slot2.matchNum].forEach(qfNum => {
      const qfIdx = KO_TREE.quarterfinals.findIndex(m => m.num === qfNum);
      if (qfIdx !== -1) {
        qfOrder.push(qfIdx);

        const qf = KO_TREE.quarterfinals[qfIdx];
        [qf.slot1.matchNum, qf.slot2.matchNum].forEach(r16Num => {
          const r16Idx = KO_TREE.round16.findIndex(m => m.num === r16Num);
          if (r16Idx !== -1) {
            r16Order.push(r16Idx);

            const r16 = KO_TREE.round16[r16Idx];
            [r16.slot1.matchNum, r16.slot2.matchNum].forEach(r32Num => {
              const r32Idx = KO_TREE.round32.findIndex(m => m.num === r32Num);
              if (r32Idx !== -1) r32Order.push(r32Idx);
            });
          }
        });
      }
    });
  });

  return { r32Order, r16Order, qfOrder };
}

function renderBracket() {
  const container = document.getElementById('bracketContainer');
  container.innerHTML = '';
  if (!KO_TREE) return;

  const order = getBracketDisplayOrder();

  const SLOT_H = 46;
  const GAP = 10;
  const MATCH_GAP = 2;
  const LABEL_H = 32;
  const COL_W = 170;
  const CONN_W = 58;

  const MATCH_H = SLOT_H * 2 + MATCH_GAP;
  const STEP = MATCH_H + GAP;

  const cols = [
    10,
    COL_W + CONN_W,
    COL_W * 2 + CONN_W * 2,
    COL_W * 3 + CONN_W * 3,
    COL_W * 4 + CONN_W * 4
  ];

  function matchData(treeArr, ord) {
    return (ord || treeArr.map((_, i) => i)).map(i => {
      const m = treeArr[i];
      const mt = state.matchTeams[m.num] || {};
      return {
        team1: mt.team1,
        team2: mt.team2,
        winner: state.knockoutResults[m.num] || null,
        num: m.num
      };
    });
  }

  const r32 = matchData(KO_TREE.round32, order.r32Order);
  const r16 = matchData(KO_TREE.round16, order.r16Order);
  const qf = matchData(KO_TREE.quarterfinals, order.qfOrder);
  const sf = matchData(KO_TREE.semifinals);

  const r32Tree = order.r32Order.map(i => KO_TREE.round32[i]);
  const r16Tree = order.r16Order.map(i => KO_TREE.round16[i]);
  const qfTree = order.qfOrder.map(i => KO_TREE.quarterfinals[i]);
  const sfTree = KO_TREE.semifinals;

  const finMatch = KO_TREE.final ? KO_TREE.final[0] : null;
  const finNum = finMatch ? finMatch.num : 104;
  const finMt = state.matchTeams[finNum] || {};
  const finalMatch = {
    team1: finMt.team1,
    team2: finMt.team2,
    winner: state.knockoutResults[finNum] || null,
    num: finNum
  };

  const thirdMatchDef = KO_TREE.thirdPlace ? KO_TREE.thirdPlace[0] : null;
  const thirdNum = thirdMatchDef ? thirdMatchDef.num : 103;
  const thirdMt = state.matchTeams[thirdNum] || {};
  const thirdMatch = {
    team1: thirdMt.team1,
    team2: thirdMt.team2,
    winner: state.knockoutResults[thirdNum] || null,
    num: thirdNum
  };

  const r32Tops = r32.map((_, i) => LABEL_H + i * STEP);

  function centerOf(top) {
    return top + SLOT_H;
  }

  function buildTops(dstTree, srcTree, srcTops) {
    return dstTree.map(dst => {
      const s1i = srcTree.findIndex(s => s.num === dst.slot1.matchNum);
      const s2i = srcTree.findIndex(s => s.num === dst.slot2.matchNum);

      if (s1i === -1 || s2i === -1) {
        return LABEL_H;
      }

      const c1 = centerOf(srcTops[s1i]);
      const c2 = centerOf(srcTops[s2i]);

      return ((c1 + c2) / 2) - SLOT_H;
    });
  }

  const r16Tops = buildTops(r16Tree, r32Tree, r32Tops);
  const qfTops = buildTops(qfTree, r16Tree, r16Tops);
  const sfTops = buildTops(sfTree, qfTree, qfTops);

  let finalTop = LABEL_H;
  if (sfTops.length === 2) {
    finalTop = ((centerOf(sfTops[0]) + centerOf(sfTops[1])) / 2) - SLOT_H;
  }

  // El partido por el 3er puesto vive entre las dos semifinales, en la
  // misma columna de semis. La final se queda a la derecha como siempre.
  const thirdTop = finalTop;

  const maxH = LABEL_H + r32.length * STEP + 40;

  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:relative;height:' + maxH + 'px;min-width:' + (COL_W * 5 + CONN_W * 4 + 40) + 'px';

  ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final'].forEach((lbl, i) => {
    const l = document.createElement('div');
    l.className = 'bracket-round-label';
    l.style.cssText =
      'position:absolute;top:2px;left:' + cols[i] + 'px;width:' + COL_W + 'px;text-align:center;';
    l.textContent = lbl;
    wrapper.appendChild(l);
  });

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', maxH);
  svg.style.cssText =
    'position:absolute;top:0;left:0;pointer-events:none;z-index:1;';

  function mkPath(d) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    p.setAttribute('stroke', '#81C784');
    p.setAttribute('stroke-width', '2');
    p.setAttribute('fill', 'none');
    return p;
  }

  function connect(srcTree, srcTops, dstTree, dstTops, srcLeft, dstLeft) {
    const sx = srcLeft + COL_W - 6;
    const dx = dstLeft + 3;
    const mx = sx + (dx - sx) / 2;

    dstTree.forEach((dst, di) => {
      const s1i = srcTree.findIndex(s => s.num === dst.slot1.matchNum);
      const s2i = srcTree.findIndex(s => s.num === dst.slot2.matchNum);
      if (s1i === -1 || s2i === -1) return;

      const y1 = centerOf(srcTops[s1i]);
      const y2 = centerOf(srcTops[s2i]);
      const yd = centerOf(dstTops[di]);

      svg.appendChild(mkPath(`M${sx},${y1} L${mx},${y1} L${mx},${yd} L${dx},${yd}`));
      svg.appendChild(mkPath(`M${sx},${y2} L${mx},${y2} L${mx},${yd} L${dx},${yd}`));
    });
  }

  function connectSemisToFinal() {
    if (sfTree.length !== 2) return;

    const sx = cols[3] + COL_W - 6;
    const dx = cols[4] + 3;
    const mx = sx + (dx - sx) / 2;
    const yd = centerOf(finalTop);

    sfTops.forEach(top => {
      const y = centerOf(top);
      svg.appendChild(mkPath(`M${sx},${y} L${mx},${y} L${mx},${yd} L${dx},${yd}`));
    });
  }

  function connectSemisToThirdPlace() {
    if (sfTops.length !== 2 || !thirdMatchDef) return;

    const x = cols[3] + (COL_W / 2) - 3;
    const upperBottom = sfTops[0] + MATCH_H;
    const lowerTop = sfTops[1];
    const thirdTopEdge = thirdTop - 6;
    const thirdBottomEdge = thirdTop + MATCH_H + 6;

    if (upperBottom < thirdTopEdge) {
      const p1 = mkPath(`M${x},${upperBottom} L${x},${thirdTopEdge}`);
      p1.setAttribute('stroke-width', '2');
      svg.appendChild(p1);
    }

    if (thirdBottomEdge < lowerTop) {
      const p2 = mkPath(`M${x},${thirdBottomEdge} L${x},${lowerTop}`);
      p2.setAttribute('stroke-width', '2');
      svg.appendChild(p2);
    }
  }

  wrapper.appendChild(svg);

  function slotDiv(team, isWinner, matchNum, slotNum, top, left, extraClass) {
  const hasTeam = Boolean(team);
  const winner = state.knockoutResults[matchNum] || null;
  const isRealWinner = hasTeam && winner && team === winner;
  const isLoser = hasTeam && winner && team !== winner;


  const d = document.createElement('div');

  d.className =
    'bracket-slot' +
    (hasTeam ? ' has-team' : ' empty-slot') +
    (isRealWinner ? ' winner' : '') +
    (isLoser ? ' loser' : '') +
    (extraClass ? ' ' + extraClass : '');

  d.style.cssText =
    'position:absolute;top:' + top + 'px;left:' + left + 'px;width:' + (COL_W - 6) + 'px;z-index:2;';

  d.innerHTML =
    '<span class="slot-flag ' + getFlagClass(team) + '"></span>' +
    '<span class="slot-name">' + (team || '---') + '</span>' +
    '<button class="slot-clear">×</button>';

  d.addEventListener('click', () => {
  const match = state.matchTeams[matchNum] || {};
  const hasBothTeams = Boolean(match.team1 && match.team2);

  if (!hasBothTeams) {
    return;
  }

  const previousWinner = state.knockoutResults[matchNum] || null;

  pickWinner(matchNum, slotNum);

  setTimeout(() => {
    const pickedEl = document.querySelector(
      `.bracket-slot[data-match="${matchNum}"][data-slot="${slotNum}"]`
    );

    if (pickedEl) {
      pickedEl.classList.remove('just-picked');
      void pickedEl.offsetWidth;
      pickedEl.classList.add('just-picked');
    }
  }, 0);
});

  d.dataset.match = matchNum;
  d.dataset.slot = slotNum;

  d.querySelector('.slot-clear').addEventListener('click', e => {
    e.stopPropagation();
    clearKnockoutAndRender(matchNum);
  });

  return d;
}

  function drawRound(matches, tops, colIdx) {
    const left = cols[colIdx];

    matches.forEach((m, i) => {
      const top = tops[i];

      wrapper.appendChild(
        slotDiv(m.team1, m.winner === m.team1, m.num, 1, top, left, '')
      );

      wrapper.appendChild(
        slotDiv(m.team2, m.winner === m.team2, m.num, 2, top + SLOT_H, left, '')
      );
    });
  }

  connect(r32Tree, r32Tops, r16Tree, r16Tops, cols[0], cols[1]);
  connect(r16Tree, r16Tops, qfTree, qfTops, cols[1], cols[2]);
  connect(qfTree, qfTops, sfTree, sfTops, cols[2], cols[3]);
  connectSemisToFinal();
  connectSemisToThirdPlace();

  drawRound(r32, r32Tops, 0);
  drawRound(r16, r16Tops, 1);
  drawRound(qf, qfTops, 2);
  drawRound(sf, sfTops, 3);

  if (thirdMatchDef) {
    const thirdLabel = document.createElement('div');
    thirdLabel.className = 'bracket-round-label';
    thirdLabel.style.cssText =
      'position:absolute;top:' + Math.max(LABEL_H, thirdTop - 26) + 'px;left:' + cols[3] + 'px;width:' + COL_W + 'px;text-align:center;color:#2E7D32;z-index:3;';
    thirdLabel.textContent = '3er puesto';
    wrapper.appendChild(thirdLabel);

    const thirdWinner = thirdMatch.winner || null;
    wrapper.appendChild(
      slotDiv(
        thirdMatch.team1,
        Boolean(thirdMatch.team1 && thirdWinner && thirdMatch.team1 === thirdWinner),
        thirdNum,
        1,
        thirdTop,
        cols[3],
        'third-place-slot'
      )
    );
    wrapper.appendChild(
      slotDiv(
        thirdMatch.team2,
        Boolean(thirdMatch.team2 && thirdWinner && thirdMatch.team2 === thirdWinner),
        thirdNum,
        2,
        thirdTop + SLOT_H,
        cols[3],
        'third-place-slot'
      )
    );
  }

  const finalWinner = finalMatch.winner || null;

  wrapper.appendChild(
    slotDiv(
      finalMatch.team1,
      Boolean(finalMatch.team1 && finalWinner && finalMatch.team1 === finalWinner),
      finNum,
      1,
      finalTop,
      cols[4],
      'final-slot'
    )
  );

  wrapper.appendChild(
    slotDiv(
      finalMatch.team2,
      Boolean(finalMatch.team2 && finalWinner && finalMatch.team2 === finalWinner),
      finNum,
      2,
      finalTop + SLOT_H,
      cols[4],
      'final-slot'
    )
  );
  container.appendChild(wrapper);

  // Champion banner
  if (finalWinner) {
    const banner = document.createElement('div');
    banner.id = 'championBanner';
    banner.className = 'champion-banner';

    const inner = document.createElement('div');
    inner.className = 'champion-banner-inner';

    const trophy = document.createElement('div');
    trophy.className = 'champion-trophy';
    trophy.textContent = '🏆';

    const flag = document.createElement('span');
    flag.className = 'champion-flag ' + getFlagClass(finalWinner);

    const name = document.createElement('div');
    name.className = 'champion-name';
    name.textContent = finalWinner;

    const label = document.createElement('div');
    label.className = 'champion-label';
    label.textContent = '¡Tu campeón del Mundial!';

    inner.appendChild(trophy);
    inner.appendChild(flag);
    inner.appendChild(name);
    inner.appendChild(label);
    banner.appendChild(inner);
    container.appendChild(banner);
  }
}


function cloneMatchTeamsSnapshot() {
  return JSON.parse(JSON.stringify(state.matchTeams || {}));
}

function sameMatchTeams(a, b) {
  return (a?.team1 || null) === (b?.team1 || null) && (a?.team2 || null) === (b?.team2 || null);
}

function cleanupKnockoutAfterGroupChange(previousMatchTeams) {
  // Si cambiar un resultado de grupos mueve equipos en dieciseisavos, hay que borrar
  // cualquier pick que dependía de la foto anterior. Repetimos hasta estabilizar para
  // que caigan también octavos/cuartos/semis/final cuando su camino ya no existe.
  let changed = true;
  let guard = 0;

  while (changed && guard < 20) {
    changed = false;
    guard += 1;

    buildTPAllocation();
    computeMatchTeams();

    Object.keys(state.knockoutResults).forEach(matchNum => {
      const currentTeams = state.matchTeams[matchNum] || {};
      const previousTeams = previousMatchTeams?.[matchNum] || {};
      const pickedWinner = state.knockoutResults[matchNum];
      const winnerStillInMatch = pickedWinner && (
        pickedWinner === currentTeams.team1 || pickedWinner === currentTeams.team2
      );

      const matchupChanged = previousMatchTeams && !sameMatchTeams(previousTeams, currentTeams);

      if (!winnerStillInMatch || matchupChanged) {
        delete state.knockoutResults[matchNum];
        changed = true;
      }
    });
  }

  buildTPAllocation();
  computeMatchTeams();
}

function pickWinner(matchNum, slotNum) {
  const mt = state.matchTeams[matchNum];
  if (!mt) return;
  const team = slotNum === 1 ? mt.team1 : mt.team2;
  if (!team) return;
  if (state.knockoutResults[matchNum] === team) {
    delete state.knockoutResults[matchNum];
  } else {
    state.knockoutResults[matchNum] = team;
  }
  computeMatchTeams();
  renderAll();
  saveLocalPredictionSoon();
}

function clearKnockoutAndRender(matchNum) {
  if (matchNum == null) return;
  if (!(matchNum in state.knockoutResults)) {
    // Nothing picked for this match, nothing to clear here. Still re-render in case.
    renderAll();
    return;
  }
  delete state.knockoutResults[matchNum];

  // Cascade forward: any later match whose stored winner is no longer present in
  // its (recomputed) team1/team2 must also be cleared. Repeat until stable so
  // QF/SF/Final picks that depended on the removed result also disappear.
  let changed = true;
  let guard = 0;
  while (changed && guard < 20) {
    changed = false;
    guard += 1;
    computeMatchTeams();
    Object.keys(state.knockoutResults).forEach(num => {
      const teams = state.matchTeams[num] || {};
      const w = state.knockoutResults[num];
      if (w && w !== teams.team1 && w !== teams.team2) {
        delete state.knockoutResults[num];
        changed = true;
      }
    });
  }

  renderAll();
  saveLocalPredictionSoon();
}

// ---- Awards ----

function getAwardConfigBySelectId(id) {
  return AWARDS_CONFIG.find(a => a.selectId === id) || null;
}

function getAwardConfigByKey(key) {
  return AWARDS_CONFIG.find(a => a.key === key) || null;
}

function getPlayerByName(name) {
  return AWARD_PLAYERS.find(p => p.name === name) || null;
}

function getAllTeamsFlat() {
  const list = [];
  GROUP_NAMES.forEach(g => {
    (TEAMS_BY_GROUP[g] || []).forEach(t => list.push({ name: t.name, group: g }));
  });
  return list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function awardOptionInnerHtml(kind, value) {
  if (!value) return '<span class="award-placeholder">---</span><span class="award-player-country">Sin elegir</span>';

  if (kind === 'player') {
    const player = getPlayerByName(value);
    if (!player) {
      return `<span class="award-player-name">${escapeHtml(value)}</span>`;
    }
    return `
      <span class="team-flag ${getFlagClass(player.country)}"></span>
      <span class="award-player-name">${escapeHtml(player.name)}</span>
      <span class="award-player-country">${escapeHtml(player.country)}</span>
    `;
  }

  // team
  return `
    <span class="team-flag ${getTeamFlagClass(value)}"></span>
    <span class="award-player-name">${escapeHtml(value)}</span>
  `;
}

function awardDisplayHtml(kind, value) {
  if (!value) return '<span class="award-placeholder">---</span>';
  return awardOptionInnerHtml(kind, value);
}

function ensureAwardPickerModal() {
  let overlay = document.getElementById('awardPickerModal');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'awardPickerModal';
  overlay.className = 'award-picker-overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="award-picker-modal" role="dialog" aria-modal="true">
      <button type="button" class="prediction-modal-close award-picker-close" aria-label="Cerrar">×</button>
      <h3 id="awardPickerTitle">Elegir</h3>
      <div class="award-picker-search">
        <input type="text" id="awardPickerSearch" class="award-picker-search-input"
               placeholder="Buscar por nombre o país..." autocomplete="off" spellcheck="false">
      </div>
      <div class="award-picker-list" id="awardPickerList"></div>
      <div class="award-picker-empty" id="awardPickerEmpty" style="display:none;">Sin resultados</div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('.award-picker-close')) {
      closeAwardPickerModal();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') {
      closeAwardPickerModal();
    }
  });

  const searchInput = overlay.querySelector('#awardPickerSearch');
  searchInput.addEventListener('input', () => filterAwardPickerOptions(searchInput.value));

  return overlay;
}

function closeAwardPickerModal() {
  const overlay = document.getElementById('awardPickerModal');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.dataset.selectId = '';
  const search = overlay.querySelector('#awardPickerSearch');
  if (search) search.value = '';
}

function normalizeAwardSearchText(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function filterAwardPickerOptions(query) {
  const overlay = document.getElementById('awardPickerModal');
  if (!overlay) return;
  const list = overlay.querySelector('#awardPickerList');
  const emptyMsg = overlay.querySelector('#awardPickerEmpty');
  const q = normalizeAwardSearchText(query);
  let visible = 0;
  list.querySelectorAll('.award-picker-option').forEach(opt => {
    // The "Sin elegir" option (data-value="") is always shown.
    if (!opt.dataset.value) {
      opt.style.display = '';
      visible++;
      return;
    }
    const haystack = opt.dataset.search || '';
    const match = !q || haystack.indexOf(q) !== -1;
    opt.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  if (emptyMsg) emptyMsg.style.display = visible <= 1 && q ? 'block' : 'none';
}

function openAwardPickerModal(select) {
  const overlay = ensureAwardPickerModal();
  const list = overlay.querySelector('#awardPickerList');
  const title = overlay.querySelector('#awardPickerTitle');
  const cfg = getAwardConfigBySelectId(select.id);
  if (!cfg) return;
  const label = select.closest('.award-row')?.querySelector('label')?.textContent?.trim() || cfg.label;
  const currentValue = select.value || '';

  overlay.dataset.selectId = select.id;
  title.textContent = label.replace(':', '');
  list.innerHTML = '';

  const empty = document.createElement('button');
  empty.type = 'button';
  empty.className = 'award-picker-option' + (!currentValue ? ' selected' : '');
  empty.dataset.value = '';
  empty.innerHTML = '<span class="award-placeholder">---</span><span class="award-player-country">Sin elegir</span>';
  list.appendChild(empty);

  if (cfg.kind === 'player') {
    getAwardPlayersFor(cfg).forEach(player => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'award-picker-option' + (currentValue === player.name ? ' selected' : '');
      option.dataset.value = player.name;
      option.dataset.search = normalizeAwardSearchText(player.name + ' ' + player.country);
      option.innerHTML = `
        <span class="team-flag ${getFlagClass(player.country)}"></span>
        <span class="award-player-name">${escapeHtml(player.name)}</span>
        <span class="award-player-country">${escapeHtml(player.country)}</span>
      `;
      list.appendChild(option);
    });
  } else {
    getAllTeamsFlat().forEach(team => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'award-picker-option' + (currentValue === team.name ? ' selected' : '');
      option.dataset.value = team.name;
      option.dataset.search = normalizeAwardSearchText(team.name + ' ' + (team.group || ''));
      option.innerHTML = `
        <span class="team-flag ${getTeamFlagClass(team.name)}"></span>
        <span class="award-player-name">${escapeHtml(team.name)}</span>
        <span class="award-player-country">Grupo ${team.group}</span>
      `;
      list.appendChild(option);
    });
  }

  list.onclick = e => {
    const option = e.target.closest('.award-picker-option');
    if (!option) return;

    const activeSelect = document.getElementById(overlay.dataset.selectId);
    if (!activeSelect) return;

    activeSelect.value = option.dataset.value || '';
    syncAwardCustomSelects();
    activeSelect.dispatchEvent(new Event('input', { bubbles: true }));
    activeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    closeAwardPickerModal();
    saveLocalPredictionSoon();
  };

  overlay.style.display = 'flex';
  const searchInput = overlay.querySelector('#awardPickerSearch');
  if (searchInput) {
    searchInput.value = '';
    filterAwardPickerOptions('');
    setTimeout(() => searchInput.focus(), 50);
  }
}

function buildAwardCustomSelect(select) {
  const cfg = getAwardConfigBySelectId(select.id);
  if (!cfg) return;

  let wrap = select.nextElementSibling;
  if (!wrap || !wrap.classList || !wrap.classList.contains('award-custom')) {
    wrap = document.createElement('div');
    wrap.className = 'award-custom award-popup-select';
    wrap.dataset.selectId = select.id;
    wrap.innerHTML = `
      <button type="button" class="award-custom-trigger" aria-haspopup="dialog"></button>
    `;
    select.insertAdjacentElement('afterend', wrap);
  }

  select.classList.add('award-native-hidden');

  const trigger = wrap.querySelector('.award-custom-trigger');
  trigger.innerHTML = awardDisplayHtml(cfg.kind, select.value);

  if (!wrap.dataset.bound) {
    wrap.dataset.bound = '1';
    trigger.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openAwardPickerModal(select);
    });
  }
}

function renderAwardSelects() {
  AWARDS_CONFIG.forEach(cfg => {
    const select = document.getElementById(cfg.selectId);
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">---</option>';

    if (cfg.kind === 'player') {
      getAwardPlayersFor(cfg).forEach(player => {
        const option = document.createElement('option');
        option.value = player.name;
        option.textContent = `${player.name} — ${player.country}`;
        select.appendChild(option);
      });
    } else {
      getAllTeamsFlat().forEach(team => {
        const option = document.createElement('option');
        option.value = team.name;
        option.textContent = `${team.name} (Grupo ${team.group})`;
        select.appendChild(option);
      });
    }

    select.value = currentValue || '';
    buildAwardCustomSelect(select);
  });
}

function syncAwardCustomSelects() {
  AWARDS_CONFIG.forEach(cfg => {
    const select = document.getElementById(cfg.selectId);
    if (!select) return;
    const wrap = select.nextElementSibling;
    if (!wrap || !wrap.classList.contains('award-custom')) return;

    const trigger = wrap.querySelector('.award-custom-trigger');
    if (trigger) trigger.innerHTML = awardDisplayHtml(cfg.kind, select.value);
  });
}

function readAwards() {
  const out = {};
  AWARDS_CONFIG.forEach(cfg => {
    out[cfg.key] = document.getElementById(cfg.selectId)?.value || '';
  });
  return out;
}

function fillAwards(a) {
  renderAwardSelects();
  if (!a) return;

  AWARDS_CONFIG.forEach(cfg => {
    const el = document.getElementById(cfg.selectId);
    if (!el) return;
    el.value = (a && typeof a === 'object' && typeof a[cfg.key] === 'string') ? a[cfg.key] : '';
  });

  syncAwardCustomSelects();
}

// ---- Build Payload ----
function buildPayload() {
  computeMatchTeams();
  const awards = readAwards();

  function winners(nums) { return nums.map(n => state.knockoutResults[n]).filter(Boolean); }
  function allTeams(nums) {
    return nums.flatMap(n => { const m = state.matchTeams[n] || {}; return [m.team1, m.team2]; }).filter(Boolean);
  }
  function matchDetails(nums) {
    return nums.map(n => {
      const m = state.matchTeams[n] || {};
      return {
        match: n,
        team1: m.team1 || null,
        team2: m.team2 || null,
        winner: state.knockoutResults[n] || null
      };
    });
  }

  const r32nums = KO_TREE.round32.map(m => m.num);
  const r16nums = (KO_TREE.round16||[]).map(m => m.num);
  const qfnums  = (KO_TREE.quarterfinals||[]).map(m => m.num);
  const sfnums  = (KO_TREE.semifinals||[]).map(m => m.num);
  const finalNum = (KO_TREE.final && KO_TREE.final[0]) ? KO_TREE.final[0].num : null;
  const thirdNum = (KO_TREE.thirdPlace && KO_TREE.thirdPlace[0]) ? KO_TREE.thirdPlace[0].num : null;
  const finalMatch = finalNum ? (state.matchTeams[finalNum] || {}) : {};
  const thirdMatch = thirdNum ? (state.matchTeams[thirdNum] || {}) : {};
  const champion = finalNum ? (state.knockoutResults[finalNum] || null) : null;
  const runnerUp = champion
    ? ([finalMatch.team1, finalMatch.team2].find(team => team && team !== champion) || null)
    : null;
  const thirdPlaceWinner = thirdNum ? (state.knockoutResults[thirdNum] || null) : null;

  return {
    groups: JSON.parse(JSON.stringify(state.groups)),
    groupsConfirmed: { ...(state.groupsConfirmed || {}) },
    thirdPlace: state.thirdPlace.filter(Boolean),
    thirdPlaceConfirmed: Boolean(state.thirdPlaceConfirmed),
    quiniela1x2: { ...(state.quiniela1x2 || {}) },
    knockout: {
      round32: winners(r32nums),
      round16: winners(r16nums),
      quarterfinals: winners(qfnums),
      semifinals: winners(sfnums),
      final: champion,
      champion,
      runnerUp,
      finalists: [finalMatch.team1, finalMatch.team2].filter(Boolean),
      thirdPlace: thirdPlaceWinner,
      thirdPlaceWinner,
      matches: {
        round32: matchDetails(r32nums),
        round16: matchDetails(r16nums),
        quarterfinals: matchDetails(qfnums),
        semifinals: matchDetails(sfnums),
        final: finalNum ? matchDetails([finalNum]) : [],
        thirdPlace: thirdNum ? matchDetails([thirdNum]) : []
      }
    },
    semifinalists: allTeams(sfnums),
    finalists: [finalMatch.team1, finalMatch.team2].filter(Boolean),
    champion,
    runnerUp,
    thirdPlaceWinner,
    awards
  };
}

// ---- Results ----
function predictionResultStatus(predValue, realValue) {
  if (!realValue || realValue.length === 0) return 'pending';
  if (!predValue) return 'wrong';
  return predValue === realValue ? 'correct' : 'wrong';
}

function getResultOutcome(home, away) {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

function sameTeamSet(a, b) {
  const aa = (a || []).filter(Boolean);
  const bb = (b || []).filter(Boolean);
  if (!aa.length || aa.length !== bb.length) return false;
  const bSet = new Set(bb);
  return aa.every(team => bSet.has(team));
}

function getChampionFromPayload(payload) {
  return payload?.champion || payload?.knockout?.champion || payload?.knockout?.final || null;
}

function getRunnerUpFromPayload(payload) {
  if (payload?.runnerUp || payload?.knockout?.runnerUp) return payload.runnerUp || payload.knockout.runnerUp;

  const champion = getChampionFromPayload(payload);
  const finalists = payload?.finalists || payload?.knockout?.finalists || [];
  if (!champion || finalists.length < 2) return null;
  return finalists.find(team => team && team !== champion) || null;
}


const KNOCKOUT_SCORING = puntuaciones.eliminatorias;

function uniqueTeamList(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function getTeamsFromReviewMatches(reviewState, treeArr) {
  const teams = [];
  (treeArr || []).forEach(match => {
    const mt = reviewState.matchTeams?.[match.num] || {};
    if (mt.team1) teams.push(mt.team1);
    if (mt.team2) teams.push(mt.team2);
  });
  return uniqueTeamList(teams);
}

function getKnockoutStageTeamSets(payload) {
  if (!payload) {
    return {
      round32: new Set(),
      round16: new Set(),
      quarterfinals: new Set(),
      semifinals: new Set(),
      finalist: new Set(),
      champion: new Set(),
      thirdPlace: new Set()
    };
  }

  // Lógica de puntuación KO:
  // - round32: los 32 que llegan a dieciseisavos = 1º y 2º de cada grupo + 8 mejores terceros.
  //   Siempre se calcula desde los grupos, tanto para RESULTS como para apuestas.
  // - round16+: los que participan en esa ronda = ganadores de la ronda anterior.
  //   Se lee del array simple ko.roundX (ganadores), o de los winners de ko.matches.prevRound.
  //   Para apuestas: team1+team2 de ko.matches.round (los cruces que apostaron).

  function koTeamsInRound(ko, round, groups, thirdPlace) {
    const s = new Set();

    if (round === 'round32') {
      // Los 32 participantes = clasificados de grupos
      if (groups) {
        Object.values(groups).forEach(g => { if(g[0]) s.add(g[0]); if(g[1]) s.add(g[1]); });
        (thirdPlace || []).slice(0, 8).forEach(t => t && s.add(t));
      }
      // Fallback si no hay grupos: matches
      if (s.size === 0) {
        ((ko.matches || {}).round32 || []).forEach(m => {
          if(m.team1) s.add(m.team1); if(m.team2) s.add(m.team2);
          if(m.home)  s.add(m.home);  if(m.away)  s.add(m.away);
        });
      }
      return s;
    }

    // round16, quarterfinals, semifinals:
    const prevRound = { round16:'round32', quarterfinals:'round16', semifinals:'quarterfinals' }[round];

    // A: array simple de ganadores de la ronda anterior (RESULTS y apuestas legacy)
    const prevWinners = (ko[prevRound] || []).filter(Boolean);
    if (prevWinners.length) { prevWinners.forEach(t => s.add(t)); return s; }

    // B: winners de matches de la ronda anterior (RESULTS con matches terminados)
    ((ko.matches || {})[prevRound] || []).forEach(m => { if(m.winner) s.add(m.winner); });
    if (s.size) return s;

    // C: team1+team2 de matches de esta ronda (apuestas con formato matches)
    ((ko.matches || {})[round] || []).forEach(m => {
      if(m.team1) s.add(m.team1); if(m.team2) s.add(m.team2);
      if(m.home)  s.add(m.home);  if(m.away)  s.add(m.away);
    });
    return s;
  }

  const ko = payload.knockout || {};
  const finalists  = new Set(uniqueTeamList(getFinalistsFromPayload(payload)));
  const champion   = getChampionFromPayload(payload);
  const thirdWinner = getThirdPlaceWinnerFromPayload(payload);

  return {
    round32:       koTeamsInRound(ko, 'round32',       payload.groups, payload.thirdPlace),
    round16:       koTeamsInRound(ko, 'round16',       null, null),
    quarterfinals: koTeamsInRound(ko, 'quarterfinals', null, null),
    semifinals:    koTeamsInRound(ko, 'semifinals',    null, null),
    finalist:      finalists,
    champion:      new Set(champion    ? [champion]    : []),
    thirdPlace:    new Set(thirdWinner ? [thirdWinner] : [])
  };
}

function getKnockoutProgressPointsForTeam(team, roundName, realStageTeams, predictedState) {
  if (!team || !roundName || !realStageTeams) return 0;

  const stageByRound = {
    round32: 'round32',
    round16: 'round16',
    quarterfinals: 'quarterfinals',
    semifinals: 'semifinals',
    final: 'finalist',
    thirdPlace: 'thirdPlace'
  };

  const stage = stageByRound[roundName];
  if (!stage) return 0;

  let points = realStageTeams[stage]?.has(team) ? (KNOCKOUT_SCORING[stage] || 0) : 0;

  if (roundName === 'final') {
    const finalNum = KO_TREE.final?.[0]?.num;
    const predictedChampion = finalNum ? predictedState?.knockoutResults?.[finalNum] : null;
    if (predictedChampion === team && realStageTeams.champion?.has(team)) {
      points += KNOCKOUT_SCORING.champion;
    }
  }

  return points;
}

function getKnockoutScoreBreakdown(prediction, results = RESULTS) {
  const predStages = getKnockoutStageTeamSets(prediction);
  const realStages = getKnockoutStageTeamSets(results);

  let score = 0;

  ['round32', 'round16', 'quarterfinals', 'semifinals', 'finalist'].forEach(stage => {
    const points = KNOCKOUT_SCORING[stage] || 0;
    predStages[stage].forEach(team => {
      if (realStages[stage].has(team)) score += points;
    });
  });

  predStages.champion.forEach(team => {
    if (realStages.champion.has(team)) score += KNOCKOUT_SCORING.champion;
  });

  predStages.thirdPlace.forEach(team => {
    if (realStages.thirdPlace.has(team)) score += KNOCKOUT_SCORING.thirdPlace;
  });

  return score;
}

function getFinalistsFromPayload(payload) {
  const explicit = payload?.finalists || payload?.knockout?.finalists;
  if (explicit && explicit.length) return explicit.filter(Boolean);

  const champion = getChampionFromPayload(payload);
  const runnerUp = getRunnerUpFromPayload(payload);
  return [champion, runnerUp].filter(Boolean);
}

function getThirdPlaceWinnerFromPayload(payload) {
  return payload?.thirdPlaceWinner || payload?.knockout?.thirdPlaceWinner || payload?.knockout?.thirdPlace || null;
}

function getSemifinalistsFromPayload(payload) {
  return payload?.semifinalists || payload?.knockout?.semifinalists || payload?.knockout?.semifinals || [];
}

function scorePrediction(prediction, results = RESULTS) {
  let score = 0;

  GROUP_NAMES.forEach(group => {
    const predGroup = prediction.groups?.[group] || [];
    const realGroup = results.groups?.[group] || [];

    if (predictionResultStatus(predGroup[0], realGroup[0]) === 'correct') score += puntuaciones.grupos.posicion.primero;
    if (predictionResultStatus(predGroup[1], realGroup[1]) === 'correct') score += puntuaciones.grupos.posicion.segundo;
    if (predictionResultStatus(predGroup[2], realGroup[2]) === 'correct') score += puntuaciones.grupos.posicion.tercero;
    if (predictionResultStatus(predGroup[3], realGroup[3]) === 'correct') score += puntuaciones.grupos.posicion.cuarto;
  });

  // Mejores terceros: 1 punto por cada equipo que el usuario haya clasificado
  // (top 8 de su orden) y que también esté en el top 8 real.
  const predThirdsTop8 = (prediction.thirdPlace || []).filter(Boolean).slice(0, 8);
  const realThirdsTop8 = new Set((results.thirdPlace || []).filter(Boolean).slice(0, 8));
  predThirdsTop8.forEach(team => {
    if (realThirdsTop8.has(team)) score += puntuaciones.grupos.mejorTercero;
  });

  // Quiniela 1X2: 1 punto por cada acierto.
  const predQ = prediction.quiniela1x2 || {};
  const realQ = results.quiniela1x2 || {};
  QUINIELA_1X2_MATCHES.forEach(m => {
    const real = realQ[m.key];
    const pred = predQ[m.key];
    if (real && pred && real === pred) score += puntuaciones.quiniela1x2;
  });

  score += getKnockoutScoreBreakdown(prediction, results);

  const predAwards = prediction.awards || {};
  const realAwards = results.awards || {};
  AWARDS_CONFIG.forEach(cfg => {
    const real = realAwards[cfg.key];
    const pred = predAwards[cfg.key];
    if (real && pred && real === pred) score += cfg.points;
  });

  return score;
}

// ---- Leaderboard ----

async function loadLeaderboard() {
  const res = await fetch(LEADERBOARD_CSV_URL);
  const csv = await res.text();

  const rows = parseCSV(csv);
  const submissions = [];

  rows.slice(1).forEach(row => {
    const rawJson = row[1];
    if (!rawJson) return;

    try {
      const prediction = JSON.parse(rawJson);
      submissions.push({
        name: prediction.name || 'Anonymous',
        score: scorePrediction(prediction),
        prediction
      });
    } catch (e) {
      console.warn('Invalid prediction JSON:', rawJson);
    }
  });

  submissions.sort((a, b) => b.score - a.score);
  renderLeaderboardList(submissions);
}

function parseCSV(csv) {
  const rows = [];
  let row = [];
  let value = '';
  let insideQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (value || row.length) {
        row.push(value);
        rows.push(row);
      }
      row = [];
      value = '';
      if (char === '\r' && next === '\n') i++;
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function renderLeaderboardList(submissions) {
  const container = document.getElementById('leaderboardContent');

  const list = document.createElement('div');
  list.className = 'leaderboard-list';

  container.innerHTML = '';
  container.appendChild(list);

  if (submissions.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'note-text';
    empty.style.marginTop = '20px';
    empty.textContent = 'Nadie ha apostado todavía. Vergüenza ajena.';
    list.appendChild(empty);
    return;
  }

  submissions.forEach((entry, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'leaderboard-entry';

    const playerName = escapeHtml(entry.name);

    btn.innerHTML = `
      <span class="leaderboard-rank">#${index + 1}</span>
      <span class="leaderboard-name"><span>${playerName}</span></span>
      <span class="leaderboard-score">${entry.score} pts</span>
    `;

    btn.addEventListener('click', () => openPredictionModal(entry));
    list.appendChild(btn);
  });
}

function openPredictionModal(entry) {
  const modal = document.getElementById('predictionModal');
  const viewer = document.getElementById('predictionViewer');

  modal.style.display = 'flex';
  viewer.innerHTML = '';

  renderPredictionReview(entry);
}

function closePredictionModal() {
  const modal = document.getElementById('predictionModal');
  const viewer = document.getElementById('predictionViewer');

  modal.style.display = 'none';
  viewer.innerHTML = '';
}


function openScoringHelpModal() {
  const modal = document.getElementById('predictionModal');
  const viewer = document.getElementById('predictionViewer');

  modal.style.display = 'flex';
  viewer.innerHTML = `
    <div class="scoring-help">
      <h3>❓ Cómo se puntúa</h3>

<div class="scoring-help-card">
          <h4>🌍 Fase de grupos</h4>
          <ul>
            <li>Acertar el 1º del grupo: <strong>${puntuaciones.grupos.posicion.primero} pts</strong></li>
            <li>Acertar el 2º del grupo: <strong>${puntuaciones.grupos.posicion.segundo} pts</strong></li>
            <li>Acertar el 3º del grupo: <strong>${puntuaciones.grupos.posicion.tercero} pts</strong></li>
            <li>Cada mejor tercero (top 8) acertado: <strong>${puntuaciones.grupos.mejorTercero} pt</strong></li>
            <li>Quiniela 1X2 (3 partidos): <strong>${puntuaciones.quiniela1x2} pt por acierto</strong></li>
          </ul>
          <p class="scoring-help-small">Solo se acierta arrastrando los equipos en el orden correcto. No hay marcadores exactos. Acertar el 4º no puntúa.</p>
        </div>

        <div class="scoring-help-card">
          <h4>🥊 Eliminatorias</h4>
          <ul>
			<li>Equipo en dieciseisavos: <strong>${puntuaciones.eliminatorias.round32} pts</strong></li>
            <li>Equipo en octavos: <strong>${puntuaciones.eliminatorias.round16} pts</strong></li>
            <li>Equipo en cuartos: <strong>${puntuaciones.eliminatorias.quarterfinals} pts</strong></li>
            <li>Equipo en semifinales: <strong>${puntuaciones.eliminatorias.semifinals} pts</strong></li>
            <li>Finalista: <strong>${puntuaciones.eliminatorias.finalist} pts</strong></li>
            <li>Campeón: <strong>+${puntuaciones.eliminatorias.champion} pts</strong></li>
            <li>Tercer puesto: <strong>${puntuaciones.eliminatorias.thirdPlace} pts</strong></li>
          </ul>
        </div>

        <div class="scoring-help-card">
          <h4>⭐ Logros del Mundial</h4>
          <ul>
            ${AWARDS_CONFIG.map(cfg => `<li>${cfg.emoji} ${escapeHtml(cfg.label)}: <strong>${cfg.points} pts</strong></li>`).join('')}
          </ul>
        </div>
      </div>

      <p class="scoring-help-note">
        La puntuación total de eliminatorias sí suma todas las decisiones acertadas. En el bracket del ranking, cada cajita muestra solo los puntos de esa ronda concreta; en la final puede sumar finalista + campeón si has clavado ambas cosas.
      </p>


      <div class="scoring-help-example">
        <div class="scoring-example-badge got-points">+3</div>
        <div class="scoring-example-text">
          Cada cuadradito verde del leaderboard representa los puntos que te ha dado esa decisión concreta:
          acertar el orden de un grupo, que una selección llegue a 16avos, semis, final, etc.
        </div>
      </div>
    </div>
  `;
}

function openPrizesModal() {
  const modal = document.getElementById('predictionModal');
  const viewer = document.getElementById('predictionViewer');

  modal.style.display = 'flex';
  viewer.innerHTML = `
    <div class="scoring-help">
      <h3>💰 Premios</h3>

      <div class="scoring-help-grid">
        <div class="scoring-help-card">
          <h4>🎟️ La apuesta</h4>
          <ul>
            <li>Cada participante pone <strong>5 €</strong> para entrar en la quiniela.</li>
          </ul>
          <p class="scoring-help-small">El bote total es la suma de todas las apuestas. Solo una apuesta por persona. Pago previo al arranque por Bizum.</p>
        </div>

        <div class="scoring-help-card">
          <h4>🏆 Reparto del bote</h4>
          <ul>
            <li>🥇 1º clasificado: <strong>50% de la recaudación</strong></li>
            <li>🥈 2º clasificado: <strong>30% de la recaudación</strong></li>
            <li>🥉 3º clasificado: <strong>20% de la recaudación</strong></li>
          </ul>
        </div>

        <div class="scoring-help-card">
          <h4>🤝 ¿Y si hay empate?</h4>
          <ul>
            <li>Los empatados se reparten <strong>a partes iguales</strong> la suma de los premios de las posiciones que ocupan.</li>
          </ul>
          <p class="scoring-help-small">Ejemplo: si dos personas empatan en lo más alto, ocupan el 1º y el 2º puesto, así que se reparten ese dinero entre las dos: (50% + 30%) ÷ 2 = <strong>40% cada una</strong>. El siguiente clasificado se lleva el 20% y el cuarto se queda sin premio.</p>
        </div>
      </div>

      <p class="scoring-help-note">
        Ejemplo: si juegan 10 personas, el bote es 50 €. El ganador se lleva 25 €, el segundo 15 € y el tercero 10 €.
      </p>
    </div>
  `;
}

function openHowToPlayModal() {
  const modal = document.getElementById('predictionModal');
  const viewer = document.getElementById('predictionViewer');

  modal.style.display = 'flex';
  viewer.innerHTML = `
    <div class="scoring-help">
      <h3>🎮 Cómo se juega</h3>

      <p class="scoring-help-note">
        Rellena tu pronóstico en las cinco secciones de la pestaña <strong>Apostar</strong>. Todo se guarda solo en tu dispositivo según vas tocando, así que puedes salir y volver sin perder nada. Cuando lo tengas, pulsa <strong>"¡A por la gloria!"</strong>, mete tu nombre y envíalo. Solo cuenta el último envío, y hay tiempo hasta el cierre de apuestas (mira el contador de arriba).
      </p>

      <div class="scoring-help-grid">
        <div class="scoring-help-card">
          <h4>🌍 Fase de grupos</h4>
          <ul>
            <li><strong>Arrastra</strong> los equipos de cada grupo (o usa ▲▼) para ordenarlos del 1º al 4º como crees que quedarán.</li>
            <li>1º y 2º pasan directos; el 3º entra en la lucha de mejores terceros; el 4º queda eliminado.</li>
          </ul>
          <p class="scoring-help-small">Puntos: 1º <strong>${puntuaciones.grupos.posicion.primero}</strong>, 2º <strong>${puntuaciones.grupos.posicion.segundo}</strong>, 3º <strong>${puntuaciones.grupos.posicion.tercero}</strong>. Acertar el 4º no puntúa.</p>
        </div>

        <div class="scoring-help-card">
          <h4>🎯 Quiniela 1X2</h4>
          <ul>
            <li>3 partidos de la fase de grupos. Pulsa <strong>1</strong> (gana el local), <strong>X</strong> (empate) o <strong>2</strong> (gana el visitante).</li>
            <li>Vuelve a pulsar el mismo botón para deseleccionar.</li>
          </ul>
          <p class="scoring-help-small">Puntos: <strong>${puntuaciones.quiniela1x2} pt</strong> por cada partido acertado.</p>
        </div>

        <div class="scoring-help-card">
          <h4>🥉 Mejores terceros</h4>
          <ul>
            <li>Cuando hayas ordenado los 12 grupos, aparecerán aquí los 12 terceros.</li>
            <li>Arrástralos para decidir los <strong>8 que clasifican</strong>; los 4 de abajo se quedan fuera.</li>
          </ul>
          <p class="scoring-help-small">Puntos: <strong>${puntuaciones.grupos.mejorTercero} pt</strong> por cada uno de tus 8 que acabe entre los 8 reales.</p>
        </div>

        <div class="scoring-help-card">
          <h4>🥊 Eliminatorias</h4>
          <ul>
            <li>Haz click en el equipo que crees que gana cada cruce, ronda a ronda, hasta coronar al campeón.</li>
            <li>Si cambias un resultado anterior, los cruces que dependían de él se recalculan solos.</li>
          </ul>
          <p class="scoring-help-small">Puntos acumulativos por cada ronda alcanzada: 1/16 <strong>${puntuaciones.eliminatorias.round32}</strong>, 1/8 <strong>${puntuaciones.eliminatorias.round16}</strong>, cuartos <strong>${puntuaciones.eliminatorias.quarterfinals}</strong>, semis <strong>${puntuaciones.eliminatorias.semifinals}</strong>, finalista <strong>${puntuaciones.eliminatorias.finalist}</strong>, campeón <strong>+${puntuaciones.eliminatorias.champion}</strong>, 3er puesto <strong>${puntuaciones.eliminatorias.thirdPlace}</strong>.</p>
        </div>

        <div class="scoring-help-card">
          <h4>🏆 Premios del Mundial</h4>
          <ul>
            <li>Elige un jugador o equipo en cada categoría (puedes buscar por nombre o país).</li>
            <li>El Guante de Oro solo deja elegir porteros.</li>
          </ul>
          <p class="scoring-help-small">Puntos: ${AWARDS_CONFIG.map(cfg => `${cfg.emoji} <strong>${cfg.points}</strong>`).join(' · ')}.</p>
        </div>
      </div>

      <p class="scoring-help-note">
        ¿Quieres el desglose fino de la puntuación? Lo tienes en <strong>"Cómo se puntúa"</strong>.
      </p>
    </div>
  `;
}

function renderPredictionReview(entry) {
  const viewer = document.getElementById('predictionViewer');

  viewer.innerHTML = `
    <div class="prediction-review">
      <h3>La predicción de ${entry.name} — ${entry.score} pts</h3>

      <h4 class="group-modal-section-title"><span>🌍</span> FASE DE GRUPOS</h4>
      <div class="review-groups" id="reviewGroups"></div>

      <h4 class="group-modal-section-title"><span>🎯</span> QUINIELA 1X2</h4>
      <div class="review-section" id="reviewQuiniela1x2"></div>

      <h4 class="group-modal-section-title"><span>🥉</span> MEJORES TERCEROS</h4>
      <div class="review-section" id="reviewThirdPlace"></div>

      <div class="review-section" id="reviewKnockout"></div>

      <h4 class="group-modal-section-title"><span>⭐</span> LOGROS INDIVIDUALES</h4>
      <div class="review-section" id="reviewAwards"></div>
    </div>
  `;

  renderReviewGroups(entry.prediction, entry);
  renderReviewQuiniela1x2(entry.prediction);
  renderReviewThirdPlace(entry.prediction);
  renderReviewKnockout(entry.prediction);
  renderReviewAwards(entry.prediction);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getPredictionGroupOrder(prediction, group) {
  const order = prediction.groups?.[group] || [];
  const teams = (TEAMS_BY_GROUP[group] || []).map(t => t.name);
  const valid = order.filter(t => teams.includes(t));
  const missing = teams.filter(t => !valid.includes(t));
  return [...valid, ...missing];
}

function getPredictionStandingReviewClass(team, predIdx, realOrder) {
  if (!Array.isArray(realOrder) || realOrder.length === 0) return ' review-pending';
  const realIdx = realOrder.indexOf(team);
  if (realIdx === -1) return ' review-wrong';
  return predIdx === realIdx ? ' review-correct' : ' review-partial';
}

function getPredictedGroupPositionPoints(team, idx, realOrder) {
  if (!Array.isArray(realOrder) || realOrder.length === 0) return 0;
  if (realOrder[idx] !== team) return 0;
  if (idx === 0) return puntuaciones.grupos.posicion.primero;
  if (idx === 1) return puntuaciones.grupos.posicion.segundo;
  if (idx === 2) return puntuaciones.grupos.posicion.tercero;
  if (idx === 3) return puntuaciones.grupos.posicion.cuarto;
  return 0;
}

function calculateGroupReviewTotalPoints(group, prediction) {
  const realOrder = RESULTS.groups?.[group] || [];
  if (!realOrder.length) return 0;
  const predOrder = getPredictionGroupOrder(prediction, group);
  return predOrder.reduce((total, team, idx) => total + getPredictedGroupPositionPoints(team, idx, realOrder), 0);
}

function calculateThirdPlaceReviewPoints(prediction) {
  const predTop8 = (prediction.thirdPlace || []).filter(Boolean).slice(0, 8);
  const realTop8 = new Set((RESULTS.thirdPlace || []).filter(Boolean).slice(0, 8));
  if (realTop8.size === 0) return 0;
  return predTop8.reduce((total, team) => total + (realTop8.has(team) ? puntuaciones.grupos.mejorTercero : 0), 0);
}

function renderReviewPointsBadge(points, title = '') {
  const cls = points > 0 ? ' review-points-badge got-points' : ' review-points-badge no-points';
  return `<span class="${cls}"${title ? ` title="${escapeHtml(title)}"` : ''}>+${points}pt</span>`;
}

function renderStandingRow({ team, idx, statusClass, extraClass = '' }) {
  return `
    <div class="group-team pos-${idx + 1}${extraClass}${statusClass || ''}">
      <span class="position-badge">${idx + 1}</span>
      <span class="team-flag ${getTeamFlagClass(team)}"></span>
      <span class="team-name">${escapeHtml(team)}</span>
    </div>
  `;
}

function isPredictionGroupComplete(group, prediction) {
  // En el nuevo modelo basta con que el usuario haya enviado un orden con los
  // 4 equipos del grupo (algo que siempre ocurre cuando se manda la quiniela).
  const teams = (TEAMS_BY_GROUP[group] || []).map(t => t.name);
  const order = prediction.groups?.[group] || [];
  if (order.length < teams.length) return false;
  const set = new Set(order);
  return teams.every(t => set.has(t));
}

function renderReviewGroups(prediction, entry) {
  const container = document.getElementById('reviewGroups');
  container.className = 'groups-grid';
  container.innerHTML = '';

  const qualifiedThirdsPred = new Set((prediction.thirdPlace || []).slice(0, 8));

  GROUP_NAMES.forEach(g => {
    const complete = isPredictionGroupComplete(g, prediction);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'group-card group-card-clickable review-group-card' + (complete ? ' group-complete' : ' group-empty');
    card.title = 'Ver detalle del grupo ' + g;

    const header = document.createElement('div');
    header.className = 'review-group-card-header';

    const h3 = document.createElement('h3');
    h3.textContent = 'Grupo ' + g;
    header.appendChild(h3);

    const groupTotalPoints = calculateGroupReviewTotalPoints(g, prediction);
    const totalBadge = document.createElement('span');
    totalBadge.className = 'review-group-total-points' + (groupTotalPoints > 0 ? ' got-points' : ' no-points');
    totalBadge.title = 'Total de puntos conseguidos en el grupo ' + g;
    totalBadge.textContent = `+${groupTotalPoints}pt`;
    header.appendChild(totalBadge);

    card.appendChild(header);

    const predOrder = getPredictionGroupOrder(prediction, g);
    const realOrder = RESULTS.groups?.[g] || [];

    predOrder.forEach((team, idx) => {
      const isThird = idx === 2;
      const isFourth = idx === 3;
      const qualifiedAsThird = isThird && qualifiedThirdsPred.has(team);
      const eliminated = isFourth || (isThird && !qualifiedAsThird);
      const statusClass = realOrder.length
        ? getPredictionStandingReviewClass(team, idx, realOrder)
        : ' review-pending';

      const row = document.createElement('div');
      row.className =
        'group-team pos-' + (idx + 1) +
        (eliminated ? ' eliminated' : '') +
        (qualifiedAsThird ? ' qualified-third' : '') +
        statusClass;

      row.innerHTML = `
        <span class="position-badge">${idx + 1}</span>
        <span class="team-flag ${getTeamFlagClass(team)}"></span>
        <span class="team-name">${escapeHtml(team)}</span>
      `;

      card.appendChild(row);
    });

    const hint = document.createElement('div');
    hint.className = 'group-card-hint';
    hint.textContent = 'Ver detalle';
    card.appendChild(hint);

    card.addEventListener('click', () => openReadOnlyGroupResultsModal(entry, g));
    container.appendChild(card);
  });
}

function openReadOnlyGroupResultsModal(entry, group) {
  const viewer = document.getElementById('predictionViewer');
  const prediction = entry.prediction;
  const predOrder = getPredictionGroupOrder(prediction, group);
  const realOrder = RESULTS.groups?.[group] || [];
  const qualifiedThirdsPred = new Set((prediction.thirdPlace || []).slice(0, 8));
  const qualifiedThirdsReal = new Set((RESULTS.thirdPlace || []).slice(0, 8));

  viewer.innerHTML = `
    <div class="group-results-editor group-results-readonly">
      <button type="button" class="toolbar-btn review-back-btn" id="backToPredictionReview">← Volver a ${escapeHtml(entry.name)}</button>
      <h3>GRUPO ${group}</h3>
      <p class="group-modal-subtitle">Solo lectura: orden apostado vs orden real.</p>
      <div class="group-live-standings-wrap">
        <div class="review-standings-compare review-standings-compare-with-points">
          <div class="review-standings-col">
            <div class="review-standings-label">Apostada</div>
            <div class="group-modal-standings" id="predictedGroupStandings"></div>
          </div>
          <div class="review-standings-points-col">
            <div class="review-standings-label">Puntos</div>
            <div class="review-standings-points-list" id="predictedGroupPositionPoints"></div>
          </div>
          <div class="review-standings-col">
            <div class="review-standings-label">Real</div>
            <div class="group-modal-standings" id="realGroupStandings"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const predictedStandingsDiv = viewer.querySelector('#predictedGroupStandings');
  const positionPointsDiv = viewer.querySelector('#predictedGroupPositionPoints');
  const realStandingsDiv = viewer.querySelector('#realGroupStandings');

  predictedStandingsDiv.innerHTML = predOrder.map((team, idx) => {
    const isThird = idx === 2;
    const isFourth = idx === 3;
    const qualifiedAsThird = isThird && qualifiedThirdsPred.has(team);
    const eliminated = isFourth || (isThird && !qualifiedAsThird);
    const statusClass = realOrder.length
      ? getPredictionStandingReviewClass(team, idx, realOrder)
      : ' review-pending';

    return renderStandingRow({
      team,
      idx,
      statusClass,
      extraClass: (eliminated ? ' eliminated' : '') + (qualifiedAsThird ? ' qualified-third' : '')
    });
  }).join('');

  positionPointsDiv.innerHTML = predOrder.map((team, idx) => {
    const points = getPredictedGroupPositionPoints(team, idx, realOrder);
    return `<div class="review-standing-points-row">${renderReviewPointsBadge(points, 'Puntos por esta posición')}</div>`;
  }).join('');

  if (realOrder.length) {
    realStandingsDiv.innerHTML = realOrder.map((team, idx) => {
      const isThird = idx === 2;
      const isFourth = idx === 3;
      const qualifiedAsThird = isThird && qualifiedThirdsReal.has(team);
      const eliminated = isFourth || (isThird && !qualifiedAsThird);

      return renderStandingRow({
        team,
        idx,
        statusClass: '',
        extraClass: (eliminated ? ' eliminated' : '') + (qualifiedAsThird ? ' qualified-third' : '')
      });
    }).join('');
  } else {
    realStandingsDiv.innerHTML = '<p class="note-text">Aún sin resultados oficiales.</p>';
  }

  document.getElementById('backToPredictionReview').addEventListener('click', () => renderPredictionReview(entry));
}

function buildKnockoutReviewState(source) {
  const oldState = JSON.parse(JSON.stringify(state));
  const oldTpAllocation = JSON.parse(JSON.stringify(tpAllocation || {}));

  state.groups = JSON.parse(JSON.stringify(source.groups || {}));
  state.thirdPlace = [...(source.thirdPlace || [])];
  state.knockoutResults = {};
  state.matchTeams = {};

  buildTPAllocation();
  computeMatchTeams();

  const knockout = source.knockout || {};

  function setExplicitMatch(item) {
    if (!item || item.match === undefined || item.match === null) return;
    const matchNum = Number(item.match);
    if (!Number.isFinite(matchNum)) return;

    if (item.team1 || item.team2) {
      state.matchTeams[matchNum] = {
        team1: item.team1 || null,
        team2: item.team2 || null
      };
    }

    if (item.winner) {
      state.knockoutResults[matchNum] = item.winner;
    }
  }

  function setWinnerIfPossible(match, team) {
    if (!match || !team) return;
    const mt = state.matchTeams[match.num] || {};
    if (mt.team1 === team || mt.team2 === team) {
      state.knockoutResults[match.num] = team;
      computeMatchTeams();
    }
  }

  function applyRound(roundName, treeRound) {
    const explicitMatches = knockout.matches?.[roundName];

    // New payload format: use the official match number as source of truth.
    // This is important for the leaderboard review because the real bracket may
    // not be reproducible from the predicted group path. If results.js says
    // match 101 is Portugal vs Norway, the popup/bracket for match 101 must show
    // exactly that, regardless of what the computed bracket path would produce.
    if (Array.isArray(explicitMatches)) {
      explicitMatches.forEach(setExplicitMatch);
      return;
    }

    // Legacy payload format: only winner arrays, so we infer the match by team.
    const winners = knockout[roundName] || [];
    winners.forEach(team => {
      const match = treeRound.find(m => {
        const mt = state.matchTeams[m.num] || {};
        return mt.team1 === team || mt.team2 === team;
      });
      setWinnerIfPossible(match, team);
    });
  }

  applyRound('round32', KO_TREE.round32 || []);
  applyRound('round16', KO_TREE.round16 || []);
  applyRound('quarterfinals', KO_TREE.quarterfinals || []);
  applyRound('semifinals', KO_TREE.semifinals || []);
  applyRound('thirdPlace', KO_TREE.thirdPlace || []);
  applyRound('final', KO_TREE.final || []);

  // Legacy fallbacks for old results/predictions without knockout.matches.final
  // or knockout.matches.thirdPlace.
  if (KO_TREE.final?.[0] && !state.knockoutResults[KO_TREE.final[0].num]) {
    setWinnerIfPossible(KO_TREE.final[0], knockout.final || knockout.champion || source.champion);
  }

  if (KO_TREE.thirdPlace?.[0] && !state.knockoutResults[KO_TREE.thirdPlace[0].num]) {
    setWinnerIfPossible(KO_TREE.thirdPlace[0], knockout.thirdPlace || knockout.thirdPlaceWinner || source.thirdPlaceWinner);
  }

  const reviewState = JSON.parse(JSON.stringify(state));

  state.groups = oldState.groups;
  state.thirdPlace = oldState.thirdPlace;
  state.knockoutResults = oldState.knockoutResults;
  state.matchTeams = oldState.matchTeams;
  tpAllocation = oldTpAllocation;

  return reviewState;
}

function renderKnockoutBracket(reviewState, titleText, options = {}) {
  const order = getBracketDisplayOrder();

  const SLOT_H = 46;
  const GAP = 10;
  const MATCH_GAP = 2;
  const LABEL_H = 32;
  const TITLE_H = 34;
  const COL_W = 170;
  const CONN_W = 58;
  const MATCH_H = SLOT_H * 2 + MATCH_GAP;
  const STEP = MATCH_H + GAP;

  const cols = [
    10,
    COL_W + CONN_W,
    COL_W * 2 + CONN_W * 2,
    COL_W * 3 + CONN_W * 3,
    COL_W * 4 + CONN_W * 4
  ];

  function matchData(treeArr, ord) {
    return (ord || treeArr.map((_, i) => i)).map(i => {
      const m = treeArr[i];
      const mt = reviewState.matchTeams[m.num] || {};
      return {
        team1: mt.team1,
        team2: mt.team2,
        winner: reviewState.knockoutResults[m.num] || null,
        num: m.num
      };
    });
  }

  const r32 = matchData(KO_TREE.round32, order.r32Order);
  const r16 = matchData(KO_TREE.round16, order.r16Order);
  const qf = matchData(KO_TREE.quarterfinals, order.qfOrder);
  const sf = matchData(KO_TREE.semifinals);

  const r32Tree = order.r32Order.map(i => KO_TREE.round32[i]);
  const r16Tree = order.r16Order.map(i => KO_TREE.round16[i]);
  const qfTree = order.qfOrder.map(i => KO_TREE.quarterfinals[i]);
  const sfTree = KO_TREE.semifinals;

  const finMatch = KO_TREE.final?.[0];
  const finNum = finMatch ? finMatch.num : 104;
  const finMt = reviewState.matchTeams[finNum] || {};
  const finalMatch = {
    team1: finMt.team1,
    team2: finMt.team2,
    winner: reviewState.knockoutResults[finNum] || null,
    num: finNum
  };

  const thirdMatchDef = KO_TREE.thirdPlace?.[0];
  const thirdNum = thirdMatchDef ? thirdMatchDef.num : 103;
  const thirdMt = reviewState.matchTeams[thirdNum] || {};
  const thirdMatch = {
    team1: thirdMt.team1,
    team2: thirdMt.team2,
    winner: reviewState.knockoutResults[thirdNum] || null,
    num: thirdNum
  };

  const r32Tops = r32.map((_, i) => TITLE_H + LABEL_H + i * STEP);

  function centerOf(top) {
    return top + SLOT_H;
  }

  function buildTops(dstTree, srcTree, srcTops) {
    return dstTree.map(dst => {
      const s1i = srcTree.findIndex(s => s.num === dst.slot1.matchNum);
      const s2i = srcTree.findIndex(s => s.num === dst.slot2.matchNum);
      if (s1i === -1 || s2i === -1) return TITLE_H + LABEL_H;
      return ((centerOf(srcTops[s1i]) + centerOf(srcTops[s2i])) / 2) - SLOT_H;
    });
  }

  const r16Tops = buildTops(r16Tree, r32Tree, r32Tops);
  const qfTops = buildTops(qfTree, r16Tree, r16Tops);
  const sfTops = buildTops(sfTree, qfTree, qfTops);

  let finalTop = TITLE_H + LABEL_H;
  if (sfTops.length === 2) {
    finalTop = ((centerOf(sfTops[0]) + centerOf(sfTops[1])) / 2) - SLOT_H;
  }

  const thirdTop = finalTop;

  const maxH = TITLE_H + LABEL_H + r32.length * STEP + 40;

  const wrapper = document.createElement('div');
  wrapper.className = 'bracket review-knockout-bracket' + (options.extraClass ? ' ' + options.extraClass : '');
  wrapper.style.cssText =
    'position:relative;height:' + maxH + 'px;min-width:' + (COL_W * 5 + CONN_W * 4 + 40) + 'px';

  const title = document.createElement('div');
  title.className = 'review-knockout-title';
  title.style.cssText = 'position:absolute;top:0;left:10px;width:' + (COL_W * 5 + CONN_W * 4) + 'px;';
  title.textContent = titleText || '';
  if (titleText) wrapper.appendChild(title);

  ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semis', 'Final'].forEach((lbl, i) => {
    const l = document.createElement('div');
    l.className = 'bracket-round-label';
    l.style.cssText =
      'position:absolute;top:' + TITLE_H + 'px;left:' + cols[i] + 'px;width:' + COL_W + 'px;text-align:center;';
    l.textContent = lbl;
    wrapper.appendChild(l);
  });

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', maxH);
  svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:1;';

  function mkPath(d) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    p.setAttribute('stroke', '#81C784');
    p.setAttribute('stroke-width', '2');
    p.setAttribute('fill', 'none');
    return p;
  }

  function connect(srcTree, srcTops, dstTree, dstTops, srcLeft, dstLeft) {
    const sx = srcLeft + COL_W - 6;
    const dx = dstLeft + 3;
    const mx = sx + (dx - sx) / 2;

    dstTree.forEach((dst, di) => {
      const s1i = srcTree.findIndex(s => s.num === dst.slot1.matchNum);
      const s2i = srcTree.findIndex(s => s.num === dst.slot2.matchNum);
      if (s1i === -1 || s2i === -1) return;

      const y1 = centerOf(srcTops[s1i]);
      const y2 = centerOf(srcTops[s2i]);
      const yd = centerOf(dstTops[di]);

      svg.appendChild(mkPath(`M${sx},${y1} L${mx},${y1} L${mx},${yd} L${dx},${yd}`));
      svg.appendChild(mkPath(`M${sx},${y2} L${mx},${y2} L${mx},${yd} L${dx},${yd}`));
    });
  }

  function connectSemisToFinal() {
    if (sfTree.length !== 2) return;

    const sx = cols[3] + COL_W - 6;
    const dx = cols[4] + 3;
    const mx = sx + (dx - sx) / 2;
    const yd = centerOf(finalTop);

    sfTops.forEach(top => {
      const y = centerOf(top);
      svg.appendChild(mkPath(`M${sx},${y} L${mx},${y} L${mx},${yd} L${dx},${yd}`));
    });
  }

  function connectSemisToThirdPlace() {
    if (sfTops.length !== 2 || !thirdMatchDef) return;

    const x = cols[3] + (COL_W / 2) - 3;
    const upperBottom = sfTops[0] + MATCH_H;
    const lowerTop = sfTops[1];
    const thirdTopEdge = thirdTop - 6;
    const thirdBottomEdge = thirdTop + MATCH_H + 6;

    if (upperBottom < thirdTopEdge) {
      const p1 = mkPath(`M${x},${upperBottom} L${x},${thirdTopEdge}`);
      p1.setAttribute('stroke-width', '2');
      svg.appendChild(p1);
    }

    if (thirdBottomEdge < lowerTop) {
      const p2 = mkPath(`M${x},${thirdBottomEdge} L${x},${lowerTop}`);
      p2.setAttribute('stroke-width', '2');
      svg.appendChild(p2);
    }
  }

  connect(r32Tree, r32Tops, r16Tree, r16Tops, cols[0], cols[1]);
  connect(r16Tree, r16Tops, qfTree, qfTops, cols[1], cols[2]);
  connect(qfTree, qfTops, sfTree, sfTops, cols[2], cols[3]);
  connectSemisToFinal();
  connectSemisToThirdPlace();
  wrapper.appendChild(svg);

  function slotDiv(team, winner, top, left, matchNum, roundName) {
    const hasTeam = Boolean(team);
    const isWinner = hasTeam && winner && team === winner;
    const matchInfo = options.matchInfoByNum?.[matchNum];
    const isClickable = Boolean(options.onMatchClick && matchInfo?.realHasMatch);
    const slotPoints = hasTeam && typeof options.getSlotPoints === 'function'
      ? Number(options.getSlotPoints(team, roundName, matchNum) || 0)
      : null;

    const d = document.createElement('div');
    d.className =
      'bracket-slot' +
      (hasTeam ? ' has-team' : ' empty-slot') +
      (isWinner ? ' winner' : '') +
      (isClickable ? ' review-match-clickable' : '');

    d.style.cssText =
      'position:absolute;top:' + top + 'px;left:' + left + 'px;width:' + (COL_W - 6) + 'px;z-index:2;' +
      (isClickable ? 'cursor:pointer;' : 'cursor:default;');

    d.innerHTML =
      (slotPoints !== null ? '<span class="review-knockout-slot-points ' + (slotPoints > 0 ? 'got-points' : '') + '">' + escapeHtml(`+${slotPoints}pt`) + '</span>' : '') +
      '<span class="slot-flag ' + getFlagClass(team) + '"></span>' +
      '<span class="slot-name">' + escapeHtml(team || '---') + '</span>' +
      (isClickable ? '<span class="review-match-info-dot" title="Ver partido real">i</span>' : '');

    if (isClickable) {
      d.setAttribute('data-match-num', String(matchNum));
      d.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        options.onMatchClick(matchNum, ev, d);
      });
    }

    return d;
  }

  function drawRound(matches, tops, colIdx) {
    const left = cols[colIdx];
    matches.forEach((m, i) => {
      const roundName = ['round32', 'round16', 'quarterfinals', 'semifinals'][colIdx] || '';
      wrapper.appendChild(slotDiv(m.team1, m.winner, tops[i], left, m.num, roundName));
      wrapper.appendChild(slotDiv(m.team2, m.winner, tops[i] + SLOT_H, left, m.num, roundName));
    });
  }

  drawRound(r32, r32Tops, 0);
  drawRound(r16, r16Tops, 1);
  drawRound(qf, qfTops, 2);
  drawRound(sf, sfTops, 3);

  if (thirdMatchDef) {
    const thirdLabel = document.createElement('div');
    thirdLabel.className = 'bracket-round-label';
    thirdLabel.style.cssText =
      'position:absolute;top:' + Math.max(TITLE_H + LABEL_H, thirdTop - 26) + 'px;left:' + cols[3] + 'px;width:' + COL_W + 'px;text-align:center;color:#2E7D32;z-index:3;';
    thirdLabel.textContent = '3er puesto';
    wrapper.appendChild(thirdLabel);

    wrapper.appendChild(slotDiv(thirdMatch.team1, thirdMatch.winner, thirdTop, cols[3], thirdMatch.num, 'thirdPlace'));
    wrapper.appendChild(slotDiv(thirdMatch.team2, thirdMatch.winner, thirdTop + SLOT_H, cols[3], thirdMatch.num, 'thirdPlace'));
  }

  wrapper.appendChild(slotDiv(finalMatch.team1, finalMatch.winner, finalTop, cols[4], finalMatch.num, 'final'));
  wrapper.appendChild(slotDiv(finalMatch.team2, finalMatch.winner, finalTop + SLOT_H, cols[4], finalMatch.num, 'final'));

  return wrapper;
}

function renderReviewKnockout(prediction) {
  const container = document.getElementById('reviewKnockout');
  container.className = 'review-knockout-click-section';
  container.innerHTML = `
    <div class="review-knockout-header">
      <div>
        <h4 class="group-modal-section-title"><span>🏆</span> ELIMINATORIAS: APOSTADO VS REAL</h4>
        <p class="note-text review-knockout-note">Haz click en un partido para comparar el cruce esperado con el cruce real, cuando ese partido real ya exista.</p>
      </div>
    </div>
  `;

  const predictedState = buildKnockoutReviewState(prediction);
  const realState = buildKnockoutReviewState(RESULTS);

  const matchInfoByNum = {};
  Object.keys(predictedState.matchTeams || {}).forEach(matchNum => {
    const realMatch = realState.matchTeams?.[matchNum] || {};
    matchInfoByNum[matchNum] = {
      realHasMatch: Boolean(realMatch.team1 && realMatch.team2)
    };
  });

  function closeKnockoutPopover() {
    document.querySelectorAll('.knockout-match-popover').forEach(el => el.remove());
  }

  function teamMini(team, winner) {
    const isWinner = team && winner && team === winner;
    return `
      <div class="knockout-popover-team ${isWinner ? 'winner' : ''}">
        <span class="slot-flag ${getFlagClass(team)}"></span>
        <span>${escapeHtml(team || '---')}</span>
      </div>
    `;
  }

  function showKnockoutMatchPopover(matchNum, ev) {
    const expected = predictedState.matchTeams?.[matchNum] || {};
    const real = realState.matchTeams?.[matchNum] || {};
    const hasRealMatch = Boolean(real.team1 && real.team2);
    if (!hasRealMatch) return;

    closeKnockoutPopover();

    const expectedWinner = predictedState.knockoutResults?.[matchNum] || null;
    const realWinner = realState.knockoutResults?.[matchNum] || null;

    const pop = document.createElement('div');
    pop.className = 'knockout-match-popover';
    pop.innerHTML = `
      <button type="button" class="knockout-popover-close" aria-label="Cerrar">×</button>
      <div class="knockout-popover-title">Partido #${escapeHtml(matchNum)}</div>
      <div class="knockout-popover-grid">
        <div class="knockout-popover-card expected">
          <div class="knockout-popover-label">Partido esperado</div>
          ${teamMini(expected.team1, expectedWinner)}
          ${teamMini(expected.team2, expectedWinner)}
        </div>
        <div class="knockout-popover-card real">
          <div class="knockout-popover-label">Partido real</div>
          ${teamMini(real.team1, realWinner)}
          ${teamMini(real.team2, realWinner)}
        </div>
      </div>
    `;

    document.body.appendChild(pop);
    pop.addEventListener('click', e => e.stopPropagation());

    const closeBtn = pop.querySelector('.knockout-popover-close');
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeKnockoutPopover();
    });

    const margin = 12;
    const rect = pop.getBoundingClientRect();
    let left = ev.clientX + 14;
    let top = ev.clientY + 14;

    if (left + rect.width + margin > window.innerWidth) {
      left = Math.max(margin, ev.clientX - rect.width - 14);
    }
    if (top + rect.height + margin > window.innerHeight) {
      top = Math.max(margin, ev.clientY - rect.height - 14);
    }

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;

    setTimeout(() => {
      document.addEventListener('click', closeKnockoutPopover, { once: true });
    }, 0);
  }

  const realStageTeams = getKnockoutStageTeamSets(RESULTS);

  function getBracketSlotPoints(team, roundName) {
    return getKnockoutProgressPointsForTeam(team, roundName, realStageTeams, predictedState);
  }

  const pane = document.createElement('div');
  pane.className = 'bracket-wrapper review-knockout-pane review-knockout-click-pane';

  const predictedBracket = renderKnockoutBracket(predictedState, '', {
    extraClass: 'review-knockout-predicted review-knockout-clickable-bracket',
    matchInfoByNum,
    getSlotPoints: getBracketSlotPoints,
    onMatchClick: showKnockoutMatchPopover
  });

  pane.appendChild(predictedBracket);
  container.appendChild(pane);
}

function renderReviewQuiniela1x2(prediction) {
  const container = document.getElementById('reviewQuiniela1x2');
  if (!container) return;
  container.className = 'review-section quiniela1x2-review';
  container.innerHTML = '';

  const predQ = prediction.quiniela1x2 || {};
  const realQ = (RESULTS && RESULTS.quiniela1x2) || {};

  QUINIELA_1X2_MATCHES.forEach(m => {
    const pred = predQ[m.key] || '';
    const real = realQ[m.key] || '';
    const resolved = Boolean(real);
    const correct = resolved && pred && pred === real;
    const wrong = resolved && pred && pred !== real;
    const points = correct ? puntuaciones.quiniela1x2 : 0;

    const row = document.createElement('div');
    row.className =
      'quiniela1x2-review-row' +
      (correct ? ' review-correct' : '') +
      (wrong ? ' review-wrong' : '') +
      (!resolved ? ' review-pending' : '');

    row.innerHTML = `
      <div class="quiniela1x2-review-match">
        <span class="team-flag ${getTeamFlagClass(m.team1)}"></span>
        <span class="team-name">${escapeHtml(m.team1)}</span>
        <span class="quiniela1x2-vs">vs</span>
        <span class="team-name">${escapeHtml(m.team2)}</span>
        <span class="team-flag ${getTeamFlagClass(m.team2)}"></span>
        <small class="quiniela1x2-review-group">(Grupo ${escapeHtml(m.group)})</small>
      </div>
      <div class="quiniela1x2-review-picks">
        <span class="quiniela1x2-review-pick" title="Tu apuesta">Tuya: <strong>${pred ? escapeHtml(pred) : '—'}</strong></span>
        <span class="quiniela1x2-review-pick" title="Resultado real">Real: <strong>${resolved ? escapeHtml(real) : '—'}</strong></span>
        ${renderReviewPointsBadge(points, 'Puntos por este 1X2')}
      </div>
    `;

    container.appendChild(row);
  });
}

function renderReviewThirdPlace(prediction) {
  const container = document.getElementById('reviewThirdPlace');
  if (!container) return;
  container.innerHTML = '';

  const predTop8 = (prediction.thirdPlace || []).filter(Boolean).slice(0, 8);
  const realTop8 = new Set((RESULTS.thirdPlace || []).filter(Boolean).slice(0, 8));
  const resolved = realTop8.size > 0;

  if (!resolved) {
    container.innerHTML = '<p class="review-pending-note">Aún no hay mejores terceros confirmados.</p>';
    return;
  }

  if (predTop8.length === 0) {
    container.innerHTML = '<p class="review-pending-note">No apostó por ningún mejor tercero.</p>';
    return;
  }

  const totalPoints = predTop8.reduce((sum, team) => sum + (realTop8.has(team) ? puntuaciones.grupos.mejorTercero : 0), 0);

  const header = document.createElement('div');
  header.className = 'quiniela1x2-review-row';
  header.innerHTML = `<strong>Equipos apostados (top 8):</strong> ${renderReviewPointsBadge(totalPoints, 'Total puntos mejores terceros')}`;
  container.appendChild(header);

  predTop8.forEach((team, idx) => {
    const correct = realTop8.has(team);
    const points  = correct ? puntuaciones.grupos.mejorTercero : 0;

    const row = document.createElement('div');
    row.className = 'quiniela1x2-review-row' + (correct ? ' review-correct' : (resolved ? ' review-wrong' : ' review-pending'));
    row.innerHTML = `
      <div class="quiniela1x2-review-match">
        <span class="position-badge">${idx + 1}</span>
        <span class="team-flag ${getTeamFlagClass(team)}"></span>
        <span class="team-name">${escapeHtml(team)}</span>
      </div>
      <div class="quiniela1x2-review-picks">
        ${renderReviewPointsBadge(points, correct ? 'Acertado' : 'No clasificó entre los 8')}
      </div>
    `;
    container.appendChild(row);
  });
}

function renderReviewAwards(prediction) {
  const container = document.getElementById('reviewAwards');
  container.className = 'awards-section';
  container.innerHTML = '';

  const predAwards = prediction.awards || {};
  const realAwards = RESULTS.awards || {};

  AWARDS_CONFIG.forEach(cfg => {
    const predicted = typeof predAwards[cfg.key] === 'string' ? predAwards[cfg.key] : '';
    const real = typeof realAwards[cfg.key] === 'string' ? realAwards[cfg.key] : '';
    const resolved = Boolean(real);
    const correct = resolved && predicted && predicted === real;
    const wrong = resolved && predicted !== real;

    const row = document.createElement('div');
    row.className =
      'award-row review-award-row' +
      (correct ? ' review-correct' : '') +
      (wrong ? ' review-wrong' : '') +
      (!resolved ? ' review-pending' : '');

    row.innerHTML = `
      <label>${cfg.emoji} ${escapeHtml(cfg.label)} (${cfg.points}pt):</label>
      <div class="award-select review-award-display">
        ${awardDisplayHtml(cfg.kind, predicted)}
        ${resolved ? `<small class="review-award-real">Real: ${awardDisplayHtml(cfg.kind, real)}</small>` : ''}
      </div>
    `;

    container.appendChild(row);
  });
}

// ---- Scoring ----
function calculateScore(prediction, results) {
  return scorePrediction(prediction, results);
}

// ---- Leaderboard ----
function renderLeaderboard(entries) {
  const div = document.getElementById('leaderboardContent');
  if (!entries || entries.length === 0) {
    div.innerHTML = '<p class="note-text" style="margin-top:20px;">No predictions found.</p>';
    return;
  }
  entries.sort((a,b) => b.score - a.score);

  const table = document.createElement('table');
  table.className = 'leaderboard-table';
  table.innerHTML = `<thead><tr><th>#</th><th>Name</th><th>Score</th><th>Champion</th></tr></thead><tbody></tbody>`;
  const tbody = table.querySelector('tbody');

  entries.forEach((e, idx) => {
    const tr = document.createElement('tr');
    if (idx === 0) tr.className = 'rank-1';
    tr.innerHTML = `<td>${idx===0?'<span class="rank-crown">👑</span> ':''}${idx+1}</td><td>${e.name}</td><td>${e.score}</td><td>${e.champion||'--'}</td>`;
    tbody.appendChild(tr);
  });

  div.innerHTML = '';
  div.appendChild(table);
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i+1]==='"') { field+='"'; i++; } else inQuotes = false; }
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i+1]==='\n') i++;
        row.push(field); field = '';
        if (row.length) rows.push(row);
        row = [];
      } else field += ch;
    }
  }
  row.push(field);
  if (row.length || field) rows.push(row);
  return rows;
}

// ---- Submit ----
const FORM_ACTION = 'https://docs.google.com/forms/d/e/'+FORM_ID+'/formResponse';

// Comprueba qué le falta a la apuesta antes de poder enviarla.
// Devuelve un array de textos legibles (vacío => está todo completo).
function getMissingSections() {
  const missing = [];

  ensureGroupsInitialized();
  buildTPAllocation();
  computeMatchTeams();

  // 1) Fase de grupos: los 12 grupos confirmados
  const unconfirmedGroups = GROUP_NAMES.filter(g => !isGroupComplete(g));
  if (unconfirmedGroups.length > 0) {
    missing.push('la fase de grupos (sin confirmar: ' +
      unconfirmedGroups.map(g => 'Grupo ' + g).join(', ') + ')');
  }

  // 2) Mejores terceros: ranking confirmado
  if (!state.thirdPlaceConfirmed) {
    missing.push('los mejores terceros (ordénalos y pulsa "Confirmar ranking")');
  }

  // 3) Quiniela 1X2: los 3 partidos
  const q = state.quiniela1x2 || {};
  const quinielaPending = QUINIELA_1X2_MATCHES.filter(m => !q[m.key]).length;
  if (quinielaPending > 0) {
    missing.push('la quiniela 1X2 (faltan ' + quinielaPending + ' de ' +
      QUINIELA_1X2_MATCHES.length + ' partidos)');
  }

  // 4) Eliminatoria: todos los cruces con ganador
  const koRounds = [
    { key: 'round32',       label: 'dieciseisavos' },
    { key: 'round16',       label: 'octavos' },
    { key: 'quarterfinals', label: 'cuartos' },
    { key: 'semifinals',    label: 'semifinales' },
    { key: 'final',         label: 'la final' },
    { key: 'thirdPlace',    label: 'el 3.er puesto' }
  ];
  const koPending = koRounds
    .filter(r => (KO_TREE[r.key] || []).some(m => !state.knockoutResults[m.num]))
    .map(r => r.label);
  if (koPending.length > 0) {
    missing.push('la fase eliminatoria (faltan: ' + koPending.join(', ') + ')');
  }

  // 5) Premios: los 5
  const awards = readAwards();
  const awardsPending = AWARDS_CONFIG.filter(cfg => !awards[cfg.key]);
  if (awardsPending.length > 0) {
    missing.push('los premios (faltan: ' +
      awardsPending.map(cfg => cfg.label).join(', ') + ')');
  }

  return missing;
}

// Aviso de apuesta incompleta, reutilizando el modal existente.
function showIncompleteSubmissionModal(missing) {
  const modal = document.getElementById('predictionModal');
  const viewer = document.getElementById('predictionViewer');

  if (!modal || !viewer) {
    // Fallback por si el modal no estuviera disponible.
    showToast('Te falta por rellenar: ' + missing.join('; ') +
      '. Tu apuesta NO se ha enviado.', true);
    return;
  }

  modal.style.display = 'flex';
  viewer.innerHTML = `
    <div class="scoring-help">
      <h3>⚠️ Te falta algo por rellenar</h3>
      <div class="scoring-help-card">
        <p><strong>Te falta por rellenar:</strong></p>
        <ul>
          ${missing.map(item => '<li>' + escapeHtml(item) + '</li>').join('')}
        </ul>
      </div>
      <p class="scoring-help-note">
        Tu apuesta <strong>NO se ha enviado</strong>. Complétalo y vuelve a darle a
        <strong>"¡A por la gloria!"</strong>.
      </p>
    </div>
  `;
}

function submitPrediction() {
  if (isSubmissionClosed()) {
    showToast('El plazo se cerró el 11 de junio a las 19:00. Llegas tarde, sorry baby.', true);
    return;
  }

  const missing = getMissingSections();
  if (missing.length > 0) {
    showIncompleteSubmissionModal(missing);
    return;
  }

  openNameModal();
}

function openNameModal() {
  const modal = document.getElementById('nameModal');
  const input = document.getElementById('playerNameInput');

  modal.style.display = 'flex';
  input.value = '';
  setTimeout(() => input.focus(), 50);
}

function closeNameModal() {
  document.getElementById('nameModal').style.display = 'none';
}

async function confirmSubmitPrediction() {
  if (isSubmissionClosed()) {
    showToast('El plazo ya está cerrado.', true);
    closeNameModal();
    return;
  }

  // Segunda comprobación: no enviar si falta algo.
  const missing = getMissingSections();
  if (missing.length > 0) {
    closeNameModal();
    showIncompleteSubmissionModal(missing);
    return;
  }

  const input = document.getElementById('playerNameInput');
  const playerName = input.value.trim();

  if (!playerName) {
    showToast('Eh, eh, eh… sin nombre no hay quiniela, compi.', true);
    input.focus();
    return;
  }

  const payload = buildPayload();
  payload.name = playerName;
  payload._submittedAt = new Date().toISOString();

  const params = new URLSearchParams();
  params.append(ENTRY_ID, JSON.stringify(payload));

  closeNameModal();
  showLoading('Publicando...');

  try {
    await fetch(FORM_ACTION, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    hideLoading();
    fireConfetti();
    showToast('¡Pronóstico registrado! Tarda unos segundos en aparecer en el ranking. Mucha suerte.');
  } catch(e) {
    hideLoading();
    showToast('Algo ha petado al enviar. Inténtalo otra vez o avisa al de sistemas (a ver si te hace caso).', true);
  }
}

// ---- Master Render ----
function renderAll() {
  buildTPAllocation();
  computeMatchTeams();
  renderGroups();
  renderQuiniela1x2();
  renderBestThirds();
  renderThirdPlace();
  renderBracket();
  renderAwardSelects();
  loadLeaderboard();
}

function resetState() {
  GROUP_NAMES.forEach(g => {
    state.groups[g] = TEAMS_BY_GROUP[g].map(t => t.name);
  });

  state.groupsConfirmed = {};
  state.thirdPlace = [];
  state.thirdPlaceConfirmed = false;
  state.quiniela1x2 = {};
  ensureGroupsInitialized();

  state.knockoutResults = {};
  state.matchTeams = {};
  state.knockout = {};

  state.awards = emptyAwardsState();

  fillAwards(state.awards);
  clearLocalPrediction();
  buildTPAllocation();
  computeMatchTeams();
  renderAll();

  showToast('A tomar por culo.');
}

// ---- Init ----
async function init() {
  showLoading('Cargando el Mundial...');
  const ok = await loadData();
  hideLoading();
  if (!ok) { showToast('No hay datos del Mundial. Revisa la conexión y recarga (sí, otra vez).', true); return; }

  // Clear stale localStorage from old incompatible data
  const v = localStorage.getItem(LOCAL_STORAGE_VERSION_KEY);
  if (v !== LOCAL_STORAGE_VERSION) {
    localStorage.removeItem(LOCAL_STORAGE_PICKS_KEY);
    localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, LOCAL_STORAGE_VERSION);
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    });
  });

	document.getElementById('btnReset').addEventListener('click', () => {
		resetState();
		computeMatchTeams();
		renderAll();
	  });
  const btnScoringHelp = document.getElementById('btnScoringHelp');
  if (btnScoringHelp) {
    btnScoringHelp.addEventListener('click', openScoringHelpModal);
  }
  const btnPrizes = document.getElementById('btnPrizes');
  if (btnPrizes) {
    btnPrizes.addEventListener('click', openPrizesModal);
  }
  const btnHowToPlay = document.getElementById('btnHowToPlay');
  if (btnHowToPlay) {
    btnHowToPlay.addEventListener('click', openHowToPlayModal);
  }
  document.getElementById('btnSubmit').addEventListener('click', submitPrediction);
  document.getElementById('confirmNameSubmit').addEventListener('click', confirmSubmitPrediction);
  document.getElementById('cancelNameSubmit').addEventListener('click', closeNameModal);
  document.getElementById('playerNameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmSubmitPrediction();
    if (e.key === 'Escape') closeNameModal();
  });

  document.getElementById('closePredictionModal').addEventListener('click', closePredictionModal);

  document.getElementById('predictionModal').addEventListener('click', e => {
    if (e.target.id === 'predictionModal') closePredictionModal();
  });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closePredictionModal();
    closeAwardPickerModal();
  }
});


  restoreLocalPrediction();
  fillAwards(state.awards);
  computeMatchTeams();
  renderAll();

  document.querySelectorAll(AWARD_SELECT_IDS.map(id => '#' + id).join(',')).forEach(el => {
    el.addEventListener('input', saveLocalPredictionSoon);
    el.addEventListener('change', saveLocalPredictionSoon);
  });

  if (window.location.hash === '#leaderboard') {
    document.querySelector('[data-tab="leaderboard"]').click();
  }

  updateCountdowns();
  setInterval(updateCountdowns, 1000);
}

document.addEventListener('DOMContentLoaded', init);
