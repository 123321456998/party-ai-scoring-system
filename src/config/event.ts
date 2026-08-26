import { TEAM_DISPLAY_ORDER, TEAM_NAMES_BY_CODE } from './teams'

export const eventConfig = {
  name: '“党建引领·数智赋能”AI创新竞赛',
  subtitle: '现场评分系统',
  fullScore: 10,
  teams: TEAM_DISPLAY_ORDER.map((code) => TEAM_NAMES_BY_CODE[code]),
} as const

export const mockScores = [
  { team: '香化组', score: 95 }, { team: '物流公司', score: 93 }, { team: '烟组', score: 92 },
  { team: '精品组', score: 91 }, { team: '酒组', score: 89 }, { team: '香港公司', score: 88 },
]

export const completedScores: Record<string, number> = { 烟组: 92, 酒组: 89 }
