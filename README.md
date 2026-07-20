# 真人荷官视讯系统后台管理平台

## 项目简介

这是一个功能完整的真人荷官视讯系统后台管理平台，包含**系统总管理后台**和**代理管理后台**两套独立的管理系统。

### 系统架构
- **前端框架**: 原生JavaScript + TailwindCSS
- **后端框架**: Hono (Cloudflare Workers)
- **数据库**: Cloudflare D1 (SQLite)
- **部署平台**: Cloudflare Pages
- **版本**: V2.1 升级版

---

## 🌐 在线演示地址

### 系统总管理后台
- **✅ 生产环境**: https://online-app.pages.dev/
- **账号**: `admin`
- **密码**: `Qwer@1234`

### 代理管理后台（股东）
- **✅ 生产环境**: https://online-app.pages.dev/agent.html
- **账号**: `shareholder01`
- **密码**: `Qwer@1234`

### 代理管理后台（代理）
- **✅ 生产环境**: https://online-app.pages.dev/agent.html
- **账号**: `agent01`
- **密码**: `Qwer@1234`

> 🎉 **已部署**: 生产环境已成功部署到Cloudflare Pages，立即可用！  
> 🔒 **安全提示**: 首次登录后请立即修改密码并启用2FA双因素认证  
> 📧 **技术支持**: cnwen123@gmail.com

---

## 一、系统总管理后台

### 访问说明
- **沙箱环境**: 用于测试和演示，数据可能随时重置
- **生产环境**: 需要部署到Cloudflare Pages，获得永久访问地址

### 核心功能模块

#### 1. 玩家管理
- **玩家列表**: 查看、搜索、筛选所有玩家
- **玩家详情**: 查看玩家基本信息、投注记录、交易记录
- **玩家操作**: 
  - 添加/编辑玩家
  - 启用/禁用账户
  - 转移代理
  - 设置洗码方案
- **VIP等级配置**: 配置VIP等级规则和权益

#### 2. 代理系统
- **层级结构**: 树形展示代理组织架构（最多5级）
- **代理列表**: 管理所有代理账号
- **代理详情**: 查看代理业绩、下线、洗码数据
- **代理操作**:
  - 添加/编辑代理
  - 设置洗码率和占成比例
  - 重新生成邀请链接
  - 验证专属域名

#### 3. 财务管理
- **人工存取款**: 手动处理玩家存款和取款
- **账户明细**: 查看所有交易流水
- **提款审核**: 审核玩家提款申请
- **存款审核**: 确认玩家存款到账
- **收款方式设置**: 配置银行卡、USDT等收款方式
- **财务密码设置**: 设置3个财务操作密码

#### 4. 红利与洗码 (V2.1升级)
- **待审核发放**: 审核并发放洗码费
- **洗码方案配置**: 配置游戏洗码比例
- **红利派发**: 手动派发红利
- **红利触发**: 设置自动红利触发条件
- **流水稽核设置**: 配置提款流水要求

#### 5. 风控管理
- **实时预警**: 监控异常投注和账户行为
- **限红配置**: 设置游戏下注限额
- **风控规则设置**: 配置风控策略

#### 6. 报表中心
- **盈亏日报**: 每日盈亏汇总统计
- **盈亏排行**: 玩家/代理盈亏排名
- **游戏报表**: 各游戏类型数据统计
  - 支持查看玩家游戏详情（点击详情展开）
- **注单明细**: 所有投注记录查询
- **代理业绩**: 代理业绩统计和排名
- **盈利分成**: 综合盈利分成报表
- **结算报表**: 结算数据统计
- **转账记录**: 所有转账交易记录

#### 7. 系统设置
- **个人资料**: 修改管理员信息
- **修改密码**: 更改登录密码
- **双因素认证**: 启用2FA安全验证
- **角色权限**: 配置管理员角色和权限

#### 8. 直播间管理
- **智能排班**: 荷官排班管理
- **桌台管理**: 游戏桌台配置
- **荷官档案**: 荷官信息管理

---

## 二、代理管理后台

