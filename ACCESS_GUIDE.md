# 🌐 系统访问指南

## 在线演示地址（立即可用）

### 🖥️ 系统总管理后台

**沙箱演示地址（立即访问）**:
```
https://3000-iuwuqi7rz0v5niuhr74wf-cc2fbc16.sandbox.novita.ai/
```

**登录账号**:
- 用户名: `admin`
- 密码: `admin123`

**功能模块**:
- ✅ 玩家管理
- ✅ 代理系统
- ✅ 财务管理
- ✅ 红利与洗码
- ✅ 风控管理
- ✅ 报表中心
- ✅ 系统设置
- ✅ 直播间管理

---

### 👥 代理管理后台

**沙箱演示地址（立即访问）**:
```
https://3000-iuwuqi7rz0v5niuhr74wf-cc2fbc16.sandbox.novita.ai/agent.html
```

**股东账号**:
- 用户名: `shareholder01`
- 密码: `test123`

**代理账号**:
- 用户名: `agent01`
- 密码: `test123`

**功能模块**:
- ✅ 账户总览
- ✅ 代理层级
- ✅ 团队管理
- ✅ 游戏报表（支持详情展开）
- ✅ 佣金明细
- ✅ 财务记录

---

## 永久访问地址（需部署）

### 📌 生产环境地址

部署到Cloudflare Pages后，将获得以下永久地址：

**系统总管理后台**:
```
https://webapp.pages.dev/
或
https://your-custom-domain.com/
```

**代理管理后台**:
```
https://webapp.pages.dev/agent.html
或
https://your-custom-domain.com/agent.html
```

---

## 🚀 如何部署获得永久地址

### 快速部署（5分钟）

