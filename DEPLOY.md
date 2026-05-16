# 部署到 Cloudflare 完整教程

把这个项目部署到 Cloudflare 免费版，朋友们用浏览器访问一个 `xxx.pages.dev` 链接就能看到、记录战绩。整个过程大概 15 分钟。

> 你只需要按顺序复制粘贴命令、点几下网页按钮。所有代码改造我已经做完了。

---

## 这次部署用到的 Cloudflare 服务（全部免费）

| 服务 | 作用 | 免费额度 |
|---|---|---|
| Cloudflare Pages | 托管前端（React 静态页面） | 无限请求 |
| Pages Functions | 跑 API（替代原 Express 后端） | 每天 100,000 次请求 |
| Cloudflare D1 | SQLite 数据库（替代本地 sqlite 文件） | 每天 5GB 存储 + 5,000,000 行读 / 100,000 行写 |

你和朋友玩 Dota 内战的频率，到天荒地老都用不完。

---

## 第 1 步：注册 Cloudflare 账号

1. 打开 https://dash.cloudflare.com/sign-up
2. 用邮箱注册一个账号（免费）
3. 验证邮箱，登录后**不需要**绑定信用卡，也**不需要**买域名

---

## 第 2 步：登录 wrangler CLI

`wrangler` 是 Cloudflare 的命令行工具，已经装在你这个项目里了。

在项目根目录（`/Users/luoxinyang/Desktop/dota_record.nosync`）执行：

```bash
npx wrangler login
```

会打开浏览器，点 **Allow** 授权。看到 "Successfully logged in" 就成功了。

---

## 第 3 步：创建 D1 数据库

```bash
npx wrangler d1 create dota-record
```

输出会类似这样：

```
✅ Successfully created DB 'dota-record' in region APAC
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "dota-record"
database_id = "12345678-abcd-ef01-2345-6789abcdef01"
```

**把这一串 `database_id` 复制下来。**

---

## 第 4 步：把 database_id 填到 wrangler.toml

打开项目根目录的 `wrangler.toml`，把 `REPLACE_WITH_DATABASE_ID` 替换成你刚拿到的 id：

```toml
[[d1_databases]]
binding = "DB"
database_name = "dota-record"
database_id = "12345678-abcd-ef01-2345-6789abcdef01"  # ← 这里换成你的
```

---

## 第 5 步：在 D1 上建表

把建表语句（`schema.sql`）推送到云端数据库：

```bash
npx wrangler d1 execute dota-record --remote --file=schema.sql
```

第一次执行会让你确认 "Yes, execute remotely"，输入 `y` 回车。

执行成功会看到三个 `success: true`（对应三张表）。

---

## 第 6 步：导出本地现有数据并导入 D1

先把本地 `backend/database.sqlite` 里的数据（24 个选手）导出成 `seed.sql`：

```bash
npm run export-seed
```

会看到：
```
已生成 /Users/luoxinyang/Desktop/dota_record.nosync/seed.sql
players: 24
matches: 0
match_players: 0
```

然后把 `seed.sql` 推送到云端：

```bash
npx wrangler d1 execute dota-record --remote --file=seed.sql
```

> **以后如果你想把本地新加的数据再次同步到云端**，重复这两条命令就行。但要注意：会出现 id 冲突（除非你先 `DROP TABLE` 再重建）。一般部署后大家直接在线上记录就好。

---

## 第 7 步：把项目部署到 Cloudflare Pages

```bash
npm run pages:deploy
```

这条命令会：
1. 运行 `npm run build` 构建前端
2. 把构建产物（`frontend/dist/`）和 `functions/` 一起推到 Cloudflare

**首次部署时**，wrangler 会问你：
- "Create a new project?" → 输入 `y` 回车
- "Enter the name of your new project" → 输入 `dota-record`（这会决定你的访问域名 `dota-record.pages.dev`，如果名字被占用就换一个）
- "Enter the production branch name" → 默认 `main`，直接回车

最后输出：
```
✨ Deployment complete! Take a peek over at https://dota-record.pages.dev
```

**这就是你和朋友访问的链接！**

---

## 第 8 步：把 D1 数据库绑定到 Pages

⚠️ 上一步部署成功，但 API 还不能用，因为 Pages 项目还不知道用哪个 D1 数据库。

1. 浏览器打开 https://dash.cloudflare.com
2. 左侧菜单点 **Workers & Pages**
3. 找到你刚创建的项目 `dota-record`，点进去
4. 顶部菜单点 **Settings** → 左侧选 **Bindings** → 点 **Add**
5. 选 **D1 database**
6. 填写：
   - **Variable name**：`DB`（**一定要全大写 DB**，和代码里对应）
   - **D1 database**：选 `dota-record`
7. 点 **Save**

绑定之后 Cloudflare 会提示需要重新部署一次（让 functions 拿到 binding）。回到终端再执行一次：

