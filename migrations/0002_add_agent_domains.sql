-- 为代理表添加分享链接和专属域名字段

-- 添加分享链接代码（唯一标识）
ALTER TABLE agents ADD COLUMN invite_code TEXT;

-- 添加专属域名（支持多个，JSON数组存储）
ALTER TABLE agents ADD COLUMN custom_domains TEXT;

-- 添加分享链接状态
ALTER TABLE agents ADD COLUMN invite_link_status INTEGER DEFAULT 1;

-- 为已存在的代理生成随机邀请码
UPDATE agents SET invite_code = lower(hex(randomblob(4))) WHERE invite_code IS NULL;

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_invite_code ON agents(invite_code);
