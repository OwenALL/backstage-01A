-- 测试数据生成脚本
-- 用于报表中心功能演示

-- 1. 创建测试玩家（20个玩家，分配给不同代理）
INSERT OR IGNORE INTO players (id, username, password_hash, nickname, balance, agent_id, vip_level, status, register_ip, created_at) VALUES
(1, 'player001', 'hash001', '幸运玩家001', 15000.00, 1, 2, 0, '192.168.1.101', datetime('now', '-30 days')),
(2, 'player002', 'hash002', '幸运玩家002', 8500.00, 1, 1, 0, '192.168.1.102', datetime('now', '-28 days')),
(3, 'player003', 'hash003', '幸运玩家003', 22000.00, 1, 3, 0, '192.168.1.103', datetime('now', '-25 days')),
(4, 'player004', 'hash004', '幸运玩家004', 3200.00, 1, 1, 0, '192.168.1.104', datetime('now', '-24 days')),
(5, 'player005', 'hash005', '幸运玩家005', 45000.00, 1, 4, 0, '192.168.1.105', datetime('now', '-22 days')),
(6, 'player006', 'hash006', '普通玩家006', 1200.00, NULL, 0, 0, '192.168.1.106', datetime('now', '-20 days')),
(7, 'player007', 'hash007', '普通玩家007', 5600.00, NULL, 1, 0, '192.168.1.107', datetime('now', '-18 days')),
(8, 'player008', 'hash008', '普通玩家008', 890.00, NULL, 0, 0, '192.168.1.108', datetime('now', '-16 days')),
(9, 'player009', 'hash009', '普通玩家009', 12000.00, NULL, 2, 0, '192.168.1.109', datetime('now', '-15 days')),
(10, 'player010', 'hash010', '普通玩家010', 7800.00, NULL, 1, 0, '192.168.1.110', datetime('now', '-14 days')),
(11, 'vip_player01', 'hash011', 'VIP大户001', 180000.00, 1, 5, 0, '192.168.1.111', datetime('now', '-12 days')),
(12, 'vip_player02', 'hash012', 'VIP大户002', 95000.00, 1, 4, 0, '192.168.1.112', datetime('now', '-10 days')),
(13, 'whale_001', 'hash013', '巨鲸玩家001', 520000.00, 1, 6, 0, '192.168.1.113', datetime('now', '-8 days')),
(14, 'whale_002', 'hash014', '巨鲸玩家002', 350000.00, 1, 6, 0, '192.168.1.114', datetime('now', '-7 days')),
(15, 'loser_001', 'hash015', '倒霉玩家001', 50.00, NULL, 0, 0, '192.168.1.115', datetime('now', '-6 days')),
(16, 'loser_002', 'hash016', '倒霉玩家002', 120.00, NULL, 0, 0, '192.168.1.116', datetime('now', '-5 days')),
(17, 'loser_003', 'hash017', '倒霉玩家003', 80.00, NULL, 1, 0, '192.168.1.117', datetime('now', '-4 days')),
(18, 'medium_001', 'hash018', '中等玩家001', 25000.00, 1, 2, 0, '192.168.1.118', datetime('now', '-3 days')),
(19, 'medium_002', 'hash019', '中等玩家002', 18000.00, 1, 2, 0, '192.168.1.119', datetime('now', '-2 days')),
(20, 'medium_003', 'hash020', '中等玩家003', 32000.00, 1, 3, 0, '192.168.1.120', datetime('now', '-1 days'));

-- 2. 创建测试投注记录（最近30天，不同游戏类型）
-- 百家乐投注（玩家1-5，赢多输少）
INSERT INTO bets (bet_no, player_id, game_type, table_code, bet_amount, valid_bet_amount, bet_type, payout, bet_status, created_at) VALUES
-- VIP玩家大赢
('BET20241101001', 13, 'baccarat', 'BAC-001', 50000, 50000, 'banker', 95000, 1, datetime('now', '-29 days', '+2 hours')),
('BET20241101002', 13, 'baccarat', 'BAC-001', 80000, 80000, 'player', 160000, 1, datetime('now', '-29 days', '+4 hours')),
('BET20241101003', 11, 'baccarat', 'BAC-002', 30000, 30000, 'banker', 57000, 1, datetime('now', '-28 days', '+3 hours')),
('BET20241101004', 12, 'baccarat', 'BAC-001', 25000, 25000, 'player', 50000, 1, datetime('now', '-28 days', '+5 hours')),
('BET20241102001', 14, 'baccarat', 'BAC-002', 60000, 60000, 'banker', 114000, 1, datetime('now', '-27 days', '+2 hours')),

