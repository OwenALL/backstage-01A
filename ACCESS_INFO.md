# 🔐 生产环境完整访问信息

⚠️ **重要提示**: 此文档包含生产环境的完整访问凭证,请妥善保管。

---

## 🌐 生产环境访问地址

### 系统总管理后台
- **访问地址**: https://webapp-eqp.pages.dev/
- **登录账号**: `admin`
- **登录密码**: `Qwer@1234`
- **权限级别**: 超级管理员 (最高权限)
- **功能权限**: 
  - ✅ 玩家管理 (查看、添加、编辑、禁用)
  - ✅ 代理管理 (5级树形架构)
  - ✅ 财务管理 (存取款、审核、交易流水)
  - ✅ 红利与洗码 (方案配置、审核发放)
  - ✅ 风控管理 (预警、限红、规则)
  - ✅ 报表中心 (8种专业报表)
  - ✅ 系统设置 (权限、2FA、角色配置)
  - ✅ 直播间管理 (荷官、桌台、排班)

### 代理管理后台 - 股东级别
- **访问地址**: https://webapp-eqp.pages.dev/agent.html
- **登录账号**: `shareholder01`
- **登录密码**: `Qwer@1234`
- **权限级别**: 股东 (Shareholder)
- **功能权限**:
  - ✅ 账户总览 (累计洗码费、业绩统计)
  - ✅ 代理层级 (查看下级代理树)
  - ✅ 团队管理 (玩家列表、详情)
  - ✅ 游戏报表 (数据统计、详情展开)
  - ✅ 佣金明细 (洗码费、占成计算)
  - ✅ 财务记录 (交易明细、余额)

### 代理管理后台 - 代理级别
- **访问地址**: https://webapp-eqp.pages.dev/agent.html
- **登录账号**: `agent01`
- **登录密码**: `Qwer@1234`
- **权限级别**: 代理 (Agent)
- **功能权限**:
  - ✅ 账户总览 (个人业绩统计)
  - ✅ 代理层级 (管理下级代理)
  - ✅ 团队管理 (直属玩家)
  - ✅ 游戏报表 (团队数据)
  - ✅ 佣金明细 (洗码费详情)
  - ✅ 财务记录 (账户流水)

---

## 🧪 沙箱演示环境

### 系统总管理后台 (沙箱)
- **访问地址**: https://3000-iuwuqi7rz0v5niuhr74wf-cc2fbc16.sandbox.novita.ai/
- **登录账号**: `admin`
- **登录密码**: `Qwer@1234`
- **说明**: 沙箱环境用于测试,数据可能随时重置

### 代理管理后台 (沙箱)
- **访问地址**: https://3000-iuwuqi7rz0v5niuhr74wf-cc2fbc16.sandbox.novita.ai/agent.html
- **股东账号**: `shareholder01` / `Qwer@1234`
- **代理账号**: `agent01` / `Qwer@1234`

---

## 📊 Cloudflare 基础设施信息

### D1 数据库
- **数据库名称**: webapp-production
- **数据库 ID**: dbac89e1-e8bf-44e6-a2ac-3ef4a984c945
- **区域**: ENAM (Eastern North America)
- **类型**: SQLite-based (Cloudflare D1)
- **迁移状态**: 3个迁移已应用
  - 0001_schema.sql (初始架构)
  - 0002_add_agent_domains.sql (代理域名)
  - 0003_transfer_system.sql (转账系统)

### Cloudflare Pages 项目
- **项目名称**: webapp
- **项目 ID**: 7839cb8c-66ce-4422-8102-9e98dc337b5e
- **生产域名**: webapp-eqp.pages.dev
- **部署分支**: main
- **构建命令**: `npm run build`
- **输出目录**: dist

### Cloudflare 账号信息
- **账号邮箱**: Cnwen123@gmail.com
- **账号 ID**: 9b1750b36d4bb9662caa1f91ae4e4ba5

---

## 🗄️ 数据库连接方式

### 使用 Wrangler CLI 连接
```bash
# 连接生产数据库
wrangler d1 execute webapp-production --remote --command="SELECT * FROM admins"

# 查询玩家
wrangler d1 execute webapp-production --remote --command="SELECT * FROM players LIMIT 10"

# 查询代理
wrangler d1 execute webapp-production --remote --command="SELECT * FROM agents"

# 查询交易记录
wrangler d1 execute webapp-production --remote --command="SELECT * FROM transactions ORDER BY created_at DESC LIMIT 20"
```