1. **克隆代码**
   ```bash
   git clone https://github.com/CNWEN123/backstage-01A.git
   cd backstage-01A
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **登录Cloudflare**
   ```bash
   wrangler login
   ```

4. **创建数据库**
   ```bash
   wrangler d1 create webapp-production
   # 复制输出的 database_id 到 wrangler.jsonc
   ```

5. **应用迁移**
   ```bash
   wrangler d1 migrations apply webapp-production
   ```

6. **部署**
   ```bash
   npm run build
   wrangler pages deploy dist --project-name webapp
   ```

7. **绑定数据库**
   - 登录 Cloudflare Dashboard
   - 进入 Pages > webapp > Settings > Functions
   - 添加 D1 database binding
   - Variable name: `DB`
   - D1 database: `webapp-production`

8. **访问系统**
   ```
   https://xxxxxxxx.webapp.pages.dev/
   ```

📖 **详细步骤**: [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md)

---

## 📱 移动端访问

所有后台系统都支持响应式设计，可以通过手机浏览器访问：

### 系统管理后台（手机访问）
```
https://3000-iuwuqi7rz0v5niuhr74wf-cc2fbc16.sandbox.novita.ai/
```

### 代理后台（手机访问）
```
https://3000-iuwuqi7rz0v5niuhr74wf-cc2fbc16.sandbox.novita.ai/agent.html
```

---

## 🔐 测试账号信息汇总

### 系统总管理后台
| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 超级管理员 | admin | admin123 | 所有权限 |

### 代理管理后台
| 角色 | 用户名 | 密码 | 层级 |
|------|--------|------|------|
| 股东 | shareholder01 | test123 | 1级 |
| 代理 | agent01 | test123 | 2级 |

⚠️ **安全提醒**: 
- 沙箱环境可用于测试和演示
- 生产环境部署后请立即修改所有默认密码
- 建议启用2FA双因素认证

---

## 🎯 快速体验路径

### 系统管理后台体验路径

1. **登录系统**
   - 访问: https://3000-iuwuqi7rz0v5niuhr74wf-cc2fbc16.sandbox.novita.ai/
   - 输入: admin / admin123

2. **查看仪表盘**
   - 查看系统统计数据
   - 查看待处理事项

3. **管理玩家**
   - 进入「玩家管理」
   - 查看玩家列表
   - 点击玩家查看详情

4. **查看报表**
   - 进入「报表中心」
   - 选择「盈亏日报」
   - 查看数据统计

5. **管理代理**
   - 进入「代理系统」
   - 查看代理树结构
   - 查看代理业绩

### 代理后台体验路径

1. **登录系统**
   - 访问: https://3000-iuwuqi7rz0v5niuhr74wf-cc2fbc16.sandbox.novita.ai/agent.html
   - 输入: agent01 / test123

2. **查看总览**
   - 查看账户统计
   - 查看最近动态

3. **查看游戏报表**
   - 进入「游戏报表」
   - 点击「详情」按钮
   - 查看玩家投注明细（新功能）

4. **查看佣金明细**
   - 进入「佣金明细」
   - 查看每日佣金统计
   - 查看计算公式

5. **管理团队**
   - 进入「团队管理」
   - 查看下级玩家
   - 查看玩家详情

---

## 📊 功能演示

### 系统管理后台 - 核心功能

#### 1. 玩家管理
```
路径: 登录 → 玩家管理 → 玩家列表
功能: 添加、编辑、禁用玩家，设置VIP等级
```

#### 2. 代理系统
```
路径: 登录 → 代理系统 → 层级结构
功能: 查看代理树，管理代理层级，设置洗码率
```

#### 3. 财务管理
```
路径: 登录 → 财务管理 → 提款审核
功能: 审核玩家提款申请，处理存款确认
```

#### 4. 报表中心
```
路径: 登录 → 报表中心 → 盈亏日报
功能: 查看日报、游戏报表、代理业绩等
```

### 代理后台 - 核心功能

#### 1. 游戏报表详情
```
路径: 登录 → 游戏报表 → 点击「详情」
功能: 查看玩家详细投注记录（新功能）
```

#### 2. 佣金明细
```
路径: 登录 → 佣金明细
功能: 查看每日佣金，查看计算公式
```

#### 3. 代理层级
```
路径: 登录 → 代理层级
功能: 查看下级代理树，管理下级
```

---

## 🔗 相关链接

### GitHub仓库
- **主仓库**: https://github.com/CNWEN123/backstage-01A
- **备份仓库**: https://github.com/CNWEN123/Live-dealer-backstage-01

### 文档资源
- [README.md](./README.md) - 项目说明
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API文档
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南
- [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md) - 生产部署
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - 安全审查
- [FINAL_REPORT.md](./FINAL_REPORT.md) - 最终报告

### 外部资源
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [Hono Framework](https://hono.dev/)
- [TailwindCSS](https://tailwindcss.com/)

---

## ⚠️ 重要提醒

### 沙箱环境说明
- 🔄 **数据可能重置**: 沙箱环境数据不保证永久保存
- 🧪 **仅供测试**: 适合测试和演示，不适合生产使用
- 🔓 **公开访问**: 任何人都可以访问

### 生产环境要求
- ✅ **部署到Cloudflare**: 获得永久稳定的访问地址
- ✅ **修改默认密码**: 所有账号必须使用强密码
- ✅ **启用2FA**: 为管理员账户启用双因素认证
- ✅ **访问控制**: 配置IP白名单或Cloudflare Access
- ✅ **定期备份**: 设置数据库自动备份策略
- ✅ **监控告警**: 配置系统监控和异常告警

---

## 📞 技术支持

如有问题，请：
1. 查看文档目录中的相关文档
2. 提交 GitHub Issue
3. 联系技术团队

---

## ✅ 访问检查清单

使用以下清单确保能够成功访问系统：

### 沙箱环境访问
- [ ] 能够打开系统管理后台URL
- [ ] 能够使用 admin/admin123 登录
- [ ] 能够打开代理后台URL
- [ ] 能够使用测试账号登录
- [ ] 所有功能模块正常显示

### 生产环境部署
- [ ] 已完成Cloudflare账号注册
- [ ] 已安装Node.js和Wrangler
- [ ] 已创建D1数据库
- [ ] 已应用数据库迁移
- [ ] 已部署到Cloudflare Pages
- [ ] 已绑定D1数据库
- [ ] 可以访问永久地址
- [ ] 已修改所有默认密码

---

**最后更新**: 2024-11-30  
**版本**: V2.1

© 2024 真人荷官视讯系统. All Rights Reserved.
