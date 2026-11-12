import type { Dictionary } from './en'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const rounds = (n: number) => plural(n, 'runda', 'rundor')
const cards = (n: number) => `${n} kort`
const players = (n: number) => `${n} spelare`
const sessions = (n: number) => plural(n, 'session', 'sessioner')

/** Swedish decks print knekt, dam, kung and ess as Kn, D, K, E. */
const FACE_LETTERS: Record<number, string> = { 11: 'Kn', 12: 'D', 13: 'K', 14: 'E' }

const playersAndSessions = (p: number, s: number) => [p > 0 && players(p), s > 0 && sessions(s)].filter(Boolean).join(' och ')

/** Swedish genitive: Anna → Annas, Lars → Lars. */
const genitive = (name: string) => (/[sxz]$/i.test(name) ? name : `${name}s`)

export const sv: Dictionary = {
  common: {
    rounds,
    cards,
    back: 'Tillbaka',
    cancel: 'Avbryt',
    done: 'Klar',
    delete: 'Ta bort',
    owes: 'är skyldig',
    winner: 'Vinnare',
    loser: 'Förlorare',
    ended: 'Avslutad',
    inProgress: 'Pågår',
    scores: 'Poäng',
    settleUp: 'Gör upp',
    moneyOverTime: 'Pengar över tid',
    dealAndMoney: 'Inställningar för giv och pengar',
    fewer: 'Färre',
    more: 'Fler',
    tapAgain: 'Tryck igen för att bekräfta',
    card: (value) => FACE_LETTERS[value] ?? String(value),
    faceCards: { 11: 'Knekt', 12: 'Dam', 13: 'Kung', 14: 'Ess' },
    finishes: { 1: 'Enkel', 2: 'Doffel', 3: 'Troffel', 4: 'Foffel' },
  },

  nav: {
    game: 'Spel',
    history: 'Historik',
    stats: 'Statistik',
    players: 'Spelare',
    rules: 'Regler',
    account: 'Konto',
    accountOf: (name) => `Konto (${name})`,
    openMenu: 'Öppna menyn',
    closeMenu: 'Stäng menyn',
    skip: 'Hoppa till innehållet',
    loading: 'Läser in dina data…',
    notFound: 'Sidan finns inte',
    notFoundNote: 'Den sidan finns inte.',
  },

  home: {
    tagline: 'Håll koll på poängen, vem som är skyldig vem och hur många kort nästa giv ska ha.',
    newSession: 'Ny session',
    recent: 'Senaste sessionerna',
  },

  game: {
    round: (n) => `Runda ${n}`,
    deal: (n) => `Dela ut ${cards(n)} var`,
    ruleSays: (n) => `(regeln säger ${n})`,
    cardsToDeal: 'Kort att dela ut',
    players: 'Spelare',
    details: 'Detaljer',
    hints: {
      oneCard: 'Delas ut nedvänt, inget byte. Ett extra uppvänt kort var avgör vem som blir ledare.',
      twoCards: 'Inget första byte. Ett öppet byte är fortfarande tillåtet.',
    },
  },

  entry: {
    saveRound: 'Spara rundan',
    noScore: 'ingen poäng än',
    sumPrompt: (name, count, min, max) => `Summan av ${genitive(name)} ${count} kort, ${min} till ${max}.`,
    delete: 'Radera',
    next: 'Nästa',
    tieQuestion: 'Det är lika. Vem spelade ut i sista sticket?',
    formulaError: (problem) => `Pengaformeln gav ett fel: ${problem}. Ändra den i sessionens inställningar.`,
    formulaFailed: 'Formeln gick inte att räkna ut',
    tieDecided: (name) => `Lika avgjort från ${name}, som spelade ut i sista sticket.`,
    change: 'Ändra',
    finishedOn: 'Slutade på',
    finish: 'Avslut',
  },

  formula: {
    unexpected: (token) => `Oväntat ”${token}”`,
    expected: (token) => `Här ska det stå ”${token}”`,
    unknownFunction: (token) => `Okänd funktion ”${token}”`,
    unknownName: (token) => `Okänt namn ”${token}”`,
    endsEarly: 'Formeln tar slut för tidigt',
    empty: 'Formeln är tom',
    notANumber: 'Resultatet är inte ett tal',
    invalid: 'Ogiltig formel',
  },

  config: {
    firstRound: 'Kort i första rundan',
    followingRounds: 'Kort i följande rundor',
    dealRule: 'Givregel',
    difference: 'Skillnad',
    loserScore: 'Förlorarens poäng',
    fixed: 'Fast',
    differenceNote: 'Förlorarens poäng minus vinnarens poäng.',
    loserScoreNote: 'Lika många kort som förlorarens poäng.',
    fixedNote: 'Samma antal kort varje runda.',
    cardsEachRound: 'Kort varje runda',
    keepOneBelow: 'Håll ett kort under största möjliga giv',
    atMost: (cardCount, playerCount) => `Högst ${cards(cardCount)} med ${players(playerCount)}.`,
    moneyFormula: 'Pengaformel',
    example: (amount) => `Förloraren på K (13), vinnaren på 3: förloraren är skyldig ${amount}.`,
    exampleNotANumber: 'inget tal',
    help: 'Du kan använda max_score, min_score, total och players, med + − * / ^ och parenteser.',
  },

  table: {
    round: 'Runda',
    owed: 'Skuld',
    balance: 'Saldo',
    wins: 'Vinster',
    losses: 'Förluster',
    average: 'Snitt',
    noRounds: 'Inga rundor spelade än.',
    tapRound: 'Tryck på en runda för att ändra eller ta bort den.',
    changeRound: (n) => `Ändra runda ${n}`,
  },

  seating: {
    guestTag: 'gäst',
    moveUp: (name) => `Flytta upp ${name}`,
    moveDown: (name) => `Flytta ner ${name}`,
    remove: (name) => `Ta bort ${name}`,
    add: (name) => `Lägg till ${name}`,
    someoneNew: 'Någon ny',
    newPlayerName: 'Namn på ny spelare',
    guest: 'Gäst',
    save: 'Spara',
    help: 'Gäst lägger till personen för den här gången. Spara lägger också till personen i din spelarlista.',
  },

  settle: {
    nobody: 'Ingen är skyldig något.',
    pays: 'betalar',
  },

  share: {
    title: 'Dela',
    signIn: 'Logga in',
    signInRest: 'för att få en länk som låter andra följa sessionen live.',
    deviceOnly: 'Den här sessionen är bara sparad på den här enheten och kan därför inte delas.',
    anyoneCan: 'Alla som har länken kan följa poängen live. De kan inte ändra något.',
    create: 'Skapa en delningslänk',
    copied: 'Kopierad',
    copyLink: 'Kopiera länken',
    send: 'Skicka…',
    stop: 'Sluta dela',
  },

  charts: {
    balanceLabel: 'Saldo per spelare efter varje runda',
    start: 'Start',
    afterRound: (n) => `Efter runda ${n}`,
    tapBar: 'Tryck på en stapel för att se antalet.',
    barCount: (card, count, total, percent) => `${card}: ${count} av ${rounds(total)} (${percent})`,
    cardsLabel: 'Slutkort, hur ofta varje valör förekom',
  },

  account: {
    title: 'Konto',
    signedIn: 'Inloggad',
    notConfigured:
      'Synkning är inte inställd i den här versionen. Allt sparas bara på den här enheten, och appen fungerar i övrigt som vanligt.',
    synced: 'Dina spelare och sessioner sparas i det här kontot och hålls synkade på alla enheter där du loggar in.',
    syncProblem: (message) => `Problem med synkningen: ${message}`,
    unreachable: 'Det gick inte att nå synktjänsten. Visar det som finns på den här enheten.',
    notInAccount: (p, s) =>
      `Den här enheten har ${playersAndSessions(p, s)} som sparades innan du loggade in och som inte finns i ditt konto.`,
    copy: 'Kopiera till mitt konto',
    copied: (p, s) => `Kopierade ${playersAndSessions(p, s)} till ditt konto.`,
    signOut: 'Logga ut',
    afterSignOut: 'När du har loggat ut ser du det som är sparat på den här enheten igen.',
    noAccountNeeded: 'Du behöver inget konto. Om du loggar in hålls dina spelare och sessioner synkade mellan dina enheter.',
    signInGoogle: 'Logga in med Google',
    failed: 'Det fungerade inte. Kontrollera anslutningen och försök igen.',
    bannerTitle: 'Kopiera den här enhetens data till ditt konto?',
    bannerText: (p, s) =>
      `Den här enheten har ${playersAndSessions(p, s)} som sparades innan du loggade in. Du kan också göra det senare från kontosidan.`,
    notNow: 'Inte nu',
  },

  language: {
    title: 'Språk',
    automatic: 'Automatiskt',
    note: 'Automatiskt följer enhetens språk. Valet sparas bara på den här enheten.',
  },

  backup: {
    title: 'Säkerhetskopia',
    noteDevice: 'Spara spelarna och sessionerna på den här enheten i en fil, eller lägg till dem från en fil du sparat tidigare.',
    noteAccount: 'Spara spelarna och sessionerna i ditt konto i en fil, eller lägg till dem från en fil du sparat tidigare.',
    export: 'Exportera till en fil',
    import: 'Importera från en fil',
    importNote: 'Importen lägger bara till det som saknas. Spelare och sessioner som du redan har lämnas som de är.',
    imported: (p, s) => `Lade till ${playersAndSessions(p, s)} från filen.`,
    nothingNew: 'Allt i den filen finns redan här.',
    notABackup: 'Den filen är ingen säkerhetskopia från Gursch.',
    damaged: 'Säkerhetskopian gick inte att läsa. Inget ändrades.',
    tooNew: 'Säkerhetskopian kommer från en nyare version av appen. Uppdatera appen och försök igen.',
  },

  history: {
    title: 'Historik',
    none: 'Inga sessioner än.',
    inProgress: 'pågår',
  },

  newSession: {
    title: 'Ny session',
    seating: 'Placering',
    seatingNote: 'Lägg till spelarna medsols runt bordet. Poängen matas in i den ordningen.',
    needTwo: 'Lägg till minst två spelare',
    start: (n) => `Börja med ${players(n)}`,
  },

  players: {
    title: 'Spelare',
    shortName: 'Kort namn',
    newPlayerName: 'Namn på ny spelare',
    add: 'Lägg till',
    none: 'Inga spelare än. Lägg till dem du brukar spela med.',
    guests: 'Gäster',
    guestsNote: 'Tillfälliga spelare. De finns kvar i historik och statistik men föreslås inte till nya sessioner.',
    pictureError: 'Bilden gick inte att läsa.',
    edit: 'Ändra',
    name: 'Namn',
    rename: 'Byt namn',
    changePicture: 'Byt bild',
    addPicture: 'Lägg till bild',
    removePicture: 'Ta bort bilden',
    makeRegular: 'Gör till vanlig spelare',
    makeGuest: 'Gör till gäst',
  },

  roundEdit: {
    notFound: 'Rundan finns inte',
    title: (n) => `Ändra runda ${n}`,
    note: (session, n) =>
      `${session} · ${cards(n)} utdelade. Tryck på en spelare för att ändra poängen. Beloppet räknas om med den formel som gällde för rundan.`,
    save: 'Spara ändringarna',
    delete: 'Ta bort rundan',
  },

  seatingPage: {
    notInProgress: 'Den här sessionen pågår inte',
    title: 'Ändra spelare',
    note: 'Gäller från nästa runda. Den du tar bort behåller sina poäng och sitt saldo och kan läggas till igen senare.',
    needTwo: 'Det behövs två spelare',
  },

  session: {
    notFound: 'Sessionen finns inte',
    backToHistory: 'Tillbaka till historiken',
    backToGame: 'Tillbaka till spelet',
    stats: 'Statistik för sessionen',
    settingsNote: 'Ändringarna gäller kommande rundor. Rundor som redan är spelade behåller sina belopp.',
    fixFormula: 'Rätta formeln innan du sparar nästa runda.',
    changePlayers: 'Ändra spelare',
    end: 'Avsluta sessionen',
    reopen: 'Öppna sessionen igen',
    delete: 'Ta bort sessionen',
  },

  shared: {
    loading: 'Läser in sessionen…',
    errorTitle: 'Sessionen gick inte att läsa in',
    errorNote: 'Kontrollera anslutningen och läs in sidan igen.',
    missingTitle: 'Den här sessionen är inte delad',
    missingNote: 'Länken kan vara fel, eller så har ägaren slutat dela den.',
    played: (n) => plural(n, 'runda spelad', 'rundor spelade'),
    live: 'Live, uppdateras automatiskt',
    each: 'var',
    lastRound: 'Förra rundan:',
  },

  stats: {
    title: 'Statistik',
    scope: 'Vilka sessioner som ska räknas med',
    allSessions: 'Alla sessioner',
    sessionOption: (name, n) => `${name} (${rounds(n)})`,
    none: 'Inga rundor att visa än. Statistiken dyker upp när en runda har sparats.',
    players: 'Spelare',
    player: 'Spelare',
    rounds: 'Rundor',
    won: 'Vann',
    lost: 'Förl.',
    avg: 'Snitt',
    net: 'Netto',
    tapPlayer: 'Tryck på en spelare för att se mer.',
    whoPays: 'Vem betalar vem',
    lostTo: 'förlorade mot',
    times: (n) => (n === 1 ? 'en gång' : `${n} gånger`),
    matchup: (loser, winner) => `${loser} till ${winner}`,
    inSessions: (n) => `i ${sessions(n)}`,
    averageOwed: 'Snittskuld',
    perRound: 'per runda',
    biggestRound: 'Största rundan',
    largestDiff: 'Största skillnaden',
    against: (high, low) => `${high} mot ${low}`,
    averageDiff: 'Snittskillnad',
    loserMinusWinner: 'förlorare minus vinnare',
    averageDeal: 'Snittgiv',
    mostOften: (n) => `oftast ${cards(n)}`,
    tieBreaks: 'Särskiljningar',
    ofRounds: (percent) => `${percent} av rundorna`,
    multiCard: 'Avslut med flera kort',
    finishCounts: (two, three, four) => `${two} dofflar, ${three} trofflar, ${four} fofflar`,
    wins: 'Vinster',
    losses: 'Förluster',
    shareOfRounds: (percent, n) => `${percent} av ${rounds(n)}`,
    wonLost: (won, lost) => `vann ${won}, förlorade ${lost}`,
    sessionsWon: 'Vunna sessioner',
    of: (n) => `av ${n}`,
    biggestWin: 'Största vinsten',
    biggestLoss: 'Största förlusten',
    winStreak: 'Längsta vinstsviten',
    lossStreak: 'Längsta förlustsviten',
    inARow: 'rundor i rad',
    onAce: 'Slutade på ess',
    onTwo: 'Slutade på en tvåa',
    ties: 'Lika',
    tiesNote: 'till fördel – till nackdel',
    averageCard: 'Snittkort',
    finalCards: 'Slutkort',
    headToHead: 'Inbördes möten',
    opponent: 'Mot',
    took: 'Fick',
    paid: 'Betalade',
    headToHeadNote: 'Belopp, med antalet rundor inom parentes.',
  },
}
