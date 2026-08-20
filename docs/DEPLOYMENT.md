# 正式环境部署说明

本项目默认使用 DEMO 模式。正式环境需要先准备 Supabase，再将前端部署到 Vercel；不要把管理员 PIN 写入任何 `VITE_` 变量。

## Supabase

1. 在 Supabase 创建项目，并在 Authentication → Sign In / Providers 中启用 Anonymous Sign-Ins。
2. 复制 `.env.example` 为 `.env.local`，填写 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 和 `VITE_EVENT_KEY`。
3. 登录并关联项目：

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy
```

确认 dry-run 内容后再正式 push。不要使用 `db reset --linked`，不要使用 `--include-seed`，正式环境不要导入 DEMO 数据。

4. 在 Supabase Edge Function Secrets 中设置 `ADMIN_PIN`。它只用于后台函数鉴权，不放在浏览器环境变量中。

## Vercel

完成 Supabase 配置并通过本地测试后，再执行 `npx vercel` 完成登录和部署。Vercel 只配置三个浏览器安全变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`、`VITE_EVENT_KEY`。部署后检查 `/admin`、`/score`、`/results` 三条路由。

## 现场验收

使用管理员 PIN 登录后台，按“准备 → 生成评分码 → 开始评分 → 全部评分完成 → 锁定并生成结果 → 公布最终成绩”的顺序操作。公布前成绩大屏不得显示分数，公布后才显示 1+2+3 奖项结构。再用手机扫码或直接打开评分地址，验证匿名评分码、保存、刷新恢复和锁定只读。
