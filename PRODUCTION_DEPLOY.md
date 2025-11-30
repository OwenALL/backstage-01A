# 生产环境部署指南

## 🌐 永久访问地址（部署后生效）

### 系统总管理后台
- **访问地址**: `https://webapp.pages.dev/`
- **默认账号**: `admin`
- **默认密码**: `admin123`
- ⚠️ **部署后请立即修改密码！**

### 代理管理后台
- **访问地址**: `https://webapp.pages.dev/agent.html`
- **股东账号**: `shareholder01` / `test123`
- **代理账号**: `agent01` / `test123`
- ⚠️ **部署后请立即修改密码！**

---

## 🚀 一键部署步骤

### 前置要求
1. ✅ Cloudflare 账号
2. ✅ Cloudflare API Token
3. ✅ Node.js >= 18

### 步骤1: 配置Cloudflare API
```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 验证登录
wrangler whoami
```

### 步骤2: 创建D1数据库
```bash
# 创建生产数据库
wrangler d1 create webapp-production

# 会输出类似以下内容：
# [[d1_databases]]
# binding = "DB"
# database_name = "webapp-production"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 复制 database_id 并更新到 wrangler.jsonc
```

**更新 wrangler.jsonc**:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "webapp",
  "compatibility_date": "2024-01-01",
  "pages_build_output_dir": "./dist",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "webapp-production",
      "database_id": "替换为你的database_id"
    }
  ]
}
```

### 步骤3: 应用数据库迁移
```bash
# 应用所有迁移到生产数据库
wrangler d1 migrations apply webapp-production

# 验证迁移
wrangler d1 execute webapp-production --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 步骤4: 构建项目
```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 验证构建产物
ls -la dist/
```

### 步骤5: 创建Pages项目
```bash
# 创建 Cloudflare Pages 项目
wrangler pages project create webapp \
  --production-branch main \
  --compatibility-date 2024-01-01

# 如果项目已存在，可以跳过此步骤
```

### 步骤6: 部署到生产环境
```bash
# 部署到 Cloudflare Pages
wrangler pages deploy dist --project-name webapp

# 部署成功后会显示：
# ✨ Deployment complete! Take a peek over at
# https://xxxxxxxx.webapp.pages.dev
```

### 步骤7: 绑定D1数据库
在 Cloudflare Dashboard 中完成最后配置：

1. 登录 https://dash.cloudflare.com/
2. 进入 **Workers & Pages** > **webapp**
3. 点击 **Settings** > **Functions**
4. 找到 **D1 database bindings**
5. 点击 **Add binding**:
   - Variable name: `DB`
   - D1 database: `webapp-production`
6. 点击 **Save**
7. 重新部署以使配置生效

### 步骤8: 配置自定义域名（可选）
```bash
# 添加自定义域名
wrangler pages domain add yourdomain.com --project-name webapp

# 然后在你的DNS服务商添加CNAME记录：
# Type: CNAME
# Name: @ 或 www
# Target: webapp.pages.dev
# TTL: Auto
```

---

## 🔐 安全配置（重要！）

### 立即执行的安全措施

#### 1. 修改默认密码
```
系统管理员:
1. 登录 https://webapp.pages.dev/
2. 使用 admin / admin123 登录
3. 进入「系统设置」>「修改密码」
4. 设置强密码（至少8位，包含大小写字母+数字+特殊字符）

代理账号:
1. 登录 https://webapp.pages.dev/agent.html
2. 分别使用测试账号登录
3. 修改密码
4. 或在系统管理后台禁用测试账号
```

#### 2. 启用2FA双因素认证
```
1. 登录系统管理后台
2. 进入「系统设置」>「双因素认证」
3. 扫描二维码
4. 输入验证码启用
```

#### 3. 配置访问限制
在 Cloudflare Dashboard 中：
```
1. 进入 Pages > webapp > Settings > Access
2. 配置 IP 白名单
3. 或启用 Cloudflare Access（企业级访问控制）
```

#### 4. 配置环境变量和密钥
```bash
# 设置Session密钥
wrangler pages secret put SESSION_SECRET --project-name webapp
# 输入一个强随机字符串

# 其他可选的环境变量
wrangler pages secret put ENVIRONMENT --project-name webapp
# 输入: production
```