### 访问地址
- **生产环境**: `https://online-app.pages.dev/agent.html`
- **股东账号**: `shareholder01` / `Qwer@1234`
- **代理账号**: `agent01` / `Qwer@1234`

### 核心功能模块

#### 1. 账户总览
- **统计卡片**: 累计洗码费、本月业绩、团队总人数等
- **最近动态**: 实时显示账户变动
- **快捷入口**: 快速访问常用功能

#### 2. 代理层级
- **组织架构**: 树形展示下级代理结构
- **代理管理**: 添加、编辑下级代理
- **洗码率配置**: 设置下级洗码率

#### 3. 团队管理
- **玩家列表**: 查看所有直属玩家
- **玩家详情**: 查看玩家投注和交易记录
- **玩家操作**: 管理玩家账户

#### 4. 游戏报表
- **数据统计**: 按时间范围统计游戏数据
- **游戏详情**: 点击「详情」查看玩家投注明细（新功能）
  - 游戏ID、游戏类型、桌台号
  - 投注金额、有效投注、输赢金额
  - 洗码费、投注时间、结算时间

#### 5. 佣金明细
- **统计汇总**: 累计佣金、本月佣金、今日佣金
- **明细查询**: 查看每日佣金明细
- **字段说明**:
  - 有效投注
  - 输赢金额
  - 洗码率%
  - 洗码费
  - 占成比例
  - 佣金金额 = (输赢金额 - 洗码费) × 占成比例

#### 6. 财务记录
- **交易明细**: 查看所有账户交易
- **类型筛选**: 按交易类型筛选
- **余额变动**: 实时显示余额变化

---

## 🚀 快速部署到生产环境

### 一键部署命令
```bash
# 1. 克隆仓库
git clone https://github.com/CNWEN123/backstage-01A.git
cd backstage-01A

# 2. 安装依赖
npm install

# 3. 登录Cloudflare
wrangler login

# 4. 创建D1数据库
wrangler d1 create webapp-production

# 5. 应用数据库迁移
wrangler d1 migrations apply webapp-production

# 6. 构建项目
npm run build

# 7. 部署到Cloudflare Pages
wrangler pages deploy dist --project-name webapp
```

### 部署后配置
1. 在 Cloudflare Dashboard 绑定 D1 数据库
2. 创建管理员账号并设置强密码
3. 启用2FA双因素认证
4. 配置访问限制

📖 **详细部署指南**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 技术特性

### 安全性
- ✅ **SQL注入防护**: 所有查询使用参数化绑定
- ✅ **密码加密**: SHA-256哈希存储
- ✅ **登录保护**: 失败次数限制 + 账户锁定
- ✅ **Session管理**: 自动过期机制
- ✅ **2FA支持**: 双因素认证

### 性能优化
- ✅ **响应式设计**: 支持桌面端和移动端
- ✅ **异步加载**: 所有数据异步获取
- ✅ **分页查询**: 大数据集分页显示
- ✅ **边缘计算**: Cloudflare Workers全球部署

### 用户体验
- ✅ **现代UI**: TailwindCSS + 渐变色设计
- ✅ **图标系统**: FontAwesome图标库
- ✅ **实时反馈**: Toast提示和加载状态
- ✅ **数据可视化**: 图表和统计卡片

---

## 项目结构

```
webapp/
├── src/
│   ├── index.tsx              # 主后端应用 (9,146行)
│   └── renderer.tsx           # 渲染器
├── public/
│   ├── agent.html             # 代理后台HTML
│   └── static/
│       ├── app.js             # 系统总管理后台JS (15,833行)
│       └── agent.js           # 代理管理后台JS (3,393行)
├── migrations/                # D1数据库迁移文件
├── wrangler.jsonc             # Cloudflare配置
├── package.json               # 项目依赖
├── ecosystem.config.cjs       # PM2配置
├── README.md                  # 本文档
└── SECURITY_AUDIT.md          # 安全审查报告
```

---

## 快速开始

### 1. 环境要求
- Node.js >= 18
- npm >= 9
- Cloudflare账号

### 2. 安装依赖
```bash
npm install
```