### 数据库表结构
- `admins` - 管理员表 (当前账号: admin)
- `agents` - 代理表 (当前账号: shareholder01, agent01)
- `players` - 玩家表
- `transactions` - 交易记录表
- `bets` - 投注记录表
- `withdraw_requests` - 提款申请表
- `deposits` - 存款记录表
- `commission_records` - 佣金记录表
- `commission_schemes` - 洗码方案表
- `game_tables` - 游戏桌台表
- `dealers` - 荷官表
- `payment_methods` - 支付方式表
- `risk_alerts` - 风控预警表
- `audit_logs` - 审计日志表
- `player_sessions` - 玩家会话表

---

## 🔧 管理员操作指南

### 修改密码
1. 登录系统总管理后台
2. 点击右上角「系统设置」→「修改密码」
3. 输入当前密码 `Qwer@1234`
4. 输入新密码并确认
5. 点击「确认修改」

### 添加新管理员
1. 进入「系统管理」→「管理员管理」
2. 点击「添加管理员」
3. 填写用户名、密码、昵称
4. 选择角色权限
5. 点击「保存」

### 添加新代理
1. 进入「代理管理」→「代理列表」
2. 点击「添加代理」
3. 填写代理信息 (用户名、密码、级别)
4. 设置洗码率和占成比例
5. 点击「保存」

### 启用双因素认证 (2FA)
1. 进入「系统设置」→「安全设置」
2. 点击「启用2FA」
3. 使用 Google Authenticator 扫描二维码
4. 输入验证码完成绑定

---

## 🚀 部署和维护

### 本地开发环境设置
```bash
# 1. 克隆仓库
git clone https://github.com/CNWEN123/Live-dealer-backstage-01.git
cd Live-dealer-backstage-01

# 2. 安装依赖
npm install

# 3. 本地开发
npm run build
pm2 start ecosystem.config.cjs

# 4. 访问本地环境
# 系统管理: http://localhost:3000/
# 代理后台: http://localhost:3000/agent.html
```

### 生产环境更新部署
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 部署到 Cloudflare Pages
wrangler pages deploy dist --project-name webapp

# 5. 应用数据库迁移 (如有新迁移)
wrangler d1 migrations apply webapp-production --remote
```

### 数据库备份
```bash
# 导出所有数据
wrangler d1 execute webapp-production --remote --command="SELECT * FROM admins" > backup_admins.json
wrangler d1 execute webapp-production --remote --command="SELECT * FROM agents" > backup_agents.json
wrangler d1 execute webapp-production --remote --command="SELECT * FROM players" > backup_players.json
```

---

## 📞 联系方式

- **项目负责人**: Owen
- **联系邮箱**: cnwen123@gmail.com
- **GitHub 主仓库**: https://github.com/CNWEN123/backstage-01A
- **GitHub 备份仓库**: https://github.com/CNWEN123/Live-dealer-backstage-01

---

## ⚠️ 安全建议

### 强烈建议
1. **定期修改密码**: 建议每3个月更换一次密码
2. **启用2FA**: 为所有管理员账号启用双因素认证
3. **IP白名单**: 在 Cloudflare 配置允许访问的IP地址
4. **访问日志**: 定期检查 `audit_logs` 表的登录记录
5. **数据备份**: 每周备份一次数据库

### 密码管理
- **当前密码**: `Qwer@1234` (所有账号统一)
- **推荐强度**: 至少包含大小写字母、数字、特殊字符
- **不要使用**: 生日、姓名、常见词汇

### 紧急情况处理
如果发现账号被盗或异常登录:
1. 立即修改所有账号密码
2. 检查 `audit_logs` 表的异常记录
3. 在 Cloudflare Dashboard 启用 Bot Fight Mode
4. 配置 Rate Limiting 限制登录频率

---

## 📝 快速参考

### 登录凭证速查表
| 类型 | 账号 | 密码 | 访问地址 |
|------|------|------|----------|
| 系统管理员 | admin | Qwer@1234 | https://webapp-eqp.pages.dev/ |
| 股东账号 | shareholder01 | Qwer@1234 | https://webapp-eqp.pages.dev/agent.html |
| 代理账号 | agent01 | Qwer@1234 | https://webapp-eqp.pages.dev/agent.html |

### API 端点
- 管理员登录: `POST /api/auth/login`
- 代理登录: `POST /api/agent/login`
- 获取玩家列表: `GET /api/players`
- 获取代理列表: `GET /api/agents`
- 获取交易记录: `GET /api/transactions`

### 数据库访问
```bash
# 快速查询管理员
wrangler d1 execute webapp-production --remote \
  --command="SELECT id, username, role, status FROM admins"

# 快速查询代理
wrangler d1 execute webapp-production --remote \
  --command="SELECT id, agent_username, level, status FROM agents"
```

---

**文档创建时间**: 2025-12-01  
**最后更新**: 2025-12-01  
**文档版本**: V1.0  
**项目版本**: V2.1  

🔒 **重要**: 请妥善保管此文档,包含完整的生产环境访问凭证。
