# 真人荷官视讯后台管理系统 V2.1

## 项目概述
- **名称**: Live Dealer Admin System
- **版本**: V2.1
- **目标**: 真人荷官视讯平台的中央后台控制枢纽，提供全方位的运营管理平台
- **技术栈**: Hono + TypeScript + Cloudflare Workers + D1 Database + TailwindCSS

## 访问地址
- **预览地址**: https://3000-iuwuqi7rz0v5niuhr74wf-cc2fbc16.sandbox.novita.ai
- **登录账号**: admin_root / admin123

## 11大核心模块

### 核心业务模块
| 模块 | 功能 | 路由 |
|------|------|------|
| 1. 仪表盘 | KPI指标、实时数据、趋势图表 | `#dashboard` |
| 2. 玩家控端 | CRM画像、KYC、生命周期管理 | `#players` |
| 3. 层级控端 | 代理树状结构、佣金模型配置 | `#agents` |
| 4. 财务控端 | 资金流水、存取款审核、人工调整 | `#finance` |
| 5. 注单控端 | 实时注单监控、历史查询、视频回放 | `#bets` |
| 6. 红利与洗码 | **V2.1升级** - 洗码策略配置、自动结算 | `#commission` |

### 运营管理模块
| 模块 | 功能 | 路由 |
|------|------|------|
| 7. 风险控端 | 大额预警、套利识别、限红管理 | `#risk` |
| 8. 报表中心 | 多维度经营报表、盈亏分析 | `#reports` |
| 9. 内容管理 | 游戏规则、公告跑马灯维护 | `#content` |
| 10. 系统设置 | RBAC权限、2FA、日志审计 | `#system` |
| 11. 现场运营 | **V2.1新增** - 荷官档案、智能排班 | `#studio` |

## V2.1 重点升级

### 洗码系统升级 🔥
- 从"简单计算"升级为"策略配置"
- 支持多套洗码方案模板
- 不同游戏类型差异化返水比例
- 灵活的结算周期（日结/周结/实时）
- 智能审核分流（小额自动、大额人工）

### 现场运营控端 ⭐ 新增
- 荷官档案库（工号、艺名、头像管理）
- 桌台配置管理（视频流、限红组）
- 甘特图可视化排班
- 冲突检测与WebSocket实时联动

### 财务功能增强 💰
- **人工存款/取款**: 支持快速为玩家手动入账或出款
- **收款方式管理**: 支持USDT (TRC20/ERC20)、银行卡、支付宝、微信、银联快捷等多种支付渠道
- **收款二维码功能**: 支持为每种收款方式配置二维码图片，用户端可扫码付款
- **存款审核增强**: 列表、详情、统计、人工补单、批量审核全流程

### 玩家状态管理 👥
- **在线/离线筛选**: 玩家列表支持按在线状态筛选
- **实时在线统计**: 显示在线/离线玩家数量统计卡片
- **踢线功能**: 支持将在线玩家强制下线

### 权限系统升级 🔐 NEW
- **细化权限分配**: 权限细化到每个大功能模块下的子功能级别
- **10大模块 + 60+子权限**: 涵盖仪表盘、玩家、财务、注单、洗码、风控、内容、报表、现场、系统
- **层级化管理**: 支持模块级全选和子功能级别的精细控制
- **灵活配置**: 可为不同角色自由组合任意子权限
- **直观UI**: 卡片式权限树，支持复选框联动和半选状态显示

### 财务密码功能 🔒 NEW
- **三套密码机制**: 支持设置最多3套独立的财务密码
- **验证规则配置**: 可配置需要1/2/3套密码才能通过验证
- **6大应用场景**: 人工存款、人工取款、红利派送、提款审核、存款审核、洗码结算审批
- **密码可视化**: 支持显示/隐藏密码功能
- **超级管理员特权**: 超级管理员可直接修改任意财务密码

## API 接口

### 仪表盘
- `GET /api/dashboard/stats` - 获取统计数据

### 玩家管理
- `GET /api/players` - 玩家列表（支持参数：`status`, `online_status`, `search`, `vip_level`, `risk_level`）
- `GET /api/players/:id` - 玩家详情
- `PUT /api/players/:id/status` - 更新状态
- `GET /api/players/online` - 在线玩家列表
- `GET /api/players/stats` - 玩家统计

### 代理管理
- `GET /api/agents` - 代理列表
- `GET /api/agents/tree` - 代理树形结构

### 财务管理
- `GET /api/transactions` - 交易流水
- `GET /api/withdraws` - 提款申请
- `PUT /api/withdraws/:id` - 审核提款
- `GET /api/deposits` - 存款申请列表
- `GET /api/deposits/stats` - 存款统计
- `GET /api/deposits/:id` - 存款详情
- `PUT /api/deposits/:id` - 审核存款
- `POST /api/deposits/supplement` - 存款补单
- `POST /api/deposits/batch-approve` - 批量审核存款
- `POST /api/manual-deposit` - **人工存款**
- `POST /api/manual-withdraw` - **人工取款**
- `POST /api/manual-adjust` - 人工调整