---

## 📊 部署后验证

### 1. 检查系统管理后台
```bash
# 访问首页
curl -I https://webapp.pages.dev/

# 应该返回 200 OK
```

### 2. 检查代理后台
```bash
# 访问代理后台
curl -I https://webapp.pages.dev/agent.html

# 应该返回 200 OK
```

### 3. 测试API端点
```bash
# 测试登录API
curl -X POST https://webapp.pages.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 应该返回 session_id
```

### 4. 检查数据库
```bash
# 查看玩家数据
wrangler d1 execute webapp-production \
  --command="SELECT COUNT(*) as count FROM players"

# 查看代理数据
wrangler d1 execute webapp-production \
  --command="SELECT COUNT(*) as count FROM agents"
```

---

## 🔄 更新部署

### 代码更新流程
```bash
# 1. 拉取最新代码
git pull

# 2. 安装依赖（如果有变化）
npm install

# 3. 构建
npm run build

# 4. 部署
wrangler pages deploy dist --project-name webapp
```

### 数据库迁移更新
```bash
# 应用新的迁移
wrangler d1 migrations apply webapp-production

# 查看迁移历史
wrangler d1 migrations list webapp-production
```

---

## 📈 监控和维护

### 查看部署日志
```bash
# 查看最近的部署
wrangler pages deployment list --project-name webapp

# 实时日志
wrangler pages deployment tail --project-name webapp
```

### 查看访问统计
1. 登录 Cloudflare Dashboard
2. 进入 **Pages** > **webapp** > **Analytics**
3. 查看访问量、带宽、请求数等指标

### 定期备份
```bash
# 每周备份一次数据库
wrangler d1 export webapp-production --output=backup-$(date +%Y%m%d).sql

# 保存到安全的地方（建议使用云存储）
```

---

## 🆘 常见问题

### Q1: 部署后页面显示404
**解决方案**:
```bash
# 检查 dist 目录是否正确生成
ls -la dist/

# 重新构建并部署
npm run build
wrangler pages deploy dist --project-name webapp
```

### Q2: API返回500错误
**解决方案**:
```bash
# 检查D1数据库是否已绑定
# 在 Cloudflare Dashboard > Pages > webapp > Settings > Functions
# 确认 D1 database bindings 已配置

# 查看错误日志
wrangler pages deployment tail --project-name webapp
```

### Q3: 登录失败
**解决方案**:
```bash
# 检查数据库是否有管理员数据
wrangler d1 execute webapp-production \
  --command="SELECT * FROM admins WHERE username='admin'"

# 如果没有，需要应用迁移或手动插入
```

### Q4: 自定义域名无法访问
**解决方案**:
1. 检查DNS记录是否正确配置
2. 等待DNS传播（可能需要几分钟到几小时）
3. 检查SSL证书是否已自动生成

---

## 📞 技术支持

如果遇到问题：
1. 查看 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. 查看 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
3. 查看 [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
4. 提交 GitHub Issue

---

## ✅ 部署完成检查清单

- [ ] Cloudflare API Token 已配置
- [ ] D1 数据库已创建
- [ ] 数据库迁移已应用
- [ ] Pages 项目已创建
- [ ] 代码已部署
- [ ] D1 数据库已绑定
- [ ] 系统管理后台可访问
- [ ] 代理后台可访问
- [ ] 所有默认密码已修改
- [ ] 2FA 已启用
- [ ] 访问限制已配置
- [ ] 备份策略已设置
- [ ] 监控已启用

---

## 🎯 生产环境地址（部署后）

部署完成后，请将以下信息更新到 README.md：

```markdown
## 🌐 生产环境访问

### 系统总管理后台
- **地址**: https://webapp.pages.dev/
- **账号**: admin（请立即修改密码）

### 代理管理后台  
- **地址**: https://webapp.pages.dev/agent.html
- **测试账号**: shareholder01 / agent01（生产环境建议禁用）
```

---

© 2024 真人荷官视讯系统 - 生产环境部署指南