```bash
npx wrangler pages deploy frontend/dist
```

> 这次不会再问项目名，直接部署到现有项目。

---

## 第 9 步：打开链接，分享给朋友

浏览器访问 `https://dota-record.pages.dev`（换成你刚才起的项目名）。

应该能看到：
- 选手列表里有 24 个原来的选手
- 可以新增比赛、修改、删除

**把这个链接发给朋友们。** 任何拿到链接的人都能看，也都能写（你选的「开放写入」模式）。

---

## 以后怎么维护

### 改了代码，要重新部署

```bash
npm run pages:deploy
```

这条命令会：
1. 构建前端（`npm run build`）
2. 用 `wrangler@4` 把 `frontend/dist/` + `functions/` 一起推到 Cloudflare

> 你机器上有 HTTPS 抓包代理（wrangler 报 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`），所以 `pages:deploy` 和 `backup` 的脚本内部已经自动加了 `NODE_TLS_REJECT_UNAUTHORIZED=0`。你不用再手动加前缀。

### 备份云端数据到本地

```bash
npm run backup
```

输出示例：

```
==> 备份云端 D1 到本地...

  • 读取 schema
  • 拉取 players
    24 行
  • 拉取 matches
    28 行
  • 拉取 match_players
    280 行

========== 备份完成 ==========
文件: backups/dota-record-2026-05-16_01-30-00.sql
大小: 12.34 KB
---
选手数:       24
对战局数:     28
场内选手记录: 280（预期 280 = 28 局 × 10）
==============================
```

备份文件在 `backups/` 目录下，文件名带时间戳，每次新文件不覆盖旧的。建议每场重要比赛后跑一次。

### 从备份恢复（万一云端数据出问题）

```bash
# 1. 清空云端现有数据
npx wrangler d1 execute dota-record --remote --command="DELETE FROM match_players; DELETE FROM matches; DELETE FROM players; DELETE FROM sqlite_sequence;"

# 2. 导入备份
npx wrangler d1 execute dota-record --remote --file=backups/你要恢复的文件.sql
```

### 改了数据库结构（schema.sql）

```bash
npx wrangler d1 execute dota-record --remote --file=你的新迁移.sql
```

### 想看数据库里现在有什么

```bash
npx wrangler d1 execute dota-record --remote --command="SELECT COUNT(*) FROM matches"
```

或者在 Cloudflare Dashboard → Workers & Pages → D1 → dota-record → **Console** 里直接写 SQL。

### 想本地预览生产环境（带云端数据库）

```bash
npx wrangler pages dev frontend/dist --remote
```

### 想本地预览（用本地假数据库）

```bash
# 一次性：把表和数据导入本地 D1
npx wrangler d1 execute dota-record --local --file=schema.sql
npx wrangler d1 execute dota-record --local --file=seed.sql

# 启动
npm run pages:dev
```

访问 http://localhost:8788

### 想看部署日志 / 错误

Cloudflare Dashboard → 项目 → **Functions** → **Real-time Logs**

---

## 常见问题

**Q：朋友们能看到数据库内容吗？能改我的数据吗？**

A：能看，也能改、能删。你选的是「开放写入」模式——任何拿到链接的人都有完整权限。如果以后想要密码保护，告诉我，我加一个简单的口令拦截。

**Q：可以绑定自己的域名吗？**

A：可以。Cloudflare Dashboard → 项目 → **Custom domains** → **Set up a custom domain**。但你的域名需要先放在 Cloudflare 上（免费）。

**Q：D1 免费版会被超？**

A：你们每天玩 100 场内战，每场 50 次写入也才 5000 次写入，远低于 100,000/天 的免费额度。读更宽松。

**Q：能在 Cloudflare Pages 用 GitHub 自动部署吗？**

A：可以。在 Dashboard → Workers & Pages → 创建项目 → **Connect to Git** 选你的 GitHub 仓库。但这种方式需要你的项目已经推到 GitHub。直接 `wrangler pages deploy` 不需要 GitHub，更简单。

**Q：原来的 backend 还能本地跑吗？**

A：能，没动它。本地开发还是 `npm run dev`（前端 + Express 后端），用本地 SQLite 文件。Cloudflare 上跑的是 `functions/` 目录的代码，两套并行。

---

## 你需要执行的命令汇总

按顺序：

```bash
# 一次性：登录 + 建库 + 建表 + 导数据
npx wrangler login
npx wrangler d1 create dota-record               # 复制 database_id 填到 wrangler.toml
npx wrangler d1 execute dota-record --remote --file=schema.sql
npm run export-seed
npx wrangler d1 execute dota-record --remote --file=seed.sql

# 部署
npm run pages:deploy                              # 首次会问项目名

# 控制台 Settings → Bindings 加 D1 binding（变量名 DB）后，再部署一次
npx wrangler pages deploy frontend/dist
```

完成。
