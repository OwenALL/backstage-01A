-- 为每个代理添加随机玩家数量
-- 股东：5-25个玩家
-- 代理：3-15个玩家

-- 更新股东的玩家数（ID 2-31）
UPDATE agents SET 
  contact_phone = '+1-555-' || substr('0000' || (id * 123 % 9999), -4, 4),
  contact_email = agent_username || '@example.com'
WHERE level = 'shareholder';

-- 更新代理的玩家数（ID 32-61）
UPDATE agents SET 
  contact_phone = '+1-555-' || substr('0000' || (id * 456 % 9999), -4, 4),
  contact_email = agent_username || '@example.com'
WHERE level = 'agent';

-- 为测试数据生成一些玩家
INSERT INTO players (username, password_hash, nickname, agent_id, balance, total_bet, status, created_at)
SELECT 
  'player_' || printf('%03d', (SELECT COUNT(*) FROM players) + ROW_NUMBER() OVER()),
  '$2a$10$testplayer123456789',
  '玩家' || printf('%03d', (SELECT COUNT(*) FROM players) + ROW_NUMBER() OVER()),
  agents.id,
  CAST((ABS(RANDOM()) % 50000 + 1000) AS REAL),
  CAST((ABS(RANDOM()) % 100000) AS REAL),
  1,
  datetime('now', '-' || (ABS(RANDOM()) % 30) || ' days')
FROM agents
JOIN (SELECT 1 AS n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
      UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) nums
WHERE agents.level IN ('shareholder', 'agent')
LIMIT 300;
