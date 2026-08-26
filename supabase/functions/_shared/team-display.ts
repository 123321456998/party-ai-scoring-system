const TEAM_NAMES_BY_CODE: Record<string, string> = {
  A: '烟组',
  B: '酒组',
  C: '香化组',
  D: '精品组',
  E: '香港公司',
  F: '物流公司',
}

const DISPLAY_ORDER = new Map(['F', 'A', 'D', 'E', 'B', 'C'].map((code, index) => [code, index]))

export type DisplayTeam = { team_code: string; name: string }

export function displayTeamName(team: DisplayTeam) {
  return TEAM_NAMES_BY_CODE[team.team_code] ?? team.name
}

export function sortTeamsForDisplay<T extends DisplayTeam>(teams: readonly T[]) {
  return [...teams].sort((left, right) => (DISPLAY_ORDER.get(left.team_code) ?? Number.MAX_SAFE_INTEGER) - (DISPLAY_ORDER.get(right.team_code) ?? Number.MAX_SAFE_INTEGER))
}