### 收款方式设置 (V2.1新增)
- `GET /api/payment-methods` - 收款方式列表（支持USDT/银行卡/支付宝等）
- `POST /api/payment-methods` - 添加收款方式（支持 `qr_code_url` 字段配置二维码）
- `PUT /api/payment-methods/:id` - 更新收款方式（含二维码URL）
- `DELETE /api/payment-methods/:id` - 禁用收款方式

**收款方式二维码功能说明**:
- 每种收款方式可配置一个二维码图片URL
- 支持实时预览二维码
- 前端显示二维码配置状态（已配置/未配置）
- 提供二维码全屏预览与链接复制功能

### 注单管理
- `GET /api/bets` - 注单列表

### 洗码管理
- `GET /api/commission/schemes` - 洗码方案
- `GET /api/commission/records` - 洗码记录
- `PUT /api/commission/records/:id` - 审核洗码

### 风控管理
- `GET /api/risk/alerts` - 风控预警
- `GET /api/risk/limit-groups` - 限红组

### 报表中心
- `GET /api/reports/daily` - 日报表
- `GET /api/reports/game` - 游戏报表
- `GET /api/reports/leaderboard` - 排行榜
- `GET /api/transfers` - **会员转账记录**（支持订单号、会员ID、状态、日期范围筛选）
- `PUT /api/transfers/:id/review` - **转账审核**（批准/拒绝）

### 转账手续费配置 (V2.1新增)
- `GET /api/transfer-fee-configs` - 手续费配置列表
- `POST /api/transfer-fee-configs` - 创建手续费配置（VIP等级、金额区间、费率类型）
- `PUT /api/transfer-fee-configs` - 更新手续费配置
- `DELETE /api/transfer-fee-configs` - 删除手续费配置

**转账手续费功能说明**:
- 支持基于VIP等级和金额区间的差异化费率
- 费率类型：百分比(percentage) 或 固定金额(fixed)
- 可配置最低/最高手续费限制
- 优先级规则匹配（数值越大优先级越高）
- 支持启用/禁用配置

### 内容管理
- `GET /api/contents` - 内容列表
- `POST /api/contents` - 新增内容

### 系统管理
- `GET /api/admins` - 管理员列表
- `GET /api/audit-logs` - 审计日志
- `GET /api/system/configs` - 系统配置
- `GET /api/roles` - 角色列表
- `POST /api/roles` - 创建角色
- `PUT /api/roles/:id` - 更新角色
- `DELETE /api/roles/:id` - 删除角色
- `GET /api/permissions` - **获取权限树**（10大模块 + 60+子权限）

### 财务密码
- `GET /api/finance-password/config` - 获取财务密码配置
- `POST /api/finance-password/set` - 设置财务密码
- `POST /api/finance-password/rule` - 保存验证规则
- `POST /api/finance-password/verify` - 验证财务密码
- `POST /api/finance-password/reset/:slot` - 重置财务密码（超级管理员专用）

### 现场运营
- `GET /api/dealers` - 荷官列表
- `GET /api/tables` - 桌台列表
- `GET /api/shifts` - 排班列表
- `POST /api/shifts` - 新增排班

### 认证
- `POST /api/auth/login` - 登录

## 数据架构

### 核心数据表 (28张)
- `admins` - 管理员账号（RBAC）
- `players` - 玩家信息
- `player_bank_cards` - 玩家银行卡
- `player_sessions` - 玩家会话（在线状态）
- `player_tags` - 玩家标签
- `agents` - 代理层级
- `transactions` - 资金流水
- `deposit_requests` - 存款申请
- `withdraw_requests` - 提款申请
- `payment_methods` - **收款方式配置**（支持USDT等）
- `bets` - 注单记录
- `game_results` - 游戏结果
- `commission_schemes` - 洗码方案
- `commission_records` - 洗码记录
- `bonus_records` - 红利记录
- `risk_alerts` - 风控预警
- `limit_groups` - 限红组
- `dealers` - 荷官档案
- `game_tables` - 桌台配置
- `dealer_shifts` - 排班记录
- `dealer_leaves` - 荷官请假
- `contents` - 内容管理
- `audit_logs` - 操作日志
- `system_configs` - 系统配置
- `vip_levels` - VIP等级配置
- `game_rooms` - 游戏房间

## 开发指南

### 本地开发
```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 应用数据库迁移
npm run db:migrate:local

# 导入测试数据
npm run db:seed

# 启动开发服务器
npm run dev:sandbox
```

### 部署到Cloudflare
```bash
npm run build
wrangler pages deploy dist
```

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | admin_root | admin123 |
| 财务总监 | finance_lead | finance123 |
| 风控专员 | risk_officer | risk123 |
| 客服主管 | cs_manager | cs123 |
| 运营专员 | ops_staff | ops123 |

## 设计原则
- **数据实时性**: 毫秒级同步
- **操作便捷性**: 优化交互流程
- **权限严控**: RBAC细粒度管理
- **高一致性**: 财务级数据准确
- **安全合规**: 2FA认证、IP白名单、操作留痕

