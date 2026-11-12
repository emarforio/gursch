/**
 * English strings. This file defines the shape every language must follow:
 * `Dictionary` is derived from it, so a string missing from another language
 * is a type error.
 *
 * Not translated anywhere: the formula variable names and the house terms
 * doffel, troffel and foffel.
 */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const rounds = (n: number) => plural(n, 'round', 'rounds')
const cards = (n: number) => plural(n, 'card', 'cards')
const players = (n: number) => plural(n, 'player', 'players')
const sessions = (n: number) => plural(n, 'session', 'sessions')

const FACE_LETTERS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }

/** "2 players and 1 session", leaving out whichever is zero. */
const playersAndSessions = (p: number, s: number) => [p > 0 && players(p), s > 0 && sessions(s)].filter(Boolean).join(' and ')

export const en = {
  common: {
    rounds,
    cards,
    back: 'Back',
    cancel: 'Cancel',
    done: 'Done',
    delete: 'Delete',
    owes: 'owes',
    winner: 'Winner',
    loser: 'Loser',
    ended: 'Ended',
    inProgress: 'In progress',
    scores: 'Scores',
    settleUp: 'Settle up',
    moneyOverTime: 'Money over time',
    dealAndMoney: 'Deal and money settings',
    fewer: 'Fewer',
    more: 'More',
    tapAgain: 'Tap again to confirm',
    /** What is printed on a card of this value: 2 to 10, then J, Q, K, A. */
    card: (value: number) => FACE_LETTERS[value] ?? String(value),
    /** Spoken names of the face cards, by value. */
    faceCards: { 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' } as Record<number, string>,
    /** Names of the finishes, by number of cards. */
    finishes: { 1: 'Single', 2: 'Doffel', 3: 'Troffel', 4: 'Foffel' } as Record<1 | 2 | 3 | 4, string>,
  },

  nav: {
    game: 'Game',
    history: 'History',
    stats: 'Stats',
    players: 'Players',
    rules: 'Rules',
    account: 'Account',
    accountOf: (name: string) => `Account (${name})`,
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    skip: 'Skip to content',
    loading: 'Loading your data…',
    notFound: 'Not found',
    notFoundNote: 'That page does not exist.',
  },

  home: {
    tagline: 'Keep score, track who owes whom, and work out the next deal.',
    newSession: 'New session',
    recent: 'Recent sessions',
  },

  game: {
    round: (n: number) => `Round ${n}`,
    deal: (n: number) => `Deal ${cards(n)} each`,
    ruleSays: (n: number) => `(rule says ${n})`,
    cardsToDeal: 'Cards to deal',
    players: 'Players',
    details: 'Details',
    hints: {
      oneCard: 'Dealt face down, no trade. One extra face-up card each decides the leader.',
      twoCards: 'No first trade. An open trade is still allowed.',
    },
  },

  entry: {
    saveRound: 'Save round',
    noScore: 'no score yet',
    sumPrompt: (name: string, count: number, min: number, max: number) => `Sum of ${name}'s ${count} cards, ${min} to ${max}.`,
    delete: 'Delete',
    next: 'Next',
    tieQuestion: 'There is a tie. Who led the last trick?',
    formulaError: (problem: string) => `The money formula gave an error: ${problem}. Change it in the session settings.`,
    formulaFailed: 'The formula failed',
    tieDecided: (name: string) => `Tie decided from ${name}, who led the last trick.`,
    change: 'Change',
    finishedOn: 'Finished on',
    finish: 'Finish',
  },

  formula: {
    unexpected: (token: string) => `Unexpected "${token}"`,
    expected: (token: string) => `Expected "${token}"`,
    unknownFunction: (token: string) => `Unknown function "${token}"`,
    unknownName: (token: string) => `Unknown name "${token}"`,
    endsEarly: 'The formula ends too early',
    empty: 'The formula is empty',
    notANumber: 'The result is not a number',
    invalid: 'Invalid formula',
  },

  config: {
    firstRound: 'Cards in the first round',
    followingRounds: 'Cards in the following rounds',
    dealRule: 'Deal rule',
    difference: 'Difference',
    loserScore: "Loser's score",
    fixed: 'Fixed',
    differenceNote: "The loser's score minus the winner's score.",
    loserScoreNote: "As many cards as the loser's score.",
    fixedNote: 'The same number of cards every round.',
    cardsEachRound: 'Cards each round',
    keepOneBelow: 'Keep one below the largest deal',
    atMost: (cardCount: number, playerCount: number) => `At most ${cards(cardCount)} with ${players(playerCount)}.`,
    moneyFormula: 'Money formula',
    example: (amount: string) => `Loser on K (13), winner on 3: the loser owes ${amount}.`,
    exampleNotANumber: 'not a number',
    help: 'You can use max_score, min_score, total and players, with + − * / ^ and brackets.',
  },

  table: {
    round: 'Round',
    owed: 'Owed',
    balance: 'Balance',
    wins: 'Wins',
    losses: 'Losses',
    average: 'Average',
    noRounds: 'No rounds played yet.',
    tapRound: 'Tap a round to change or delete it.',
    changeRound: (n: number) => `Change round ${n}`,
  },

  seating: {
    guestTag: 'guest',
    moveUp: (name: string) => `Move ${name} up`,
    moveDown: (name: string) => `Move ${name} down`,
    remove: (name: string) => `Remove ${name}`,
    add: (name: string) => `Add ${name}`,
    someoneNew: 'Someone new',
    newPlayerName: 'New player name',
    guest: 'Guest',
    save: 'Save',
    help: 'Guest adds them for now. Save also keeps them in your player list.',
  },

  settle: {
    nobody: 'Nobody owes anything.',
    pays: 'pays',
  },

  share: {
    title: 'Share',
    signIn: 'Sign in',
    signInRest: 'to get a link that lets others follow this session live.',
    deviceOnly: 'This session is saved on this device only, so it cannot be shared.',
    anyoneCan: 'Anyone with the link can follow the scores live. They cannot change anything.',
    create: 'Create a share link',
    copied: 'Copied',
    copyLink: 'Copy link',
    send: 'Send…',
    stop: 'Stop sharing',
  },

  charts: {
    balanceLabel: 'Running balance per player after each round',
    start: 'Start',
    afterRound: (n: number) => `After round ${n}`,
    tapBar: 'Tap a bar for the count.',
    barCount: (card: string, count: number, total: number, percent: string) => `${card}: ${count} of ${rounds(total)} (${percent})`,
    cardsLabel: 'Final cards, how often each value occurred',
  },

  account: {
    title: 'Account',
    signedIn: 'Signed in',
    notConfigured: 'Sync is not set up in this build. Everything is saved on this device only, and the app works the same otherwise.',
    synced: 'Your players and sessions are saved to this account and kept in sync on every device where you sign in.',
    syncProblem: (message: string) => `Sync problem: ${message}`,
    unreachable: 'Could not reach the sync service. Showing the data on this device.',
    notInAccount: (p: number, s: number) =>
      `This device has ${playersAndSessions(p, s)} saved from before you signed in that ${p + s === 1 ? 'is' : 'are'} not in your account.`,
    copy: 'Copy to my account',
    copied: (p: number, s: number) => `Copied ${playersAndSessions(p, s)} to your account.`,
    signOut: 'Sign out',
    afterSignOut: 'After signing out you see the data saved on this device again.',
    noAccountNeeded: 'You do not need an account. Signing in keeps your players and sessions in sync between your devices.',
    signInGoogle: 'Sign in with Google',
    failed: 'That did not work. Check your connection and try again.',
    bannerTitle: "Copy this device's data to your account?",
    bannerText: (p: number, s: number) =>
      `This device has ${playersAndSessions(p, s)} saved from before you signed in. You can also do this later from the Account page.`,
    notNow: 'Not now',
  },

  language: {
    title: 'Language',
    automatic: 'Automatic',
    note: 'Automatic follows the language of this device. The choice is saved on this device only.',
  },

  backup: {
    title: 'Backup',
    noteDevice: 'Save the players and sessions on this device to a file, or add the ones from a file you saved earlier.',
    noteAccount: 'Save the players and sessions in your account to a file, or add the ones from a file you saved earlier.',
    export: 'Export to a file',
    import: 'Import from a file',
    importNote: 'Importing only adds what is missing. Players and sessions you already have are left as they are.',
    imported: (p: number, s: number) => `Added ${playersAndSessions(p, s)} from the file.`,
    nothingNew: 'Everything in that file is here already.',
    notABackup: 'That file is not a Gursch backup.',
    damaged: 'That backup could not be read. Nothing was changed.',
    tooNew: 'That backup comes from a newer version of the app. Update the app and try again.',
  },

  history: {
    title: 'History',
    none: 'No sessions yet.',
    inProgress: 'in progress',
  },

  newSession: {
    title: 'New session',
    seating: 'Seating',
    seatingNote: 'Add players in clockwise order. Scores are entered in this order.',
    needTwo: 'Add at least two players',
    start: (n: number) => `Start with ${players(n)}`,
  },

  players: {
    title: 'Players',
    shortName: 'Short name',
    newPlayerName: 'New player name',
    add: 'Add',
    none: 'No players yet. Add the people you usually play with.',
    guests: 'Guests',
    guestsNote: 'Temporary players. They are kept for history and stats but are not suggested for new sessions.',
    pictureError: 'That picture could not be read.',
    edit: 'Edit',
    name: 'Name',
    rename: 'Rename',
    changePicture: 'Change picture',
    addPicture: 'Add picture',
    removePicture: 'Remove picture',
    makeRegular: 'Make regular player',
    makeGuest: 'Make guest',
  },

  roundEdit: {
    notFound: 'Round not found',
    title: (n: number) => `Change round ${n}`,
    note: (session: string, n: number) =>
      `${session} · ${cards(n)} dealt. Tap a player to change their score. The amount is worked out again with the formula this round used.`,
    save: 'Save changes',
    delete: 'Delete this round',
  },

  seatingPage: {
    notInProgress: 'This session is not in progress',
    title: 'Change players',
    note: 'Applies from the next round. Someone you remove keeps their scores and balance and can be added back later.',
    needTwo: 'Need two players',
  },

  session: {
    notFound: 'Session not found',
    backToHistory: 'Back to history',
    backToGame: 'Back to the game',
    stats: 'Stats for this session',
    settingsNote: 'Changes apply to the coming rounds. Rounds already played keep their amounts.',
    fixFormula: 'Fix the formula before saving the next round.',
    changePlayers: 'Change players',
    end: 'End session',
    reopen: 'Reopen session',
    delete: 'Delete session',
  },

  shared: {
    loading: 'Loading the session…',
    errorTitle: 'Could not load the session',
    errorNote: 'Check your connection and reload the page.',
    missingTitle: 'This session is not shared',
    missingNote: 'The link may be wrong, or the owner has stopped sharing it.',
    played: (n: number) => `${rounds(n)} played`,
    live: 'Live, updates automatically',
    each: 'each',
    lastRound: 'Last round:',
  },

  stats: {
    title: 'Stats',
    scope: 'Which sessions to include',
    allSessions: 'All sessions',
    sessionOption: (name: string, n: number) => `${name} (${rounds(n)})`,
    none: 'No rounds to show yet. Stats appear once a round has been saved.',
    players: 'Players',
    player: 'Player',
    rounds: 'Rounds',
    won: 'Won',
    lost: 'Lost',
    avg: 'Avg',
    net: 'Net',
    tapPlayer: 'Tap a player for their details.',
    whoPays: 'Who pays whom',
    lostTo: 'lost to',
    times: (n: number) => (n === 1 ? 'once' : `${n} times`),
    matchup: (loser: string, winner: string) => `${loser} to ${winner}`,
    inSessions: (n: number) => `in ${sessions(n)}`,
    averageOwed: 'Average owed',
    perRound: 'per round',
    biggestRound: 'Biggest round',
    largestDiff: 'Largest difference',
    against: (high: string, low: string) => `${high} against ${low}`,
    averageDiff: 'Average difference',
    loserMinusWinner: 'loser minus winner',
    averageDeal: 'Average deal',
    mostOften: (n: number) => `most often ${cards(n)}`,
    tieBreaks: 'Tie-breaks',
    ofRounds: (percent: string) => `${percent} of rounds`,
    multiCard: 'Multi-card finishes',
    finishCounts: (two: number, three: number, four: number) => `${two} dofflar, ${three} trofflar, ${four} fofflar`,
    wins: 'Wins',
    losses: 'Losses',
    shareOfRounds: (percent: string, n: number) => `${percent} of ${rounds(n)}`,
    wonLost: (won: string, lost: string) => `won ${won}, lost ${lost}`,
    sessionsWon: 'Sessions won',
    of: (n: number) => `of ${n}`,
    biggestWin: 'Biggest win',
    biggestLoss: 'Biggest loss',
    winStreak: 'Best win streak',
    lossStreak: 'Worst losing streak',
    inARow: 'rounds in a row',
    onAce: 'Finished on an ace',
    onTwo: 'Finished on a 2',
    ties: 'Ties',
    tiesNote: 'went their way – against',
    averageCard: 'Average card',
    finalCards: 'Final cards',
    headToHead: 'Head to head',
    opponent: 'Against',
    took: 'Took',
    paid: 'Paid',
    headToHeadNote: 'Amounts, with the number of rounds in brackets.',
  },
}

export type Dictionary = typeof en
