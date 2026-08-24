export const eventConfig = {
  name: '党建引领·数智赋能 AI创新竞赛',
  subtitle: '党建引领·数智赋能',
  fullScore: 100,
  teams: ['烟组', '酒组', '香化组', '精品组', '香港组', '物流组'],
} as const

export const mockScores = [
  { team: '香化组', score: 95 }, { team: '物流组', score: 93 }, { team: '烟组', score: 92 },
  { team: '精品组', score: 91 }, { team: '酒组', score: 89 }, { team: '香港组', score: 88 },
]

export const completedScores: Record<string, number> = { 烟组: 92, 酒组: 89 }