## 技术特色
- 基于 Cloudflare Workers 边缘计算
- D1 SQLite 数据库持久化
- Hono 轻量级高性能框架
- TailwindCSS 现代化UI
- Chart.js 数据可视化
- 响应式设计，支持多端

### 核心数据表更新
- `transfer_records` - **会员转账记录**（含转出/转入会员、金额、手续费、状态）
- `transfer_fee_configs` - **转账手续费配置**（VIP等级、金额区间、费率规则）

## 转账功能亮点 (V2.1.3) 🆕

### 会员转账记录管理
**访问路径**: 报表中心 → 转账记录

**查询条件**:
- 日期范围筛选
- 转出/转入会员账号或ID查询
- 金额范围过滤
- 实时统计：总笔数、总金额、手续费、去重人数

**记录展示**:
- 订单号、时间、转出/转入会员信息（含VIP等级）
- 转账金额、手续费、实际到账金额
- 状态标识（待审核/已完成/已取消/失败）
- 备注信息

**操作功能**:
- 查看详情
- 审核操作（待审核状态）
- 导出报表

### 转账手续费配置
**访问路径**: 报表中心 → 手续费设置

**配置参数**:
- 配置名称（如：VIP5专属优惠费率）
- VIP等级（0-10或所有等级）
- 适用金额范围（最小-最大）
- 费率类型：百分比 / 固定金额
- 费率值（如：2% 或 固定5元）
- 最低/最高手续费限制
- 优先级（数值越大优先级越高）
- 启用/禁用状态

**费率匹配逻辑**:
1. 根据转账会员的VIP等级和转账金额进行匹配
2. 多个配置同时满足时，选择优先级最高的
3. 计算手续费并应用最低/最高限制
4. 仅匹配启用状态的配置

**示例配置**:
- VIP5专属：0.5% (1000-50000元，最低5元，最高100元，优先级100)
- 大额优惠：1% (≥10000元，优先级80)
- 小额固定：固定5元 (100-1000元，优先级60)
- 默认费率：2% (所有等级，所有金额，优先级0)

## 版本历史
- **V2.1.4** (2025-11-30) - **权限系统细化** + **财务密码功能** 全面上线
- **V2.1.3** (2025-11-30) - **会员转账记录** + **转账手续费配置** 功能上线
- **V2.1.2** (2025-11-29) - 收款方式设置增加「添加二维码」功能
- **V2.1.1** (2025-11-29) - 人工存取款 + 收款方式设置(USDT) + 玩家在线状态筛选
- **V2.1** (2025) - 洗码系统升级 + 现场运营控端新增
- **V2.0** - 11大核心模块基础功能

## 权限系统详解

### 权限结构（共10大模块 + 60+子权限）

#### 1. 仪表盘 (3项)
- 查看仪表盘 | 查看统计数据 | 查看待办事项

#### 2. 玩家管理 (7项)
- 查看玩家列表 | 查看玩家详情 | 编辑玩家信息 | 修改玩家状态 | 修改VIP等级 | 管理玩家标签 | 查看玩家余额

#### 3. 财务控端 (10项)
- 查看财务概览 | 提款审核 | 提款批准 | 提款拒绝 | 存款审核 | 存款批准 | 人工存款 | 人工提款 | 收款方式管理 | 编辑收款方式

#### 4. 注单控端 (5项)
- 查看注单列表 | 查看注单详情 | 取消注单 | 手动结算 | 导出注单

#### 5. 洗码系统 (5项)
- 查看洗码记录 | 执行洗码计算 | 洗码结算 | 洗码方案管理 | 代理管理

#### 6. 风险控端 (6项)
- 查看风控概览 | 查看风险预警 | 处理风险事件 | 风控规则管理 | 限红配置 | 黑名单管理

#### 7. 内容管理 (5项)
- 查看内容列表 | 创建内容 | 编辑内容 | 删除内容 | 发布/下架内容

#### 8. 报告中心 (5项)
- 查看报表 | 日报表 | 游戏报表 | 玩家报表 | 导出报表

#### 9. 现场运营 (4项)
- 查看现场概览 | 荷官管理 | 桌台管理 | 排班管理

#### 10. 系统设置 (10项)
- 查看系统设置 | 管理员管理 | 创建管理员 | 编辑管理员 | 删除管理员 | 角色管理 | 创建角色 | 编辑角色 | 查看操作日志 | 系统配置

### 权限配置示例

**财务专员**（仅提款审核权限）
```json
{
  "permissions": ["finance:view", "finance:withdraw_review"]
}
```

**客服主管**（玩家管理 + 内容管理）
```json
{
  "permissions": [
    "dashboard:view",
    "players:view",
    "players:edit",
    "content:*"
  ]
}
```

**超级管理员**（全部权限）
```json
{
  "permissions": ["*"]
}
```

---
企业级安全标准 · 细粒度权限控制 · 财务密码双重保护 · 全流程审计追踪

最后更新: 2025-11-30
