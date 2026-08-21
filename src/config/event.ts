export const eventConfig = {
  name: '党建引领·数智赋能 AI创新竞赛',
  subtitle: '党建引领·数智赋能',
  fullScore: 10,
  teams: ['A队', 'B队', 'C队', 'D队', 'E队', 'F队'],
} as const

export const mockScores = [
  { team: 'C队', score: 9.46 }, { team: 'F队', score: 9.31 }, { team: 'A队', score: 9.27 },
  { team: 'D队', score: 9.08 }, { team: 'B队', score: 8.91 }, { team: 'E队', score: 8.76 },
]

export const completedScores: Record<string, number> = { A队: 9.2, B队: 8.9 }