-- 普通玩家中等输赢
('BET20241102002', 1, 'baccarat', 'BAC-001', 1000, 1000, 'banker', 1900, 1, datetime('now', '-27 days', '+3 hours')),
('BET20241102003', 2, 'baccarat', 'BAC-001', 500, 500, 'player', 0, 1, datetime('now', '-27 days', '+4 hours')),
('BET20241102004', 3, 'baccarat', 'BAC-002', 2000, 2000, 'banker', 3800, 1, datetime('now', '-26 days', '+2 hours')),
('BET20241103001', 4, 'baccarat', 'BAC-001', 800, 800, 'tie', 6400, 1, datetime('now', '-26 days', '+3 hours')),
('BET20241103002', 5, 'baccarat', 'BAC-002', 3000, 3000, 'player', 6000, 1, datetime('now', '-25 days', '+2 hours')),

-- 倒霉玩家大输
('BET20241104001', 15, 'baccarat', 'BAC-001', 5000, 5000, 'banker', 0, 1, datetime('now', '-24 days', '+2 hours')),
('BET20241104002', 16, 'baccarat', 'BAC-001', 8000, 8000, 'player', 0, 1, datetime('now', '-24 days', '+4 hours')),
('BET20241104003', 17, 'baccarat', 'BAC-002', 6000, 6000, 'banker', 0, 1, datetime('now', '-23 days', '+3 hours')),
('BET20241105001', 15, 'baccarat', 'BAC-001', 3000, 3000, 'player', 0, 1, datetime('now', '-22 days', '+2 hours')),
('BET20241105002', 16, 'baccarat', 'BAC-002', 4000, 4000, 'banker', 0, 1, datetime('now', '-22 days', '+5 hours')),

-- 轮盘投注（玩家6-10）
('BET20241106001', 6, 'roulette', 'ROU-001', 500, 500, 'red', 1000, 1, datetime('now', '-21 days', '+2 hours')),
('BET20241106002', 7, 'roulette', 'ROU-001', 1000, 1000, 'black', 0, 1, datetime('now', '-21 days', '+3 hours')),
('BET20241106003', 8, 'roulette', 'ROU-001', 300, 300, 'odd', 600, 1, datetime('now', '-20 days', '+2 hours')),
('BET20241107001', 9, 'roulette', 'ROU-001', 2000, 2000, 'even', 4000, 1, datetime('now', '-20 days', '+4 hours')),
('BET20241107002', 10, 'roulette', 'ROU-001', 1500, 1500, 'red', 0, 1, datetime('now', '-19 days', '+2 hours')),

-- 龙虎投注（玩家11-15）
('BET20241108001', 11, 'dragon_tiger', 'DT-001', 10000, 10000, 'dragon', 19000, 1, datetime('now', '-18 days', '+2 hours')),
('BET20241108002', 12, 'dragon_tiger', 'DT-001', 8000, 8000, 'tiger', 15200, 1, datetime('now', '-18 days', '+3 hours')),
('BET20241108003', 13, 'dragon_tiger', 'DT-001', 20000, 20000, 'dragon', 38000, 1, datetime('now', '-17 days', '+2 hours')),
('BET20241109001', 14, 'dragon_tiger', 'DT-001', 15000, 15000, 'tiger', 0, 1, datetime('now', '-17 days', '+4 hours')),
('BET20241109002', 15, 'dragon_tiger', 'DT-001', 2000, 2000, 'dragon', 0, 1, datetime('now', '-16 days', '+2 hours')),

-- 骰宝投注（玩家16-20）
('BET20241110001', 16, 'sicbo', 'SIC-001', 1000, 1000, 'big', 2000, 1, datetime('now', '-15 days', '+2 hours')),
('BET20241110002', 17, 'sicbo', 'SIC-001', 800, 800, 'small', 0, 1, datetime('now', '-15 days', '+3 hours')),
('BET20241110003', 18, 'sicbo', 'SIC-001', 5000, 5000, 'big', 10000, 1, datetime('now', '-14 days', '+2 hours')),
('BET20241111001', 19, 'sicbo', 'SIC-001', 3000, 3000, 'small', 6000, 1, datetime('now', '-14 days', '+4 hours')),
('BET20241111002', 20, 'sicbo', 'SIC-001', 4000, 4000, 'big', 8000, 1, datetime('now', '-13 days', '+2 hours')),

