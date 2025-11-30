import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS配置
app.use('/api/*', cors())

// 静态文件
app.use('/static/*', serveStatic())

// ========================================
// 安全工具函数
// ========================================

// 密码哈希函数 (使用 Web Crypto API)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'live_dealer_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 验证密码
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

// 输入验证工具
const sanitizeString = (str: string | undefined | null, maxLength: number = 255): string => {
  if (!str) return ''
  return String(str).trim().slice(0, maxLength).replace(/[<>]/g, '')
}

const isValidUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,32}$/.test(username)
}

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const isValidPhone = (phone: string): boolean => {
  return /^[0-9+\-\s]{6,20}$/.test(phone)
}

// 工具函数
const generateOrderNo = (prefix: string) => {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time = now.toISOString().slice(11, 19).replace(/:/g, '')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}${date}${time}${random}`
}

// ========================================
// 1. 仪表盘 Dashboard API
// ========================================
app.get('/api/dashboard/stats', async (c) => {
  const db = c.env.DB
  
  try {
    const [totalBalance, todayDeposit, todayWithdraw, todayBet, todayPayout, onlinePlayers, 
           pendingWithdraws, pendingAlerts, pendingCommissions, totalPlayers, totalAgents] = await Promise.all([
      db.prepare("SELECT COALESCE(SUM(balance),0) as total FROM players WHERE status=0").first(),
      db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE transaction_type=1 AND date(created_at)=date('now')").first(),
      db.prepare("SELECT COALESCE(SUM(ABS(amount)),0) as total FROM transactions WHERE transaction_type=2 AND date(created_at)=date('now')").first(),
      db.prepare("SELECT COALESCE(SUM(bet_amount),0) as total FROM bets WHERE date(created_at)=date('now')").first(),
      db.prepare("SELECT COALESCE(SUM(payout),0) as total FROM bets WHERE date(created_at)=date('now') AND bet_status=1").first(),
      db.prepare("SELECT COUNT(*) as count FROM player_sessions WHERE is_online=1").first(),
      db.prepare("SELECT COUNT(*) as count FROM withdraw_requests WHERE status=0").first(),
      db.prepare("SELECT COUNT(*) as count FROM risk_alerts WHERE status=0").first(),
      db.prepare("SELECT COUNT(*) as count FROM commission_records WHERE status=0").first(),
      db.prepare("SELECT COUNT(*) as count FROM players").first(),
      db.prepare("SELECT COUNT(*) as count FROM agents").first()
    ])
    
    // 获取7天趋势数据
    const trendData = await db.prepare(`
      SELECT 
        date(created_at) as date,
        SUM(CASE WHEN transaction_type=1 THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN transaction_type=2 THEN ABS(amount) ELSE 0 END) as withdraws
      FROM transactions 
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all()
    
    // 获取游戏类型统计
    const gameStats = await db.prepare(`
      SELECT game_type, COUNT(*) as count, SUM(bet_amount) as total_bet
      FROM bets WHERE date(created_at)=date('now')
      GROUP BY game_type
    `).all()

    return c.json({
      success: true,
      data: {
        totalBalance: totalBalance?.total || 0,
        todayDeposit: todayDeposit?.total || 0,
        todayWithdraw: todayWithdraw?.total || 0,
        todayBet: todayBet?.total || 0,
        todayPayout: todayPayout?.total || 0,
        todayProfit: (todayBet?.total || 0) - (todayPayout?.total || 0),
        onlinePlayers: onlinePlayers?.count || 0,
        pendingWithdraws: pendingWithdraws?.count || 0,
        pendingAlerts: pendingAlerts?.count || 0,
        pendingCommissions: pendingCommissions?.count || 0,
        totalPlayers: totalPlayers?.count || 0,
        totalAgents: totalAgents?.count || 0,
        trendData: trendData.results,
        gameStats: gameStats.results
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 快速统计 - 待处理事项
app.get('/api/dashboard/pending', async (c) => {
  const db = c.env.DB
  try {
    const [withdraws, deposits, alerts, commissions, kyc] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count, SUM(amount) as total FROM withdraw_requests WHERE status=0").first(),
      db.prepare("SELECT COUNT(*) as count FROM deposit_requests WHERE status=1").first(),
      db.prepare("SELECT COUNT(*) as count FROM risk_alerts WHERE status=0").first(),
      db.prepare("SELECT COUNT(*) as count, SUM(total_amount) as total FROM commission_records WHERE status=0").first(),
      db.prepare("SELECT COUNT(*) as count FROM players WHERE kyc_status=0").first()
    ])
    return c.json({
      success: true,
      data: {
        withdraws: { count: withdraws?.count || 0, amount: withdraws?.total || 0 },
        deposits: { count: deposits?.count || 0 },
        alerts: { count: alerts?.count || 0 },
        commissions: { count: commissions?.count || 0, amount: commissions?.total || 0 },
        kycPending: { count: kyc?.count || 0 }
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 2. 玩家控端 Player Management API
// ========================================
app.get('/api/players', async (c) => {
  const db = c.env.DB
  const { status, online_status, agent_id, vip_level, risk_level, search, page = '1', limit = '20' } = c.req.query()
  
  try {
    let sql = `SELECT p.*, a.agent_username as agent_name, cs.scheme_name, lg.group_name as limit_group_name,
               CASE WHEN ps.is_online = 1 THEN 1 ELSE 0 END as is_online,
               ps.last_active_at as last_active_time
               FROM players p 
               LEFT JOIN agents a ON p.agent_id = a.id
               LEFT JOIN commission_schemes cs ON p.commission_scheme_id = cs.id
               LEFT JOIN limit_groups lg ON p.limit_group_id = lg.id
               LEFT JOIN (SELECT player_id, is_online, last_active_at FROM player_sessions WHERE id IN 
                         (SELECT MAX(id) FROM player_sessions GROUP BY player_id)) ps ON p.id = ps.player_id
               WHERE 1=1`
    const params: any[] = []
    
    // 账户状态筛选（正常/冻结/锁定）
    if (status !== undefined && status !== '') {
      sql += ` AND p.status = ?`
      params.push(parseInt(status))
    }
    // 在线状态筛选
    if (online_status === 'online') {
      sql += ` AND ps.is_online = 1`
    } else if (online_status === 'offline') {
      sql += ` AND (ps.is_online IS NULL OR ps.is_online = 0)`
    }
    if (agent_id) {
      sql += ` AND p.agent_id = ?`
      params.push(agent_id)
    }
    if (vip_level !== undefined && vip_level !== '') {
      sql += ` AND p.vip_level = ?`
      params.push(parseInt(vip_level))
    }
    if (risk_level !== undefined && risk_level !== '') {
      sql += ` AND p.risk_level = ?`
      params.push(parseInt(risk_level))
    }
    if (search) {
      sql += ` AND (p.username LIKE ? OR p.nickname LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    // 计数查询 - 使用参数化查询防止SQL注入
    let countSql = `SELECT COUNT(*) as total FROM players p 
                      LEFT JOIN (SELECT player_id, is_online FROM player_sessions WHERE id IN 
                                (SELECT MAX(id) FROM player_sessions GROUP BY player_id)) ps ON p.id = ps.player_id
                      WHERE 1=1`
    const countParams: any[] = []
    
    if (status !== undefined && status !== '') {
      countSql += ` AND p.status = ?`
      countParams.push(parseInt(status))
    }
    if (online_status === 'online') {
      countSql += ` AND ps.is_online = 1`
    } else if (online_status === 'offline') {
      countSql += ` AND (ps.is_online IS NULL OR ps.is_online = 0)`
    }
    if (agent_id) {
      countSql += ` AND p.agent_id = ?`
      countParams.push(agent_id)
    }
    if (vip_level !== undefined && vip_level !== '') {
      countSql += ` AND p.vip_level = ?`
      countParams.push(parseInt(vip_level))
    }
    if (risk_level !== undefined && risk_level !== '') {
      countSql += ` AND p.risk_level = ?`
      countParams.push(parseInt(risk_level))
    }
    if (search) {
      countSql += ` AND (p.username LIKE ? OR p.nickname LIKE ?)`
      countParams.push(`%${search}%`, `%${search}%`)
    }
    
    const countResult = countParams.length > 0 
      ? await db.prepare(countSql).bind(...countParams).first()
      : await db.prepare(countSql).first()
    
    sql += ` ORDER BY ps.is_online DESC, p.id DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const players = await db.prepare(sql).bind(...params).all()
    
    // 获取在线统计
    const onlineStats = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ps.is_online = 1 THEN 1 ELSE 0 END) as online_count
      FROM players p
      LEFT JOIN (SELECT player_id, is_online FROM player_sessions WHERE id IN 
                (SELECT MAX(id) FROM player_sessions GROUP BY player_id)) ps ON p.id = ps.player_id
    `).first()
    
    return c.json({
      success: true,
      data: players.results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total as number || 0) / parseInt(limit))
      },
      stats: {
        total: onlineStats?.total || 0,
        online: onlineStats?.online_count || 0,
        offline: (onlineStats?.total as number || 0) - (onlineStats?.online_count as number || 0)
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家详情
app.get('/api/players/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    const player = await db.prepare(`
      SELECT p.*, a.agent_username as agent_name, cs.scheme_name, lg.group_name as limit_group_name
      FROM players p 
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN commission_schemes cs ON p.commission_scheme_id = cs.id
      LEFT JOIN limit_groups lg ON p.limit_group_id = lg.id
      WHERE p.id = ?
    `).bind(id).first()
    
    if (!player) {
      return c.json({ success: false, error: 'Player not found' }, 404)
    }
    
    // 获取最近交易、注单、银行卡
    const [recentTransactions, recentBets, bankCards, tags] = await Promise.all([
      db.prepare(`SELECT * FROM transactions WHERE player_id = ? ORDER BY created_at DESC LIMIT 10`).bind(id).all(),
      db.prepare(`SELECT * FROM bets WHERE player_id = ? ORDER BY created_at DESC LIMIT 10`).bind(id).all(),
      db.prepare(`SELECT * FROM player_bank_cards WHERE player_id = ? AND status = 1`).bind(id).all(),
      db.prepare(`SELECT t.* FROM player_tags t JOIN player_tag_relations r ON t.id = r.tag_id WHERE r.player_id = ?`).bind(id).all()
    ])
    
    return c.json({
      success: true,
      data: {
        ...player,
        recentTransactions: recentTransactions.results,
        recentBets: recentBets.results,
        bankCards: bankCards.results,
        tags: tags.results
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 新增玩家
app.post('/api/players', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    const result = await db.prepare(`
      INSERT INTO players (username, password_hash, nickname, real_name, phone, email, agent_id, vip_level, 
                          commission_scheme_id, limit_group_id, register_ip, register_source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.username, body.password || 'default_hash', body.nickname, body.real_name, body.phone, body.email,
      body.agent_id, body.vip_level || 0, body.commission_scheme_id, body.limit_group_id,
      body.register_ip || 'admin', body.register_source || 'admin_create'
    ).run()
    
    // 记录操作日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
      VALUES (?, ?, 'player', 'create', 'player', ?, ?)
    `).bind(body.operator_id || 1, body.operator_name || 'admin', result.meta.last_row_id, `创建玩家: ${body.username}`).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '玩家创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新玩家信息
app.put('/api/players/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    // 获取原值用于日志
    const oldPlayer = await db.prepare("SELECT * FROM players WHERE id = ?").bind(id).first()
    
    const fields = ['nickname', 'real_name', 'phone', 'email', 'vip_level', 'commission_scheme_id', 
                   'limit_group_id', 'risk_level', 'notes']
    const updates: string[] = []
    const values: any[] = []
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(body[field])
      }
    })
    
    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }
    
    updates.push("updated_at = datetime('now')")
    values.push(id)
    
    await db.prepare(`UPDATE players SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    // 记录操作日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, old_value, new_value, description)
      VALUES (?, 'player', 'update', 'player', ?, ?, ?, ?)
    `).bind(body.operator_id || 1, id, JSON.stringify(oldPlayer), JSON.stringify(body), `更新玩家信息: ${id}`).run()
    
    return c.json({ success: true, message: '玩家信息更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新玩家状态
app.put('/api/players/:id/status', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { status, reason, operator_id } = await c.req.json()
  
  try {
    const oldPlayer = await db.prepare("SELECT status, username FROM players WHERE id = ?").bind(id).first()
    
    await db.prepare("UPDATE players SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, id).run()
    
    const statusNames: Record<number, string> = { 0: '正常', 1: '冻结', 2: '锁定' }
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, old_value, new_value, description)
      VALUES (?, 'player', 'status_change', 'player', ?, ?, ?, ?)
    `).bind(operator_id || 1, id, JSON.stringify({ status: oldPlayer?.status }), JSON.stringify({ status, reason }), 
           `玩家状态变更: ${oldPlayer?.username} -> ${statusNames[status] || status}`).run()
    
    return c.json({ success: true, message: '状态更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家代理转移
app.post('/api/players/:id/transfer-agent', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { to_agent_id, reason, operator_id } = await c.req.json()
  
  try {
    const player = await db.prepare("SELECT agent_id, username FROM players WHERE id = ?").bind(id).first()
    if (!player) {
      return c.json({ success: false, error: 'Player not found' }, 404)
    }
    
    await db.prepare("UPDATE players SET agent_id = ?, updated_at = datetime('now') WHERE id = ?").bind(to_agent_id, id).run()
    
    // 记录转移日志
    await db.prepare(`
      INSERT INTO agent_transfer_logs (player_id, from_agent_id, to_agent_id, reason, operator_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, player.agent_id, to_agent_id, reason, operator_id || 1).run()
    
    return c.json({ success: true, message: '代理转移成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家洗码方案绑定 (V2.1)
app.put('/api/players/:id/commission-scheme', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { scheme_id, operator_id } = await c.req.json()
  
  try {
    await db.prepare("UPDATE players SET commission_scheme_id = ?, updated_at = datetime('now') WHERE id = ?").bind(scheme_id, id).run()
    
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description)
      VALUES (?, 'player', 'bind_scheme', 'player', ?, ?)
    `).bind(operator_id || 1, id, `绑定洗码方案: ${scheme_id}`).run()
    
    return c.json({ success: true, message: '洗码方案绑定成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 在线玩家
app.get('/api/players/online', async (c) => {
  const db = c.env.DB
  try {
    const sessions = await db.prepare(`
      SELECT s.*, p.username, p.nickname, p.vip_level, p.balance
      FROM player_sessions s
      JOIN players p ON s.player_id = p.id
      WHERE s.is_online = 1
      ORDER BY s.last_active_at DESC
    `).all()
    return c.json({ success: true, data: sessions.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家统计
app.get('/api/players/stats', async (c) => {
  const db = c.env.DB
  try {
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as frozen,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as locked,
        SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as today_new,
        SUM(CASE WHEN date(last_login_at) = date('now') THEN 1 ELSE 0 END) as today_active,
        SUM(balance) as total_balance
      FROM players
    `).first()
    return c.json({ success: true, data: stats })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 3. 层级控端 Agent Management API
// ========================================
app.get('/api/agents', async (c) => {
  const db = c.env.DB
  const { parent_id, level, status, search } = c.req.query()
  
  try {
    let sql = `SELECT a.*, pa.agent_username as parent_name, cs.scheme_name,
               (SELECT COUNT(*) FROM agents WHERE parent_agent_id = a.id) as sub_agent_count,
               (SELECT COUNT(*) FROM players WHERE agent_id = a.id) as player_count,
               (SELECT SUM(balance) FROM players WHERE agent_id = a.id) as team_balance
               FROM agents a 
               LEFT JOIN agents pa ON a.parent_agent_id = pa.id
               LEFT JOIN commission_schemes cs ON a.default_commission_scheme_id = cs.id
               WHERE 1=1`
    const params: any[] = []
    
    if (parent_id !== undefined) {
      if (parent_id === 'null' || parent_id === '') {
        sql += ` AND a.parent_agent_id IS NULL`
      } else {
        sql += ` AND a.parent_agent_id = ?`
        params.push(parent_id)
      }
    }
    if (level) {
      sql += ` AND a.level = ?`
      params.push(level)
    }
    if (status !== undefined && status !== '') {
      sql += ` AND a.status = ?`
      params.push(parseInt(status))
    }
    if (search) {
      sql += ` AND (a.agent_username LIKE ? OR a.nickname LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }
    
    sql += ` ORDER BY a.level, a.id`
    
    const agents = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: agents.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 代理树形结构
app.get('/api/agents/tree', async (c) => {
  const db = c.env.DB
  
  try {
    const agents = await db.prepare(`
      SELECT id, agent_username, nickname, level, parent_agent_id, status, share_ratio, commission_ratio,
             (SELECT COUNT(*) FROM players WHERE agent_id = agents.id) as player_count,
             (SELECT SUM(balance) FROM players WHERE agent_id = agents.id) as team_balance
      FROM agents ORDER BY level, id
    `).all()
    
    const buildTree = (items: any[], parentId: number | null = null): any[] => {
      return items
        .filter(item => item.parent_agent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }))
    }
    
    const tree = buildTree(agents.results as any[])
    return c.json({ success: true, data: tree })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 代理详情
app.get('/api/agents/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    const agent = await db.prepare(`
      SELECT a.*, pa.agent_username as parent_name, cs.scheme_name, lg.group_name as limit_group_name
      FROM agents a 
      LEFT JOIN agents pa ON a.parent_agent_id = pa.id
      LEFT JOIN commission_schemes cs ON a.default_commission_scheme_id = cs.id
      LEFT JOIN limit_groups lg ON a.default_limit_group_id = lg.id
      WHERE a.id = ?
    `).bind(id).first()
    
    if (!agent) {
      return c.json({ success: false, error: 'Agent not found' }, 404)
    }
    
    // 获取下级代理和玩家统计
    const [subAgents, players, recentPlayers] = await Promise.all([
      db.prepare("SELECT * FROM agents WHERE parent_agent_id = ?").bind(id).all(),
      db.prepare(`
        SELECT COUNT(*) as count, SUM(balance) as total_balance, SUM(total_bet) as total_bet
        FROM players WHERE agent_id = ?
      `).bind(id).first(),
      db.prepare("SELECT * FROM players WHERE agent_id = ? ORDER BY created_at DESC LIMIT 10").bind(id).all()
    ])
    
    return c.json({
      success: true,
      data: {
        ...agent,
        subAgents: subAgents.results,
        playerStats: players,
        recentPlayers: recentPlayers.results
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 获取代理业绩
app.get('/api/agents/:id/performance', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    // 获取代理基本信息
    const agent = await db.prepare('SELECT * FROM agents WHERE id = ?').bind(id).first()
    if (!agent) {
      return c.json({ success: false, error: 'Agent not found' }, 404)
    }
    
    // 获取所有下级代理
    const subAgents = await db.prepare(`
      SELECT id, agent_username as username, level, parent_agent_id 
      FROM agents 
      WHERE parent_agent_id = ?
    `).bind(id).all()
    
    // 获取代理下所有玩家的统计
    const playerStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_players,
        SUM(balance) as total_balance,
        SUM(total_bet) as total_bet,
        SUM(total_win_loss) as total_win_loss,
        SUM(total_deposit) as total_deposit,
        SUM(total_withdraw) as total_withdraw
      FROM players 
      WHERE agent_id = ?
    `).bind(id).first()
    
    // 计算总佣金（简化版本，使用总和）
    const commissionStats = await db.prepare(`
      SELECT 
        SUM(total_commission) as total_commission
      FROM players 
      WHERE agent_id = ?
    `).bind(id).first()
    
    // 统计下级代理信息
    const subAgentDetails = []
    for (const sub of subAgents.results || []) {
      const subPlayerStats = await db.prepare(`
        SELECT 
          COUNT(*) as player_count,
          SUM(total_bet) as total_bet
        FROM players 
        WHERE agent_id = ?
      `).bind(sub.id).first()
      
      const subAgentCount = await db.prepare(
        'SELECT COUNT(*) as count FROM agents WHERE parent_agent_id = ?'
      ).bind(sub.id).first()
      
      subAgentDetails.push({
        id: sub.id,
        username: sub.username,
        level: sub.level,
        sub_count: subAgentCount?.count || 0,
        player_count: subPlayerStats?.player_count || 0,
        total_bet: subPlayerStats?.total_bet || 0
      })
    }
    
    const performance = {
      total_members: (subAgents.results?.length || 0) + (playerStats?.total_players || 0),
      total_players: playerStats?.total_players || 0,
      total_bet: playerStats?.total_bet || 0,
      total_win_loss: playerStats?.total_win_loss || 0,
      total_commission: commissionStats?.total_commission || 0,
      month_bet: playerStats?.total_bet || 0,  // 使用总投注作为月度数据
      month_payout: 0,  // 暂不统计
      month_profit: playerStats?.total_win_loss || 0,  // 使用总盈亏
      month_commission: commissionStats?.total_commission || 0,  // 使用总佣金
      sub_agents: subAgentDetails
    }
    
    return c.json({ success: true, data: performance })
  } catch (error) {
    console.error('Get agent performance error:', error)
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 新增代理
app.post('/api/agents', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    // 生成唯一邀请码
    const generateInviteCode = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      let code = ''
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }
    
    let invite_code = generateInviteCode()
    // 确保邀请码唯一
    let existingAgent = await db.prepare(`SELECT id FROM agents WHERE invite_code = ?`).bind(invite_code).first()
    while (existingAgent) {
      invite_code = generateInviteCode()
      existingAgent = await db.prepare(`SELECT id FROM agents WHERE invite_code = ?`).bind(invite_code).first()
    }
    
    // 处理专属域名（JSON数组）
    const custom_domains = body.custom_domains ? JSON.stringify(Array.isArray(body.custom_domains) ? body.custom_domains : [body.custom_domains]) : null
    
    // 密码哈希
    const password_hash = body.password ? await hashPassword(body.password) : await hashPassword('123456')
    
    const result = await db.prepare(`
      INSERT INTO agents (agent_username, password_hash, nickname, level, parent_agent_id, share_ratio, 
                         commission_ratio, turnover_rate, currency, default_commission_scheme_id, 
                         default_limit_group_id, contact_phone, contact_email, contact_telegram,
                         invite_code, custom_domains, invite_link_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.agent_username, password_hash, body.nickname || null, body.level || 'agent',
      body.parent_agent_id || null, body.share_ratio || 0, body.commission_ratio || 0,
      body.turnover_rate || 0, body.currency || 'USD', body.default_commission_scheme_id || null,
      body.default_limit_group_id || null, body.contact_phone || null, body.contact_email || null, body.contact_telegram || null,
      invite_code, custom_domains, body.invite_link_status !== undefined ? body.invite_link_status : 1
    ).run()
    
    return c.json({ 
      success: true, 
      data: { 
        id: result.meta.last_row_id, 
        invite_code: invite_code 
      }, 
      message: '代理创建成功' 
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新代理
app.put('/api/agents/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const fields = ['nickname', 'share_ratio', 'commission_ratio', 'turnover_rate', 'currency',
                   'default_commission_scheme_id', 'default_limit_group_id', 'contact_phone', 
                   'contact_email', 'contact_telegram', 'notes', 'status', 'invite_link_status']
    const updates: string[] = []
    const values: any[] = []
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(body[field])
      }
    })
    
    // 处理专属域名（JSON数组）
    if (body.custom_domains !== undefined) {
      updates.push('custom_domains = ?')
      values.push(body.custom_domains ? JSON.stringify(Array.isArray(body.custom_domains) ? body.custom_domains : [body.custom_domains]) : null)
    }
    
    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }
    
    updates.push("updated_at = datetime('now')")
    values.push(id)
    
    await db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    return c.json({ success: true, message: '代理信息更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 重新生成邀请码
app.post('/api/agents/:id/regenerate-invite', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    const generateInviteCode = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      let code = ''
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }
    
    let invite_code = generateInviteCode()
    // 确保邀请码唯一
    let existingAgent = await db.prepare(`SELECT id FROM agents WHERE invite_code = ? AND id != ?`).bind(invite_code, id).first()
    while (existingAgent) {
      invite_code = generateInviteCode()
      existingAgent = await db.prepare(`SELECT id FROM agents WHERE invite_code = ? AND id != ?`).bind(invite_code, id).first()
    }
    
    await db.prepare(`UPDATE agents SET invite_code = ?, updated_at = datetime('now') WHERE id = ?`).bind(invite_code, id).run()
    
    return c.json({ success: true, data: { invite_code }, message: '邀请码重新生成成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 验证域名绑定
app.post('/api/agents/validate-domain', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { domain, agent_id } = body
  
  try {
    if (!domain || !domain.trim()) {
      return c.json({ success: false, error: '域名不能为空' }, 400)
    }
    
    // 域名格式验证
    const domainPattern = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
    if (!domainPattern.test(domain)) {
      return c.json({ success: false, error: '域名格式不正确' }, 400)
    }
    
    // 检查域名是否已被其他代理使用
    const agents = await db.prepare(`SELECT id, agent_username, custom_domains FROM agents WHERE custom_domains IS NOT NULL`).all()
    
    for (const agent of agents.results as any[]) {
      if (agent_id && agent.id === parseInt(agent_id)) continue // 跳过自己
      
      if (agent.custom_domains) {
        try {
          const domains = JSON.parse(agent.custom_domains)
          if (Array.isArray(domains) && domains.includes(domain)) {
            return c.json({ success: false, error: `域名已被代理 ${agent.agent_username} 使用` }, 400)
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
    
    return c.json({ success: true, message: '域名可用' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 4. 财务控端 Finance API
// ========================================
// 交易流水
app.get('/api/transactions', async (c) => {
  const db = c.env.DB
  const { player_id, type, start_date, end_date, page = '1', limit = '20' } = c.req.query()
  
  try {
    let sql = `SELECT t.*, p.username as player_name FROM transactions t 
               LEFT JOIN players p ON t.player_id = p.id WHERE 1=1`
    const params: any[] = []
    
    if (player_id) {
      sql += ` AND t.player_id = ?`
      params.push(player_id)
    }
    if (type) {
      sql += ` AND t.transaction_type = ?`
      params.push(parseInt(type))
    }
    if (start_date) {
      sql += ` AND date(t.created_at) >= ?`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(t.created_at) <= ?`
      params.push(end_date)
    }
    
    sql += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const transactions = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: transactions.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 提款请求列表
app.get('/api/withdraws', async (c) => {
  const db = c.env.DB
  const { status, start_date, end_date, search, page = '1', limit = '20' } = c.req.query()
  
  try {
    let sql = `SELECT w.*, p.username as player_name, p.vip_level, p.risk_level, p.balance as current_balance
               FROM withdraw_requests w
               LEFT JOIN players p ON w.player_id = p.id
               WHERE 1=1`
    const params: any[] = []
    
    if (status !== undefined && status !== '') {
      sql += ` AND w.status = ?`
      params.push(parseInt(status))
    }
    if (start_date) {
      sql += ` AND date(w.created_at) >= ?`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(w.created_at) <= ?`
      params.push(end_date)
    }
    if (search) {
      sql += ` AND (w.order_no LIKE ? OR p.username LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }
    
    sql += ` ORDER BY w.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const withdraws = await db.prepare(sql).bind(...params).all()
    
    // 统计
    const stats = await db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 0 THEN 1 END) as pending_count,
        SUM(CASE WHEN status = 0 THEN amount ELSE 0 END) as pending_amount,
        COUNT(CASE WHEN status = 4 AND date(payout_at) = date('now') THEN 1 END) as today_count,
        SUM(CASE WHEN status = 4 AND date(payout_at) = date('now') THEN actual_amount ELSE 0 END) as today_amount
      FROM withdraw_requests
    `).first()
    
    return c.json({ success: true, data: withdraws.results, stats })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 提款审核
app.put('/api/withdraws/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { status, remark, reviewer_id, reviewer_name } = await c.req.json()
  
  try {
    const withdraw = await db.prepare("SELECT * FROM withdraw_requests WHERE id = ?").bind(id).first()
    if (!withdraw) {
      return c.json({ success: false, error: 'Withdraw request not found' }, 404)
    }
    
    // 更新提款状态
    if (status === 2) { // 一审通过
      await db.prepare(`
        UPDATE withdraw_requests 
        SET status = ?, first_reviewer_id = ?, first_review_remark = ?, first_review_at = datetime('now')
        WHERE id = ?
      `).bind(status, reviewer_id, remark, id).run()
    } else if (status === 4) { // 出款完成
      await db.prepare(`
        UPDATE withdraw_requests 
        SET status = ?, actual_amount = amount, payout_at = datetime('now')
        WHERE id = ?
      `).bind(status, id).run()
      
      // 扣除玩家余额并记录交易
      await db.prepare(`
        UPDATE players SET balance = balance - ?, total_withdraw = total_withdraw + ?, 
        withdraw_count = withdraw_count + 1, updated_at = datetime('now')
        WHERE id = ?
      `).bind(withdraw.amount, withdraw.amount, withdraw.player_id).run()
      
      const player = await db.prepare("SELECT balance FROM players WHERE id = ?").bind(withdraw.player_id).first()
      await db.prepare(`
        INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark)
        VALUES (?, ?, 2, ?, ?, ?, ?, ?)
      `).bind(generateOrderNo('TXN'), withdraw.player_id, (player?.balance as number || 0) + (withdraw.amount as number), 
             -(withdraw.amount as number), player?.balance, withdraw.order_no, '提款审核通过').run()
      
    } else if (status === 5) { // 拒绝
      await db.prepare(`
        UPDATE withdraw_requests 
        SET status = ?, first_reviewer_id = ?, first_review_remark = ?, first_review_at = datetime('now')
        WHERE id = ?
      `).bind(status, reviewer_id, remark, id).run()
    }
    
    // 记录审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
      VALUES (?, ?, 'finance', 'withdraw_review', 'withdraw', ?, ?)
    `).bind(reviewer_id || 1, reviewer_name || 'admin', id, `提款审核: ${status === 4 ? '通过出款' : status === 5 ? '拒绝' : '审核中'}`).run()
    
    return c.json({ success: true, message: '提款审核完成' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 转账记录列表
app.get('/api/transfers', async (c) => {
  const db = c.env.DB
  const { status, start_date, end_date, order_no, from_player, to_player, page = '1', limit = '50' } = c.req.query()
  
  try {
    let sql = `SELECT 
      t.*,
      fp.username as from_player_name,
      fp.vip_level as from_vip_level,
      tp.username as to_player_name,
      tp.vip_level as to_vip_level,
      a.nickname as reviewer_name
      FROM transfer_records t
      LEFT JOIN players fp ON t.from_player_id = fp.id
      LEFT JOIN players tp ON t.to_player_id = tp.id
      LEFT JOIN admins a ON t.reviewed_by = a.id
      WHERE 1=1`
    const params: any[] = []
    
    if (status) {
      sql += ` AND t.status = ?`
      params.push(status)
    }
    if (order_no) {
      sql += ` AND t.order_no LIKE ?`
      params.push(`%${order_no}%`)
    }
    if (from_player) {
      sql += ` AND (fp.username LIKE ? OR fp.id = ?)`
      params.push(`%${from_player}%`, parseInt(from_player) || 0)
    }
    if (to_player) {
      sql += ` AND (tp.username LIKE ? OR tp.id = ?)`
      params.push(`%${to_player}%`, parseInt(to_player) || 0)
    }
    if (start_date) {
      sql += ` AND date(t.created_at) >= date(?)`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(t.created_at) <= date(?)`
      params.push(end_date)
    }
    
    sql += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const transfers = await db.prepare(sql).bind(...params).all()
    
    // 统计汇总
    let statsSql = `SELECT 
      COUNT(*) as total_count,
      SUM(amount) as total_amount,
      SUM(fee) as total_fee,
      SUM(actual_amount) as total_actual_amount
      FROM transfer_records t
      WHERE 1=1`
    const statsParams: any[] = []
    
    if (status) {
      statsSql += ` AND t.status = ?`
      statsParams.push(status)
    }
    if (start_date) {
      statsSql += ` AND date(t.created_at) >= date(?)`
      statsParams.push(start_date)
    }
    if (end_date) {
      statsSql += ` AND date(t.created_at) <= date(?)`
      statsParams.push(end_date)
    }
    
    const stats = await db.prepare(statsSql).bind(...statsParams).first()
    
    return c.json({ 
      success: true, 
      data: transfers.results,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: (stats as any)?.total_count || 0
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 转账审核
app.put('/api/transfers/:id/review', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { action, remark, reviewer_id = 1, reviewer_name = 'admin' } = await c.req.json()
  
  try {
    const transfer = await db.prepare("SELECT * FROM transfer_records WHERE id = ?").bind(id).first() as any
    if (!transfer) {
      return c.json({ success: false, error: '转账记录不存在' }, 404)
    }
    
    if (transfer.status !== 'pending') {
      return c.json({ success: false, error: '该转账已处理' }, 400)
    }
    
    if (action === 'approve') {
      // 通过审核，执行转账
      // 1. 扣除转出方余额
      const deductResult = await db.prepare(`
        UPDATE players SET balance = balance - ? WHERE id = ? AND balance >= ?
      `).bind(transfer.amount, transfer.from_player_id, transfer.amount).run()
      
      if (deductResult.meta.changes === 0) {
        return c.json({ success: false, error: '转出方余额不足' }, 400)
      }
      
      // 2. 增加转入方余额
      await db.prepare(`
        UPDATE players SET balance = balance + ? WHERE id = ?
      `).bind(transfer.actual_amount, transfer.to_player_id).run()
      
      // 3. 创建交易记录
      const orderNo1 = `TRF${Date.now()}OUT${transfer.from_player_id}`
      const orderNo2 = `TRF${Date.now()}IN${transfer.to_player_id}`
      
      await db.prepare(`
        INSERT INTO transactions (order_no, player_id, transaction_type, amount, balance_before, balance_after, related_order_id, remark, created_at)
        SELECT ?, ?, 9, ?, balance, balance - ?, ?, ?, datetime('now')
        FROM players WHERE id = ?
      `).bind(orderNo1, transfer.from_player_id, -transfer.amount, transfer.amount, transfer.order_no, '转账转出', transfer.from_player_id).run()
      
      await db.prepare(`
        INSERT INTO transactions (order_no, player_id, transaction_type, amount, balance_before, balance_after, related_order_id, remark, created_at)
        SELECT ?, ?, 10, ?, balance - ?, balance, ?, ?, datetime('now')
        FROM players WHERE id = ?
      `).bind(orderNo2, transfer.to_player_id, transfer.actual_amount, transfer.actual_amount, transfer.order_no, '转账转入', transfer.to_player_id).run()
      
      // 4. 更新转账状态
      await db.prepare(`
        UPDATE transfer_records 
        SET status = 'completed', reviewed_by = ?, reviewed_at = datetime('now'), remark = ?
        WHERE id = ?
      `).bind(reviewer_id, remark || '审核通过', id).run()
      
      return c.json({ success: true, message: '转账审核通过，已完成资金划转' })
      
    } else if (action === 'reject') {
      // 拒绝审核
      await db.prepare(`
        UPDATE transfer_records 
        SET status = 'cancelled', reviewed_by = ?, reviewed_at = datetime('now'), remark = ?
        WHERE id = ?
      `).bind(reviewer_id, remark || '审核拒绝', id).run()
      
      return c.json({ success: true, message: '转账已拒绝' })
    }
    
    return c.json({ success: false, error: '无效的操作' }, 400)
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 转账手续费配置列表
app.get('/api/transfer-fee-configs', async (c) => {
  const db = c.env.DB
  
  try {
    const configs = await db.prepare(`
      SELECT 
        id, name, vip_level, min_amount, max_amount, fee_type, 
        fee_value as fee_rate, fee_value as fee_amount,
        min_fee, max_fee, priority, is_enabled as is_active, 
        created_at, updated_at
      FROM transfer_fee_configs ORDER BY priority DESC, id ASC
    `).all()
    
    return c.json({ success: true, configs: configs.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建转账手续费配置
app.post('/api/transfer-fee-configs', async (c) => {
  const db = c.env.DB
  const data = await c.req.json()
  
  try {
    // 前端发送fee_rate或fee_amount，后端统一存储为fee_value
    const feeValue = data.fee_type === 'percentage' ? (data.fee_rate || 0) : (data.fee_amount || 0)
    
    const result = await db.prepare(`
      INSERT INTO transfer_fee_configs 
      (name, vip_level, min_amount, max_amount, fee_type, fee_value, min_fee, max_fee, priority, is_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.name,
      data.vip_level ?? -1,
      data.min_amount || 0,
      data.max_amount || null,
      data.fee_type,
      feeValue,
      data.min_fee || 0,
      data.max_fee || null,
      data.priority || 0,
      data.is_active ? 1 : 0
    ).run()
    
    return c.json({ success: true, id: result.meta.last_row_id })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新转账手续费配置
app.put('/api/transfer-fee-configs', async (c) => {
  const db = c.env.DB
  const data = await c.req.json()
  
  try {
    // 前端发送fee_rate或fee_amount，后端统一存储为fee_value
    const feeValue = data.fee_type === 'percentage' ? (data.fee_rate || 0) : (data.fee_amount || 0)
    
    await db.prepare(`
      UPDATE transfer_fee_configs 
      SET name = ?, vip_level = ?, min_amount = ?, max_amount = ?, 
          fee_type = ?, fee_value = ?, min_fee = ?, max_fee = ?, 
          priority = ?, is_enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      data.name,
      data.vip_level ?? -1,
      data.min_amount || 0,
      data.max_amount || null,
      data.fee_type,
      feeValue,
      data.min_fee || 0,
      data.max_fee || null,
      data.priority || 0,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      data.id
    ).run()
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除转账手续费配置
app.delete('/api/transfer-fee-configs', async (c) => {
  const db = c.env.DB
  const data = await c.req.json()
  
  try {
    await db.prepare("DELETE FROM transfer_fee_configs WHERE id = ?").bind(data.id).run()
    return c.json({ success: true })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 计算转账手续费
app.post('/api/transfers/calculate-fee', async (c) => {
  const db = c.env.DB
  const { amount, from_player_id } = await c.req.json()
  
  try {
    // 获取玩家VIP等级
    const player = await db.prepare("SELECT vip_level FROM players WHERE id = ?").bind(from_player_id).first() as any
    if (!player) {
      return c.json({ success: false, error: '玩家不存在' }, 404)
    }
    
    // 查找匹配的手续费规则
    const config = await db.prepare(`
      SELECT * FROM transfer_fee_configs 
      WHERE is_enabled = 1 
        AND (vip_level = -1 OR vip_level = ?)
        AND (min_amount = 0 OR ? >= min_amount)
        AND (max_amount = 0 OR ? <= max_amount)
      ORDER BY priority DESC, id ASC
      LIMIT 1
    `).bind(player.vip_level, amount, amount).first() as any
    
    let fee = 0
    let feeConfigId = null
    
    if (config) {
      feeConfigId = config.id
      if (config.fee_type === 'percentage') {
        fee = amount * (config.fee_value / 100)
        if (config.min_fee > 0 && fee < config.min_fee) fee = config.min_fee
        if (config.max_fee > 0 && fee > config.max_fee) fee = config.max_fee
      } else {
        fee = config.fee_value
      }
    }
    
    const actualAmount = amount - fee
    
    return c.json({ 
      success: true, 
      fee, 
      actual_amount: actualAmount,
      fee_config_id: feeConfigId,
      config_name: config?.name || '默认费率'
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 存款请求列表 - 增强版支持更多筛选条件
app.get('/api/deposits', async (c) => {
  const db = c.env.DB
  const { status, start_date, end_date, search, payment_method, is_first_deposit, player_id, min_amount, max_amount, page = '1', limit = '20' } = c.req.query()
  
  try {
    let sql = `SELECT d.*, p.username as player_name, p.nickname, p.vip_level, p.risk_level, p.agent_id,
               a.agent_username as agent_name,
               adm.nickname as reviewer_name
               FROM deposit_requests d
               LEFT JOIN players p ON d.player_id = p.id
               LEFT JOIN agents a ON p.agent_id = a.id
               LEFT JOIN admins adm ON d.reviewer_id = adm.id
               WHERE 1=1`
    const params: any[] = []
    
    if (status !== undefined && status !== '') {
      sql += ` AND d.status = ?`
      params.push(parseInt(status))
    }
    if (player_id) {
      sql += ` AND d.player_id = ?`
      params.push(player_id)
    }
    if (payment_method) {
      sql += ` AND d.payment_method = ?`
      params.push(payment_method)
    }
    if (is_first_deposit !== undefined && is_first_deposit !== '') {
      sql += ` AND d.is_first_deposit = ?`
      params.push(parseInt(is_first_deposit))
    }
    if (min_amount) {
      sql += ` AND d.amount >= ?`
      params.push(parseFloat(min_amount))
    }
    if (max_amount) {
      sql += ` AND d.amount <= ?`
      params.push(parseFloat(max_amount))
    }
    if (start_date) {
      sql += ` AND date(d.created_at) >= ?`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(d.created_at) <= ?`
      params.push(end_date)
    }
    if (search) {
      sql += ` AND (d.order_no LIKE ? OR p.username LIKE ? OR p.nickname LIKE ?)`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    // 计数查询
    const countSql = sql.replace(/SELECT d\.\*.*FROM/, 'SELECT COUNT(*) as total FROM')
    const countResult = await db.prepare(countSql).bind(...params).first()
    
    sql += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const deposits = await db.prepare(sql).bind(...params).all()
    
    return c.json({ 
      success: true, 
      data: deposits.results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total as number || 0) / parseInt(limit))
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 存款统计数据
app.get('/api/deposits/stats', async (c) => {
  const db = c.env.DB
  const { start_date, end_date } = c.req.query()
  
  try {
    const startD = start_date || new Date().toISOString().slice(0, 10)
    const endD = end_date || new Date().toISOString().slice(0, 10)
    
    // 整体统计
    const stats = await db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 0 THEN 1 END) as pending_count,
        SUM(CASE WHEN status = 0 THEN amount ELSE 0 END) as pending_amount,
        COUNT(CASE WHEN status = 1 THEN 1 END) as processing_count,
        SUM(CASE WHEN status = 1 THEN amount ELSE 0 END) as processing_amount,
        COUNT(CASE WHEN status = 2 AND date(reviewed_at) = date('now') THEN 1 END) as today_approved_count,
        SUM(CASE WHEN status = 2 AND date(reviewed_at) = date('now') THEN actual_amount ELSE 0 END) as today_approved_amount,
        COUNT(CASE WHEN status = 3 THEN 1 END) as rejected_count,
        COUNT(CASE WHEN is_first_deposit = 1 AND date(created_at) = date('now') THEN 1 END) as today_first_deposit_count,
        SUM(CASE WHEN is_first_deposit = 1 AND date(created_at) = date('now') THEN amount ELSE 0 END) as today_first_deposit_amount
      FROM deposit_requests
    `).first()
    
    // 日期范围内统计
    const rangeStats = await db.prepare(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(CASE WHEN status = 2 THEN actual_amount ELSE 0 END) as approved_amount,
        COUNT(CASE WHEN is_first_deposit = 1 THEN 1 END) as first_deposit_count
      FROM deposit_requests
      WHERE date(created_at) >= ? AND date(created_at) <= ?
      GROUP BY date(created_at)
      ORDER BY date DESC
    `).bind(startD, endD).all()
    
    // 支付方式统计
    const paymentStats = await db.prepare(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM deposit_requests
      WHERE date(created_at) = date('now')
      GROUP BY payment_method
    `).all()
    
    return c.json({ 
      success: true, 
      data: {
        overview: stats,
        dailyStats: rangeStats.results,
        paymentStats: paymentStats.results
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 存款详情
app.get('/api/deposits/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    const deposit = await db.prepare(`
      SELECT d.*, p.username as player_name, p.nickname, p.vip_level, p.risk_level, 
             p.balance, p.total_deposit, p.deposit_count, p.agent_id, p.kyc_status,
             a.agent_username as agent_name,
             adm.nickname as reviewer_name
      FROM deposit_requests d
      LEFT JOIN players p ON d.player_id = p.id
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN admins adm ON d.reviewer_id = adm.id
      WHERE d.id = ?
    `).bind(id).first()
    
    if (!deposit) {
      return c.json({ success: false, error: '存款记录不存在' }, 404)
    }
    
    // 获取玩家最近存款记录
    const recentDeposits = await db.prepare(`
      SELECT order_no, amount, actual_amount, payment_method, status, created_at
      FROM deposit_requests
      WHERE player_id = ? AND id != ?
      ORDER BY created_at DESC LIMIT 5
    `).bind(deposit.player_id, id).all()
    
    // 获取存款补单记录（如果有）
    const supplements = await db.prepare(`
      SELECT * FROM deposit_supplements WHERE deposit_id = ? ORDER BY created_at DESC
    `).bind(id).all().catch(() => ({ results: [] })) // 表可能不存在
    
    // 审核日志
    const auditLogs = await db.prepare(`
      SELECT * FROM audit_logs 
      WHERE target_type = 'deposit' AND target_id = ?
      ORDER BY created_at DESC
    `).bind(id.toString()).all()
    
    return c.json({ 
      success: true, 
      data: {
        ...deposit,
        recentDeposits: recentDeposits.results,
        supplements: supplements.results,
        auditLogs: auditLogs.results
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 存款审核 - 增强版支持不同审核状态
app.put('/api/deposits/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { status, remark, reviewer_id, reviewer_name, actual_amount, bonus_amount } = await c.req.json()
  
  try {
    const deposit = await db.prepare("SELECT * FROM deposit_requests WHERE id = ?").bind(id).first()
    if (!deposit) {
      return c.json({ success: false, error: '存款记录不存在' }, 404)
    }
    
    // 验证状态转换是否合法
    const currentStatus = deposit.status as number
    const validTransitions: Record<number, number[]> = {
      0: [1, 2, 3], // 待处理 -> 处理中/通过/拒绝
      1: [2, 3],    // 处理中 -> 通过/拒绝
    }
    
    if (!validTransitions[currentStatus]?.includes(status)) {
      return c.json({ success: false, error: '无效的状态变更' }, 400)
    }
    
    const finalAmount = actual_amount !== undefined ? actual_amount : deposit.amount
    const finalBonus = bonus_amount !== undefined ? bonus_amount : (deposit.bonus_amount || 0)
    
    await db.prepare(`
      UPDATE deposit_requests 
      SET status = ?, reviewer_id = ?, review_remark = ?, reviewed_at = datetime('now'),
          actual_amount = ?, bonus_amount = ?
      WHERE id = ?
    `).bind(status, reviewer_id, remark, finalAmount, finalBonus, id).run()
    
    // 如果审核通过，更新玩家余额
    if (status === 2) {
      const player = await db.prepare("SELECT * FROM players WHERE id = ?").bind(deposit.player_id).first()
      if (!player) {
        return c.json({ success: false, error: '玩家不存在' }, 404)
      }
      
      const totalAmount = finalAmount + finalBonus
      const balanceBefore = player.balance as number
      const balanceAfter = balanceBefore + totalAmount
      
      // 更新玩家余额和统计
      await db.prepare(`
        UPDATE players SET 
          balance = balance + ?, 
          total_deposit = total_deposit + ?, 
          total_bonus = total_bonus + ?,
          deposit_count = deposit_count + 1, 
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(totalAmount, finalAmount, finalBonus, deposit.player_id).run()
      
      // 记录交易流水 - 存款
      await db.prepare(`
        INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark, operator_id, audit_status)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 1)
      `).bind(generateOrderNo('TXN'), deposit.player_id, balanceBefore, finalAmount, balanceBefore + finalAmount, 
             deposit.order_no, `存款入账 - ${deposit.payment_method || '银行转账'}`, reviewer_id || 1).run()
      
      // 如果有奖励，单独记录奖励交易
      if (finalBonus > 0) {
        await db.prepare(`
          INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark, operator_id, audit_status)
          VALUES (?, ?, 5, ?, ?, ?, ?, ?, ?, 1)
        `).bind(generateOrderNo('BON'), deposit.player_id, balanceBefore + finalAmount, finalBonus, balanceAfter, 
               deposit.order_no, deposit.is_first_deposit ? '首充奖励' : '存款优惠', reviewer_id || 1).run()
      }
      
      // ========= V2.1 新增: 自动触发存款红利 =========
      try {
        // 查找匹配的存款红利触发规则
        const triggers = await db.prepare(`
          SELECT * FROM deposit_bonus_triggers 
          WHERE is_enabled = 1 
            AND min_deposit <= ?
            AND (max_deposit IS NULL OR max_deposit >= ?)
            AND (start_date IS NULL OR start_date <= datetime('now'))
            AND (end_date IS NULL OR end_date >= datetime('now'))
            AND (is_first_deposit_only = 0 OR (is_first_deposit_only = 1 AND ? = 1))
          ORDER BY priority DESC, id ASC
        `).bind(finalAmount, finalAmount, deposit.is_first_deposit ? 1 : 0).all()
        
        for (const trigger of (triggers.results || [])) {
          const t = trigger as any
          
          // 检查VIP等级限制
          if (t.vip_levels) {
            const allowedLevels = JSON.parse(t.vip_levels)
            if (allowedLevels.length > 0 && !allowedLevels.includes(player.vip_level)) {
              continue
            }
          }
          
          // 检查玩家每日限制
          if (t.player_daily_limit > 0) {
            const todayCount = await db.prepare(`
              SELECT COUNT(*) as count FROM deposit_bonus_logs 
              WHERE trigger_id = ? AND player_id = ? AND DATE(created_at) = DATE('now')
            `).bind(t.id, deposit.player_id).first() as any
            if (todayCount && todayCount.count >= t.player_daily_limit) {
              continue
            }
          }
          
          // 检查规则每日总限制
          if (t.daily_limit > 0) {
            const todayTotal = await db.prepare(`
              SELECT COUNT(*) as count FROM deposit_bonus_logs 
              WHERE trigger_id = ? AND DATE(created_at) = DATE('now')
            `).bind(t.id).first() as any
            if (todayTotal && todayTotal.count >= t.daily_limit) {
              continue
            }
          }
          
          // 计算红利金额
          let autoBonus = 0
          if (t.trigger_type === 'percentage') {
            autoBonus = finalAmount * (t.bonus_percentage / 100)
          } else if (t.trigger_type === 'fixed') {
            autoBonus = t.fixed_bonus
          }
          
          // 应用最大红利限制
          if (t.max_bonus && autoBonus > t.max_bonus) {
            autoBonus = t.max_bonus
          }
          
          if (autoBonus <= 0) continue
          
          // 计算流水要求
          const turnoverRequired = (finalAmount + autoBonus) * (t.turnover_multiplier || 1)
          
          // 记录触发日志
          await db.prepare(`
            INSERT INTO deposit_bonus_logs (trigger_id, player_id, deposit_id, deposit_amount, bonus_amount, turnover_required)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(t.id, deposit.player_id, id, finalAmount, autoBonus, turnoverRequired).run()
          
          // 发放红利到玩家账户
          const currentBalance = await db.prepare("SELECT balance FROM players WHERE id = ?").bind(deposit.player_id).first() as any
          const bonusOrderNo = generateOrderNo('ABN')
          
          await db.prepare(`
            UPDATE players SET balance = balance + ?, total_bonus = total_bonus + ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(autoBonus, autoBonus, deposit.player_id).run()
          
          // 记录红利交易流水
          await db.prepare(`
            INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark, operator_id, audit_status)
            VALUES (?, ?, 9, ?, ?, ?, ?, ?, 0, 1)
          `).bind(bonusOrderNo, deposit.player_id, currentBalance?.balance || 0, autoBonus, (currentBalance?.balance || 0) + autoBonus,
                 deposit.order_no, `存款红利触发: ${t.trigger_name} (${t.trigger_type === 'percentage' ? t.bonus_percentage + '%' : '固定' + t.fixed_bonus})`, ).run()
          
          // 记录到bonus_records
          await db.prepare(`
            INSERT INTO bonus_records (order_no, player_id, bonus_type, amount, turnover_setting_id, required_turnover, status, remark, operator_id)
            VALUES (?, ?, 'deposit_trigger', ?, NULL, ?, 1, ?, 0)
          `).bind(bonusOrderNo, deposit.player_id, autoBonus, turnoverRequired, `自动触发: ${t.trigger_name}`).run()
          
          // 只触发第一个匹配的规则（按优先级），如需多规则叠加可移除break
          break
        }
      } catch (triggerError) {
        // 红利触发失败不影响存款审核结果
        console.error('Deposit bonus trigger error:', triggerError)
      }
      // ========= END V2.1 =========
    }
    
    // 记录审计日志
    const statusNames: Record<number, string> = { 1: '处理中', 2: '通过', 3: '拒绝' }
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, old_value, new_value, description, risk_level)
      VALUES (?, ?, 'finance', 'deposit_review', 'deposit', ?, ?, ?, ?, ?)
    `).bind(
      reviewer_id || 1, 
      reviewer_name || 'admin', 
      id.toString(), 
      JSON.stringify({ status: deposit.status }),
      JSON.stringify({ status, actual_amount: finalAmount, bonus_amount: finalBonus, remark }),
      `存款审核: 订单${deposit.order_no} -> ${statusNames[status] || status}`,
      status === 2 && finalAmount >= 10000 ? 1 : 0 // 大额存款标记风险等级
    ).run()
    
    return c.json({ success: true, message: '存款审核完成', data: { new_status: status } })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 存款补单 (V2.1新增) - 人工创建存款记录
app.post('/api/deposits/supplement', async (c) => {
  const db = c.env.DB
  const { player_id, amount, payment_method, payment_channel, remark, operator_id, operator_name, proof_images } = await c.req.json()
  
  try {
    // 验证玩家是否存在
    const player = await db.prepare("SELECT * FROM players WHERE id = ?").bind(player_id).first()
    if (!player) {
      return c.json({ success: false, error: '玩家不存在' }, 404)
    }
    
    // 检查是否是首充
    const isFirstDeposit = (player.deposit_count as number || 0) === 0 ? 1 : 0
    
    // 创建存款订单
    const orderNo = generateOrderNo('DEP')
    const result = await db.prepare(`
      INSERT INTO deposit_requests (order_no, player_id, amount, actual_amount, payment_method, payment_channel, 
                                   is_first_deposit, status, review_remark, reviewer_id, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 2, ?, ?, datetime('now'))
    `).bind(orderNo, player_id, amount, amount, payment_method || 'manual', payment_channel || '人工补单', 
           isFirstDeposit, `人工补单: ${remark || ''}`, operator_id || 1).run()
    
    const depositId = result.meta.last_row_id
    
    // 更新玩家余额
    const balanceBefore = player.balance as number
    const balanceAfter = balanceBefore + amount
    
    await db.prepare(`
      UPDATE players SET 
        balance = balance + ?, 
        total_deposit = total_deposit + ?, 
        deposit_count = deposit_count + 1, 
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(amount, amount, player_id).run()
    
    // 记录交易流水
    await db.prepare(`
      INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark, operator_id, audit_status)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 1)
    `).bind(generateOrderNo('TXN'), player_id, balanceBefore, amount, balanceAfter, orderNo, `人工补单: ${remark || ''}`, operator_id || 1).run()
    
    // 记录审计日志 - 人工补单需要高风险标记
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, new_value, description, risk_level)
      VALUES (?, ?, 'finance', 'deposit_supplement', 'deposit', ?, ?, ?, 2)
    `).bind(
      operator_id || 1, 
      operator_name || 'admin', 
      depositId?.toString() || '',
      JSON.stringify({ player_id, amount, payment_method, remark, proof_images }),
      `人工补单: 玩家${player.username} 金额$${amount}`
    ).run()
    
    return c.json({ 
      success: true, 
      data: { 
        id: depositId, 
        order_no: orderNo,
        new_balance: balanceAfter 
      }, 
      message: '存款补单成功' 
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 批量审核存款
app.post('/api/deposits/batch-approve', async (c) => {
  const db = c.env.DB
  const { ids, reviewer_id, reviewer_name } = await c.req.json()
  
  try {
    let successCount = 0
    let failCount = 0
    const results: any[] = []
    
    for (const id of ids) {
      try {
        const deposit = await db.prepare("SELECT * FROM deposit_requests WHERE id = ? AND status IN (0, 1)").bind(id).first()
        if (!deposit) {
          failCount++
          results.push({ id, success: false, error: '记录不存在或已处理' })
          continue
        }
        
        // 更新存款状态
        await db.prepare(`
          UPDATE deposit_requests SET status = 2, reviewer_id = ?, reviewed_at = datetime('now'), actual_amount = amount
          WHERE id = ?
        `).bind(reviewer_id || 1, id).run()
        
        // 获取玩家信息并更新余额
        const player = await db.prepare("SELECT * FROM players WHERE id = ?").bind(deposit.player_id).first()
        if (player) {
          const balanceBefore = player.balance as number
          const amount = deposit.amount as number
          
          await db.prepare(`
            UPDATE players SET balance = balance + ?, total_deposit = total_deposit + ?, 
            deposit_count = deposit_count + 1, updated_at = datetime('now')
            WHERE id = ?
          `).bind(amount, amount, deposit.player_id).run()
          
          // 记录交易
          await db.prepare(`
            INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark, operator_id, audit_status)
            VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 1)
          `).bind(generateOrderNo('TXN'), deposit.player_id, balanceBefore, amount, balanceBefore + amount, 
                 deposit.order_no, '批量审核通过', reviewer_id || 1).run()
        }
        
        successCount++
        results.push({ id, success: true, order_no: deposit.order_no })
      } catch (err) {
        failCount++
        results.push({ id, success: false, error: String(err) })
      }
    }
    
    // 记录批量审核日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description, risk_level)
      VALUES (?, ?, 'finance', 'batch_deposit_approve', 'deposit', ?, ?, ?)
    `).bind(
      reviewer_id || 1, 
      reviewer_name || 'admin', 
      ids.join(','),
      `批量存款审核: 成功${successCount}笔, 失败${failCount}笔`,
      successCount >= 5 ? 1 : 0
    ).run()
    
    return c.json({ 
      success: true, 
      data: { successCount, failCount, results },
      message: `批量审核完成: 成功${successCount}笔, 失败${failCount}笔`
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家银行卡列表
app.get('/api/players/:id/bank-cards', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    const cards = await db.prepare(`
      SELECT * FROM player_bank_cards WHERE player_id = ? ORDER BY is_default DESC, created_at DESC
    `).bind(id).all()
    return c.json({ success: true, data: cards.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 添加玩家银行卡
app.post('/api/players/:id/bank-cards', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const result = await db.prepare(`
      INSERT INTO player_bank_cards (player_id, bank_name, bank_code, card_number, card_holder, branch_name, province, city, is_default, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(id, body.bank_name, body.bank_code, body.card_number, body.card_holder, 
           body.branch_name, body.province, body.city, body.is_default || 0).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '银行卡添加成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除玩家银行卡
app.delete('/api/players/:id/bank-cards/:cardId', async (c) => {
  const db = c.env.DB
  const cardId = c.req.param('cardId')
  
  try {
    await db.prepare("UPDATE player_bank_cards SET status = 0 WHERE id = ?").bind(cardId).run()
    return c.json({ success: true, message: '银行卡删除成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家KYC验证
app.put('/api/players/:id/kyc', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { kyc_status, kyc_remark, reviewer_id } = await c.req.json()
  
  try {
    await db.prepare(`
      UPDATE players SET kyc_status = ?, kyc_verified_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
      updated_at = datetime('now')
      WHERE id = ?
    `).bind(kyc_status, kyc_status, id).run()
    
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description)
      VALUES (?, 'player', 'kyc_review', 'player', ?, ?)
    `).bind(reviewer_id || 1, id, `KYC审核: ${kyc_status === 1 ? '通过' : '拒绝'} ${kyc_remark || ''}`).run()
    
    return c.json({ success: true, message: 'KYC审核完成' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家交易历史
app.get('/api/players/:id/transactions', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { page = '1', limit = '20' } = c.req.query()
  
  try {
    const transactions = await db.prepare(`
      SELECT * FROM transactions WHERE player_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).bind(id, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)).all()
    
    return c.json({ success: true, data: transactions.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家注单历史
app.get('/api/players/:id/bets', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { page = '1', limit = '20' } = c.req.query()
  
  try {
    const bets = await db.prepare(`
      SELECT * FROM bets WHERE player_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).bind(id, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)).all()
    
    return c.json({ success: true, data: bets.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 人工存款
app.post('/api/manual-deposit', async (c) => {
  const db = c.env.DB
  const { player_id, amount, payment_method, payment_channel, remark, operator_id, operator_name } = await c.req.json()
  
  try {
    if (!player_id || !amount || amount <= 0) {
      return c.json({ success: false, error: '参数错误：玩家ID和金额必填且金额必须大于0' }, 400)
    }
    
    const player = await db.prepare("SELECT * FROM players WHERE id = ?").bind(player_id).first()
    if (!player) {
      return c.json({ success: false, error: '玩家不存在' }, 404)
    }
    
    const balanceBefore = player.balance as number
    const newBalance = balanceBefore + amount
    const orderNo = generateOrderNo('MDP')
    
    // 创建存款记录
    await db.prepare(`
      INSERT INTO deposit_requests (order_no, player_id, amount, actual_amount, payment_method, payment_channel, 
                                   is_first_deposit, status, review_remark, reviewer_id, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 2, ?, ?, datetime('now'))
    `).bind(orderNo, player_id, amount, amount, payment_method || 'manual', payment_channel || '人工存款', 
           (player.deposit_count as number || 0) === 0 ? 1 : 0, `人工存款: ${remark || ''}`, operator_id || 1).run()
    
    // 更新玩家余额
    await db.prepare(`
      UPDATE players SET balance = ?, total_deposit = total_deposit + ?, 
      deposit_count = deposit_count + 1, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newBalance, amount, player_id).run()
    
    // 记录交易流水
    await db.prepare(`
      INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark, operator_id, audit_status)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 1)
    `).bind(generateOrderNo('TXN'), player_id, balanceBefore, amount, newBalance, orderNo, `人工存款: ${remark || ''}`, operator_id || 1).run()
    
    // 审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, new_value, description, risk_level)
      VALUES (?, ?, 'finance', 'manual_deposit', 'player', ?, ?, ?, 2)
    `).bind(operator_id || 1, operator_name || 'admin', player_id, 
           JSON.stringify({ amount, balanceBefore, newBalance, payment_method, payment_channel }), 
           `人工存款: ${player.username} +$${amount}`).run()
    
    return c.json({ success: true, data: { order_no: orderNo, new_balance: newBalance }, message: '人工存款成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 人工取款
app.post('/api/manual-withdraw', async (c) => {
  const db = c.env.DB
  const { player_id, amount, bank_name, bank_card_no, bank_holder_name, remark, operator_id, operator_name } = await c.req.json()
  
  try {
    if (!player_id || !amount || amount <= 0) {
      return c.json({ success: false, error: '参数错误：玩家ID和金额必填且金额必须大于0' }, 400)
    }
    
    const player = await db.prepare("SELECT * FROM players WHERE id = ?").bind(player_id).first()
    if (!player) {
      return c.json({ success: false, error: '玩家不存在' }, 404)
    }
    
    const balanceBefore = player.balance as number
    if (balanceBefore < amount) {
      return c.json({ success: false, error: `余额不足，当前余额: $${balanceBefore}` }, 400)
    }
    
    const newBalance = balanceBefore - amount
    const orderNo = generateOrderNo('MWD')
    
    // 创建提款记录（直接完成状态）
    await db.prepare(`
      INSERT INTO withdraw_requests (order_no, player_id, amount, actual_amount, bank_name, bank_card_no, bank_holder_name,
                                    turnover_required, turnover_achieved, turnover_rate, status, first_reviewer_id, 
                                    first_review_remark, first_review_at, payout_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 100, 4, ?, ?, datetime('now'), datetime('now'))
    `).bind(orderNo, player_id, amount, amount, bank_name || '-', bank_card_no || '-', bank_holder_name || player.real_name || '-',
           operator_id || 1, `人工取款: ${remark || ''}`).run()
    
    // 更新玩家余额
    await db.prepare(`
      UPDATE players SET balance = ?, total_withdraw = total_withdraw + ?, 
      withdraw_count = withdraw_count + 1, updated_at = datetime('now')
      WHERE id = ?
    `).bind(newBalance, amount, player_id).run()
    
    // 记录交易流水
    await db.prepare(`
      INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark, operator_id, audit_status)
      VALUES (?, ?, 2, ?, ?, ?, ?, ?, ?, 1)
    `).bind(generateOrderNo('TXN'), player_id, balanceBefore, -amount, newBalance, orderNo, `人工取款: ${remark || ''}`, operator_id || 1).run()
    
    // 审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, new_value, description, risk_level)
      VALUES (?, ?, 'finance', 'manual_withdraw', 'player', ?, ?, ?, 2)
    `).bind(operator_id || 1, operator_name || 'admin', player_id, 
           JSON.stringify({ amount, balanceBefore, newBalance, bank_name, bank_card_no }), 
           `人工取款: ${player.username} -$${amount}`).run()
    
    return c.json({ success: true, data: { order_no: orderNo, new_balance: newBalance }, message: '人工取款成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 人工调整（通用）
app.post('/api/manual-adjust', async (c) => {
  const db = c.env.DB
  const { player_id, amount, type, remark, operator_id, operator_name } = await c.req.json()
  
  try {
    const player = await db.prepare("SELECT * FROM players WHERE id = ?").bind(player_id).first()
    if (!player) {
      return c.json({ success: false, error: '玩家不存在' }, 404)
    }
    
    const balanceBefore = player.balance as number
    const newBalance = balanceBefore + amount
    
    if (newBalance < 0) {
      return c.json({ success: false, error: '调整后余额不能为负' }, 400)
    }
    
    // 更新玩家余额
    await db.prepare(`
      UPDATE players SET balance = ?, updated_at = datetime('now'),
      total_deposit = total_deposit + CASE WHEN ? > 0 THEN ? ELSE 0 END,
      total_withdraw = total_withdraw + CASE WHEN ? < 0 THEN ABS(?) ELSE 0 END
      WHERE id = ?
    `).bind(newBalance, amount, amount, amount, amount, player_id).run()
    
    // 记录交易
    const orderNo = generateOrderNo('ADJ')
    await db.prepare(`
      INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, remark, operator_id)
      VALUES (?, ?, 7, ?, ?, ?, ?, ?)
    `).bind(orderNo, player_id, balanceBefore, amount, newBalance, remark || '人工调整', operator_id || 1).run()
    
    // 审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, new_value, description, risk_level)
      VALUES (?, ?, 'finance', 'manual_adjust', 'player', ?, ?, ?, 2)
    `).bind(operator_id || 1, operator_name || 'admin', player_id, JSON.stringify({ amount, balanceBefore, newBalance }), 
           `人工调整: ${player.username} ${amount > 0 ? '+' : ''}$${amount}`).run()
    
    return c.json({ success: true, data: { order_no: orderNo, new_balance: newBalance }, message: '人工调整成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 收款方式设置 API (Payment Methods)
// ========================================
// 获取收款方式列表
app.get('/api/payment-methods', async (c) => {
  const db = c.env.DB
  const { status, type } = c.req.query()
  
  try {
    let sql = "SELECT * FROM payment_methods WHERE 1=1"
    const params: any[] = []
    
    if (status !== undefined && status !== '') {
      sql += ` AND status = ?`
      params.push(parseInt(status))
    }
    if (type) {
      sql += ` AND method_type = ?`
      params.push(type)
    }
    
    sql += " ORDER BY sort_order, id"
    
    const methods = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: methods.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建收款方式
app.post('/api/payment-methods', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    // 参数校验
    if (!body.method_code || !body.method_name) {
      return c.json({ success: false, error: '方式代码和名称不能为空' }, 400)
    }
    
    const result = await db.prepare(`
      INSERT INTO payment_methods (method_code, method_name, method_type, currency, min_amount, max_amount, 
                                  fee_rate, fee_fixed, account_info, qr_code_url, instructions, 
                                  supported_banks, status, sort_order, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.method_code, 
      body.method_name, 
      body.method_type || 'bank', 
      body.currency || 'USD',
      body.min_amount || 100, 
      body.max_amount || 1000000, 
      body.fee_rate || 0, 
      body.fee_fixed || 0,
      body.account_info ? JSON.stringify(body.account_info) : null, 
      body.qr_code_url || null,  // 确保 undefined 转为 null
      body.instructions || null,  // 确保 undefined 转为 null
      body.supported_banks ? JSON.stringify(body.supported_banks) : null,
      body.status !== undefined ? body.status : 1, 
      body.sort_order || 0, 
      body.created_by || 1
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '收款方式创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新收款方式
app.put('/api/payment-methods/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const fields = ['method_name', 'method_type', 'currency', 'min_amount', 'max_amount', 
                   'fee_rate', 'fee_fixed', 'account_info', 'qr_code_url', 'instructions',
                   'supported_banks', 'status', 'sort_order']
    const updates: string[] = []
    const values: any[] = []
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        if (field === 'account_info' || field === 'supported_banks') {
          // 对象类型字段需要JSON序列化
          const val = body[field]
          values.push(val === null ? null : (typeof val === 'string' ? val : JSON.stringify(val)))
        } else if (field === 'qr_code_url' || field === 'instructions') {
          // 可选字符串字段，空字符串转为null
          const val = body[field]
          values.push(val === null || val === '' ? null : val)
        } else {
          values.push(body[field])
        }
      }
    })
    
    if (updates.length === 0) {
      return c.json({ success: false, error: '没有要更新的字段' }, 400)
    }
    
    updates.push("updated_at = datetime('now')")
    values.push(id)
    
    await db.prepare(`UPDATE payment_methods SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    return c.json({ success: true, message: '收款方式更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除收款方式
app.delete('/api/payment-methods/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    await db.prepare("UPDATE payment_methods SET status = 0 WHERE id = ?").bind(id).run()
    return c.json({ success: true, message: '收款方式已禁用' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 5. 注单控端 Betting API
// ========================================
app.get('/api/bets', async (c) => {
  const db = c.env.DB
  const { player_id, game_type, bet_status, is_high_odds, start_date, end_date, search, page = '1', limit = '20' } = c.req.query()
  
  try {
    let sql = `SELECT b.*, p.username as player_name, p.vip_level
               FROM bets b
               LEFT JOIN players p ON b.player_id = p.id WHERE 1=1`
    const params: any[] = []
    
    if (player_id) {
      sql += ` AND b.player_id = ?`
      params.push(player_id)
    }
    if (game_type) {
      sql += ` AND b.game_type = ?`
      params.push(game_type)
    }
    if (bet_status !== undefined && bet_status !== '') {
      sql += ` AND b.bet_status = ?`
      params.push(parseInt(bet_status))
    }
    if (is_high_odds === '1') {
      sql += ` AND b.is_high_odds = 1`
    }
    if (start_date) {
      sql += ` AND date(b.created_at) >= ?`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(b.created_at) <= ?`
      params.push(end_date)
    }
    if (search) {
      sql += ` AND (b.bet_no LIKE ? OR p.username LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }
    
    sql += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const bets = await db.prepare(sql).bind(...params).all()
    
    // 统计
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(*) as total_bets,
        SUM(bet_amount) as total_amount,
        SUM(valid_bet_amount) as total_valid_bet,
        SUM(payout) as total_payout,
        SUM(win_loss_amount) as total_win_loss,
        COUNT(CASE WHEN is_high_odds = 1 THEN 1 END) as high_odds_count,
        COUNT(CASE WHEN is_large_bet = 1 THEN 1 END) as large_bet_count
      FROM bets WHERE date(created_at) = date('now')
    `).first()
    
    return c.json({
      success: true,
      data: bets.results,
      stats: statsResult
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 注单详情
app.get('/api/bets/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    const bet = await db.prepare(`
      SELECT b.*, p.username as player_name, p.vip_level, p.risk_level,
             gr.result_detail, gr.result_summary, gr.video_url as round_video_url
      FROM bets b
      LEFT JOIN players p ON b.player_id = p.id
      LEFT JOIN game_results gr ON b.game_round_id = gr.game_round_id
      WHERE b.id = ?
    `).bind(id).first()
    
    if (!bet) {
      return c.json({ success: false, error: 'Bet not found' }, 404)
    }
    
    return c.json({ success: true, data: bet })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 作废注单
app.put('/api/bets/:id/void', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { reason, operator_id, operator_name } = await c.req.json()
  
  try {
    const bet = await db.prepare("SELECT * FROM bets WHERE id = ?").bind(id).first()
    if (!bet) {
      return c.json({ success: false, error: 'Bet not found' }, 404)
    }
    if (bet.bet_status === 3) {
      return c.json({ success: false, error: '该注单已作废' }, 400)
    }
    
    await db.prepare("UPDATE bets SET bet_status = 3, risk_flag = ? WHERE id = ?").bind(reason, id).run()
    
    // 如果已结算，需要退款
    if (bet.bet_status === 1) {
      const refundAmount = (bet.bet_amount as number) - (bet.payout as number)
      await db.prepare(`
        UPDATE players SET balance = balance + ? WHERE id = ?
      `).bind(refundAmount, bet.player_id).run()
      
      // 记录交易
      await db.prepare(`
        INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, related_order_id, remark)
        VALUES (?, ?, 7, 0, ?, 0, ?, ?)
      `).bind(generateOrderNo('REF'), bet.player_id, refundAmount, bet.bet_no, '注单作废退款').run()
    }
    
    // 审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description, risk_level)
      VALUES (?, ?, 'bet', 'void', 'bet', ?, ?, 2)
    `).bind(operator_id || 1, operator_name || 'admin', id, `注单作废: ${bet.bet_no}, 原因: ${reason}`).run()
    
    return c.json({ success: true, message: '注单作废成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 游戏结果
app.get('/api/game-results', async (c) => {
  const db = c.env.DB
  const { game_type, table_code, start_date, end_date, page = '1', limit = '20' } = c.req.query()
  
  try {
    let sql = `SELECT gr.*, d.stage_name_cn as dealer_name
               FROM game_results gr
               LEFT JOIN dealers d ON gr.dealer_id = d.id
               WHERE 1=1`
    const params: any[] = []
    
    if (game_type) {
      sql += ` AND gr.game_type = ?`
      params.push(game_type)
    }
    if (table_code) {
      sql += ` AND gr.table_code = ?`
      params.push(table_code)
    }
    if (start_date) {
      sql += ` AND date(gr.created_at) >= ?`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(gr.created_at) <= ?`
      params.push(end_date)
    }
    
    sql += ` ORDER BY gr.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const results = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: results.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 6. 红利与洗码 Commission API (V2.1升级)
// ========================================
// 洗码方案列表
app.get('/api/commission/schemes', async (c) => {
  const db = c.env.DB
  
  try {
    const schemes = await db.prepare(`
      SELECT cs.*,
             (SELECT COUNT(*) FROM players WHERE commission_scheme_id = cs.id) as player_count,
             (SELECT COUNT(*) FROM agents WHERE default_commission_scheme_id = cs.id) as agent_count
      FROM commission_schemes cs
      ORDER BY cs.id
    `).all()
    
    return c.json({ success: true, data: schemes.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 洗码方案详情
app.get('/api/commission/schemes/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    const scheme = await db.prepare("SELECT * FROM commission_schemes WHERE id = ?").bind(id).first()
    if (!scheme) {
      return c.json({ success: false, error: 'Scheme not found' }, 404)
    }
    
    return c.json({ success: true, data: scheme })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建洗码方案
app.post('/api/commission/schemes', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    const result = await db.prepare(`
      INSERT INTO commission_schemes (scheme_name, description, settlement_cycle, min_valid_bet, daily_max_amount, 
                                     auto_payout_threshold, baccarat_rate, dragon_tiger_rate, roulette_rate, 
                                     sicbo_rate, niuniu_rate, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.scheme_name, body.description, body.settlement_cycle || 1, body.min_valid_bet || 0,
      body.daily_max_amount, body.auto_payout_threshold || 1000,
      body.baccarat_rate || 0.006, body.dragon_tiger_rate || 0.006, body.roulette_rate || 0.004,
      body.sicbo_rate || 0.005, body.niuniu_rate || 0.005, body.status || 1
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '洗码方案创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新洗码方案
app.put('/api/commission/schemes/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const fields = ['scheme_name', 'description', 'settlement_cycle', 'min_valid_bet', 'daily_max_amount',
                   'auto_payout_threshold', 'baccarat_rate', 'dragon_tiger_rate', 'roulette_rate',
                   'sicbo_rate', 'niuniu_rate', 'status']
    const updates: string[] = []
    const values: any[] = []
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(body[field])
      }
    })
    
    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }
    
    updates.push("updated_at = datetime('now')")
    values.push(id)
    
    await db.prepare(`UPDATE commission_schemes SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    return c.json({ success: true, message: '洗码方案更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除洗码方案
app.delete('/api/commission/schemes/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    // 检查是否有玩家或代理绑定此方案
    const binding = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM players WHERE commission_scheme_id = ?) as player_count,
        (SELECT COUNT(*) FROM agents WHERE default_commission_scheme_id = ?) as agent_count
    `).bind(id, id).first() as any
    
    if (binding && (binding.player_count > 0 || binding.agent_count > 0)) {
      // 将绑定的玩家和代理的方案设置为NULL
      await db.prepare('UPDATE players SET commission_scheme_id = NULL WHERE commission_scheme_id = ?').bind(id).run()
      await db.prepare('UPDATE agents SET default_commission_scheme_id = NULL WHERE default_commission_scheme_id = ?').bind(id).run()
    }
    
    await db.prepare('DELETE FROM commission_schemes WHERE id = ?').bind(id).run()
    
    return c.json({ success: true, message: '洗码方案删除成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 洗码记录
app.get('/api/commission/records', async (c) => {
  const db = c.env.DB
  const { status, settle_date, player_id, page = '1', limit = '20' } = c.req.query()
  
  try {
    let sql = `SELECT cr.*, p.username as player_name, cs.scheme_name
               FROM commission_records cr
               LEFT JOIN players p ON cr.player_id = p.id
               LEFT JOIN commission_schemes cs ON cr.scheme_id = cs.id
               WHERE 1=1`
    const params: any[] = []
    
    if (status !== undefined && status !== '') {
      sql += ` AND cr.status = ?`
      params.push(parseInt(status))
    }
    if (settle_date) {
      sql += ` AND cr.settle_date = ?`
      params.push(settle_date)
    }
    if (player_id) {
      sql += ` AND cr.player_id = ?`
      params.push(player_id)
    }
    
    sql += ` ORDER BY cr.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const records = await db.prepare(sql).bind(...params).all()
    
    // 统计
    const stats = await db.prepare(`
      SELECT 
        SUM(CASE WHEN status=0 THEN total_amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status IN (1,3) THEN total_amount ELSE 0 END) as paid_amount,
        COUNT(CASE WHEN status=0 THEN 1 END) as pending_count
      FROM commission_records WHERE settle_date >= date('now', '-7 days')
    `).first()
    
    return c.json({
      success: true,
      data: records.results,
      stats
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 洗码审核
app.put('/api/commission/records/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { status, reviewer_id, review_remark } = await c.req.json()
  
  try {
    const record = await db.prepare("SELECT * FROM commission_records WHERE id = ?").bind(id).first()
    if (!record) {
      return c.json({ success: false, error: 'Record not found' }, 404)
    }
    
    await db.prepare(`
      UPDATE commission_records 
      SET status = ?, reviewer_id = ?, review_remark = ?, reviewed_at = datetime('now'),
          paid_at = CASE WHEN ? = 3 THEN datetime('now') ELSE paid_at END
      WHERE id = ?
    `).bind(status, reviewer_id, review_remark, status, id).run()
    
    // 如果审核通过，发放洗码金
    if (status === 3) {
      await db.prepare(`
        UPDATE players SET balance = balance + ?, total_commission = total_commission + ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(record.total_amount, record.total_amount, record.player_id).run()
      
      // 记录交易
      await db.prepare(`
        INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, remark)
        VALUES (?, ?, 6, 0, ?, 0, ?)
      `).bind(generateOrderNo('COM'), record.player_id, record.total_amount, `洗码返水 ${record.settle_date}`).run()
    }
    
    return c.json({ success: true, message: '洗码记录审核完成' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 批量审核洗码
app.post('/api/commission/records/batch-approve', async (c) => {
  const db = c.env.DB
  const { ids, reviewer_id } = await c.req.json()
  
  try {
    for (const id of ids) {
      const record = await db.prepare("SELECT * FROM commission_records WHERE id = ? AND status = 0").bind(id).first()
      if (record) {
        await db.prepare(`
          UPDATE commission_records SET status = 3, reviewer_id = ?, reviewed_at = datetime('now'), paid_at = datetime('now')
          WHERE id = ?
        `).bind(reviewer_id || 1, id).run()
        
        await db.prepare(`
          UPDATE players SET balance = balance + ?, total_commission = total_commission + ? WHERE id = ?
        `).bind(record.total_amount, record.total_amount, record.player_id).run()
        
        await db.prepare(`
          INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, remark)
          VALUES (?, ?, 6, 0, ?, 0, ?)
        `).bind(generateOrderNo('COM'), record.player_id, record.total_amount, `洗码返水 ${record.settle_date}`).run()
      }
    }
    
    return c.json({ success: true, message: `成功审核 ${ids.length} 条记录` })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 流水稽核设置管理 (V2.1)
// 获取流水稽核设置
app.get('/api/bonus/turnover-settings', async (c) => {
  const db = c.env.DB
  
  try {
    // 创建流水稽核设置表（如果不存在）
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS turnover_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_name TEXT NOT NULL,
        bonus_type TEXT NOT NULL,
        turnover_multiplier REAL NOT NULL DEFAULT 1,
        valid_games TEXT,
        min_odds REAL DEFAULT 1.0,
        max_single_bet REAL,
        time_limit_hours INTEGER DEFAULT 0,
        is_enabled INTEGER DEFAULT 1,
        description TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    const settings = await db.prepare(`
      SELECT ts.*, a.username as created_by_name 
      FROM turnover_settings ts
      LEFT JOIN admins a ON ts.created_by = a.id
      ORDER BY ts.created_at DESC
    `).all()
    
    return c.json({ success: true, data: settings.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建流水稽核设置
app.post('/api/bonus/turnover-settings', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { setting_name, bonus_type, turnover_multiplier, valid_games, min_odds, max_single_bet, time_limit_hours, description, created_by } = body
  
  try {
    const result = await db.prepare(`
      INSERT INTO turnover_settings (setting_name, bonus_type, turnover_multiplier, valid_games, min_odds, max_single_bet, time_limit_hours, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      setting_name, bonus_type, turnover_multiplier || 1,
      typeof valid_games === 'string' ? valid_games : (valid_games ? JSON.stringify(valid_games) : null),
      min_odds || 1.0, max_single_bet ?? null, time_limit_hours || 0, description || null, created_by ?? null
    ).run()
    
    // 审计日志（如果有operator）
    if (created_by) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
        VALUES (?, (SELECT username FROM admins WHERE id = ?), 'commission', 'create_turnover', 'turnover_setting', ?, ?)
      `).bind(created_by, created_by, result.meta.last_row_id, `创建流水稽核设置: ${setting_name}`).run()
    }
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '流水稽核设置创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新流水稽核设置
app.put('/api/bonus/turnover-settings/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  const { setting_name, bonus_type, turnover_multiplier, valid_games, min_odds, max_single_bet, time_limit_hours, description, is_enabled, updated_by } = body
  
  try {
    await db.prepare(`
      UPDATE turnover_settings SET 
        setting_name = COALESCE(?, setting_name),
        bonus_type = COALESCE(?, bonus_type),
        turnover_multiplier = COALESCE(?, turnover_multiplier),
        valid_games = COALESCE(?, valid_games),
        min_odds = COALESCE(?, min_odds),
        max_single_bet = COALESCE(?, max_single_bet),
        time_limit_hours = COALESCE(?, time_limit_hours),
        description = COALESCE(?, description),
        is_enabled = COALESCE(?, is_enabled),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      setting_name, bonus_type, turnover_multiplier,
      valid_games ? JSON.stringify(valid_games) : null,
      min_odds, max_single_bet, time_limit_hours, description, is_enabled, id
    ).run()
    
    // 审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
      VALUES (?, (SELECT username FROM admins WHERE id = ?), 'commission', 'update_turnover', 'turnover_setting', ?, ?)
    `).bind(updated_by, updated_by, id, `更新流水稽核设置: ${setting_name || id}`).run()
    
    return c.json({ success: true, message: '流水稽核设置更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除流水稽核设置
app.delete('/api/bonus/turnover-settings/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { deleted_by } = c.req.query()
  
  try {
    const setting = await db.prepare('SELECT setting_name FROM turnover_settings WHERE id = ?').bind(id).first() as any
    await db.prepare('DELETE FROM turnover_settings WHERE id = ?').bind(id).run()
    
    // 审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
      VALUES (?, (SELECT username FROM admins WHERE id = ?), 'commission', 'delete_turnover', 'turnover_setting', ?, ?)
    `).bind(deleted_by, deleted_by, id, `删除流水稽核设置: ${setting?.setting_name || id}`).run()
    
    return c.json({ success: true, message: '流水稽核设置删除成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 红利发放（支持用户名和流水稀核设置）
app.post('/api/bonus/payout', async (c) => {
  const db = c.env.DB
  const { player_id, username, amount, bonus_type, turnover_setting_id, required_turnover, remark, operator_id } = await c.req.json()
  
  try {
    // 创建bonus_records表（如果不存在）
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS bonus_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE NOT NULL,
        player_id INTEGER NOT NULL,
        bonus_type TEXT,
        amount REAL NOT NULL,
        turnover_setting_id INTEGER,
        required_turnover REAL DEFAULT 0,
        completed_turnover REAL DEFAULT 0,
        status INTEGER DEFAULT 1,
        remark TEXT,
        operator_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `).run()
    
    // 兼容旧表：添加缺失的列
    try { await db.prepare(`ALTER TABLE bonus_records ADD COLUMN turnover_setting_id INTEGER`).run() } catch (e) { /* 列已存在 */ }
    try { await db.prepare(`ALTER TABLE bonus_records ADD COLUMN required_turnover REAL DEFAULT 0`).run() } catch (e) { /* 列已存在 */ }
    try { await db.prepare(`ALTER TABLE bonus_records ADD COLUMN completed_turnover REAL DEFAULT 0`).run() } catch (e) { /* 列已存在 */ }
    try { await db.prepare(`ALTER TABLE bonus_records ADD COLUMN completed_at DATETIME`).run() } catch (e) { /* 列已存在 */ }
    
    // 根据username或player_id查找玩家
    let player: any
    if (username) {
      player = await db.prepare("SELECT * FROM players WHERE username = ?").bind(username).first()
    } else if (player_id) {
      player = await db.prepare("SELECT * FROM players WHERE id = ?").bind(player_id).first()
    }
    
    if (!player) {
      return c.json({ success: false, error: '玩家不存在' }, 404)
    }
    
    const orderNo = 'BON' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase()
    const actualTurnover = required_turnover || 0
    
    // 记录红利
    await db.prepare(`
      INSERT INTO bonus_records (order_no, player_id, bonus_type, amount, turnover_setting_id, required_turnover, status, remark, operator_id)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(orderNo, player.id, bonus_type || 'manual', amount, turnover_setting_id || null, actualTurnover, remark || null, operator_id || 1).run()
    
    // 更新玩家余额
    await db.prepare(`
      UPDATE players SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(amount, player.id).run()
    
    // 记录交易
    await db.prepare(`
      INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, remark, operator_id)
      VALUES (?, ?, 9, ?, ?, ?, ?, ?)
    `).bind(orderNo, player.id, player.balance, amount, player.balance + amount, remark || `红利派发: ${bonus_type}`, operator_id || 1).run()
    
    // 审计日志
    const operator = await db.prepare("SELECT username FROM admins WHERE id = ?").bind(operator_id || 1).first() as any
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
      VALUES (?, ?, 'bonus', 'payout', 'player', ?, ?)
    `).bind(operator_id || 1, operator?.username || 'admin', player.id, `红利派发: ${amount}, 类型: ${bonus_type}, 流水要求: ${actualTurnover}`).run()
    
    return c.json({ success: true, data: { order_no: orderNo, player_id: player.id }, message: '红利派发成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 获取红利派发历史
app.get('/api/bonus/history', async (c) => {
  const db = c.env.DB
  const { player_id, limit = '20' } = c.req.query()
  
  try {
    // 确保表存在
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS bonus_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE NOT NULL,
        player_id INTEGER NOT NULL,
        bonus_type TEXT,
        amount REAL NOT NULL,
        turnover_setting_id INTEGER,
        required_turnover REAL DEFAULT 0,
        completed_turnover REAL DEFAULT 0,
        status INTEGER DEFAULT 1,
        remark TEXT,
        operator_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `).run()
    
    let sql = `
      SELECT br.*, p.username, p.nickname, a.username as operator_name
      FROM bonus_records br
      LEFT JOIN players p ON br.player_id = p.id
      LEFT JOIN admins a ON br.operator_id = a.id
    `
    const params: any[] = []
    
    if (player_id) {
      sql += ' WHERE br.player_id = ?'
      params.push(player_id)
    }
    
    sql += ' ORDER BY br.created_at DESC LIMIT ?'
    params.push(parseInt(limit))
    
    const records = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: records.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 存款红利触发规则管理 (V2.1 新增)
// ========================================

// 获取存款红利触发规则列表
app.get('/api/bonus/deposit-triggers', async (c) => {
  const db = c.env.DB
  
  try {
    // 创建存款红利触发规则表（如果不存在）
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS deposit_bonus_triggers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigger_name TEXT NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'percentage',
        bonus_percentage REAL NOT NULL DEFAULT 0,
        fixed_bonus REAL DEFAULT 0,
        min_deposit REAL DEFAULT 0,
        max_deposit REAL,
        max_bonus REAL,
        vip_levels TEXT,
        valid_times TEXT,
        daily_limit INTEGER DEFAULT 0,
        player_daily_limit INTEGER DEFAULT 1,
        turnover_setting_id INTEGER,
        turnover_multiplier REAL DEFAULT 1,
        is_first_deposit_only INTEGER DEFAULT 0,
        is_enabled INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        start_date DATETIME,
        end_date DATETIME,
        description TEXT,
        auto_trigger_event TEXT,
        cumulative_target REAL,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // 兼容旧表：添加缺失的列
    try { await db.prepare(`ALTER TABLE deposit_bonus_triggers ADD COLUMN turnover_setting_id INTEGER`).run() } catch (e) { /* 列已存在 */ }
    try { await db.prepare(`ALTER TABLE deposit_bonus_triggers ADD COLUMN auto_trigger_event TEXT`).run() } catch (e) { /* 列已存在 */ }
    try { await db.prepare(`ALTER TABLE deposit_bonus_triggers ADD COLUMN cumulative_target REAL`).run() } catch (e) { /* 列已存在 */ }
    
    // 创建存款红利触发记录表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS deposit_bonus_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trigger_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        deposit_id INTEGER,
        deposit_amount REAL NOT NULL,
        bonus_amount REAL NOT NULL,
        turnover_required REAL DEFAULT 0,
        status INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    const triggers = await db.prepare(`
      SELECT dt.*, a.username as created_by_name,
        (SELECT COUNT(*) FROM deposit_bonus_logs WHERE trigger_id = dt.id) as used_count,
        (SELECT SUM(bonus_amount) FROM deposit_bonus_logs WHERE trigger_id = dt.id) as total_bonus
      FROM deposit_bonus_triggers dt
      LEFT JOIN admins a ON dt.created_by = a.id
      ORDER BY dt.priority DESC, dt.created_at DESC
    `).all()
    
    return c.json({ success: true, data: triggers.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 获取单个存款红利触发规则
app.get('/api/bonus/deposit-triggers/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    const trigger = await db.prepare(`
      SELECT dt.*, a.username as created_by_name
      FROM deposit_bonus_triggers dt
      LEFT JOIN admins a ON dt.created_by = a.id
      WHERE dt.id = ?
    `).bind(id).first()
    
    if (!trigger) {
      return c.json({ success: false, error: '规则不存在' }, 404)
    }
    
    // 获取触发记录
    const logs = await db.prepare(`
      SELECT dbl.*, p.username as player_name, p.vip_level
      FROM deposit_bonus_logs dbl
      LEFT JOIN players p ON dbl.player_id = p.id
      WHERE dbl.trigger_id = ?
      ORDER BY dbl.created_at DESC
      LIMIT 50
    `).bind(id).all()
    
    return c.json({ 
      success: true, 
      data: { 
        ...trigger, 
        logs: logs.results 
      } 
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建存款红利触发规则
app.post('/api/bonus/deposit-triggers', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const {
    trigger_name,
    trigger_type = 'percentage',
    bonus_percentage = 0,
    fixed_bonus = 0,
    min_deposit = 0,
    max_deposit,
    max_bonus,
    vip_levels,
    valid_times,
    daily_limit = 0,
    player_daily_limit = 1,
    turnover_setting_id,
    turnover_multiplier = 1,
    is_first_deposit_only = 0,
    priority = 0,
    start_date,
    end_date,
    description,
    created_by,
    auto_trigger_event,
    cumulative_target
  } = body
  
  if (!trigger_name) {
    return c.json({ success: false, error: '请填写规则名称' }, 400)
  }
  
  // 根据触发类型验证必填字段
  if ((trigger_type === 'percentage' || trigger_type === 'first_deposit_percentage' || trigger_type === 'cumulative_deposit') 
      && (!bonus_percentage || bonus_percentage <= 0)) {
    return c.json({ success: false, error: '百分比派发模式需要设置有效的红利比例' }, 400)
  }
  
  if (trigger_type === 'fixed' && (!fixed_bonus || fixed_bonus <= 0)) {
    return c.json({ success: false, error: '固定金额模式需要设置有效的红利金额' }, 400)
  }
  
  if (trigger_type === 'cumulative_deposit' && (!cumulative_target || cumulative_target <= 0)) {
    return c.json({ success: false, error: '累计存款派发模式需要设置有效的累计目标金额' }, 400)
  }
  
  try {
    const result = await db.prepare(`
      INSERT INTO deposit_bonus_triggers (
        trigger_name, trigger_type, bonus_percentage, fixed_bonus,
        min_deposit, max_deposit, max_bonus, vip_levels, valid_times,
        daily_limit, player_daily_limit, turnover_setting_id, turnover_multiplier,
        is_first_deposit_only, priority, start_date, end_date,
        description, created_by, auto_trigger_event, cumulative_target
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      trigger_name, trigger_type, bonus_percentage, fixed_bonus,
      min_deposit, max_deposit ?? null, max_bonus ?? null,
      vip_levels ? JSON.stringify(vip_levels) : null,
      valid_times ? JSON.stringify(valid_times) : null,
      daily_limit, player_daily_limit, turnover_setting_id ?? null, turnover_multiplier,
      is_first_deposit_only ? 1 : 0, priority,
      start_date || null, end_date || null,
      description || null, created_by || null,
      auto_trigger_event || null, cumulative_target ?? null
    ).run()
    
    // 审计日志
    if (created_by) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
        VALUES (?, (SELECT username FROM admins WHERE id = ?), 'bonus', 'create_deposit_trigger', 'deposit_trigger', ?, ?)
      `).bind(created_by, created_by, result.meta.last_row_id, `创建存款红利触发规则: ${trigger_name}`).run()
    }
    
    return c.json({ 
      success: true, 
      data: { id: result.meta.last_row_id },
      message: '存款红利触发规则创建成功'
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新存款红利触发规则
app.put('/api/bonus/deposit-triggers/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  const {
    trigger_name,
    trigger_type,
    bonus_percentage,
    fixed_bonus,
    min_deposit,
    max_deposit,
    max_bonus,
    vip_levels,
    valid_times,
    daily_limit,
    player_daily_limit,
    turnover_setting_id,
    turnover_multiplier,
    is_first_deposit_only,
    is_enabled,
    priority,
    start_date,
    end_date,
    description,
    updated_by,
    auto_trigger_event,
    cumulative_target
  } = body
  
  try {
    await db.prepare(`
      UPDATE deposit_bonus_triggers SET
        trigger_name = COALESCE(?, trigger_name),
        trigger_type = COALESCE(?, trigger_type),
        bonus_percentage = COALESCE(?, bonus_percentage),
        fixed_bonus = COALESCE(?, fixed_bonus),
        min_deposit = COALESCE(?, min_deposit),
        max_deposit = COALESCE(?, max_deposit),
        max_bonus = COALESCE(?, max_bonus),
        vip_levels = COALESCE(?, vip_levels),
        valid_times = COALESCE(?, valid_times),
        daily_limit = COALESCE(?, daily_limit),
        player_daily_limit = COALESCE(?, player_daily_limit),
        turnover_setting_id = COALESCE(?, turnover_setting_id),
        turnover_multiplier = COALESCE(?, turnover_multiplier),
        is_first_deposit_only = COALESCE(?, is_first_deposit_only),
        is_enabled = COALESCE(?, is_enabled),
        priority = COALESCE(?, priority),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        description = COALESCE(?, description),
        auto_trigger_event = COALESCE(?, auto_trigger_event),
        cumulative_target = COALESCE(?, cumulative_target),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      trigger_name, trigger_type, bonus_percentage, fixed_bonus,
      min_deposit, max_deposit, max_bonus,
      vip_levels ? JSON.stringify(vip_levels) : null,
      valid_times ? JSON.stringify(valid_times) : null,
      daily_limit, player_daily_limit, turnover_setting_id, turnover_multiplier,
      is_first_deposit_only !== undefined ? (is_first_deposit_only ? 1 : 0) : null,
      is_enabled !== undefined ? (is_enabled ? 1 : 0) : null,
      priority, start_date, end_date, description,
      auto_trigger_event || null, cumulative_target ?? null, id
    ).run()
    
    // 审计日志
    if (updated_by) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
        VALUES (?, (SELECT username FROM admins WHERE id = ?), 'bonus', 'update_deposit_trigger', 'deposit_trigger', ?, ?)
      `).bind(updated_by, updated_by, id, `更新存款红利触发规则: ${trigger_name || id}`).run()
    }
    
    return c.json({ success: true, message: '存款红利触发规则更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除存款红利触发规则
app.delete('/api/bonus/deposit-triggers/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { deleted_by } = c.req.query()
  
  try {
    const trigger = await db.prepare('SELECT trigger_name FROM deposit_bonus_triggers WHERE id = ?').bind(id).first() as any
    await db.prepare('DELETE FROM deposit_bonus_triggers WHERE id = ?').bind(id).run()
    
    // 审计日志
    if (deleted_by) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
        VALUES (?, (SELECT username FROM admins WHERE id = ?), 'bonus', 'delete_deposit_trigger', 'deposit_trigger', ?, ?)
      `).bind(deleted_by, deleted_by, id, `删除存款红利触发规则: ${trigger?.trigger_name || id}`).run()
    }
    
    return c.json({ success: true, message: '存款红利触发规则删除成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 获取存款红利触发记录
app.get('/api/bonus/deposit-trigger-logs', async (c) => {
  const db = c.env.DB
  const { trigger_id, player_id, start_date, end_date, page = '1', limit = '50' } = c.req.query()
  
  try {
    let sql = `
      SELECT dbl.*, dt.trigger_name, p.username as player_name, p.vip_level
      FROM deposit_bonus_logs dbl
      LEFT JOIN deposit_bonus_triggers dt ON dbl.trigger_id = dt.id
      LEFT JOIN players p ON dbl.player_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (trigger_id) {
      sql += ' AND dbl.trigger_id = ?'
      params.push(trigger_id)
    }
    if (player_id) {
      sql += ' AND dbl.player_id = ?'
      params.push(player_id)
    }
    if (start_date) {
      sql += ' AND DATE(dbl.created_at) >= ?'
      params.push(start_date)
    }
    if (end_date) {
      sql += ' AND DATE(dbl.created_at) <= ?'
      params.push(end_date)
    }
    
    sql += ' ORDER BY dbl.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const logs = await db.prepare(sql).bind(...params).all()
    
    // 统计
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(deposit_amount) as total_deposit,
        SUM(bonus_amount) as total_bonus
      FROM deposit_bonus_logs
      WHERE 1=1
      ${trigger_id ? ' AND trigger_id = ' + trigger_id : ''}
      ${start_date ? " AND DATE(created_at) >= '" + start_date + "'" : ''}
      ${end_date ? " AND DATE(created_at) <= '" + end_date + "'" : ''}
    `).first() as any
    
    return c.json({ 
      success: true, 
      data: logs.results,
      stats: {
        total_count: stats?.total_count || 0,
        total_deposit: stats?.total_deposit || 0,
        total_bonus: stats?.total_bonus || 0
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 7. 风险控端 Risk Management API
// ========================================
app.get('/api/risk/alerts', async (c) => {
  const db = c.env.DB
  const { status, severity, alert_type, player_id, page = '1', limit = '50' } = c.req.query()
  
  try {
    let sql = `SELECT ra.*, p.username as player_name, p.risk_level, p.vip_level
               FROM risk_alerts ra
               LEFT JOIN players p ON ra.player_id = p.id
               WHERE 1=1`
    const params: any[] = []
    
    if (status !== undefined && status !== '') {
      sql += ` AND ra.status = ?`
      params.push(parseInt(status))
    }
    if (severity) {
      sql += ` AND ra.severity = ?`
      params.push(parseInt(severity))
    }
    if (alert_type) {
      sql += ` AND ra.alert_type = ?`
      params.push(alert_type)
    }
    if (player_id) {
      sql += ` AND ra.player_id = ?`
      params.push(player_id)
    }
    
    sql += ` ORDER BY ra.severity DESC, ra.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const alerts = await db.prepare(sql).bind(...params).all()
    
    // 按严重程度统计
    const stats = await db.prepare(`
      SELECT severity, COUNT(*) as count FROM risk_alerts WHERE status = 0 GROUP BY severity
    `).all()
    
    return c.json({
      success: true,
      data: alerts.results,
      stats: stats.results
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 处理预警
app.put('/api/risk/alerts/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { status, action_taken, handle_remark, handler_id } = await c.req.json()
  
  try {
    await db.prepare(`
      UPDATE risk_alerts 
      SET status = ?, action_taken = ?, handle_remark = ?, handler_id = ?, handled_at = datetime('now')
      WHERE id = ?
    `).bind(status, action_taken, handle_remark, handler_id || 1, id).run()
    
    return c.json({ success: true, message: '预警处理完成' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建预警
app.post('/api/risk/alerts', async (c) => {
  const db = c.env.DB
  const { player_id, alert_type, severity, title, description, related_data } = await c.req.json()
  
  try {
    const result = await db.prepare(`
      INSERT INTO risk_alerts (player_id, alert_type, severity, title, description, related_data, status)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).bind(player_id, alert_type, severity || 2, title, description, related_data ? JSON.stringify(related_data) : null).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '预警创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 限红组列表
app.get('/api/risk/limit-groups', async (c) => {
  const db = c.env.DB
  
  try {
    const groups = await db.prepare(`
      SELECT lg.*,
             (SELECT COUNT(*) FROM players WHERE limit_group_id = lg.id) as player_count,
             (SELECT COUNT(*) FROM game_tables WHERE limit_group_id = lg.id) as table_count
      FROM limit_groups lg ORDER BY lg.id
    `).all()
    return c.json({ success: true, data: groups.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建限红组
app.post('/api/risk/limit-groups', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    const result = await db.prepare(`
      INSERT INTO limit_groups (group_name, description, baccarat_limits, dragon_tiger_limits, 
                               roulette_limits, sicbo_limits, niuniu_limits, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.group_name, body.description,
      JSON.stringify(body.baccarat_limits), JSON.stringify(body.dragon_tiger_limits),
      JSON.stringify(body.roulette_limits), JSON.stringify(body.sicbo_limits),
      JSON.stringify(body.niuniu_limits), body.status || 1
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '限红组创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 风控规则管理 (V2.1)
// 获取风控规则列表
app.get('/api/risk/rules', async (c) => {
  const db = c.env.DB
  
  try {
    // 创建风控规则表（如果不存在）
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS risk_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_name TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        conditions TEXT NOT NULL,
        actions TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        is_enabled INTEGER DEFAULT 1,
        description TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    const rules = await db.prepare(`
      SELECT r.*, a.username as created_by_name 
      FROM risk_rules r
      LEFT JOIN admins a ON r.created_by = a.id
      ORDER BY r.created_at DESC
    `).all()
    
    return c.json({ success: true, data: rules.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建风控规则
app.post('/api/risk/rules', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { rule_name, rule_type, conditions, actions, severity, description, created_by } = body
  
  try {
    const result = await db.prepare(`
      INSERT INTO risk_rules (rule_name, rule_type, conditions, actions, severity, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(rule_name, rule_type, JSON.stringify(conditions), JSON.stringify(actions), severity || 'medium', description, created_by).run()
    
    // 审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
      VALUES (?, (SELECT username FROM admins WHERE id = ?), 'risk', 'create_rule', 'risk_rule', ?, ?)
    `).bind(created_by, created_by, result.meta.last_row_id, `创建风控规则: ${rule_name}`).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '风控规则创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新风控规则
app.put('/api/risk/rules/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  const { rule_name, rule_type, conditions, actions, severity, description, is_enabled, updated_by } = body
  
  try {
    await db.prepare(`
      UPDATE risk_rules SET 
        rule_name = COALESCE(?, rule_name),
        rule_type = COALESCE(?, rule_type),
        conditions = COALESCE(?, conditions),
        actions = COALESCE(?, actions),
        severity = COALESCE(?, severity),
        description = COALESCE(?, description),
        is_enabled = COALESCE(?, is_enabled),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      rule_name, rule_type, 
      conditions ? JSON.stringify(conditions) : null,
      actions ? JSON.stringify(actions) : null,
      severity, description, is_enabled, id
    ).run()
    
    // 审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
      VALUES (?, (SELECT username FROM admins WHERE id = ?), 'risk', 'update_rule', 'risk_rule', ?, ?)
    `).bind(updated_by, updated_by, id, `更新风控规则: ${rule_name || id}`).run()
    
    return c.json({ success: true, message: '风控规则更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除风控规则
app.delete('/api/risk/rules/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { deleted_by } = c.req.query()
  
  try {
    const rule = await db.prepare('SELECT rule_name FROM risk_rules WHERE id = ?').bind(id).first() as any
    await db.prepare('DELETE FROM risk_rules WHERE id = ?').bind(id).run()
    
    // 审计日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, target_type, target_id, description)
      VALUES (?, (SELECT username FROM admins WHERE id = ?), 'risk', 'delete_rule', 'risk_rule', ?, ?)
    `).bind(deleted_by, deleted_by, id, `删除风控规则: ${rule?.rule_name || id}`).run()
    
    return c.json({ success: true, message: '风控规则删除成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// IP关联分析 (V2.1)
app.get('/api/risk/ip-correlations', async (c) => {
  const db = c.env.DB
  const { min_players = '2' } = c.req.query()
  
  try {
    // 模拟IP关联分析 - 从注单和会话中聚合
    const correlations = await db.prepare(`
      SELECT bet_ip as ip_address, COUNT(DISTINCT player_id) as player_count,
             GROUP_CONCAT(DISTINCT player_id) as player_ids,
             MIN(created_at) as first_seen_at, MAX(created_at) as last_seen_at
      FROM bets
      GROUP BY bet_ip
      HAVING COUNT(DISTINCT player_id) >= ?
      ORDER BY player_count DESC
      LIMIT 100
    `).bind(parseInt(min_players)).all()
    
    return c.json({ success: true, data: correlations.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 8. 报表中心 Reports API
// ========================================
// 日结算报表
app.get('/api/reports/daily', async (c) => {
  const db = c.env.DB
  const { start_date, end_date } = c.req.query()
  
  try {
    const startD = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endD = end_date || new Date().toISOString().slice(0, 10)
    
    const report = await db.prepare(`
      SELECT 
        date(created_at) as date,
        SUM(bet_amount) as total_bet,
        SUM(valid_bet_amount) as total_valid_bet,
        SUM(payout) as total_payout,
        SUM(bet_amount) - SUM(payout) as company_profit,
        COUNT(*) as bet_count,
        COUNT(DISTINCT player_id) as player_count
      FROM bets 
      WHERE date(created_at) >= ? AND date(created_at) <= ?
      GROUP BY date(created_at)
      ORDER BY date DESC
    `).bind(startD, endD).all()
    
    return c.json({ success: true, data: report.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 游戏报表
app.get('/api/reports/game', async (c) => {
  const db = c.env.DB
  const { start_date, end_date } = c.req.query()
  
  try {
    const startD = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endD = end_date || new Date().toISOString().slice(0, 10)
    
    const report = await db.prepare(`
      SELECT 
        game_type,
        SUM(bet_amount) as total_bet,
        SUM(valid_bet_amount) as total_valid_bet,
        SUM(payout) as total_payout,
        SUM(bet_amount) - SUM(payout) as profit,
        COUNT(*) as bet_count,
        COUNT(DISTINCT player_id) as player_count,
        ROUND(100.0 * SUM(bet_amount) / (SELECT SUM(bet_amount) FROM bets WHERE date(created_at) >= ? AND date(created_at) <= ?), 2) as percentage
      FROM bets 
      WHERE date(created_at) >= ? AND date(created_at) <= ?
      GROUP BY game_type
      ORDER BY total_bet DESC
    `).bind(startD, endD, startD, endD).all()
    
    return c.json({ success: true, data: report.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 盈亏排行榜
app.get('/api/reports/leaderboard', async (c) => {
  const db = c.env.DB
  const { type = 'profit', days = '7', limit = '50' } = c.req.query()
  
  try {
    const orderBy = type === 'loss' ? 'ASC' : 'DESC'
    const report = await db.prepare(`
      SELECT 
        p.id, p.username, p.nickname, p.vip_level,
        SUM(b.win_loss_amount) as total_profit,
        SUM(b.bet_amount) as total_bet,
        COUNT(*) as bet_count,
        ROUND(AVG(b.bet_amount), 2) as avg_bet
      FROM players p
      JOIN bets b ON p.id = b.player_id
      WHERE b.bet_status = 1 AND date(b.created_at) >= date('now', '-' || ? || ' days')
      GROUP BY p.id
      ORDER BY total_profit ${orderBy}
      LIMIT ?
    `).bind(parseInt(days), parseInt(limit)).all()
    
    return c.json({ success: true, data: report.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 代理业绩报表 (V2.1)
app.get('/api/reports/agent', async (c) => {
  const db = c.env.DB
  const { start_date, end_date, agent_id } = c.req.query()
  
  try {
    const startD = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endD = end_date || new Date().toISOString().slice(0, 10)
    
    let sql = `
      SELECT 
        a.id, a.agent_username, a.nickname, a.level,
        COUNT(DISTINCT p.id) as player_count,
        COALESCE(SUM(b.bet_amount), 0) as total_bet,
        COALESCE(SUM(b.valid_bet_amount), 0) as total_valid_bet,
        COALESCE(SUM(b.bet_amount) - SUM(b.payout), 0) as profit
      FROM agents a
      LEFT JOIN players p ON p.agent_id = a.id
      LEFT JOIN bets b ON b.player_id = p.id AND date(b.created_at) >= ? AND date(b.created_at) <= ?
      WHERE 1=1
    `
    const params: any[] = [startD, endD]
    
    if (agent_id) {
      sql += ` AND a.id = ?`
      params.push(agent_id)
    }
    
    sql += ` GROUP BY a.id ORDER BY total_bet DESC`
    
    const report = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: report.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 完善报表：股东/代理/公司盈亏分析
// ========================================
app.get('/api/reports/profit-analysis', async (c) => {
  const db = c.env.DB
  const { start_date, end_date, agent_id, shareholder_id } = c.req.query()
  
  try {
    const startD = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endD = end_date || new Date().toISOString().slice(0, 10)
    
    // 获取整体统计
    const overallStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_bets,
        COUNT(DISTINCT player_id) as total_players,
        COALESCE(SUM(bet_amount), 0) as total_bet_amount,
        COALESCE(SUM(valid_bet_amount), 0) as total_valid_bet,
        COALESCE(SUM(payout), 0) as total_payout,
        COALESCE(SUM(bet_amount) - SUM(payout), 0) as gross_profit
      FROM bets 
      WHERE date(created_at) >= ? AND date(created_at) <= ? AND bet_status = 1
    `).bind(startD, endD).first() as any
    
    // 获取洗码佣金总额
    const commissionStats = await db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total_commission
      FROM commission_records
      WHERE date(settle_date) >= ? AND date(settle_date) <= ? AND status = 3
    `).bind(startD, endD).first() as any
    
    // 获取代理业绩（按代理分组）
    const agentReport = await db.prepare(`
      SELECT 
        a.id as agent_id,
        a.agent_username,
        a.nickname as agent_name,
        a.level,
        a.share_ratio,
        a.commission_ratio,
        a.parent_agent_id,
        COUNT(DISTINCT p.id) as player_count,
        COALESCE(SUM(b.bet_amount), 0) as total_bet,
        COALESCE(SUM(b.valid_bet_amount), 0) as total_valid_bet,
        COALESCE(SUM(b.payout), 0) as total_payout,
        COALESCE(SUM(b.bet_amount) - SUM(b.payout), 0) as gross_profit,
        COALESCE(SUM(cr.total_amount), 0) as total_commission
      FROM agents a
      LEFT JOIN players p ON p.agent_id = a.id
      LEFT JOIN bets b ON b.player_id = p.id AND date(b.created_at) >= ? AND date(b.created_at) <= ? AND b.bet_status = 1
      LEFT JOIN commission_records cr ON cr.agent_id = a.id AND date(cr.settle_date) >= ? AND date(cr.settle_date) <= ? AND cr.status = 3
      GROUP BY a.id
      ORDER BY gross_profit DESC
    `).bind(startD, endD, startD, endD).all()
    
    // 计算各级分成
    const processedAgents = (agentReport.results || []).map((a: any) => {
      const shareRatio = a.share_ratio || 0
      const commissionRatio = a.commission_ratio || 0
      const grossProfit = a.gross_profit || 0
      const totalCommission = a.total_commission || 0
      
      // 代理应得 = 毛利 * 占成比例 + 佣金
      const agentShare = grossProfit * shareRatio + totalCommission * commissionRatio
      // 公司留存 = 毛利 - 代理应得
      const companyShare = grossProfit - agentShare
      
      return {
        ...a,
        agent_share: agentShare,
        company_share: companyShare
      }
    })
    
    // 汇总
    const summary = {
      total_bets: overallStats?.total_bets || 0,
      total_players: overallStats?.total_players || 0,
      total_bet_amount: overallStats?.total_bet_amount || 0,
      total_valid_bet: overallStats?.total_valid_bet || 0,
      total_payout: overallStats?.total_payout || 0,
      gross_profit: overallStats?.gross_profit || 0,
      total_commission: commissionStats?.total_commission || 0,
      // 公司净利润 = 毛利 - 佣金支出 - 代理占成
      total_agent_share: processedAgents.reduce((sum: number, a: any) => sum + (a.agent_share || 0), 0),
      company_net_profit: 0
    }
    summary.company_net_profit = summary.gross_profit - summary.total_agent_share
    
    return c.json({ 
      success: true, 
      data: {
        summary,
        agents: processedAgents,
        period: { start_date: startD, end_date: endD }
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 注单明细查询（完整筛选）
app.get('/api/reports/bet-details', async (c) => {
  const db = c.env.DB
  const { 
    bet_no, username, agent_id, game_type, table_code, bet_status,
    start_date, end_date, start_time, end_time,
    min_amount, max_amount, is_high_odds, is_large_bet,
    ip_location, page = '1', limit = '50'
  } = c.req.query()
  
  try {
    let sql = `
      SELECT 
        b.*,
        p.username, p.nickname, p.vip_level, p.risk_level,
        a.agent_username, a.nickname as agent_name,
        gr.result_summary
      FROM bets b
      LEFT JOIN players p ON b.player_id = p.id
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN game_results gr ON b.game_round_id = gr.game_round_id
      WHERE 1=1
    `
    const params: any[] = []
    
    // 注单号精确匹配
    if (bet_no) {
      sql += ` AND b.bet_no = ?`
      params.push(bet_no)
    }
    // 会员账号模糊匹配
    if (username) {
      sql += ` AND (p.username LIKE ? OR p.nickname LIKE ?)`
      params.push(`%${username}%`, `%${username}%`)
    }
    // 代理筛选
    if (agent_id) {
      sql += ` AND p.agent_id = ?`
      params.push(agent_id)
    }
    // 游戏类型
    if (game_type) {
      sql += ` AND b.game_type = ?`
      params.push(game_type)
    }
    // 桌台号
    if (table_code) {
      sql += ` AND b.table_code = ?`
      params.push(table_code)
    }
    // 状态
    if (bet_status !== undefined && bet_status !== '') {
      sql += ` AND b.bet_status = ?`
      params.push(parseInt(bet_status))
    }
    // 日期范围
    if (start_date) {
      sql += ` AND date(b.created_at) >= ?`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(b.created_at) <= ?`
      params.push(end_date)
    }
    // 时间范围
    if (start_time) {
      sql += ` AND time(b.created_at) >= ?`
      params.push(start_time)
    }
    if (end_time) {
      sql += ` AND time(b.created_at) <= ?`
      params.push(end_time)
    }
    // 金额范围
    if (min_amount) {
      sql += ` AND b.bet_amount >= ?`
      params.push(parseFloat(min_amount))
    }
    if (max_amount) {
      sql += ` AND b.bet_amount <= ?`
      params.push(parseFloat(max_amount))
    }
    // 高赔率
    if (is_high_odds === '1') {
      sql += ` AND b.is_high_odds = 1`
    }
    // 大额注单
    if (is_large_bet === '1') {
      sql += ` AND b.is_large_bet = 1`
    }
    // IP区域
    if (ip_location) {
      sql += ` AND b.ip_location LIKE ?`
      params.push(`%${ip_location}%`)
    }
    
    // 统计当前筛选条件下的汇总
    let countSql = sql.replace('SELECT \n        b.*,\n        p.username, p.nickname, p.vip_level, p.risk_level,\n        a.agent_username, a.nickname as agent_name,\n        gr.result_summary', 
      `SELECT COUNT(*) as total_count, 
       COALESCE(SUM(b.bet_amount), 0) as total_bet,
       COALESCE(SUM(b.valid_bet_amount), 0) as total_valid_bet,
       COALESCE(SUM(b.payout), 0) as total_payout,
       COALESCE(SUM(b.win_loss_amount), 0) as total_win_loss`)
    
    const statsResult = await db.prepare(countSql).bind(...params).first() as any
    
    sql += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const bets = await db.prepare(sql).bind(...params).all()
    
    return c.json({
      success: true,
      data: bets.results,
      stats: {
        total_count: statsResult?.total_count || 0,
        total_bet: statsResult?.total_bet || 0,
        total_valid_bet: statsResult?.total_valid_bet || 0,
        total_payout: statsResult?.total_payout || 0,
        total_win_loss: statsResult?.total_win_loss || 0,
        company_profit: (statsResult?.total_bet || 0) - (statsResult?.total_payout || 0)
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: statsResult?.total_count || 0
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 对账结算报表
app.get('/api/reports/settlement', async (c) => {
  const db = c.env.DB
  const { start_date, end_date, agent_id, status } = c.req.query()
  
  try {
    const startD = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endD = end_date || new Date().toISOString().slice(0, 10)
    
    // 按日期和代理汇总
    let sql = `
      SELECT 
        date(b.created_at) as settle_date,
        a.id as agent_id,
        a.agent_username,
        a.nickname as agent_name,
        a.share_ratio,
        COUNT(DISTINCT p.id) as player_count,
        COUNT(b.id) as bet_count,
        COALESCE(SUM(b.bet_amount), 0) as total_bet,
        COALESCE(SUM(b.valid_bet_amount), 0) as total_valid_bet,
        COALESCE(SUM(b.payout), 0) as total_payout,
        COALESCE(SUM(b.bet_amount) - SUM(b.payout), 0) as gross_profit
      FROM bets b
      LEFT JOIN players p ON b.player_id = p.id
      LEFT JOIN agents a ON p.agent_id = a.id
      WHERE date(b.created_at) >= ? AND date(b.created_at) <= ? AND b.bet_status = 1
    `
    const params: any[] = [startD, endD]
    
    if (agent_id) {
      sql += ` AND a.id = ?`
      params.push(agent_id)
    }
    
    sql += ` GROUP BY date(b.created_at), a.id ORDER BY settle_date DESC, gross_profit DESC`
    
    const settlements = await db.prepare(sql).bind(...params).all()
    
    // 计算分成
    const processedSettlements = (settlements.results || []).map((s: any) => {
      const shareRatio = s.share_ratio || 0
      const grossProfit = s.gross_profit || 0
      const agentShare = grossProfit * shareRatio
      const companyShare = grossProfit - agentShare
      
      return {
        ...s,
        agent_share: agentShare,
        company_share: companyShare
      }
    })
    
    // 汇总统计
    const summary = processedSettlements.reduce((acc: any, s: any) => {
      acc.total_bet += s.total_bet || 0
      acc.total_valid_bet += s.total_valid_bet || 0
      acc.total_payout += s.total_payout || 0
      acc.gross_profit += s.gross_profit || 0
      acc.agent_share += s.agent_share || 0
      acc.company_share += s.company_share || 0
      acc.bet_count += s.bet_count || 0
      return acc
    }, { total_bet: 0, total_valid_bet: 0, total_payout: 0, gross_profit: 0, agent_share: 0, company_share: 0, bet_count: 0 })
    
    return c.json({
      success: true,
      data: processedSettlements,
      summary,
      period: { start_date: startD, end_date: endD }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 账户明细报表API
app.get('/api/reports/account-details', async (c) => {
  const db = c.env.DB
  const { start_date, end_date, user_id, order_no, type, page = '1', limit = '50' } = c.req.query()
  
  try {
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum
    
    // 查询交易记录（包括投注、存取款、转账、红利等）
    let sql = `
      SELECT 
        'bet' as type,
        b.bet_no as order_no,
        b.game_type as game_name,
        b.table_code as round_id,
        CASE b.bet_type 
          WHEN 'banker' THEN '庄'
          WHEN 'player' THEN '闲'
          WHEN 'tie' THEN '和'
          WHEN 'banker_pair' THEN '庄对'
          WHEN 'player_pair' THEN '闲对'
          ELSE COALESCE(b.bet_type, '默认') 
        END as bet_type,
        COALESCE(b.bet_detail, '-') as bet_spot,
        CASE 
          WHEN b.bet_status = 0 THEN -b.bet_amount
          WHEN b.bet_status = 1 THEN b.payout - b.bet_amount
          ELSE 0
        END as change_amount,
        p.balance as balance_after,
        p.balance - CASE 
          WHEN b.bet_status = 0 THEN -b.bet_amount
          WHEN b.bet_status = 1 THEN b.payout - b.bet_amount
          ELSE 0
        END as balance_before,
        b.created_at,
        p.username,
        p.id as player_id
      FROM bets b
      LEFT JOIN players p ON b.player_id = p.id
      WHERE 1=1
    `
    let countSql = `SELECT COUNT(*) as total FROM bets b LEFT JOIN players p ON b.player_id = p.id WHERE 1=1`
    const params: any[] = []
    const countParams: any[] = []
    
    if (start_date) {
      sql += ` AND b.created_at >= ?`
      countSql += ` AND b.created_at >= ?`
      params.push(start_date.replace('T', ' '))
      countParams.push(start_date.replace('T', ' '))
    }
    if (end_date) {
      sql += ` AND b.created_at <= ?`
      countSql += ` AND b.created_at <= ?`
      params.push(end_date.replace('T', ' '))
      countParams.push(end_date.replace('T', ' '))
    }
    if (user_id) {
      sql += ` AND p.username LIKE ?`
      countSql += ` AND p.username LIKE ?`
      params.push(`%${user_id}%`)
      countParams.push(`%${user_id}%`)
    }
    if (order_no) {
      sql += ` AND b.bet_no LIKE ?`
      countSql += ` AND b.bet_no LIKE ?`
      params.push(`%${order_no}%`)
      countParams.push(`%${order_no}%`)
    }
    
    sql += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
    params.push(limitNum, offset)
    
    const [data, countResult] = await Promise.all([
      db.prepare(sql).bind(...params).all(),
      db.prepare(countSql).bind(...countParams).first()
    ])
    
    return c.json({
      success: true,
      data: data.results || [],
      total: (countResult as any)?.total || 0,
      page: pageNum,
      limit: limitNum
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 报表导出API
app.get('/api/reports/export', async (c) => {
  const db = c.env.DB
  const { type, format = 'csv', start_date, end_date, ...filters } = c.req.query()
  
  try {
    const startD = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endD = end_date || new Date().toISOString().slice(0, 10)
    
    let data: any[] = []
    let headers: string[] = []
    let filename = ''
    
    switch (type) {
      case 'bets':
        headers = ['注单号', '时间', '会员账号', '会员昵称', 'VIP等级', '代理', '游戏类型', '桌台', '投注类型', '投注金额', '有效投注', '派彩', '输赢', 'IP地址', 'IP区域', '状态']
        const betsResult = await db.prepare(`
          SELECT b.*, p.username, p.nickname, p.vip_level, a.agent_username
          FROM bets b
          LEFT JOIN players p ON b.player_id = p.id
          LEFT JOIN agents a ON p.agent_id = a.id
          WHERE date(b.created_at) >= ? AND date(b.created_at) <= ?
          ORDER BY b.created_at DESC
          LIMIT 10000
        `).bind(startD, endD).all()
        data = (betsResult.results || []).map((b: any) => [
          b.bet_no, b.created_at, b.username, b.nickname, `VIP${b.vip_level}`, b.agent_username || '-',
          b.game_type, b.table_code, b.bet_type, b.bet_amount, b.valid_bet_amount, b.payout, b.win_loss_amount,
          b.bet_ip, b.ip_location, b.bet_status === 1 ? '已结算' : b.bet_status === 0 ? '未结算' : '已作废'
        ])
        filename = `注单明细_${startD}_${endD}`
        break
        
      case 'daily':
        headers = ['日期', '投注笔数', '总投注', '有效投注', '总派彩', '公司盈亏', '杀数率', '投注人数']
        const dailyResult = await db.prepare(`
          SELECT 
            date(created_at) as date,
            COUNT(*) as bet_count,
            SUM(bet_amount) as total_bet,
            SUM(valid_bet_amount) as total_valid_bet,
            SUM(payout) as total_payout,
            SUM(bet_amount) - SUM(payout) as company_profit,
            COUNT(DISTINCT player_id) as player_count
          FROM bets 
          WHERE date(created_at) >= ? AND date(created_at) <= ?
          GROUP BY date(created_at)
          ORDER BY date DESC
        `).bind(startD, endD).all()
        data = (dailyResult.results || []).map((d: any) => {
          const killRate = d.total_bet > 0 ? ((d.company_profit / d.total_bet) * 100).toFixed(2) : '0'
          return [d.date, d.bet_count, d.total_bet, d.total_valid_bet, d.total_payout, d.company_profit, `${killRate}%`, d.player_count]
        })
        filename = `日结算报表_${startD}_${endD}`
        break
        
      case 'settlement':
        headers = ['日期', '代理账号', '代理名称', '会员数', '注单数', '总投注', '有效投注', '总派彩', '毛利', '占成比例', '代理应得', '公司留存']
        const settlementResult = await db.prepare(`
          SELECT 
            date(b.created_at) as settle_date,
            a.agent_username, a.nickname as agent_name, a.share_ratio,
            COUNT(DISTINCT p.id) as player_count, COUNT(b.id) as bet_count,
            COALESCE(SUM(b.bet_amount), 0) as total_bet,
            COALESCE(SUM(b.valid_bet_amount), 0) as total_valid_bet,
            COALESCE(SUM(b.payout), 0) as total_payout,
            COALESCE(SUM(b.bet_amount) - SUM(b.payout), 0) as gross_profit
          FROM bets b
          LEFT JOIN players p ON b.player_id = p.id
          LEFT JOIN agents a ON p.agent_id = a.id
          WHERE date(b.created_at) >= ? AND date(b.created_at) <= ? AND b.bet_status = 1
          GROUP BY date(b.created_at), a.id
          ORDER BY settle_date DESC
        `).bind(startD, endD).all()
        data = (settlementResult.results || []).map((s: any) => {
          const shareRatio = s.share_ratio || 0
          const agentShare = s.gross_profit * shareRatio
          const companyShare = s.gross_profit - agentShare
          return [s.settle_date, s.agent_username || '-', s.agent_name || '-', s.player_count, s.bet_count,
                  s.total_bet, s.total_valid_bet, s.total_payout, s.gross_profit, 
                  `${(shareRatio * 100).toFixed(1)}%`, agentShare.toFixed(2), companyShare.toFixed(2)]
        })
        filename = `对账结算报表_${startD}_${endD}`
        break
        
      case 'transfers':
        headers = ['订单号', '时间', '转出会员', '转入会员', '转账金额', '手续费', '费率', '实际到账', '备注', 'IP地址']
        const transfersResult = await db.prepare(`
          SELECT pt.*, fp.username as from_username, tp.username as to_username
          FROM player_transfers pt
          LEFT JOIN players fp ON pt.from_player_id = fp.id
          LEFT JOIN players tp ON pt.to_player_id = tp.id
          WHERE date(pt.created_at) >= ? AND date(pt.created_at) <= ?
          ORDER BY pt.created_at DESC
          LIMIT 10000
        `).bind(startD, endD).all()
        data = (transfersResult.results || []).map((t: any) => [
          t.order_no, t.created_at, t.from_username, t.to_username, t.amount, t.fee, 
          t.fee_rate ? `${(t.fee_rate * 100).toFixed(2)}%` : '-', t.actual_amount, t.remark || '-', t.from_ip || '-'
        ])
        filename = `转账记录_${startD}_${endD}`
        break
        
      default:
        return c.json({ success: false, error: '不支持的报表类型' }, 400)
    }
    
    // 生成CSV内容
    const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility
    let csvContent = BOM + headers.join(',') + '\n'
    data.forEach(row => {
      csvContent += row.map((cell: any) => {
        const str = String(cell ?? '')
        // 如果包含逗号、引号或换行，需要用引号包裹
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',') + '\n'
    })
    
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}.csv"`
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 会员转账记录 (V2.1新增)
app.get('/api/reports/transfers', async (c) => {
  const db = c.env.DB
  const { start_date, end_date, from_player, to_player, min_amount, max_amount, page = '1', limit = '50' } = c.req.query()
  
  try {
    // 创建会员转账记录表（如果不存在）- 包含更多字段
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS player_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE NOT NULL,
        from_player_id INTEGER NOT NULL,
        to_player_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        fee REAL DEFAULT 0,
        fee_rate REAL DEFAULT 0,
        actual_amount REAL,
        from_balance_before REAL,
        from_balance_after REAL,
        to_balance_before REAL,
        to_balance_after REAL,
        from_ip TEXT,
        to_ip TEXT,
        remark TEXT,
        status INTEGER DEFAULT 1,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_player_id) REFERENCES players(id),
        FOREIGN KEY (to_player_id) REFERENCES players(id)
      )
    `).run()
    
    // 兼容旧表：添加缺失的列
    try {
      await db.prepare(`ALTER TABLE player_transfers ADD COLUMN fee_rate REAL DEFAULT 0`).run()
    } catch (e) { /* 列已存在 */ }
    try {
      await db.prepare(`ALTER TABLE player_transfers ADD COLUMN actual_amount REAL`).run()
    } catch (e) { /* 列已存在 */ }
    try {
      await db.prepare(`ALTER TABLE player_transfers ADD COLUMN from_ip TEXT`).run()
    } catch (e) { /* 列已存在 */ }
    try {
      await db.prepare(`ALTER TABLE player_transfers ADD COLUMN to_ip TEXT`).run()
    } catch (e) { /* 列已存在 */ }
    
    // 创建手续费设置表
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS transfer_fee_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_name TEXT NOT NULL,
        fee_type TEXT NOT NULL DEFAULT 'percentage',
        fee_value REAL NOT NULL DEFAULT 0,
        min_fee REAL DEFAULT 0,
        max_fee REAL,
        min_amount REAL DEFAULT 0,
        max_amount REAL,
        vip_levels TEXT,
        is_enabled INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        description TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // 创建索引
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_transfers_from ON player_transfers(from_player_id)`).run()
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_transfers_to ON player_transfers(to_player_id)`).run()
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_transfers_date ON player_transfers(created_at)`).run()
    
    const startD = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const endD = end_date || new Date().toISOString().slice(0, 10)
    
    let sql = `
      SELECT 
        pt.*,
        fp.username as from_username,
        fp.nickname as from_nickname,
        fp.vip_level as from_vip_level,
        fp.last_login_ip as from_last_ip,
        tp.username as to_username,
        tp.nickname as to_nickname,
        tp.vip_level as to_vip_level,
        tp.last_login_ip as to_last_ip
      FROM player_transfers pt
      LEFT JOIN players fp ON pt.from_player_id = fp.id
      LEFT JOIN players tp ON pt.to_player_id = tp.id
      WHERE date(pt.created_at) >= ? AND date(pt.created_at) <= ?
    `
    const params: any[] = [startD, endD]
    
    if (from_player) {
      sql += ` AND (fp.username LIKE ? OR fp.nickname LIKE ?)`
      params.push(`%${from_player}%`, `%${from_player}%`)
    }
    if (to_player) {
      sql += ` AND (tp.username LIKE ? OR tp.nickname LIKE ?)`
      params.push(`%${to_player}%`, `%${to_player}%`)
    }
    if (min_amount) {
      sql += ` AND pt.amount >= ?`
      params.push(parseFloat(min_amount))
    }
    if (max_amount) {
      sql += ` AND pt.amount <= ?`
      params.push(parseFloat(max_amount))
    }
    
    // 获取统计数据
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(fee), 0) as total_fee,
        COUNT(DISTINCT from_player_id) as unique_senders,
        COUNT(DISTINCT to_player_id) as unique_receivers
      FROM player_transfers
      WHERE date(created_at) >= ? AND date(created_at) <= ?
    `).bind(startD, endD).first() as any
    
    sql += ` ORDER BY pt.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const transfers = await db.prepare(sql).bind(...params).all()
    
    return c.json({ 
      success: true, 
      data: transfers.results,
      stats: {
        total_count: statsResult?.total_count || 0,
        total_amount: statsResult?.total_amount || 0,
        total_fee: statsResult?.total_fee || 0,
        unique_senders: statsResult?.unique_senders || 0,
        unique_receivers: statsResult?.unique_receivers || 0
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 获取转账详情（包含资金来源）
app.get('/api/reports/transfers/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    // 获取转账记录
    const transfer = await db.prepare(`
      SELECT 
        pt.*,
        fp.username as from_username,
        fp.nickname as from_nickname,
        fp.vip_level as from_vip_level,
        fp.last_login_ip as from_last_ip,
        fp.balance as from_current_balance,
        tp.username as to_username,
        tp.nickname as to_nickname,
        tp.vip_level as to_vip_level,
        tp.last_login_ip as to_last_ip,
        tp.balance as to_current_balance
      FROM player_transfers pt
      LEFT JOIN players fp ON pt.from_player_id = fp.id
      LEFT JOIN players tp ON pt.to_player_id = tp.id
      WHERE pt.id = ?
    `).bind(id).first()
    
    if (!transfer) {
      return c.json({ success: false, error: '转账记录不存在' }, 404)
    }
    
    // 获取转出方最近交易记录（资金来源）
    const fromTransactions = await db.prepare(`
      SELECT * FROM transactions 
      WHERE player_id = ? AND created_at <= ?
      ORDER BY created_at DESC LIMIT 10
    `).bind((transfer as any).from_player_id, (transfer as any).created_at).all()
    
    return c.json({ 
      success: true, 
      data: {
        ...transfer,
        from_transactions: fromTransactions.results
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 手续费设置管理
app.get('/api/transfer-fee-settings', async (c) => {
  const db = c.env.DB
  
  try {
    const settings = await db.prepare(`
      SELECT tfs.*, a.username as created_by_name 
      FROM transfer_fee_settings tfs
      LEFT JOIN admins a ON tfs.created_by = a.id
      ORDER BY tfs.priority DESC, tfs.created_at DESC
    `).all()
    
    return c.json({ success: true, data: settings.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post('/api/transfer-fee-settings', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { setting_name, fee_type, fee_value, min_fee, max_fee, min_amount, max_amount, vip_levels, priority, description, created_by } = body
  
  try {
    const result = await db.prepare(`
      INSERT INTO transfer_fee_settings (setting_name, fee_type, fee_value, min_fee, max_fee, min_amount, max_amount, vip_levels, priority, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      setting_name, fee_type || 'percentage', fee_value || 0,
      min_fee || 0, max_fee ?? null, min_amount || 0, max_amount ?? null,
      vip_levels ? JSON.stringify(vip_levels) : null, priority || 0, description || null, created_by ?? null
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '手续费设置创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.put('/api/transfer-fee-settings/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  const { setting_name, fee_type, fee_value, min_fee, max_fee, min_amount, max_amount, vip_levels, priority, description, is_enabled } = body
  
  try {
    await db.prepare(`
      UPDATE transfer_fee_settings SET 
        setting_name = COALESCE(?, setting_name),
        fee_type = COALESCE(?, fee_type),
        fee_value = COALESCE(?, fee_value),
        min_fee = COALESCE(?, min_fee),
        max_fee = COALESCE(?, max_fee),
        min_amount = COALESCE(?, min_amount),
        max_amount = COALESCE(?, max_amount),
        vip_levels = COALESCE(?, vip_levels),
        priority = COALESCE(?, priority),
        description = COALESCE(?, description),
        is_enabled = COALESCE(?, is_enabled),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      setting_name ?? null, fee_type ?? null, fee_value ?? null, min_fee ?? null, max_fee ?? null, 
      min_amount ?? null, max_amount ?? null, vip_levels ? JSON.stringify(vip_levels) : null, 
      priority ?? null, description ?? null, is_enabled ?? null, id
    ).run()
    
    return c.json({ success: true, message: '手续费设置更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.delete('/api/transfer-fee-settings/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    await db.prepare('DELETE FROM transfer_fee_settings WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: '手续费设置删除成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 会员转账操作（前端会员互转）
app.post('/api/players/transfer', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { from_player_id, to_player_id, amount, remark } = body
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
  
  try {
    if (from_player_id === to_player_id) {
      return c.json({ success: false, error: '不能转账给自己' }, 400)
    }
    
    if (!amount || amount <= 0) {
      return c.json({ success: false, error: '转账金额必须大于0' }, 400)
    }
    
    // 获取转出方信息
    const fromPlayer = await db.prepare('SELECT * FROM players WHERE id = ?').bind(from_player_id).first() as any
    if (!fromPlayer) {
      return c.json({ success: false, error: '转出会员不存在' }, 404)
    }
    
    if (fromPlayer.balance < amount) {
      return c.json({ success: false, error: '余额不足' }, 400)
    }
    
    // 获取转入方信息
    const toPlayer = await db.prepare('SELECT * FROM players WHERE id = ?').bind(to_player_id).first() as any
    if (!toPlayer) {
      return c.json({ success: false, error: '转入会员不存在' }, 404)
    }
    
    // 获取适用的手续费设置
    let fee = 0
    let feeRate = 0
    const feeSetting = await db.prepare(`
      SELECT * FROM transfer_fee_settings 
      WHERE is_enabled = 1 
        AND (min_amount IS NULL OR min_amount <= ?)
        AND (max_amount IS NULL OR max_amount >= ?)
      ORDER BY priority DESC LIMIT 1
    `).bind(amount, amount).first() as any
    
    if (feeSetting) {
      if (feeSetting.fee_type === 'percentage') {
        feeRate = feeSetting.fee_value / 100
        fee = amount * feeRate
        // 应用最低和最高手续费限制
        if (feeSetting.min_fee && fee < feeSetting.min_fee) fee = feeSetting.min_fee
        if (feeSetting.max_fee && fee > feeSetting.max_fee) fee = feeSetting.max_fee
      } else {
        fee = feeSetting.fee_value // 固定金额
      }
    }
    
    const actualAmount = amount - fee
    const orderNo = 'TRF' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase()
    
    // 执行转账
    const fromBalanceBefore = fromPlayer.balance
    const fromBalanceAfter = fromPlayer.balance - amount
    const toBalanceBefore = toPlayer.balance
    const toBalanceAfter = toPlayer.balance + actualAmount
    
    // 更新转出方余额
    await db.prepare(`
      UPDATE players SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(amount, from_player_id).run()
    
    // 更新转入方余额
    await db.prepare(`
      UPDATE players SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(actualAmount, to_player_id).run()
    
    // 记录转账（包含双方IP）
    const result = await db.prepare(`
      INSERT INTO player_transfers (order_no, from_player_id, to_player_id, amount, fee, fee_rate, actual_amount, from_balance_before, from_balance_after, to_balance_before, to_balance_after, from_ip, to_ip, remark, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(orderNo, from_player_id, to_player_id, amount, fee, feeRate, actualAmount, fromBalanceBefore, fromBalanceAfter, toBalanceBefore, toBalanceAfter, fromPlayer.last_login_ip || ip, toPlayer.last_login_ip || null, remark || null, ip).run()
    
    // 记录双方交易流水
    await db.prepare(`
      INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, remark)
      VALUES (?, ?, 7, ?, ?, ?, ?)
    `).bind(orderNo + '-OUT', from_player_id, fromBalanceBefore, -amount, fromBalanceAfter, `转账给 ${toPlayer.username}${fee > 0 ? ` (手续费: ${fee})` : ''}`).run()
    
    await db.prepare(`
      INSERT INTO transactions (order_no, player_id, transaction_type, balance_before, amount, balance_after, remark)
      VALUES (?, ?, 8, ?, ?, ?, ?)
    `).bind(orderNo + '-IN', to_player_id, toBalanceBefore, actualAmount, toBalanceAfter, `收到 ${fromPlayer.username} 的转账`).run()
    
    return c.json({ 
      success: true, 
      data: { 
        id: result.meta.last_row_id,
        order_no: orderNo,
        amount,
        fee,
        fee_rate: feeRate,
        actual_amount: actualAmount
      },
      message: '转账成功' 
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 全流水记录 - 所有交易类型统一查询
app.get('/api/reports/all-transactions', async (c) => {
  const db = c.env.DB
  const { start_date, end_date, player_id, type, order_no, player_search, page = '1', limit = '50' } = c.req.query()
  
  try {
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum
    
    let sql = `
      SELECT 
        t.id,
        t.order_no,
        t.player_id,
        t.transaction_type,
        CASE t.transaction_type
          WHEN 1 THEN '存款'
          WHEN 2 THEN '取款'
          WHEN 3 THEN '投注扣款'
          WHEN 4 THEN '派彩增加'
          WHEN 5 THEN '红利赠送'
          WHEN 6 THEN '洗码返水'
          WHEN 7 THEN '人工增加'
          WHEN 8 THEN '人工扣除'
          WHEN 9 THEN '转账转出'
          WHEN 10 THEN '转账转入'
          ELSE '其他'
        END as type_name,
        t.balance_before,
        t.amount,
        t.balance_after,
        t.related_order_id,
        t.game_type,
        t.remark,
        t.created_at,
        p.username as player_name,
        p.nickname as player_nickname,
        a.username as operator_name
      FROM transactions t
      LEFT JOIN players p ON t.player_id = p.id
      LEFT JOIN admins a ON t.operator_id = a.id
      WHERE 1=1
    `
    let countSql = `SELECT COUNT(*) as total FROM transactions t LEFT JOIN players p ON t.player_id = p.id WHERE 1=1`
    const params: any[] = []
    const countParams: any[] = []
    
    if (start_date) {
      sql += ` AND date(t.created_at) >= date(?)`
      countSql += ` AND date(t.created_at) >= date(?)`
      params.push(start_date)
      countParams.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(t.created_at) <= date(?)`
      countSql += ` AND date(t.created_at) <= date(?)`
      params.push(end_date)
      countParams.push(end_date)
    }
    if (player_id) {
      sql += ` AND t.player_id = ?`
      countSql += ` AND t.player_id = ?`
      params.push(parseInt(player_id))
      countParams.push(parseInt(player_id))
    }
    if (type) {
      sql += ` AND t.transaction_type = ?`
      countSql += ` AND t.transaction_type = ?`
      params.push(parseInt(type))
      countParams.push(parseInt(type))
    }
    if (order_no) {
      sql += ` AND t.order_no LIKE ?`
      countSql += ` AND t.order_no LIKE ?`
      params.push(`%${order_no}%`)
      countParams.push(`%${order_no}%`)
    }
    if (player_search) {
      sql += ` AND (p.username LIKE ? OR p.id = ? OR p.nickname LIKE ?)`
      countSql += ` AND (p.username LIKE ? OR p.id = ? OR p.nickname LIKE ?)`
      const searchPattern = `%${player_search}%`
      const playerId = parseInt(player_search) || 0
      params.push(searchPattern, playerId, searchPattern)
      countParams.push(searchPattern, playerId, searchPattern)
    }
    
    sql += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
    params.push(limitNum, offset)
    
    const [transactions, countResult] = await Promise.all([
      db.prepare(sql).bind(...params).all(),
      db.prepare(countSql).bind(...countParams).first()
    ])
    
    return c.json({
      success: true,
      data: transactions.results,
      total: (countResult as any).total,
      page: pageNum,
      limit: limitNum
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 综合报表 - 按日期/代理/游戏维度
app.get('/api/reports/comprehensive', async (c) => {
  const db = c.env.DB
  const { start_date, end_date, agent_id, game_type, group_by = 'date' } = c.req.query()
  
  try {
    let sql = ''
    const params: any[] = []
    
    if (group_by === 'date') {
      // 按日期分组
      sql = `
        SELECT 
          date(b.created_at) as dimension,
          SUM(b.bet_amount) as total_bet,
          SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) as total_win_loss,
          -SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) as company_profit,
          SUM(b.valid_bet_amount * COALESCE(a.commission_ratio, 0)) as agent_commission,
          -SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) - SUM(b.valid_bet_amount * COALESCE(a.commission_ratio, 0)) as net_profit,
          COUNT(DISTINCT b.player_id) as player_count,
          COUNT(*) as bet_count
        FROM bets b
        LEFT JOIN players p ON b.player_id = p.id
        LEFT JOIN agents a ON p.agent_id = a.id
        WHERE 1=1
      `
    } else if (group_by === 'agent') {
      // 按代理分组
      sql = `
        SELECT 
          COALESCE(a.agent_username, '直属') as dimension,
          p.agent_id,
          SUM(b.bet_amount) as total_bet,
          SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) as total_win_loss,
          -SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) as company_profit,
          SUM(b.valid_bet_amount * COALESCE(a.commission_ratio, 0)) as agent_commission,
          -SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) - SUM(b.valid_bet_amount * COALESCE(a.commission_ratio, 0)) as net_profit,
          COUNT(DISTINCT b.player_id) as player_count,
          COUNT(*) as bet_count
        FROM bets b
        LEFT JOIN players p ON b.player_id = p.id
        LEFT JOIN agents a ON p.agent_id = a.id
        WHERE 1=1
      `
    } else if (group_by === 'game') {
      // 按游戏分组
      sql = `
        SELECT 
          b.game_type as dimension,
          SUM(b.bet_amount) as total_bet,
          SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) as total_win_loss,
          -SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) as company_profit,
          SUM(b.valid_bet_amount * COALESCE(a.commission_ratio, 0)) as agent_commission,
          -SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) - SUM(b.valid_bet_amount * COALESCE(a.commission_ratio, 0)) as net_profit,
          COUNT(DISTINCT b.player_id) as player_count,
          COUNT(*) as bet_count
        FROM bets b
        LEFT JOIN players p ON b.player_id = p.id
        LEFT JOIN agents a ON p.agent_id = a.id
        WHERE 1=1
      `
    }
    
    if (start_date) {
      sql += ` AND date(b.created_at) >= date(?)`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(b.created_at) <= date(?)`
      params.push(end_date)
    }
    if (agent_id) {
      sql += ` AND p.agent_id = ?`
      params.push(parseInt(agent_id))
    }
    if (game_type) {
      sql += ` AND b.game_type = ?`
      params.push(game_type)
    }
    
    if (group_by === 'date') {
      sql += ` GROUP BY date(b.created_at) ORDER BY date(b.created_at) DESC`
    } else if (group_by === 'agent') {
      sql += ` GROUP BY p.agent_id ORDER BY total_bet DESC`
    } else if (group_by === 'game') {
      sql += ` GROUP BY b.game_type ORDER BY total_bet DESC`
    }
    
    const result = await db.prepare(sql).bind(...params).all()
    
    return c.json({
      success: true,
      data: result.results,
      group_by
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家盈亏排名
app.get('/api/reports/player-ranking', async (c) => {
  const db = c.env.DB
  const { start_date, end_date, agent_id, vip_level, rank_type = 'winner', limit = '20' } = c.req.query()
  
  try {
    const limitNum = parseInt(limit)
    let sql = `
      SELECT 
        p.id,
        p.username,
        p.nickname,
        p.vip_level,
        a.agent_username,
        SUM(b.bet_amount) as total_bet,
        SUM(b.valid_bet_amount) as total_valid_bet,
        SUM(CASE WHEN b.bet_status = 1 THEN b.payout ELSE 0 END) as total_payout,
        SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) as win_loss,
        COUNT(*) as bet_count,
        MAX(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE 0 END) as max_win
      FROM bets b
      LEFT JOIN players p ON b.player_id = p.id
      LEFT JOIN agents a ON p.agent_id = a.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (start_date) {
      sql += ` AND date(b.created_at) >= date(?)`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(b.created_at) <= date(?)`
      params.push(end_date)
    }
    if (agent_id) {
      sql += ` AND p.agent_id = ?`
      params.push(parseInt(agent_id))
    }
    if (vip_level) {
      sql += ` AND p.vip_level = ?`
      params.push(parseInt(vip_level))
    }
    
    sql += ` GROUP BY p.id`
    
    if (rank_type === 'winner') {
      sql += ` ORDER BY win_loss DESC LIMIT ?`
    } else {
      sql += ` ORDER BY win_loss ASC LIMIT ?`
    }
    params.push(limitNum)
    
    const result = await db.prepare(sql).bind(...params).all()
    
    return c.json({
      success: true,
      data: result.results,
      rank_type
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 每日盈亏汇总
app.get('/api/reports/daily-summary', async (c) => {
  const db = c.env.DB
  const { start_date, end_date } = c.req.query()
  
  try {
    let sql = `
      SELECT 
        date(created_at) as date,
        -- 投注统计
        SUM(bet_amount) as total_bet,
        SUM(valid_bet_amount) as total_valid_bet,
        COUNT(*) as bet_count,
        COUNT(DISTINCT player_id) as active_players,
        -- 输赢统计
        SUM(CASE WHEN bet_status = 1 THEN payout ELSE 0 END) as total_payout,
        SUM(CASE WHEN bet_status = 1 THEN payout - bet_amount ELSE -bet_amount END) as player_win_loss,
        -SUM(CASE WHEN bet_status = 1 THEN payout - bet_amount ELSE -bet_amount END) as company_profit,
        -- 平均值
        AVG(bet_amount) as avg_bet,
        AVG(CASE WHEN bet_status = 1 THEN payout - bet_amount ELSE -bet_amount END) as avg_win_loss
      FROM bets
      WHERE 1=1
    `
    const params: any[] = []
    
    if (start_date) {
      sql += ` AND date(created_at) >= date(?)`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(created_at) <= date(?)`
      params.push(end_date)
    }
    
    sql += ` GROUP BY date(created_at) ORDER BY date(created_at) DESC`
    
    const result = await db.prepare(sql).bind(...params).all()
    
    // 计算累计统计
    const summary = await db.prepare(`
      SELECT 
        SUM(bet_amount) as total_bet,
        SUM(valid_bet_amount) as total_valid_bet,
        SUM(CASE WHEN bet_status = 1 THEN payout ELSE 0 END) as total_payout,
        -SUM(CASE WHEN bet_status = 1 THEN payout - bet_amount ELSE -bet_amount END) as total_company_profit,
        COUNT(*) as total_bet_count,
        COUNT(DISTINCT player_id) as total_players
      FROM bets
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    `).bind(start_date || '2024-01-01', end_date || '2099-12-31').first()
    
    return c.json({
      success: true,
      data: result.results,
      summary: summary || {}
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 游戏类型营收报表
app.get('/api/reports/game-revenue', async (c) => {
  const db = c.env.DB
  const { start_date, end_date } = c.req.query()
  
  try {
    let sql = `
      SELECT 
        game_type,
        CASE game_type
          WHEN 'baccarat' THEN '百家乐'
          WHEN 'roulette' THEN '轮盘'
          WHEN 'dragon_tiger' THEN '龙虎'
          WHEN 'sicbo' THEN '骰宝'
          WHEN 'blackjack' THEN '21点'
          ELSE game_type
        END as game_name,
        COUNT(*) as bet_count,
        COUNT(DISTINCT player_id) as player_count,
        SUM(bet_amount) as total_bet,
        SUM(valid_bet_amount) as total_valid_bet,
        SUM(CASE WHEN bet_status = 1 THEN payout ELSE 0 END) as total_payout,
        SUM(CASE WHEN bet_status = 1 THEN payout - bet_amount ELSE -bet_amount END) as player_win_loss,
        -SUM(CASE WHEN bet_status = 1 THEN payout - bet_amount ELSE -bet_amount END) as game_revenue,
        AVG(bet_amount) as avg_bet,
        ROUND(-SUM(CASE WHEN bet_status = 1 THEN payout - bet_amount ELSE -bet_amount END) * 100.0 / NULLIF(SUM(bet_amount), 0), 2) as win_rate
      FROM bets
      WHERE 1=1
    `
    const params: any[] = []
    
    if (start_date) {
      sql += ` AND date(created_at) >= date(?)`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(created_at) <= date(?)`
      params.push(end_date)
    }
    
    sql += ` GROUP BY game_type ORDER BY game_revenue DESC`
    
    const result = await db.prepare(sql).bind(...params).all()
    
    return c.json({
      success: true,
      data: result.results
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 代理业绩统计（含下线递归）
app.get('/api/reports/agent-performance', async (c) => {
  const db = c.env.DB
  const { start_date, end_date, agent_id } = c.req.query()
  
  try {
    // 获取所有代理
    const agents = await db.prepare(`
      SELECT id, agent_username, nickname, level, parent_agent_id, share_ratio, commission_ratio
      FROM agents
      WHERE status = 1
    `).all()
    
    // 构建代理树（包含所有下级）
    const buildAgentTree = (agentId: number | null, allAgents: any[]): number[] => {
      const result: number[] = agentId !== null ? [agentId] : []
      const children = allAgents.filter((a: any) => a.parent_agent_id === agentId)
      children.forEach((child: any) => {
        result.push(...buildAgentTree(child.id, allAgents))
      })
      return result
    }
    
    const targetAgentIds = agent_id ? buildAgentTree(parseInt(agent_id), agents.results as any[]) : agents.results.map((a: any) => a.id)
    
    // 查询每个代理及其下线的业绩
    const performanceData = []
    
    for (const agent of agents.results as any[]) {
      if (agent_id && !targetAgentIds.includes(agent.id)) continue
      
      const downlineIds = buildAgentTree(agent.id, agents.results as any[])
      
      if (downlineIds.length === 0) continue
      
      const placeholders = downlineIds.map(() => '?').join(',')
      let sql = `
        SELECT 
          COUNT(DISTINCT p.id) as player_count,
          SUM(b.bet_amount) as total_bet,
          SUM(b.valid_bet_amount) as total_valid_bet,
          SUM(CASE WHEN b.bet_status = 1 THEN b.payout ELSE 0 END) as total_payout,
          SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) as player_win_loss,
          -SUM(CASE WHEN b.bet_status = 1 THEN b.payout - b.bet_amount ELSE -b.bet_amount END) as company_profit,
          COUNT(*) as bet_count
        FROM players p
        LEFT JOIN bets b ON p.id = b.player_id
        WHERE p.agent_id IN (${placeholders})
      `
      const params: any[] = [...downlineIds]
      
      if (start_date) {
        sql += ` AND date(b.created_at) >= date(?)`
        params.push(start_date)
      }
      if (end_date) {
        sql += ` AND date(b.created_at) <= date(?)`
        params.push(end_date)
      }
      
      const stats = await db.prepare(sql).bind(...params).first() as any
      
      if (stats && stats.total_bet > 0) {
        performanceData.push({
          agent_id: agent.id,
          agent_username: agent.agent_username,
          nickname: agent.nickname,
          level: agent.level,
          share_ratio: agent.share_ratio,
          commission_ratio: agent.commission_ratio,
          downline_count: downlineIds.length - 1,
          ...stats,
          agent_commission: (stats.total_valid_bet || 0) * (agent.commission_ratio || 0),
          net_profit: (stats.company_profit || 0) - ((stats.total_valid_bet || 0) * (agent.commission_ratio || 0))
        })
      }
    }
    
    // 按营收排序
    performanceData.sort((a, b) => (b.company_profit || 0) - (a.company_profit || 0))
    
    return c.json({
      success: true,
      data: performanceData
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 9. 内容管理 CMS API
// ========================================
app.get('/api/contents', async (c) => {
  const db = c.env.DB
  const { content_type, status, language } = c.req.query()
  
  try {
    let sql = "SELECT * FROM contents WHERE 1=1"
    const params: any[] = []
    
    if (content_type) {
      sql += ` AND content_type = ?`
      params.push(content_type)
    }
    if (status !== undefined && status !== '') {
      sql += ` AND status = ?`
      params.push(parseInt(status))
    }
    if (language) {
      sql += ` AND language = ?`
      params.push(language)
    }
    
    sql += " ORDER BY sort_order, created_at DESC"
    
    const contents = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: contents.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post('/api/contents', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    const result = await db.prepare(`
      INSERT INTO contents (content_type, title, content, image_url, link_url, link_target, language, 
                           target_level, platform, status, sort_order, publish_at, expire_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.content_type, body.title, body.content, body.image_url, body.link_url, body.link_target || '_self',
      body.language || 'zh-CN', body.target_level || 'all', body.platform || 'all',
      body.status || 0, body.sort_order || 0, body.publish_at, body.expire_at, body.created_by || 1
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '内容创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.put('/api/contents/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const fields = ['title', 'content', 'image_url', 'link_url', 'link_target', 'language',
                   'target_level', 'platform', 'status', 'sort_order', 'publish_at', 'expire_at']
    const updates: string[] = []
    const values: any[] = []
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(body[field])
      }
    })
    
    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }
    
    updates.push("updated_at = datetime('now')")
    values.push(id)
    
    await db.prepare(`UPDATE contents SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    return c.json({ success: true, message: '内容更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.delete('/api/contents/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    await db.prepare("DELETE FROM contents WHERE id = ?").bind(id).run()
    return c.json({ success: true, message: '内容删除成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 10. 系统设置 System Settings API
// ========================================
// 管理员列表
app.get('/api/admins', async (c) => {
  const db = c.env.DB
  
  try {
    const admins = await db.prepare(`
      SELECT id, username, role, nickname, two_fa_enabled, ip_whitelist, status, last_login_at, last_login_ip, 
             login_fail_count, created_at
      FROM admins ORDER BY id
    `).all()
    
    return c.json({ success: true, data: admins.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建管理员
app.post('/api/admins', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  // 验证必填字段
  if (!body.username || !body.password) {
    return c.json({ success: false, error: '用户名和密码不能为空' }, 400)
  }
  
  // 用户名验证
  const safeUsername = sanitizeString(body.username, 20)
  if (!isValidUsername(safeUsername)) {
    return c.json({ success: false, error: '用户名只能包含字母、数字和下划线，长度3-32个字符' }, 400)
  }
  
  if (body.password.length < 6 || body.password.length > 64) {
    return c.json({ success: false, error: '密码长度需在6-64个字符之间' }, 400)
  }
  
  try {
    // 检查用户名是否已存在
    const existing = await db.prepare("SELECT id FROM admins WHERE username = ?").bind(safeUsername).first()
    if (existing) {
      return c.json({ success: false, error: '用户名已存在' }, 400)
    }
    
    // 密码哈希处理
    const passwordHash = await hashPassword(body.password)
    
    const result = await db.prepare(`
      INSERT INTO admins (username, password_hash, nickname, role, permissions, ip_whitelist, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      safeUsername, 
      passwordHash,
      sanitizeString(body.nickname, 50) || safeUsername,
      body.role || 'operator',
      body.permissions ? JSON.stringify(body.permissions) : null,
      body.ip_whitelist ? JSON.stringify(body.ip_whitelist) : null,
      body.status !== undefined ? body.status : 1
    ).run()
    
    // 记录操作日志
    if (body.operator_id) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
        VALUES (?, 'admin', 'create', 'admin', ?, ?, 'system')
      `).bind(body.operator_id, result.meta.last_row_id, `创建管理员: ${body.username}`).run()
    }
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '管理员创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除/禁用管理员
app.delete('/api/admins/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { operator_id } = await c.req.json().catch(() => ({}))
  
  try {
    // 不能删除自己
    if (operator_id && String(operator_id) === String(id)) {
      return c.json({ success: false, error: '不能删除自己的账号' }, 400)
    }
    
    // 检查是否为超级管理员（ID为1的不能删除）
    if (id === '1') {
      return c.json({ success: false, error: '不能删除超级管理员账号' }, 400)
    }
    
    const admin = await db.prepare("SELECT username FROM admins WHERE id = ?").bind(id).first() as any
    if (!admin) {
      return c.json({ success: false, error: '管理员不存在' }, 404)
    }
    
    // 软删除（设置状态为0）
    await db.prepare("UPDATE admins SET status = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run()
    
    // 记录操作日志
    if (operator_id) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
        VALUES (?, 'admin', 'delete', 'admin', ?, ?, 'system')
      `).bind(operator_id, id, `禁用管理员: ${admin.username}`).run()
    }
    
    return c.json({ success: true, message: '管理员已禁用' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 重置管理员密码
app.post('/api/admins/:id/reset-password', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { operator_id, new_password } = await c.req.json()
  
  if (!new_password || new_password.length < 6 || new_password.length > 64) {
    return c.json({ success: false, error: '新密码长度需在6-64个字符之间' }, 400)
  }
  
  try {
    const admin = await db.prepare("SELECT username FROM admins WHERE id = ?").bind(id).first() as any
    if (!admin) {
      return c.json({ success: false, error: '管理员不存在' }, 404)
    }
    
    // 密码哈希处理
    const passwordHash = await hashPassword(new_password)
    
    await db.prepare("UPDATE admins SET password_hash = ?, login_fail_count = 0, updated_at = datetime('now') WHERE id = ?")
      .bind(passwordHash, id).run()
    
    // 记录操作日志
    if (operator_id) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
        VALUES (?, 'admin', 'reset_password', 'admin', ?, ?, 'system')
      `).bind(operator_id, id, `重置密码: ${admin.username}`).run()
    }
    
    return c.json({ success: true, message: '密码重置成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新管理员
app.put('/api/admins/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const fields = ['nickname', 'role', 'permissions', 'ip_whitelist', 'status', 'two_fa_enabled']
    const updates: string[] = []
    const values: any[] = []
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        if (field === 'permissions' || field === 'ip_whitelist') {
          values.push(JSON.stringify(body[field]))
        } else {
          values.push(body[field])
        }
      }
    })
    
    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }
    
    updates.push("updated_at = datetime('now')")
    values.push(id)
    
    await db.prepare(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    return c.json({ success: true, message: '管理员更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 角色权限管理 API
// ========================================

// 获取所有角色
app.get('/api/roles', async (c) => {
  const db = c.env.DB
  
  try {
    // 先检查roles表是否存在，如果不存在则创建并初始化
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_code TEXT UNIQUE NOT NULL,
        role_name TEXT NOT NULL,
        description TEXT,
        permissions TEXT,
        status INTEGER DEFAULT 1,
        is_system INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
    
    // 检查是否有数据，如果没有则初始化默认角色
    const count = await db.prepare("SELECT COUNT(*) as cnt FROM roles").first() as any
    if (count.cnt === 0) {
      // 初始化默认角色
      const defaultRoles = [
        { code: 'super_admin', name: '超级管理员', desc: '系统最高权限，可访问所有功能', perms: '["*"]', system: 1 },
        { code: 'finance', name: '财务主管', desc: '负责财务审核和资金管理', perms: '["dashboard:view","finance:*","reports:view"]', system: 1 },
        { code: 'risk', name: '风控主管', desc: '负责风险控制和预警处理', perms: '["dashboard:view","risk:*","players:view","bets:view"]', system: 1 },
        { code: 'customer_service', name: '客服主管', desc: '负责玩家服务和内容管理', perms: '["dashboard:view","players:view","players:edit","content:*"]', system: 1 },
        { code: 'operator', name: '运营专员', desc: '负责日常运营工作', perms: '["dashboard:view","content:view","reports:view"]', system: 1 }
      ]
      
      for (const role of defaultRoles) {
        await db.prepare(`
          INSERT INTO roles (role_code, role_name, description, permissions, is_system) VALUES (?, ?, ?, ?, ?)
        `).bind(role.code, role.name, role.desc, role.perms, role.system).run()
      }
    }
    
    const roles = await db.prepare("SELECT * FROM roles WHERE status = 1 ORDER BY id").all()
    return c.json({ success: true, data: roles.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 获取权限定义列表
app.get('/api/permissions', async (c) => {
  // 定义系统所有权限（细化到每个功能模块的子功能）
  const permissions = [
    {
      module: 'dashboard',
      name: '仪表盘',
      icon: 'fa-chart-line',
      children: [
        { code: 'dashboard:view', name: '查看仪表盘' },
        { code: 'dashboard:stats', name: '查看统计数据' },
        { code: 'dashboard:pending', name: '查看待办事项' }
      ]
    },
    {
      module: 'players',
      name: '玩家管理',
      icon: 'fa-users',
      children: [
        { code: 'players:view', name: '查看玩家列表' },
        { code: 'players:detail', name: '查看玩家详情' },
        { code: 'players:edit', name: '编辑玩家信息' },
        { code: 'players:status', name: '修改玩家状态' },
        { code: 'players:vip', name: '修改VIP等级' },
        { code: 'players:tags', name: '管理玩家标签' },
        { code: 'players:balance', name: '查看玩家余额' }
      ]
    },
    {
      module: 'finance',
      name: '财务控端',
      icon: 'fa-dollar-sign',
      children: [
        { code: 'finance:view', name: '查看财务概览' },
        { code: 'finance:withdraw_review', name: '提款审核' },
        { code: 'finance:withdraw_approve', name: '提款批准' },
        { code: 'finance:withdraw_reject', name: '提款拒绝' },
        { code: 'finance:deposit_review', name: '存款审核' },
        { code: 'finance:deposit_approve', name: '存款批准' },
        { code: 'finance:manual_deposit', name: '人工存款' },
        { code: 'finance:manual_withdraw', name: '人工提款' },
        { code: 'finance:payment_methods', name: '收款方式管理' },
        { code: 'finance:payment_edit', name: '编辑收款方式' }
      ]
    },
    {
      module: 'bets',
      name: '注单控端',
      icon: 'fa-dice',
      children: [
        { code: 'bets:view', name: '查看注单列表' },
        { code: 'bets:detail', name: '查看注单详情' },
        { code: 'bets:cancel', name: '取消注单' },
        { code: 'bets:settle', name: '手动结算' },
        { code: 'bets:export', name: '导出注单' }
      ]
    },
    {
      module: 'commission',
      name: '洗码系统',
      icon: 'fa-percentage',
      children: [
        { code: 'commission:view', name: '查看洗码记录' },
        { code: 'commission:calculate', name: '执行洗码计算' },
        { code: 'commission:settle', name: '洗码结算' },
        { code: 'commission:schemes', name: '洗码方案管理' },
        { code: 'commission:agents', name: '代理管理' }
      ]
    },
    {
      module: 'risk',
      name: '风险控端',
      icon: 'fa-shield-alt',
      children: [
        { code: 'risk:view', name: '查看风控概览' },
        { code: 'risk:alerts', name: '查看风险预警' },
        { code: 'risk:handle', name: '处理风险事件' },
        { code: 'risk:rules', name: '风控规则管理' },
        { code: 'risk:limits', name: '限红配置' },
        { code: 'risk:blacklist', name: '黑名单管理' }
      ]
    },
    {
      module: 'content',
      name: '内容管理',
      icon: 'fa-newspaper',
      children: [
        { code: 'content:view', name: '查看内容列表' },
        { code: 'content:create', name: '创建内容' },
        { code: 'content:edit', name: '编辑内容' },
        { code: 'content:delete', name: '删除内容' },
        { code: 'content:publish', name: '发布/下架内容' }
      ]
    },
    {
      module: 'reports',
      name: '报告中心',
      icon: 'fa-chart-bar',
      children: [
        { code: 'reports:view', name: '查看报表' },
        { code: 'reports:daily', name: '日报表' },
        { code: 'reports:game', name: '游戏报表' },
        { code: 'reports:player', name: '玩家报表' },
        { code: 'reports:export', name: '导出报表' }
      ]
    },
    {
      module: 'studio',
      name: '现场运营',
      icon: 'fa-video',
      children: [
        { code: 'studio:view', name: '查看现场概览' },
        { code: 'studio:dealers', name: '荷官管理' },
        { code: 'studio:tables', name: '桌台管理' },
        { code: 'studio:schedule', name: '排班管理' }
      ]
    },
    {
      module: 'system',
      name: '系统设置',
      icon: 'fa-cog',
      children: [
        { code: 'system:view', name: '查看系统设置' },
        { code: 'system:admins', name: '管理员管理' },
        { code: 'system:admins_create', name: '创建管理员' },
        { code: 'system:admins_edit', name: '编辑管理员' },
        { code: 'system:admins_delete', name: '删除管理员' },
        { code: 'system:roles', name: '角色管理' },
        { code: 'system:roles_create', name: '创建角色' },
        { code: 'system:roles_edit', name: '编辑角色' },
        { code: 'system:logs', name: '查看操作日志' },
        { code: 'system:configs', name: '系统配置' }
      ]
    }
  ]
  
  return c.json({ success: true, data: permissions })
})

// 创建角色
app.post('/api/roles', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  if (!body.role_code || !body.role_name) {
    return c.json({ success: false, error: '角色代码和名称不能为空' }, 400)
  }
  
  // 角色代码只能包含字母、数字、下划线
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(body.role_code)) {
    return c.json({ success: false, error: '角色代码只能包含字母、数字、下划线，且以字母开头' }, 400)
  }
  
  try {
    // 检查角色代码是否已存在
    const existing = await db.prepare("SELECT id FROM roles WHERE role_code = ?").bind(body.role_code).first()
    if (existing) {
      return c.json({ success: false, error: '角色代码已存在' }, 400)
    }
    
    const result = await db.prepare(`
      INSERT INTO roles (role_code, role_name, description, permissions, is_system)
      VALUES (?, ?, ?, ?, 0)
    `).bind(
      body.role_code,
      body.role_name,
      body.description || '',
      body.permissions ? JSON.stringify(body.permissions) : '[]'
    ).run()
    
    // 记录操作日志
    if (body.operator_id) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
        VALUES (?, 'system', 'create_role', 'role', ?, ?, 'system')
      `).bind(body.operator_id, result.meta.last_row_id, `创建角色: ${body.role_name}`).run()
    }
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '角色创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新角色
app.put('/api/roles/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const role = await db.prepare("SELECT * FROM roles WHERE id = ?").bind(id).first() as any
    if (!role) {
      return c.json({ success: false, error: '角色不存在' }, 404)
    }
    
    // 系统角色不能修改代码
    if (role.is_system && body.role_code && body.role_code !== role.role_code) {
      return c.json({ success: false, error: '系统角色代码不能修改' }, 400)
    }
    
    const updates: string[] = []
    const values: any[] = []
    
    if (body.role_name !== undefined) {
      updates.push('role_name = ?')
      values.push(body.role_name)
    }
    if (body.description !== undefined) {
      updates.push('description = ?')
      values.push(body.description)
    }
    if (body.permissions !== undefined) {
      updates.push('permissions = ?')
      values.push(JSON.stringify(body.permissions))
    }
    
    if (updates.length === 0) {
      return c.json({ success: false, error: '没有要更新的字段' }, 400)
    }
    
    updates.push("updated_at = datetime('now')")
    values.push(id)
    
    await db.prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    // 记录操作日志
    if (body.operator_id) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
        VALUES (?, 'system', 'update_role', 'role', ?, ?, 'system')
      `).bind(body.operator_id, id, `更新角色: ${role.role_name}`).run()
    }
    
    return c.json({ success: true, message: '角色更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除角色
app.delete('/api/roles/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const { operator_id } = await c.req.json().catch(() => ({}))
  
  try {
    const role = await db.prepare("SELECT * FROM roles WHERE id = ?").bind(id).first() as any
    if (!role) {
      return c.json({ success: false, error: '角色不存在' }, 404)
    }
    
    if (role.is_system) {
      return c.json({ success: false, error: '系统角色不能删除' }, 400)
    }
    
    // 检查是否有管理员使用此角色
    const adminCount = await db.prepare("SELECT COUNT(*) as cnt FROM admins WHERE role = ? AND status = 1")
      .bind(role.role_code).first() as any
    if (adminCount.cnt > 0) {
      return c.json({ success: false, error: `有 ${adminCount.cnt} 个管理员正在使用此角色，无法删除` }, 400)
    }
    
    // 软删除
    await db.prepare("UPDATE roles SET status = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run()
    
    // 记录操作日志
    if (operator_id) {
      await db.prepare(`
        INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
        VALUES (?, 'system', 'delete_role', 'role', ?, ?, 'system')
      `).bind(operator_id, id, `删除角色: ${role.role_name}`).run()
    }
    
    return c.json({ success: true, message: '角色删除成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 登录日志
app.get('/api/login-logs', async (c) => {
  const db = c.env.DB
  const { username, status, date, page = '1', limit = '50' } = c.req.query()
  
  try {
    let sql = `
      SELECT al.*, a.role as admin_role 
      FROM audit_logs al
      LEFT JOIN admins a ON al.operator_id = a.id
      WHERE al.module = 'auth' AND al.action IN ('login', 'login_blocked', 'logout')
    `
    const params: any[] = []
    
    if (username) {
      sql += ` AND al.operator_name LIKE ?`
      params.push(`%${username}%`)
    }
    if (status === 'success') {
      sql += ` AND al.action = 'login'`
    } else if (status === 'failed') {
      sql += ` AND al.action = 'login' AND al.description LIKE '%失败%'`
    } else if (status === 'blocked') {
      sql += ` AND al.action = 'login_blocked'`
    }
    if (date) {
      sql += ` AND date(al.created_at) = ?`
      params.push(date)
    }
    
    sql += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const logs = await db.prepare(sql).bind(...params).all()
    
    // 获取统计数据
    const statsResult = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN action = 'login' AND description NOT LIKE '%失败%' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN action = 'login_blocked' THEN 1 ELSE 0 END) as blocked_count,
        COUNT(DISTINCT operator_id) as unique_users
      FROM audit_logs 
      WHERE module = 'auth' AND action IN ('login', 'login_blocked')
      AND date(created_at) = date('now')
    `).first() as any
    
    return c.json({ 
      success: true, 
      data: logs.results,
      stats: {
        total: statsResult?.total || 0,
        success_count: statsResult?.success_count || 0,
        blocked_count: statsResult?.blocked_count || 0,
        unique_users: statsResult?.unique_users || 0
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 审计日志
app.get('/api/audit-logs', async (c) => {
  const db = c.env.DB
  const { operator_id, module, action, start_date, end_date, page = '1', limit = '50' } = c.req.query()
  
  try {
    let sql = "SELECT * FROM audit_logs WHERE 1=1"
    const params: any[] = []
    
    if (operator_id) {
      sql += ` AND operator_id = ?`
      params.push(operator_id)
    }
    if (module) {
      sql += ` AND module = ?`
      params.push(module)
    }
    if (action) {
      sql += ` AND action = ?`
      params.push(action)
    }
    if (start_date) {
      sql += ` AND date(created_at) >= ?`
      params.push(start_date)
    }
    if (end_date) {
      sql += ` AND date(created_at) <= ?`
      params.push(end_date)
    }
    
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit))
    
    const logs = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: logs.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 系统配置
app.get('/api/system/configs', async (c) => {
  const db = c.env.DB
  const { config_group } = c.req.query()
  
  try {
    let sql = "SELECT * FROM system_configs WHERE 1=1"
    const params: any[] = []
    
    if (config_group) {
      sql += ` AND config_group = ?`
      params.push(config_group)
    }
    
    sql += " ORDER BY config_group, config_key"
    
    const configs = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: configs.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.put('/api/system/configs/:key', async (c) => {
  const db = c.env.DB
  const key = c.req.param('key')
  const { value, updated_by } = await c.req.json()
  
  try {
    await db.prepare(`
      UPDATE system_configs SET config_value = ?, updated_by = ?, updated_at = datetime('now')
      WHERE config_key = ?
    `).bind(value, updated_by || 1, key).run()
    
    return c.json({ success: true, message: '配置更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 个人信息管理 API (V2.1新增)
// ========================================
// 获取当前用户个人信息
app.get('/api/profile', async (c) => {
  const db = c.env.DB
  const admin_id = c.req.query('admin_id')
  
  if (!admin_id) {
    return c.json({ success: false, error: '请提供admin_id' }, 400)
  }
  
  try {
    const admin = await db.prepare(`
      SELECT id, username, nickname, role, permissions, two_fa_enabled, 
             last_login_at, last_login_ip, status, created_at
      FROM admins WHERE id = ?
    `).bind(admin_id).first()
    
    if (!admin) {
      return c.json({ success: false, error: '用户不存在' }, 404)
    }
    
    return c.json({ success: true, data: admin })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新个人信息
app.put('/api/profile', async (c) => {
  const db = c.env.DB
  const { admin_id, nickname } = await c.req.json()
  
  if (!admin_id) {
    return c.json({ success: false, error: '请提供admin_id' }, 400)
  }
  
  if (!nickname || nickname.trim() === '') {
    return c.json({ success: false, error: '昵称不能为空' }, 400)
  }
  
  try {
    // 检查用户是否存在
    const admin = await db.prepare("SELECT id FROM admins WHERE id = ?").bind(admin_id).first()
    if (!admin) {
      return c.json({ success: false, error: '用户不存在' }, 404)
    }
    
    // 更新昵称
    await db.prepare(`
      UPDATE admins SET nickname = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(nickname.trim(), admin_id).run()
    
    // 记录操作日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
      VALUES (?, 'profile', 'update', 'admin', ?, ?, ?)
    `).bind(admin_id, admin_id, JSON.stringify({ nickname: nickname.trim() }), 'system').run()
    
    return c.json({ success: true, message: '个人信息更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 修改密码
app.post('/api/profile/change-password', async (c) => {
  const db = c.env.DB
  const { admin_id, current_password, new_password } = await c.req.json()
  
  if (!admin_id) {
    return c.json({ success: false, error: '请提供admin_id' }, 400)
  }
  
  if (!current_password || !new_password) {
    return c.json({ success: false, error: '请提供当前密码和新密码' }, 400)
  }
  
  if (new_password.length < 6) {
    return c.json({ success: false, error: '新密码长度至少为6位' }, 400)
  }
  
  try {
    // 验证当前密码
    const admin = await db.prepare("SELECT id, password_hash FROM admins WHERE id = ?").bind(admin_id).first() as any
    if (!admin) {
      return c.json({ success: false, error: '用户不存在' }, 404)
    }
    
    // 简单密码验证（实际生产环境应使用bcrypt等）
    if (admin.password_hash !== current_password) {
      return c.json({ success: false, error: '当前密码不正确' }, 400)
    }
    
    // 更新密码
    await db.prepare(`
      UPDATE admins SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(new_password, admin_id).run()
    
    // 记录操作日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
      VALUES (?, 'profile', 'change_password', 'admin', ?, '密码修改成功', 'system')
    `).bind(admin_id, admin_id).run()
    
    return c.json({ success: true, message: '密码修改成功，请重新登录' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// IP白名单管理 API (V2.1新增)
// ========================================

// 获取个人IP白名单
app.get('/api/profile/ip-whitelist', async (c) => {
  const db = c.env.DB
  const admin_id = c.req.query('admin_id')
  
  if (!admin_id) {
    return c.json({ success: false, error: '请提供admin_id' }, 400)
  }
  
  try {
    const admin = await db.prepare(`
      SELECT id, username, ip_whitelist FROM admins WHERE id = ?
    `).bind(admin_id).first() as any
    
    if (!admin) {
      return c.json({ success: false, error: '用户不存在' }, 404)
    }
    
    const ipList = admin.ip_whitelist ? JSON.parse(admin.ip_whitelist) : []
    
    return c.json({ 
      success: true, 
      data: { 
        admin_id: admin.id,
        username: admin.username,
        ip_whitelist: ipList,
        enabled: ipList.length > 0
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新个人IP白名单
app.put('/api/profile/ip-whitelist', async (c) => {
  const db = c.env.DB
  const { admin_id, ip_whitelist } = await c.req.json()
  
  if (!admin_id) {
    return c.json({ success: false, error: '请提供admin_id' }, 400)
  }
  
  // 验证IP格式
  if (ip_whitelist && Array.isArray(ip_whitelist)) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$|^\*$/
    for (const ip of ip_whitelist) {
      if (ip && !ipRegex.test(ip.trim())) {
        return c.json({ success: false, error: `IP格式无效: ${ip}` }, 400)
      }
    }
  }
  
  try {
    const admin = await db.prepare("SELECT id FROM admins WHERE id = ?").bind(admin_id).first()
    if (!admin) {
      return c.json({ success: false, error: '用户不存在' }, 404)
    }
    
    const cleanIpList = ip_whitelist?.filter((ip: string) => ip && ip.trim()) || []
    
    await db.prepare(`
      UPDATE admins SET ip_whitelist = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(cleanIpList.length > 0 ? JSON.stringify(cleanIpList) : null, admin_id).run()
    
    // 记录操作日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
      VALUES (?, 'profile', 'update_ip_whitelist', 'admin', ?, ?, 'system')
    `).bind(admin_id, admin_id, `更新IP白名单: ${cleanIpList.length}个IP`).run()
    
    return c.json({ success: true, message: 'IP白名单更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 上级给下级设置IP白名单
app.put('/api/admins/:id/ip-whitelist', async (c) => {
  const db = c.env.DB
  const targetId = c.req.param('id')
  const { operator_id, operator_role, ip_whitelist } = await c.req.json()
  
  if (!operator_id) {
    return c.json({ success: false, error: '请提供操作者ID' }, 400)
  }
  
  // 验证IP格式
  if (ip_whitelist && Array.isArray(ip_whitelist)) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$|^\*$/
    for (const ip of ip_whitelist) {
      if (ip && !ipRegex.test(ip.trim())) {
        return c.json({ success: false, error: `IP格式无效: ${ip}` }, 400)
      }
    }
  }
  
  try {
    // 验证目标用户存在
    const target = await db.prepare("SELECT id, username, role FROM admins WHERE id = ?").bind(targetId).first() as any
    if (!target) {
      return c.json({ success: false, error: '目标用户不存在' }, 404)
    }
    
    // 权限检查：只有super_admin可以给任何人设置，其他角色只能给低级别角色设置
    const roleHierarchy: Record<string, number> = {
      'super_admin': 100,
      'finance': 50,
      'risk': 50,
      'customer_service': 30,
      'operator': 10
    }
    
    const operatorLevel = roleHierarchy[operator_role] || 0
    const targetLevel = roleHierarchy[target.role] || 0
    
    if (operator_role !== 'super_admin' && operatorLevel <= targetLevel) {
      return c.json({ success: false, error: '无权限修改该用户的IP白名单' }, 403)
    }
    
    // 不能修改自己
    if (String(operator_id) === String(targetId)) {
      return c.json({ success: false, error: '请使用个人设置修改自己的IP白名单' }, 400)
    }
    
    const cleanIpList = ip_whitelist?.filter((ip: string) => ip && ip.trim()) || []
    
    await db.prepare(`
      UPDATE admins SET ip_whitelist = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(cleanIpList.length > 0 ? JSON.stringify(cleanIpList) : null, targetId).run()
    
    // 记录操作日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, module, action, target_type, target_id, description, ip_address)
      VALUES (?, 'admin', 'set_ip_whitelist', 'admin', ?, ?, 'system')
    `).bind(operator_id, targetId, `为${target.username}设置IP白名单: ${cleanIpList.length}个IP`).run()
    
    return c.json({ success: true, message: `已为 ${target.username} 设置IP白名单` })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 获取管理员IP白名单（供上级查看）
app.get('/api/admins/:id/ip-whitelist', async (c) => {
  const db = c.env.DB
  const targetId = c.req.param('id')
  
  try {
    const admin = await db.prepare(`
      SELECT id, username, role, ip_whitelist FROM admins WHERE id = ?
    `).bind(targetId).first() as any
    
    if (!admin) {
      return c.json({ success: false, error: '用户不存在' }, 404)
    }
    
    const ipList = admin.ip_whitelist ? JSON.parse(admin.ip_whitelist) : []
    
    return c.json({ 
      success: true, 
      data: { 
        admin_id: admin.id,
        username: admin.username,
        role: admin.role,
        ip_whitelist: ipList,
        enabled: ipList.length > 0
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 11. 现场运营控端 Studio Management API (V2.1新增)
// ========================================
// 荷官列表
app.get('/api/dealers', async (c) => {
  const db = c.env.DB
  const { dealer_status, search } = c.req.query()
  
  try {
    let sql = "SELECT * FROM dealers WHERE 1=1"
    const params: any[] = []
    
    if (dealer_status !== undefined && dealer_status !== '') {
      sql += ` AND dealer_status = ?`
      params.push(parseInt(dealer_status))
    }
    if (search) {
      sql += ` AND (staff_id LIKE ? OR stage_name_cn LIKE ? OR stage_name_en LIKE ?)`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    sql += " ORDER BY staff_id"
    
    const dealers = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: dealers.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 荷官详情
app.get('/api/dealers/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    const dealer = await db.prepare("SELECT * FROM dealers WHERE id = ?").bind(id).first()
    if (!dealer) {
      return c.json({ success: false, error: 'Dealer not found' }, 404)
    }
    
    // 获取排班和绩效
    const [upcomingShifts, recentShifts, leaves] = await Promise.all([
      db.prepare(`
        SELECT s.*, t.table_name FROM dealer_shifts s
        LEFT JOIN game_tables t ON s.table_id = t.id
        WHERE s.dealer_id = ? AND s.shift_date >= date('now')
        ORDER BY s.shift_date, s.shift_start_time LIMIT 10
      `).bind(id).all(),
      db.prepare(`
        SELECT s.*, t.table_name FROM dealer_shifts s
        LEFT JOIN game_tables t ON s.table_id = t.id
        WHERE s.dealer_id = ? AND s.status = 2
        ORDER BY s.shift_date DESC LIMIT 10
      `).bind(id).all(),
      db.prepare("SELECT * FROM dealer_leaves WHERE dealer_id = ? ORDER BY start_date DESC LIMIT 10").bind(id).all()
    ])
    
    return c.json({
      success: true,
      data: {
        ...dealer,
        upcomingShifts: upcomingShifts.results,
        recentShifts: recentShifts.results,
        leaves: leaves.results
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建荷官
app.post('/api/dealers', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    const result = await db.prepare(`
      INSERT INTO dealers (staff_id, stage_name_cn, stage_name_en, avatar_url, portrait_url, gender, 
                          hire_date, dealer_status, skills, rating, real_name, phone, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.staff_id || null, 
      body.stage_name_cn || null, 
      body.stage_name_en || null, 
      body.avatar_url || null, 
      body.portrait_url || null,
      body.gender ?? 0, 
      body.hire_date || null, 
      body.dealer_status ?? 1,
      body.skills ? JSON.stringify(body.skills) : null, 
      body.rating ?? 5.0,
      body.real_name || null, 
      body.phone || null, 
      body.email || null
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '荷官创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新荷官
app.put('/api/dealers/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const fields = ['stage_name_cn', 'stage_name_en', 'avatar_url', 'portrait_url', 'gender',
                   'dealer_status', 'skills', 'rating', 'real_name', 'phone', 'email', 'notes']
    const updates: string[] = []
    const values: any[] = []
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        if (field === 'skills') {
          values.push(JSON.stringify(body[field]))
        } else {
          values.push(body[field])
        }
      }
    })
    
    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }
    
    updates.push("updated_at = datetime('now')")
    values.push(id)
    
    await db.prepare(`UPDATE dealers SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    return c.json({ success: true, message: '荷官信息更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 桌台列表
app.get('/api/tables', async (c) => {
  const db = c.env.DB
  const { game_type, table_status } = c.req.query()
  
  try {
    let sql = `SELECT t.*, d.stage_name_cn as dealer_name, lg.group_name as limit_group_name
               FROM game_tables t
               LEFT JOIN dealers d ON t.current_dealer_id = d.id
               LEFT JOIN limit_groups lg ON t.limit_group_id = lg.id
               WHERE 1=1`
    const params: any[] = []
    
    if (game_type) {
      sql += ` AND t.game_type = ?`
      params.push(game_type)
    }
    if (table_status !== undefined && table_status !== '') {
      sql += ` AND t.table_status = ?`
      params.push(parseInt(table_status))
    }
    
    sql += ` ORDER BY t.sort_order, t.table_code`
    
    const tables = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: tables.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建桌台
app.post('/api/tables', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    const result = await db.prepare(`
      INSERT INTO game_tables (table_code, table_name, game_type, primary_stream_url, backup_stream_url,
                              limit_group_id, table_status, min_bet, max_bet, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.table_code || null, 
      body.table_name || null, 
      body.game_type || null, 
      body.primary_stream_url || null, 
      body.backup_stream_url || null,
      body.limit_group_id || null, 
      body.table_status ?? 1, 
      body.min_bet || null, 
      body.max_bet || null, 
      body.sort_order ?? 0
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '桌台创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新桌台
app.put('/api/tables/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const fields = ['table_name', 'primary_stream_url', 'backup_stream_url', 'limit_group_id',
                   'current_dealer_id', 'table_status', 'min_bet', 'max_bet', 'sort_order']
    const updates: string[] = []
    const values: any[] = []
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(body[field])
      }
    })
    
    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }
    
    updates.push("updated_at = datetime('now')")
    values.push(id)
    
    await db.prepare(`UPDATE game_tables SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    return c.json({ success: true, message: '桌台信息更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 排班列表
app.get('/api/shifts', async (c) => {
  const db = c.env.DB
  const { shift_date, dealer_id, table_id } = c.req.query()
  
  try {
    let sql = `SELECT s.*, d.stage_name_cn as dealer_name, d.avatar_url, t.table_name, t.game_type
               FROM dealer_shifts s
               LEFT JOIN dealers d ON s.dealer_id = d.id
               LEFT JOIN game_tables t ON s.table_id = t.id
               WHERE 1=1`
    const params: any[] = []
    
    if (shift_date) {
      sql += ` AND s.shift_date = ?`
      params.push(shift_date)
    } else {
      sql += ` AND s.shift_date >= date('now')`
    }
    if (dealer_id) {
      sql += ` AND s.dealer_id = ?`
      params.push(dealer_id)
    }
    if (table_id) {
      sql += ` AND s.table_id = ?`
      params.push(table_id)
    }
    
    sql += ` ORDER BY s.shift_date, s.shift_start_time`
    
    const shifts = await db.prepare(sql).bind(...params).all()
    return c.json({ success: true, data: shifts.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 创建排班
app.post('/api/shifts', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    // 冲突检测
    const conflict = await db.prepare(`
      SELECT * FROM dealer_shifts 
      WHERE dealer_id = ? AND shift_date = ? AND status != 3
      AND ((shift_start_time <= ? AND shift_end_time > ?) OR (shift_start_time < ? AND shift_end_time >= ?))
    `).bind(
      body.dealer_id, body.shift_date,
      body.shift_start_time || '00:00', body.shift_start_time || '00:00',
      body.shift_end_time || '23:59', body.shift_end_time || '23:59'
    ).first()
    
    if (conflict) {
      return c.json({ success: false, error: '排班时间冲突，该荷官在此时段已有安排' }, 400)
    }
    
    const result = await db.prepare(`
      INSERT INTO dealer_shifts (table_id, dealer_id, shift_date, shift_start_time, shift_end_time, status, created_by)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).bind(
      body.table_id || null, 
      body.dealer_id || null, 
      body.shift_date || null, 
      body.shift_start_time || null, 
      body.shift_end_time || null, 
      body.created_by ?? 1
    ).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '排班创建成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 更新排班
app.put('/api/shifts/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const fields = ['table_id', 'dealer_id', 'shift_date', 'shift_start_time', 'shift_end_time', 'status']
    const updates: string[] = []
    const values: any[] = []
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`)
        values.push(body[field])
      }
    })
    
    if (updates.length === 0) {
      return c.json({ success: false, error: 'No fields to update' }, 400)
    }
    
    values.push(id)
    
    await db.prepare(`UPDATE dealer_shifts SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
    
    return c.json({ success: true, message: '排班更新成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 删除排班
app.delete('/api/shifts/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  
  try {
    await db.prepare("UPDATE dealer_shifts SET status = 3 WHERE id = ?").bind(id).run()
    return c.json({ success: true, message: '排班取消成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 荷官请假
app.post('/api/dealer-leaves', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  try {
    const result = await db.prepare(`
      INSERT INTO dealer_leaves (dealer_id, leave_type, start_date, end_date, reason, status)
      VALUES (?, ?, ?, ?, ?, 0)
    `).bind(body.dealer_id, body.leave_type, body.start_date, body.end_date, body.reason).run()
    
    return c.json({ success: true, data: { id: result.meta.last_row_id }, message: '请假申请提交成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 认证 API
// ========================================
app.post('/api/auth/login', async (c) => {
  const db = c.env.DB
  const { username, password } = await c.req.json()
  
  // 输入验证
  if (!username || !password) {
    return c.json({ success: false, error: '用户名和密码不能为空' }, 400)
  }
  
  const safeUsername = sanitizeString(username, 32)
  
  // 获取客户端IP
  const clientIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'
  
  try {
    // 先获取用户信息，然后验证密码哈希
    const admin = await db.prepare(`
      SELECT id, username, password_hash, role, nickname, permissions, two_fa_enabled, two_fa_secret, status, ip_whitelist, login_fail_count
      FROM admins WHERE username = ? AND status = 1
    `).bind(safeUsername).first() as any
    
    if (!admin) {
      return c.json({ success: false, error: '用户名或密码错误' }, 401)
    }
    
    // 检查登录失败次数限制
    if (admin.login_fail_count >= 5) {
      return c.json({ success: false, error: '登录失败次数过多，账号已被临时锁定，请30分钟后重试或联系管理员' }, 403)
    }
    
    // 验证密码 - 支持哈希密码和旧版明文密码（向后兼容）
    const passwordHash = await hashPassword(password)
    const isPasswordValid = admin.password_hash === passwordHash || admin.password_hash === password
    
    if (!isPasswordValid) {
      // 记录失败次数
      await db.prepare(`
        UPDATE admins SET login_fail_count = login_fail_count + 1 WHERE username = ?
      `).bind(safeUsername).run()
      return c.json({ success: false, error: '用户名或密码错误' }, 401)
    }
    
    // IP白名单验证
    if (admin.ip_whitelist) {
      const ipList = JSON.parse(admin.ip_whitelist) as string[]
      if (ipList.length > 0 && !ipList.includes('*')) {
        let ipAllowed = false
        for (const allowedIp of ipList) {
          if (allowedIp === clientIp) {
            ipAllowed = true
            break
          }
          // 支持CIDR格式 (简化版，只支持/24, /16, /8)
          if (allowedIp.includes('/')) {
            const [baseIp, mask] = allowedIp.split('/')
            const maskNum = parseInt(mask)
            const baseParts = baseIp.split('.').map(Number)
            const clientParts = clientIp.split('.').map(Number)
            
            if (maskNum === 24 && baseParts[0] === clientParts[0] && baseParts[1] === clientParts[1] && baseParts[2] === clientParts[2]) {
              ipAllowed = true
              break
            } else if (maskNum === 16 && baseParts[0] === clientParts[0] && baseParts[1] === clientParts[1]) {
              ipAllowed = true
              break
            } else if (maskNum === 8 && baseParts[0] === clientParts[0]) {
              ipAllowed = true
              break
            }
          }
        }
        
        if (!ipAllowed) {
          // 记录IP拒绝日志
          await db.prepare(`
            INSERT INTO audit_logs (operator_id, operator_name, module, action, description, ip_address, risk_level)
            VALUES (?, ?, 'auth', 'login_blocked', ?, ?, 2)
          `).bind(admin.id, admin.username, `IP白名单拦截: ${clientIp}`, clientIp).run()
          
          return c.json({ success: false, error: `当前IP(${clientIp})不在白名单中，禁止登录` }, 403)
        }
      }
    }
    
    // 更新登录信息
    await db.prepare(`
      UPDATE admins SET last_login_at = datetime('now'), last_login_ip = ?, login_fail_count = 0 WHERE id = ?
    `).bind(clientIp, admin.id).run()
    
    // 记录登录日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, description, ip_address)
      VALUES (?, ?, 'auth', 'login', '管理员登录', ?)
    `).bind(admin.id, admin.username, clientIp).run()
    
    return c.json({
      success: true,
      data: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        nickname: admin.nickname,
        permissions: admin.permissions ? JSON.parse(admin.permissions as string) : null,
        two_fa_enabled: admin.two_fa_enabled
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

app.post('/api/auth/logout', async (c) => {
  const { admin_id, admin_name } = await c.req.json()
  const db = c.env.DB
  
  try {
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, description)
      VALUES (?, ?, 'auth', 'logout', '管理员登出')
    `).bind(admin_id || 1, admin_name || 'admin').run()
    
    return c.json({ success: true, message: '登出成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 2FA 双因素认证 API
// ========================================

// TOTP工具函数 - 基于RFC 6238实现
const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

// 生成随机Base32密钥
function generateSecret(length = 20): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  let secret = ''
  for (let i = 0; i < length; i++) {
    secret += base32Chars[array[i] % 32]
  }
  return secret
}

// Base32解码
function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '')
  const bits: number[] = []
  
  for (const char of cleaned) {
    const val = base32Chars.indexOf(char)
    if (val === -1) continue
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1)
    }
  }
  
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j]
    }
    bytes.push(byte)
  }
  
  return new Uint8Array(bytes)
}

// HMAC-SHA1实现
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
  return new Uint8Array(signature)
}

// 生成TOTP
async function generateTOTP(secret: string, timeStep = 30, digits = 6): Promise<string> {
  const key = base32Decode(secret)
  const time = Math.floor(Date.now() / 1000 / timeStep)
  
  const timeBytes = new Uint8Array(8)
  let t = time
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = t & 0xff
    t = Math.floor(t / 256)
  }
  
  const hmac = await hmacSha1(key, timeBytes)
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff)
  
  const otp = code % Math.pow(10, digits)
  return otp.toString().padStart(digits, '0')
}

// 验证TOTP（允许前后各1个时间窗口）
async function verifyTOTP(secret: string, token: string, window = 1): Promise<boolean> {
  for (let i = -window; i <= window; i++) {
    const time = Math.floor(Date.now() / 1000 / 30) + i
    const timeBytes = new Uint8Array(8)
    let t = time
    for (let j = 7; j >= 0; j--) {
      timeBytes[j] = t & 0xff
      t = Math.floor(t / 256)
    }
    
    const key = base32Decode(secret)
    const hmac = await hmacSha1(key, timeBytes)
    const offset = hmac[hmac.length - 1] & 0x0f
    const code = ((hmac[offset] & 0x7f) << 24) |
                 ((hmac[offset + 1] & 0xff) << 16) |
                 ((hmac[offset + 2] & 0xff) << 8) |
                 (hmac[offset + 3] & 0xff)
    
    const otp = (code % 1000000).toString().padStart(6, '0')
    if (otp === token) return true
  }
  return false
}

// 获取2FA状态
app.get('/api/auth/2fa/status', async (c) => {
  const db = c.env.DB
  const adminId = c.req.query('admin_id')
  
  if (!adminId) {
    return c.json({ success: false, error: '缺少管理员ID' }, 400)
  }
  
  try {
    const admin = await db.prepare(`
      SELECT id, username, two_fa_enabled FROM admins WHERE id = ?
    `).bind(adminId).first()
    
    if (!admin) {
      return c.json({ success: false, error: '管理员不存在' }, 404)
    }
    
    return c.json({
      success: true,
      data: {
        admin_id: admin.id,
        username: admin.username,
        two_fa_enabled: admin.two_fa_enabled === 1
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 生成2FA密钥和配置URI（用于绑定）
app.post('/api/auth/2fa/setup', async (c) => {
  const db = c.env.DB
  const { admin_id } = await c.req.json()
  
  if (!admin_id) {
    return c.json({ success: false, error: '缺少管理员ID' }, 400)
  }
  
  try {
    const admin = await db.prepare(`
      SELECT id, username, two_fa_enabled, two_fa_secret FROM admins WHERE id = ?
    `).bind(admin_id).first()
    
    if (!admin) {
      return c.json({ success: false, error: '管理员不存在' }, 404)
    }
    
    if (admin.two_fa_enabled === 1) {
      return c.json({ success: false, error: '2FA已启用，请先解绑后再重新绑定' }, 400)
    }
    
    // 生成新的密钥
    const secret = generateSecret(20)
    
    // 临时存储密钥（未验证状态）
    await db.prepare(`
      UPDATE admins SET two_fa_secret = ? WHERE id = ?
    `).bind(secret, admin_id).run()
    
    // 生成otpauth URI
    const issuer = encodeURIComponent('真人荷官后台')
    const accountName = encodeURIComponent(admin.username as string)
    const otpauthUri = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
    
    // 使用Google Chart API生成二维码URL
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`
    
    return c.json({
      success: true,
      data: {
        secret: secret,
        otpauth_uri: otpauthUri,
        qr_code_url: qrCodeUrl,
        manual_entry_key: secret.match(/.{1,4}/g)?.join(' ') || secret
      },
      message: '请使用身份验证器App扫描二维码或手动输入密钥'
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 验证并启用2FA
app.post('/api/auth/2fa/verify', async (c) => {
  const db = c.env.DB
  const { admin_id, token } = await c.req.json()
  
  if (!admin_id || !token) {
    return c.json({ success: false, error: '缺少必要参数' }, 400)
  }
  
  try {
    const admin = await db.prepare(`
      SELECT id, username, two_fa_secret, two_fa_enabled FROM admins WHERE id = ?
    `).bind(admin_id).first()
    
    if (!admin) {
      return c.json({ success: false, error: '管理员不存在' }, 404)
    }
    
    if (!admin.two_fa_secret) {
      return c.json({ success: false, error: '请先生成2FA密钥' }, 400)
    }
    
    if (admin.two_fa_enabled === 1) {
      return c.json({ success: false, error: '2FA已启用' }, 400)
    }
    
    // 验证TOTP
    const isValid = await verifyTOTP(admin.two_fa_secret as string, token)
    
    if (!isValid) {
      return c.json({ success: false, error: '验证码错误，请重试' }, 400)
    }
    
    // 启用2FA
    await db.prepare(`
      UPDATE admins SET two_fa_enabled = 1, updated_at = datetime('now') WHERE id = ?
    `).bind(admin_id).run()
    
    // 记录日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, description)
      VALUES (?, ?, 'auth', '2fa_enable', '启用双因素认证')
    `).bind(admin_id, admin.username).run()
    
    return c.json({ success: true, message: '2FA绑定成功！' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 解绑2FA
app.post('/api/auth/2fa/disable', async (c) => {
  const db = c.env.DB
  const { admin_id, password, token } = await c.req.json()
  
  if (!admin_id) {
    return c.json({ success: false, error: '缺少管理员ID' }, 400)
  }
  
  try {
    const admin = await db.prepare(`
      SELECT id, username, password_hash, two_fa_secret, two_fa_enabled FROM admins WHERE id = ?
    `).bind(admin_id).first()
    
    if (!admin) {
      return c.json({ success: false, error: '管理员不存在' }, 404)
    }
    
    if (admin.two_fa_enabled !== 1) {
      return c.json({ success: false, error: '2FA未启用' }, 400)
    }
    
    // 验证密码
    if (password !== admin.password_hash) {
      return c.json({ success: false, error: '密码错误' }, 400)
    }
    
    // 如果提供了token，也验证
    if (token && admin.two_fa_secret) {
      const isValid = await verifyTOTP(admin.two_fa_secret as string, token)
      if (!isValid) {
        return c.json({ success: false, error: '验证码错误' }, 400)
      }
    }
    
    // 禁用2FA
    await db.prepare(`
      UPDATE admins SET two_fa_enabled = 0, two_fa_secret = NULL, updated_at = datetime('now') WHERE id = ?
    `).bind(admin_id).run()
    
    // 记录日志
    await db.prepare(`
      INSERT INTO audit_logs (operator_id, operator_name, module, action, description)
      VALUES (?, ?, 'auth', '2fa_disable', '解绑双因素认证')
    `).bind(admin_id, admin.username).run()
    
    return c.json({ success: true, message: '2FA已解绑' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 登录时验证2FA
app.post('/api/auth/2fa/login-verify', async (c) => {
  const db = c.env.DB
  const { admin_id, token } = await c.req.json()
  
  if (!admin_id || !token) {
    return c.json({ success: false, error: '缺少必要参数' }, 400)
  }
  
  try {
    const admin = await db.prepare(`
      SELECT id, username, two_fa_secret, two_fa_enabled FROM admins WHERE id = ?
    `).bind(admin_id).first()
    
    if (!admin || admin.two_fa_enabled !== 1 || !admin.two_fa_secret) {
      return c.json({ success: false, error: '2FA配置异常' }, 400)
    }
    
    const isValid = await verifyTOTP(admin.two_fa_secret as string, token)
    
    if (!isValid) {
      return c.json({ success: false, error: '验证码错误' }, 400)
    }
    
    return c.json({ success: true, message: '验证成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// VIP等级配置 API
// ========================================
app.get('/api/vip-levels', async (c) => {
  const db = c.env.DB
  try {
    const levels = await db.prepare("SELECT * FROM vip_levels ORDER BY level").all()
    return c.json({ success: true, data: levels.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 玩家标签 API
app.get('/api/player-tags', async (c) => {
  const db = c.env.DB
  try {
    const tags = await db.prepare("SELECT * FROM player_tags ORDER BY tag_type, tag_name").all()
    return c.json({ success: true, data: tags.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 游戏房间 API
app.get('/api/game-rooms', async (c) => {
  const db = c.env.DB
  try {
    const rooms = await db.prepare(`
      SELECT r.*, 
             (SELECT COUNT(*) FROM game_tables WHERE room_id = r.id) as actual_table_count
      FROM game_rooms r ORDER BY sort_order
    `).all()
    return c.json({ success: true, data: rooms.results })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 财务密码管理 API
// ========================================

// 财务密码配置存储（内存存储，生产环境应使用数据库）
const financePasswordConfig = {
  passwords: [
    { slot: 1, name: '', password: '', is_set: false },
    { slot: 2, name: '', password: '', is_set: false },
    { slot: 3, name: '', password: '', is_set: false }
  ],
  required_count: 1
}

// 获取财务密码配置
app.get('/api/finance-password/config', async (c) => {
  try {
    return c.json({
      success: true,
      data: {
        passwords: financePasswordConfig.passwords.map(p => ({
          slot: p.slot,
          name: p.name,
          is_set: p.is_set
        })),
        required_count: financePasswordConfig.required_count
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 设置财务密码
app.post('/api/finance-password/set', async (c) => {
  try {
    const { slot, name, password } = await c.req.json()
    
    if (!slot || slot < 1 || slot > 3) {
      return c.json({ success: false, error: '无效的密码槽位' }, 400)
    }
    
    if (!name || !password) {
      return c.json({ success: false, error: '密码名称和密码值不能为空' }, 400)
    }
    
    if (password.length < 6 || password.length > 20) {
      return c.json({ success: false, error: '密码长度必须为 6-20 位' }, 400)
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(password)) {
      return c.json({ success: false, error: '密码只能包含数字和字母' }, 400)
    }
    
    // 更新配置
    const pwdIndex = financePasswordConfig.passwords.findIndex(p => p.slot === slot)
    if (pwdIndex !== -1) {
      financePasswordConfig.passwords[pwdIndex] = {
        slot,
        name,
        password, // 生产环境应该加密存储
        is_set: true
      }
    }
    
    return c.json({ success: true, message: '财务密码设置成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 保存验证规则
app.post('/api/finance-password/rule', async (c) => {
  try {
    const { required_count } = await c.req.json()
    
    if (!required_count || required_count < 1 || required_count > 3) {
      return c.json({ success: false, error: '验证规则必须是 1-3' }, 400)
    }
    
    financePasswordConfig.required_count = required_count
    
    return c.json({ success: true, message: '验证规则保存成功' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 验证财务密码
app.post('/api/finance-password/verify', async (c) => {
  try {
    const { passwords, operation, amount } = await c.req.json()
    
    if (!passwords || !Array.isArray(passwords)) {
      return c.json({ success: false, error: '无效的密码数据' }, 400)
    }
    
    // 验证每个密码
    for (const pwd of passwords) {
      const configPwd = financePasswordConfig.passwords.find(p => p.slot === pwd.slot)
      
      if (!configPwd || !configPwd.is_set) {
        return c.json({ success: false, error: `密码 #${pwd.slot} 未设置` }, 400)
      }
      
      if (configPwd.password !== pwd.password) {
        return c.json({ success: false, error: `${configPwd.name} 密码错误` }, 400)
      }
    }
    
    // 验证密码数量是否符合要求
    if (passwords.length < financePasswordConfig.required_count) {
      return c.json({ 
        success: false, 
        error: `需要输入 ${financePasswordConfig.required_count} 个密码` 
      }, 400)
    }
    
    return c.json({ 
      success: true, 
      data: { verified: true },
      message: '密码验证成功'
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 重置财务密码（超级管理员功能）
app.post('/api/finance-password/reset/:slot', async (c) => {
  try {
    const slot = parseInt(c.req.param('slot'))
    
    if (!slot || slot < 1 || slot > 3) {
      return c.json({ success: false, error: '无效的密码槽位' }, 400)
    }
    
    // TODO: 在生产环境中，这里应该验证用户是否为超级管理员
    // const token = c.req.header('Authorization')?.replace('Bearer ', '')
    // const user = await verifyToken(token)
    // if (user.role !== 'super_admin') {
    //   return c.json({ success: false, error: '权限不足' }, 403)
    // }
    
    // 重置密码配置
    const pwdIndex = financePasswordConfig.passwords.findIndex(p => p.slot === slot)
    if (pwdIndex !== -1) {
      financePasswordConfig.passwords[pwdIndex] = {
        slot,
        name: '',
        password: '',
        is_set: false
      }
    }
    
    return c.json({ success: true, message: '财务密码已重置' })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// ========================================
// 前端页面
// ========================================
app.get('*', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>真人荷官视讯后台管理系统 V2.1</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#1e40af',
            secondary: '#7c3aed',
            success: '#059669',
            warning: '#d97706',
            danger: '#dc2626',
            dark: '#1f2937'
          }
        }
      }
    }
  </script>
  <style>
    .sidebar-item:hover, .sidebar-item.active {
      background: linear-gradient(90deg, rgba(30,64,175,0.2) 0%, transparent 100%);
      border-left: 3px solid #1e40af;
    }
    .card-stat {
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
    }
    .glow-effect {
      box-shadow: 0 0 20px rgba(30,64,175,0.3);
    }
    .data-table tr:hover {
      background-color: rgba(30,64,175,0.1);
    }
    .status-badge {
      @apply px-2 py-1 rounded-full text-xs font-medium;
    }
    .gantt-bar {
      @apply rounded h-6 text-xs flex items-center justify-center text-white;
    }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #1f2937; }
    ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 3px; }
    .modal-overlay { background: rgba(0,0,0,0.7); }
    .sidebar { transition: width 0.3s ease; }
    .main-content { transition: margin-left 0.3s ease; }
  </style>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen">
  <!-- 登录弹窗 -->
  <div id="login-modal" class="fixed inset-0 modal-overlay z-50 flex items-center justify-center">
    <div class="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-700">
      <div class="text-center mb-8">
        <div class="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto flex items-center justify-center mb-4">
          <i class="fas fa-dice text-white text-3xl"></i>
        </div>
        <h1 class="text-2xl font-bold">真人荷官视讯系统</h1>
        <p class="text-gray-400 mt-2">后台管理平台 V2.1</p>
      </div>
      
      <form id="login-form" onsubmit="handleLogin(event)">
        <div class="mb-4">
          <label class="block text-gray-400 text-sm mb-2">管理员账号</label>
          <div class="relative">
            <span class="absolute left-4 top-3 text-gray-500"><i class="fas fa-user"></i></span>
            <input type="text" id="login-username" value="admin_root" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pl-12 focus:outline-none focus:border-primary" placeholder="请输入账号">
          </div>
        </div>
        <div class="mb-6">
          <label class="block text-gray-400 text-sm mb-2">登录密码</label>
          <div class="relative">
            <span class="absolute left-4 top-3 text-gray-500"><i class="fas fa-lock"></i></span>
            <input type="password" id="login-password" value="admin123" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pl-12 focus:outline-none focus:border-primary" placeholder="请输入密码">
          </div>
        </div>
        <button type="submit" class="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 py-3 rounded-lg font-semibold transition">
          <i class="fas fa-sign-in-alt mr-2"></i>登 录
        </button>
      </form>
      
      <p class="text-center text-gray-500 text-sm mt-6">
        <i class="fas fa-shield-alt mr-1"></i>企业级安全认证
      </p>
    </div>
  </div>

  <!-- 主布局 -->
  <div id="main-app" class="flex hidden">
    <!-- 侧边栏 -->
    <aside class="sidebar w-64 bg-gray-800 min-h-screen fixed left-0 top-0 z-40 border-r border-gray-700">
      <div class="p-5 border-b border-gray-700">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <i class="fas fa-dice text-white"></i>
          </div>
          <div class="ml-3">
            <h1 class="font-bold text-lg">Live Admin</h1>
            <p class="text-xs text-gray-400">V2.1</p>
          </div>
        </div>
      </div>
      
      <nav class="p-4">
        <p class="text-xs text-gray-500 uppercase mb-3 px-3">核心业务</p>
        <a href="#" class="sidebar-item active flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="dashboard">
          <i class="fas fa-chart-pie w-5 text-primary"></i>
          <span class="ml-3">仪表盘</span>
        </a>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="players">
          <i class="fas fa-users w-5 text-cyan-400"></i>
          <span class="ml-3">玩家控端</span>
        </a>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="agents">
          <i class="fas fa-sitemap w-5 text-purple-400"></i>
          <span class="ml-3">层级控端</span>
        </a>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="finance">
          <i class="fas fa-coins w-5 text-yellow-400"></i>
          <span class="ml-3">财务控端</span>
          <span id="finance-badge" class="ml-auto bg-danger text-white text-xs px-2 py-0.5 rounded-full hidden">0</span>
        </a>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="bets">
          <i class="fas fa-dice w-5 text-pink-400"></i>
          <span class="ml-3">注单控端</span>
        </a>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="commission">
          <i class="fas fa-gift w-5 text-green-400"></i>
          <span class="ml-3">红利与洗码</span>
          <span class="ml-auto bg-orange-500 text-white text-xs px-1.5 rounded">V2.1</span>
        </a>
        
        <p class="text-xs text-gray-500 uppercase mb-3 mt-6 px-3">运营管理</p>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="risk">
          <i class="fas fa-shield-alt w-5 text-red-400"></i>
          <span class="ml-3">风险控端</span>
          <span id="risk-badge" class="ml-auto bg-danger text-white text-xs px-2 py-0.5 rounded-full hidden">0</span>
        </a>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="reports">
          <i class="fas fa-chart-bar w-5 text-blue-400"></i>
          <span class="ml-3">报表中心</span>
        </a>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="content">
          <i class="fas fa-newspaper w-5 text-indigo-400"></i>
          <span class="ml-3">内容管理</span>
        </a>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="system">
          <i class="fas fa-cog w-5 text-gray-400"></i>
          <span class="ml-3">系统设置</span>
        </a>
        <a href="#" class="sidebar-item flex items-center px-4 py-3 rounded-lg mb-1 transition" data-module="studio">
          <i class="fas fa-video w-5 text-teal-400"></i>
          <span class="ml-3">现场运营</span>
          <span class="ml-auto bg-green-500 text-white text-xs px-1.5 rounded">NEW</span>
        </a>
      </nav>
    </aside>
    
    <!-- 主内容区 -->
    <main class="main-content flex-1 ml-64">
      <!-- 顶部导航 -->
      <header class="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h2 id="page-title" class="text-xl font-bold">仪表盘</h2>
          <p id="page-subtitle" class="text-sm text-gray-400">数据概览与快捷操作</p>
        </div>
        <div class="flex items-center space-x-4">
          <!-- 提示标识区域 - 存款/取款/风险预警 -->
          <div class="flex items-center space-x-1 mr-4 bg-gray-700/80 rounded-lg px-2 py-1.5 border border-gray-600">
            <button id="notify-deposit" onclick="goToDeposits()" class="relative flex items-center space-x-1.5 px-2.5 py-1 hover:bg-yellow-600/20 rounded transition-colors text-yellow-400" title="待审核存款申请">
              <i class="fas fa-arrow-circle-down text-sm"></i>
              <span class="text-xs font-medium">存款</span>
              <span id="notify-deposit-count" class="ml-1 bg-gray-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1 font-bold">0</span>
            </button>
            <div class="w-px h-5 bg-gray-500"></div>
            <button id="notify-withdraw" onclick="goToWithdrawals()" class="relative flex items-center space-x-1.5 px-2.5 py-1 hover:bg-green-600/20 rounded transition-colors text-green-400" title="待审核取款申请">
              <i class="fas fa-arrow-circle-up text-sm"></i>
              <span class="text-xs font-medium">取款</span>
              <span id="notify-withdraw-count" class="ml-1 bg-gray-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1 font-bold">0</span>
            </button>
            <div class="w-px h-5 bg-gray-500"></div>
            <button id="notify-risk" onclick="goToRiskAlerts()" class="relative flex items-center space-x-1.5 px-2.5 py-1 hover:bg-red-600/20 rounded transition-colors text-red-400" title="待处理风险预警">
              <i class="fas fa-exclamation-triangle text-sm"></i>
              <span class="text-xs font-medium">预警</span>
              <span id="notify-risk-count" class="ml-1 bg-gray-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1 font-bold">0</span>
            </button>
          </div>
          <span id="current-time" class="text-gray-400 text-sm"></span>
          <button onclick="refreshData()" class="p-2 hover:bg-gray-700 rounded-lg" title="刷新数据">
            <i class="fas fa-sync-alt"></i>
          </button>
          <div class="flex items-center">
            <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <i class="fas fa-user text-white text-sm"></i>
            </div>
            <div class="ml-2 text-right">
              <p id="admin-name" class="text-sm font-medium">Admin</p>
              <p id="admin-role" class="text-xs text-gray-400">超级管理员</p>
            </div>
            <button onclick="logout()" class="ml-4 p-2 hover:bg-gray-700 rounded-lg text-red-400" title="退出">
              <i class="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>
      
      <!-- 内容区 -->
      <div id="content-container" class="p-6">
        <!-- 动态内容 -->
      </div>
    </main>
  </div>

  <script src="/static/app.js?v=20251130-33"></script>
</body>
</html>
  `)
})

// ========================================
// 股东/代理后台 API
// ========================================

// 股东/代理登录
app.post('/api/agent/login', async (c) => {
  const db = c.env.DB
  const { username, password } = await c.req.json()
  
  try {
    // 查询代理账号
    const agent = await db.prepare(`
      SELECT id, agent_username, nickname, level, status, parent_agent_id, contact_phone, commission_ratio
      FROM agents 
      WHERE agent_username = ? AND password_hash = ?
    `).bind(username, password).first() as any
    
    if (!agent) {
      return c.json({ success: false, error: '账号或密码错误' }, 401)
    }
    
    if (agent.status !== 1) {
      return c.json({ success: false, error: '账号已被停用' }, 403)
    }
    
    // 生成token（简化版，生产环境应使用JWT）
    const token = `agent_${agent.id}_${Date.now()}`
    
    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: agent.id,
          username: agent.agent_username,
          real_name: agent.nickname,
          role: agent.level, // 'shareholder' 或 'agent'
          level: agent.level,
          phone: agent.contact_phone
        }
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 验证token
app.get('/api/agent/verify', async (c) => {
  const db = c.env.DB
  const auth = c.req.header('Authorization')
  
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未登录' }, 401)
  }
  
  const token = auth.substring(7)
  const agentId = token.split('_')[1]
  
  try {
    const agent = await db.prepare(`
      SELECT id, agent_username, nickname, level, status FROM agents WHERE id = ?
    `).bind(agentId).first() as any
    
    if (!agent || agent.status !== 1) {
      return c.json({ success: false, error: '登录已失效' }, 401)
    }
    
    return c.json({
      success: true,
      data: {
        user: {
          id: agent.id,
          username: agent.agent_username,
          real_name: agent.nickname,
          role: agent.level,
          level: agent.level
        }
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 获取当前代理ID（从token解析）
function getAgentIdFromToken(c: any): number | null {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return null
  
  const token = auth.substring(7)
  const agentId = parseInt(token.split('_')[1])
  return isNaN(agentId) ? null : agentId
}

// 获取仪表盘统计
app.get('/api/agent/dashboard/stats', async (c) => {
  const db = c.env.DB
  const agentId = getAgentIdFromToken(c)
  
  if (!agentId) {
    return c.json({ success: false, error: '未登录' }, 401)
  }
  
  try {
    // 模拟数据（实际应从数据库查询）
    const stats = {
      todayRevenue: 25680.50,
      revenueChange: 12.5,
      teamCount: 255,
      agentCount: 15,
      monthCommission: 18500.00,
      settledCommission: 12000.00,
      activePlayers: 180,
      newPlayers: 8,
      revenueChart: {
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        values: [12000, 15000, 13000, 18000, 16000, 20000, 22000]
      },
      teamChart: {
        labels: ['直属代理', '二级代理', '三级代理', '玩家'],
        values: [10, 25, 40, 180]
      }
    }
    
    return c.json({ success: true, data: stats })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 获取下级代理列表
app.get('/api/agent/subordinates', async (c) => {
  const db = c.env.DB
  const agentId = getAgentIdFromToken(c)
  
  if (!agentId) {
    return c.json({ success: false, error: '未登录' }, 401)
  }
  
  const page = parseInt(c.req.query('page') || '1')
  const pageSize = 20
  const offset = (page - 1) * pageSize
  
  const search = c.req.query('search') || ''
  const level = c.req.query('level') || ''
  const status = c.req.query('status') || ''
  
  try {
    let whereConditions = ['parent_agent_id = ?']
    let params: any[] = [agentId]
    
    if (search) {
      whereConditions.push('(agent_username LIKE ? OR nickname LIKE ? OR contact_phone LIKE ?)')
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }
    
    if (level) {
      whereConditions.push('level = ?')
      params.push(level)
    }
    
    if (status !== '') {
      whereConditions.push('status = ?')
      params.push(status)
    }
    
    const whereClause = whereConditions.join(' AND ')
    
    // 查询总数
    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM agents WHERE ${whereClause}
    `).bind(...params).first() as any
    
    // 查询列表
    const list = await db.prepare(`
      SELECT 
        a.id, 
        a.agent_username as username, 
        a.nickname as real_name, 
        a.contact_phone as phone, 
        a.level, 
        a.status, 
        a.created_at,
        (SELECT COUNT(*) FROM agents WHERE parent_agent_id = a.id) as subordinate_count,
        0 as player_count,
        0 as month_performance
      FROM agents a
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, pageSize, offset).all()
    
    return c.json({
      success: true,
      data: {
        list: list.results,
        pagination: {
          current: page,
          pageSize,
          total: countResult.total
        }
      }
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

// 新增下级代理
app.post('/api/agent/subordinates', async (c) => {
  const db = c.env.DB
  const agentId = getAgentIdFromToken(c)
  
  if (!agentId) {
    return c.json({ success: false, error: '未登录' }, 401)
  }
  
  const { username, password, real_name, phone, commission_rate } = await c.req.json()
  
  // 验证输入
  if (!username || !password || !real_name || !phone) {
    return c.json({ success: false, error: '请填写完整信息' }, 400)
  }
  
  try {
    // 检查账号是否已存在
    const existing = await db.prepare('SELECT id FROM agents WHERE agent_username = ?').bind(username).first()
    if (existing) {
      return c.json({ success: false, error: '账号已存在' }, 400)
    }
    
    // 插入新代理
    const result = await db.prepare(`
      INSERT INTO agents (agent_username, password_hash, nickname, contact_phone, level, parent_agent_id, commission_ratio, status)
      VALUES (?, ?, ?, ?, 'agent', ?, ?, 1)
    `).bind(username, password, real_name, phone, agentId, commission_rate || 0).run()
    
    return c.json({
      success: true,
      data: { id: result.meta.last_row_id },
      message: '新增成功'
    })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

export default app
