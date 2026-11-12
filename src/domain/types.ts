export type Player = {
  id: string
  name: string
  avatar?: string
  /** Guests are temporary players: kept for history and stats, hidden from the regular list. */
  guest: boolean
  createdAt: number
}

export type DealRule = {
  mode: 'fixed' | 'loserScore' | 'difference'
  fixed?: number
  /** 0 caps at the largest possible deal, 1 at one card below it. */
  capBelowMax: number
}

export type SessionConfig = {
  startCards: number
  dealRule: DealRule
  formula: string
}

/** Cards each player finished on: single, doffel, troffel, foffel. */
export type Finish = 1 | 2 | 3 | 4

export type Scores = Record<string, number>

export type Round = {
  id: string
  at: number
  /** Player ids in clockwise order for this round. */
  seats: string[]
  cardsDealt: number
  finish: Finish
  scores: Scores
  /** Only set when a tie had to be resolved. */
  lastTrickLeaderId?: string
  winnerId: string
  loserId: string
  formula: string
  /** What the loser owes the winner. */
  amount: number
}

export type SessionPlayer = Pick<Player, 'id' | 'name' | 'avatar'>

export type Session = {
  id: string
  ownerUid?: string
  name: string
  createdAt: number
  endedAt?: number
  shared: boolean
  config: SessionConfig
  players: SessionPlayer[]
  seats: string[]
  /** Manual override of the suggested deal for the next round. */
  dealOverride?: number
  rounds: Round[]
}

export const DEFAULT_FORMULA = '(max_score - min_score) * 2'

export const DEFAULT_CONFIG: SessionConfig = {
  startCards: 6,
  dealRule: { mode: 'difference', capBelowMax: 1 },
  formula: DEFAULT_FORMULA,
}