-- 21点投注（玩家1-5）
('BET20241112001', 1, 'blackjack', 'BJ-001', 1000, 1000, 'hit', 2000, 1, datetime('now', '-12 days', '+2 hours')),
('BET20241112002', 2, 'blackjack', 'BJ-001', 500, 500, 'stand', 0, 1, datetime('now', '-12 days', '+3 hours')),
('BET20241112003', 3, 'blackjack', 'BJ-001', 2000, 2000, 'hit', 4000, 1, datetime('now', '-11 days', '+2 hours')),
('BET20241113001', 4, 'blackjack', 'BJ-001', 800, 800, 'stand', 0, 1, datetime('now', '-11 days', '+4 hours')),
('BET20241113002', 5, 'blackjack', 'BJ-001', 3000, 3000, 'hit', 6000, 1, datetime('now', '-10 days', '+2 hours')),

-- 最近7天的密集投注
('BET20241120001', 13, 'baccarat', 'BAC-001', 100000, 100000, 'banker', 190000, 1, datetime('now', '-7 days', '+10 hours')),
('BET20241120002', 14, 'baccarat', 'BAC-002', 80000, 80000, 'player', 0, 1, datetime('now', '-7 days', '+11 hours')),
('BET20241121001', 11, 'baccarat', 'BAC-001', 50000, 50000, 'banker', 95000, 1, datetime('now', '-6 days', '+10 hours')),
('BET20241121002', 12, 'baccarat', 'BAC-002', 40000, 40000, 'player', 80000, 1, datetime('now', '-6 days', '+11 hours')),
('BET20241122001', 1, 'roulette', 'ROU-001', 2000, 2000, 'red', 4000, 1, datetime('now', '-5 days', '+10 hours')),
('BET20241122002', 2, 'roulette', 'ROU-001', 1000, 1000, 'black', 0, 1, datetime('now', '-5 days', '+11 hours')),
('BET20241123001', 15, 'baccarat', 'BAC-001', 10000, 10000, 'banker', 0, 1, datetime('now', '-4 days', '+10 hours')),
('BET20241123002', 16, 'baccarat', 'BAC-001', 12000, 12000, 'player', 0, 1, datetime('now', '-4 days', '+11 hours')),
('BET20241124001', 3, 'dragon_tiger', 'DT-001', 5000, 5000, 'dragon', 9500, 1, datetime('now', '-3 days', '+10 hours')),
('BET20241124002', 4, 'sicbo', 'SIC-001', 2000, 2000, 'big', 4000, 1, datetime('now', '-3 days', '+11 hours')),
('BET20241125001', 13, 'baccarat', 'BAC-001', 150000, 150000, 'banker', 285000, 1, datetime('now', '-2 days', '+10 hours')),
('BET20241125002', 11, 'baccarat', 'BAC-002', 60000, 60000, 'player', 120000, 1, datetime('now', '-2 days', '+11 hours')),
('BET20241126001', 17, 'baccarat', 'BAC-001', 8000, 8000, 'banker', 0, 1, datetime('now', '-1 days', '+10 hours')),
('BET20241126002', 5, 'roulette', 'ROU-001', 5000, 5000, 'red', 10000, 1, datetime('now', '-1 days', '+11 hours')),

-- 今天的投注
('BET20241127001', 13, 'baccarat', 'BAC-001', 80000, 80000, 'banker', 152000, 1, datetime('now', '+2 hours')),
('BET20241127002', 1, 'baccarat', 'BAC-001', 1000, 1000, 'player', 2000, 1, datetime('now', '+3 hours')),
('BET20241127003', 15, 'baccarat', 'BAC-002', 5000, 5000, 'banker', 0, 1, datetime('now', '+4 hours'));

-- 3. 创建交易流水（存款、取款、红利等）
INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark, created_at) VALUES
-- 存款记录
('DEP20241101001', 13, 1, 0, 500000, 500000, NULL, '首次充值', datetime('now', '-29 days')),
('DEP20241101002', 11, 1, 0, 200000, 200000, NULL, '首次充值', datetime('now', '-28 days')),
('DEP20241102001', 14, 1, 0, 300000, 300000, NULL, '首次充值', datetime('now', '-27 days')),
('DEP20241102002', 12, 1, 0, 100000, 100000, NULL, '首次充值', datetime('now', '-27 days')),
('DEP20241103001', 1, 1, 0, 10000, 10000, NULL, '首次充值', datetime('now', '-26 days')),
('DEP20241103002', 2, 1, 0, 5000, 5000, NULL, '首次充值', datetime('now', '-26 days')),
('DEP20241104001', 15, 1, 0, 20000, 20000, NULL, '首次充值', datetime('now', '-24 days')),
('DEP20241104002', 16, 1, 0, 25000, 25000, NULL, '首次充值', datetime('now', '-24 days')),