### 3. 本地开发
```bash
# 构建项目
npm run build

# 启动开发服务器（使用PM2）
pm2 start ecosystem.config.cjs

# 查看日志
pm2 logs --nostream

# 访问系统
# 系统总管理后台: http://localhost:3000/
# 代理管理后台: http://localhost:3000/agent.html
```

### 4. 数据库迁移
```bash
# 应用本地迁移
npm run db:migrate:local

# 应用生产迁移
npm run db:migrate:prod

# 重置本地数据库
npm run db:reset
```

### 5. 部署到Cloudflare Pages
```bash
# 部署到生产环境
npm run deploy

# 或指定项目名称
npm run deploy:prod
```

---

## API文档

### 认证相关
- `POST /api/auth/login` - 管理员登录
- `POST /api/auth/logout` - 退出登录
- `GET /api/auth/session` - 获取当前会话

### 玩家管理
- `GET /api/players` - 获取玩家列表
- `GET /api/players/:id` - 获取玩家详情
- `POST /api/players` - 添加玩家
- `PUT /api/players/:id` - 更新玩家
- `PUT /api/players/:id/status` - 修改玩家状态

### 代理管理
- `GET /api/agents` - 获取代理列表
- `GET /api/agents/tree` - 获取代理树
- `GET /api/agents/:id` - 获取代理详情
- `POST /api/agents` - 添加代理
- `PUT /api/agents/:id` - 更新代理

### 财务管理
- `GET /api/transactions` - 获取交易记录
- `GET /api/withdraws` - 获取提款申请
- `PUT /api/withdraws/:id` - 审核提款
- `GET /api/deposits` - 获取存款记录

### 报表中心
- `GET /api/reports/daily` - 日报数据
- `GET /api/reports/ranking` - 排行榜数据
- `GET /api/reports/game` - 游戏报表
- `GET /api/reports/bets` - 注单明细
- `GET /api/agent/game-report` - 代理游戏报表
- `GET /api/agent/player-game-detail` - 玩家游戏详情（新增）

更多API详情请查看 `src/index.tsx`

---

## 数据库模型

### 核心表结构
- `players` - 玩家表
- `agents` - 代理表
- `admins` - 管理员表
- `transactions` - 交易记录表
- `bets` - 投注记录表
- `commission_records` - 佣金记录表
- `commission_schemes` - 洗码方案表
- `game_tables` - 游戏桌台表
- `dealers` - 荷官表

详细表结构请查看 `migrations/` 目录

---

## 重要计算公式

### 代理佣金计算
```
佣金金额 = (输赢金额 - 洗码费) × 占成比例
```

### 公司盈利计算
```
公司盈利 = 输赢金额 - [(输赢金额 - 洗码费) × 占成比例]
```

### 洗码费计算
```
洗码费 = 有效投注 × 洗码率%
```

---

## 版本历史

### V2.1 (当前版本)
- ✅ 优化报表中心字段名称和计算公式
- ✅ 新增游戏报表详情展开功能
- ✅ 统一「洗码费」术语（原「佣金」）
- ✅ 优化代理业绩统计卡布局
- ✅ 调整报表中心菜单顺序
- ✅ 移除佣金明细「状态」字段
- ✅ 完善代码注释和文档

### V2.0
- 初始版本发布
- 实现所有核心功能模块

---

## 注意事项

### 安全建议
1. **设置强密码**: 为所有管理员账户设置强密码
2. **启用2FA**: 为管理员账户启用双因素认证
3. **定期备份**: 定期备份D1数据库
4. **访问控制**: 限制管理后台访问IP

### 性能建议
1. **使用CDN**: 静态资源使用Cloudflare CDN
2. **数据分页**: 大数据集使用分页查询
3. **缓存策略**: 合理使用KV缓存
4. **监控告警**: 配置Cloudflare Analytics

---

## 技术支持

- **项目地址**: https://github.com/CNWEN123/backstage-01A
- **开发团队**: Owen's Team
- **联系邮箱**: cnwen123@gmail.com (获取访问账号密码)
- **更新时间**: 2024-12-01

---

## 许可证

本项目仅供学习和研究使用，未经授权不得用于商业用途。

© 2024 真人荷官视讯系统. All Rights Reserved.
