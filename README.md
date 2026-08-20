# 党建引领AI业务大赛评分系统

体制内“党建引领AI业务大赛”现场匿名评分系统。当前已完成第三阶段 DEMO 业务闭环：赛事准备、匿名评分码、评分监控、自动保存、锁定、平均分、排名和最终结果展示。

## 技术栈

React + TypeScript + Vite，使用 `react-router-dom` 管理路由，使用 `lucide-react` 提供轻量图标，使用 `@supabase/supabase-js` 连接正式数据层。赛事名称、队伍和满分集中维护在 `src/config/event.ts`。

## 安装与启动

```bash
npm install
npm run dev
```

复制 `.env.example` 为 `.env.local`。如果不填写 Supabase 配置，项目会自动运行在明确标注的 DEMO 模式；如果填写 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`，评分端会使用 Supabase Anonymous Auth 和 Edge Functions。

页面地址：

- `/score`：匿名评委评分器
- `/admin`：工作人员控制后台
- `/results`：最终成绩大屏

## 结构

```text
src/
├── components/{layout,common}
├── pages/{Score,Admin,Results}
├── config/event.ts
├── data/scoringRepository.ts
├── lib/supabase.ts
├── styles/{tokens,global,components}.css
├── App.tsx
└── main.tsx
supabase/
├── migrations/202608200001_scoring_core.sql
└── functions/{claim-anonymous-judge,get-my-scorecard,save-my-score,admin-login,admin-dashboard,admin-action,public-results}
docs/DESIGN_SYSTEM.md
```

## 第三阶段已完成

- `/score` 评委端隐藏控制后台与成绩大屏入口
- 匿名评分码验证、浏览器身份恢复、手动恢复入口
- 六队评分加载、500–800ms 防抖自动保存、评分修改和刷新恢复
- DEMO 模式支持 `DEMO-01` 至 `DEMO-07`
- Supabase migration、Anonymous Auth 映射和三个 Edge Functions
- `/results` 改为一等奖 1 张、二等奖 2 张、三等奖 3 张的正式 1-2-3 构图
- DEMO 后台 PIN：`2468`
- prepare → scoring → locked 生命周期
- DEMO 随机匿名评分码生成、实时监控、41/42 锁定禁用、42/42 锁定与最终结果生成
- 评分锁定后评委端只读，Repository 与服务端均拒绝修改
- 评分监控使用 `BroadcastChannel`，正式模式预留 Supabase Realtime

## 尚未实现

Vercel/Supabase 正式线上部署、真实二维码、Excel、PDF、邮件、短信、抽签和 AI 分析仍未实现。正式比赛必须重新生成真正随机的匿名评分码，并将其 SHA-256 哈希写入 `anonymous_judges.recovery_code_hash`，不能使用 DEMO 码。