-- 投注扣款（关联投注记录）
('BET20241101001', 13, 3, 500000, -50000, 450000, 'BET20241101001', '百家乐投注', datetime('now', '-29 days', '+2 hours')),
('BET20241101002', 13, 3, 450000, -80000, 370000, 'BET20241101002', '百家乐投注', datetime('now', '-29 days', '+4 hours')),
('BET20241101003', 11, 3, 200000, -30000, 170000, 'BET20241101003', '百家乐投注', datetime('now', '-28 days', '+3 hours')),

-- 派彩增加（关联投注记录）
('PAY20241101001', 13, 4, 370000, 95000, 465000, 'BET20241101001', '百家乐派彩', datetime('now', '-29 days', '+2 hours', '+30 seconds')),
('PAY20241101002', 13, 4, 465000, 160000, 625000, 'BET20241101002', '百家乐派彩', datetime('now', '-29 days', '+4 hours', '+30 seconds')),
('PAY20241101003', 11, 4, 170000, 57000, 227000, 'BET20241101003', '百家乐派彩', datetime('now', '-28 days', '+3 hours', '+30 seconds')),

-- 红利赠送
('BONUS20241105001', 13, 5, 625000, 50000, 675000, NULL, 'VIP晋级奖励', datetime('now', '-25 days')),
('BONUS20241105002', 11, 5, 227000, 20000, 247000, NULL, 'VIP周奖励', datetime('now', '-25 days')),
('BONUS20241106001', 14, 5, 300000, 30000, 330000, NULL, 'VIP晋级奖励', datetime('now', '-24 days')),
('BONUS20241106002', 1, 5, 10000, 500, 10500, NULL, '新人礼包', datetime('now', '-24 days')),

-- 洗码返水
('REBATE20241110001', 13, 6, 675000, 15000, 690000, NULL, '11月第1周返水', datetime('now', '-20 days')),
('REBATE20241110002', 11, 6, 247000, 8000, 255000, NULL, '11月第1周返水', datetime('now', '-20 days')),
('REBATE20241110003', 14, 6, 330000, 10000, 340000, NULL, '11月第1周返水', datetime('now', '-20 days')),
('REBATE20241110004', 12, 6, 100000, 5000, 105000, NULL, '11月第1周返水', datetime('now', '-20 days')),

-- 人工调整（正向）
('ADJ20241115001', 1, 7, 10500, 5000, 15500, NULL, '客服补偿', datetime('now', '-15 days')),
('ADJ20241115002', 2, 7, 5000, 3000, 8000, NULL, '活动奖励', datetime('now', '-15 days')),

-- 人工调整（负向）
('ADJ20241116001', 15, 8, 8000, -7500, 500, NULL, '违规处罚', datetime('now', '-14 days')),

-- 取款记录
('WD20241120001', 11, 2, 255000, -50000, 205000, NULL, '提现', datetime('now', '-10 days')),
('WD20241120002', 12, 2, 105000, -30000, 75000, NULL, '提现', datetime('now', '-10 days')),
('WD20241121001', 1, 2, 15500, -5000, 10500, NULL, '提现', datetime('now', '-9 days'));

-- 4. 更新玩家统计数据
UPDATE players SET 
  total_deposit = (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE player_id = players.id AND transaction_type = 1),
  total_withdraw = (SELECT COALESCE(SUM(ABS(amount)), 0) FROM transactions WHERE player_id = players.id AND transaction_type = 2),
  total_bet = (SELECT COALESCE(SUM(bet_amount), 0) FROM bets WHERE player_id = players.id),
  total_valid_bet = (SELECT COALESCE(SUM(valid_bet_amount), 0) FROM bets WHERE player_id = players.id),
  total_win_loss = (SELECT COALESCE(SUM(CASE WHEN bet_status = 1 THEN payout - bet_amount ELSE -bet_amount END), 0) FROM bets WHERE player_id = players.id),
  bet_count = (SELECT COUNT(*) FROM bets WHERE player_id = players.id);
