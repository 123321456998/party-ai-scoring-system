export const TEAM_CODES = ['A', 'B', 'C', 'D', 'E', 'F'] as const
export type TeamCode = (typeof TEAM_CODES)[number]
export const TEAM_DISPLAY_ORDER = ['F', 'A', 'D', 'E', 'B', 'C'] as const

export const TEAM_NAMES_BY_CODE: Record<TeamCode, string> = {
  A: '烟组',
  B: '酒组',
  C: '香化组',
  D: '精品组',
  E: '香港公司',
  F: '物流公司',
}

const DISPLAY_INDEX = new Map<string, number>(TEAM_DISPLAY_ORDER.map((code, index) => [code, index]))

export function displayTeamName(name: string, code?: string) {
  return code && code in TEAM_NAMES_BY_CODE ? TEAM_NAMES_BY_CODE[code as TeamCode] : name
}

export function sortTeamsForDisplay<T extends { code: string }>(teams: readonly T[]) {
  return [...teams].sort((left, right) => (DISPLAY_INDEX.get(left.code) ?? Number.MAX_SAFE_INTEGER) - (DISPLAY_INDEX.get(right.code) ?? Number.MAX_SAFE_INTEGER))
}
