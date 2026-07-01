/* ============================================================
   Resultados oficiales en directo del Mundial 2026.
   ------------------------------------------------------------
   Este archivo arranca VACÍO: mientras no haya nada relleno,
   el ranking muestra a todo el mundo con 0 puntos.
   A medida que vayas escribiendo resultados aquí (orden final
   de un grupo, ganadores de eliminatorias, premios, etc.), la
   app recalcula automáticamente las puntuaciones de cada
   participante. Lo que dejes vacío ("" o []) sigue contando
   como "pendiente" y no resta puntos a nadie.

   Si quieres volver a partir de cero, copia el contenido de
   results-empty.js sobre este archivo.
   ------------------------------------------------------------
   Cambios importantes:
   - YA NO se predicen resultados exactos de partidos: solo el
     ORDEN en que terminan los equipos en cada grupo.
     Por eso este archivo no tiene "groupMatches".
   - "thirdPlace" es la lista de los 8 mejores terceros que
     pasan a dieciseisavos, en el orden 1º-8º.
   - "awards" tiene 5 categorías nuevas y divertidas.
   ============================================================ */

const RESULTS = {
  // Orden final de cada grupo: 1º, 2º, 3º, 4º.
  groups: {
    A: ["México", "Sudáfrica", "Corea del Sur", "República Checa"],
    B: ["Suiza", "Canadá", "Bosnia y Herzegovina", "Catar"],
    C: ["Brasil", "Marruecos", "Escocia", "Haití"],
    D: ["Estados Unidos", "Australia", "Paraguay", "Turquía"],
    E: ["Alemania", "Costa de Marfil", "Ecuador", "Curazao"],
    F: ["Países Bajos", "Japón", "Suecia", "Túnez"],
    G: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
    H: ["España", "Cabo Verde", "Uruguay", "Arabia Saudí"],
    I: ["Francia", "Noruega", "Senegal", "Irak"],
    J: ["Argentina", "Austria", "Argelia", "Jordania"],
    K: ["Colombia", "Portugal", "RD del Congo", "Uzbekistán"],
    L: ["Inglaterra", "Croacia", "Ghana", "Panamá"]
  },

  // Los 8 mejores terceros que clasifican a dieciseisavos,
  // en orden (1º mejor tercero → 8º mejor tercero).
  thirdPlace: [
    "RD del Congo",     // 4 pts, DG +1
    "Suecia",           // 4 pts, DG  0, 7 GF
    "Ecuador",          // 4 pts, DG  0, 2 GF
    "Ghana",            // 4 pts, DG  0, 2 GF
    "Bosnia y Herzegovina", // 4 pts, DG -1
    "Argelia",          // 4 pts, DG -2, 5 GF
    "Paraguay",         // 4 pts, DG -2, 2 GF
    "Senegal"           // 3 pts
  ],

  // Quiniela 1X2 — resultados reales de los 3 partidos fijos.
  // Valores admitidos: "1" (gana team1), "X" (empate), "2" (gana team2).
  // Las claves coinciden con `[team1, team2].sort().join('__')` definido en
  // QUINIELA_1X2_MATCHES dentro de app.js. Dejar "" mientras el partido no
  // se haya jugado.
  quiniela1x2: {
    "Corea del Sur__México": "1",
    "Escocia__Marruecos":    "2",
    "España__Uruguay":       "2"
  },

  knockout: {
    round32: [
      // 12 primeros clasificados
      "México", "Suiza", "Brasil", "Estados Unidos",
      "Alemania", "Países Bajos", "Bélgica", "España",
      "Francia", "Argentina", "Colombia", "Inglaterra",
      // 12 segundos clasificados
      "Sudáfrica", "Canadá", "Marruecos", "Australia",
      "Costa de Marfil", "Japón", "Egipto", "Cabo Verde",
      "Noruega", "Austria", "Portugal", "Croacia",
      // 8 mejores terceros
      "Bosnia y Herzegovina", "Paraguay", "Ecuador", "Suecia",
      "Senegal", "Argelia", "RD del Congo", "Ghana"
    ],
    round16: [],
    quarterfinals: [],
    semifinals: [],

    champion: "",
    runnerUp: "",
    finalists: [],

    thirdPlaceWinner: "",
    final: "",
    thirdPlace: "",

    matches: {
      round32: [
        // Partido 73: 2ºA vs 2ºB
        {match: 73, team1: "Sudáfrica",      team2: "Canadá",              winner: "Canadá"},
        // Partido 74: 1ºE vs 3ºD
        {match: 74, team1: "Alemania",        team2: "Paraguay",            winner: "Paraguay"},
        // Partido 75: 1ºF vs 2ºC
        {match: 75, team1: "Países Bajos",    team2: "Marruecos",           winner: "Marruecos"},
        // Partido 76: 1ºC vs 2ºF
        {match: 76, team1: "Brasil",          team2: "Japón",               winner: "Brasil"},
        // Partido 77: 1ºI vs 3ºF
        {match: 77, team1: "Francia",         team2: "Suecia",              winner: "Francia"},
        // Partido 78: 2ºE vs 2ºI
        {match: 78, team1: "Costa de Marfil", team2: "Noruega",             winner: "Noruega"},
        // Partido 79: 1ºA vs 3ºE
        {match: 79, team1: "México",          team2: "Ecuador",             winner: "México"},
        // Partido 80: 1ºL vs 3ºK
        {match: 80, team1: "Inglaterra",      team2: "RD del Congo",        winner: ""},
        // Partido 81: 1ºD vs 3ºB
        {match: 81, team1: "Estados Unidos",  team2: "Bosnia y Herzegovina",winner: ""},
        // Partido 82: 1ºG vs 3ºI
        {match: 82, team1: "Bélgica",         team2: "Senegal",             winner: ""},
        // Partido 83: 2ºK vs 2ºL
        {match: 83, team1: "Portugal",        team2: "Croacia",             winner: ""},
        // Partido 84: 1ºH vs 2ºJ
        {match: 84, team1: "España",          team2: "Austria",             winner: ""},
        // Partido 85: 1ºB vs 3ºJ
        {match: 85, team1: "Suiza",           team2: "Argelia",             winner: ""},
        // Partido 86: 1ºJ vs 2ºH
        {match: 86, team1: "Argentina",       team2: "Cabo Verde",          winner: ""},
        // Partido 87: 1ºK vs 3ºL
        {match: 87, team1: "Colombia",        team2: "Ghana",               winner: ""},
        // Partido 88: 2ºD vs 2ºG
        {match: 88, team1: "Australia",       team2: "Egipto",              winner: ""}
      ],
      round16: [],
      quarterfinals: [],
      semifinals: [],
      thirdPlace: [],
      final: []
    }
  },

  semifinalists: [],
  finalists: [],

  champion: "",
  runnerUp: "",
  thirdPlaceWinner: "",

  // 5 categorías divertidas — todas son una sola elección por categoría.
  // "topScorer", "topAssister" y "goldenGlove" esperan el NOMBRE de un jugador
  //   (de los listados en AWARD_PLAYERS dentro de app.js).
  // "topScoringTeam" y "mostConcededTeam" esperan el NOMBRE de una selección
  //   (tal y como aparece en los grupos).
  awards: {
    topScorer: "",
    topAssister: "",
    goldenGlove: "",
    topScoringTeam: "",
    mostConcededTeam: ""
  }
};
