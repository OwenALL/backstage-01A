// 真人荷官视讯后台管理系统 V2.1
// 前端应用

let currentUser = null;
let currentModule = 'dashboard';
let dashboardChart = null;
let gameChart = null;

// 安全工具函数 - 防止XSS攻击
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// 转义用于JS字符串中的内容
const escapeJs = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
};

// 工具函数
const formatCurrency = (num) => {
  return '$ ' + Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumber = (num) => Number(num || 0).toLocaleString('en-US');

const formatDateTime = (dt) => {
  if (!dt) return '-';
  return dayjs(dt).format('YYYY-MM-DD HH:mm:ss');
};

const formatDate = (dt) => {
  if (!dt) return '-';
  return dayjs(dt).format('YYYY-MM-DD');
};

const getStatusBadge = (status, type = 'default') => {
  // 支持数字和字符串状态映射
  const statusMap = {
    // 字符串状态
    active: { class: 'bg-green-600', text: '正常' },
    frozen: { class: 'bg-blue-600', text: '冻结' },
    locked: { class: 'bg-red-600', text: '锁定' },
    pending: { class: 'bg-yellow-600', text: '待处理' },
    approved: { class: 'bg-green-600', text: '已通过' },
    rejected: { class: 'bg-red-600', text: '已拒绝' },
    settled: { class: 'bg-green-600', text: '已结算' },
    voided: { class: 'bg-gray-600', text: '已作废' },
    pending_kyc: { class: 'bg-yellow-600', text: '待KYC' },
    verified: { class: 'bg-green-600', text: '已验证' },
    auto_approved: { class: 'bg-green-600', text: '自动通过' },
    manual_review: { class: 'bg-yellow-600', text: '人工审核' },
    handled: { class: 'bg-gray-600', text: '已处理' },
    ignored: { class: 'bg-gray-600', text: '已忽略' },
    published: { class: 'bg-green-600', text: '已发布' },
    draft: { class: 'bg-gray-600', text: '草稿' },
    scheduled: { class: 'bg-blue-600', text: '定时发布' },
    vacation: { class: 'bg-yellow-600', text: '休假' },
    resigned: { class: 'bg-red-600', text: '离职' },
    maintenance: { class: 'bg-yellow-600', text: '维护中' },
    offline: { class: 'bg-gray-600', text: '离线' },
    in_progress: { class: 'bg-blue-600', text: '进行中' },
    completed: { class: 'bg-green-600', text: '已完成' },
    cancelled: { class: 'bg-red-600', text: '已取消' },
    // 数字状态映射 - 玩家状态
    0: { class: 'bg-green-600', text: '正常' },
    1: { class: 'bg-blue-600', text: '冻结' },
    2: { class: 'bg-red-600', text: '锁定' },
    // 提款状态
    'withdraw_0': { class: 'bg-yellow-600', text: '待审核' },
    'withdraw_1': { class: 'bg-blue-600', text: '审核中' },
    'withdraw_2': { class: 'bg-cyan-600', text: '一审通过' },
    'withdraw_3': { class: 'bg-indigo-600', text: '二审通过' },
    'withdraw_4': { class: 'bg-green-600', text: '已出款' },
    'withdraw_5': { class: 'bg-red-600', text: '已拒绝' },
    // 注单状态
    'bet_0': { class: 'bg-yellow-600', text: '未结算' },
    'bet_1': { class: 'bg-green-600', text: '已结算' },
    'bet_2': { class: 'bg-blue-600', text: '已取消' },
    'bet_3': { class: 'bg-gray-600', text: '已作废' },
    // 洗码状态
    'commission_0': { class: 'bg-yellow-600', text: '待审核' },
    'commission_1': { class: 'bg-blue-600', text: '审核中' },
    'commission_2': { class: 'bg-red-600', text: '已拒绝' },
    'commission_3': { class: 'bg-green-600', text: '已发放' },
    // 风控预警状态
    'alert_0': { class: 'bg-yellow-600', text: '待处理' },
    'alert_1': { class: 'bg-green-600', text: '已处理' },
    'alert_2': { class: 'bg-gray-600', text: '已忽略' },
    // 内容状态
    'content_0': { class: 'bg-gray-600', text: '草稿' },
    'content_1': { class: 'bg-green-600', text: '已发布' },
    'content_2': { class: 'bg-blue-600', text: '定时发布' },
    // 荷官状态
    'dealer_1': { class: 'bg-green-600', text: '在职' },
    'dealer_2': { class: 'bg-yellow-600', text: '休假' },
    'dealer_3': { class: 'bg-red-600', text: '离职' },
    // 桌台状态
    'table_1': { class: 'bg-green-600', text: '运营中' },
    'table_2': { class: 'bg-yellow-600', text: '维护中' },
    'table_3': { class: 'bg-gray-600', text: '已关闭' }
  };
  
  // 根据类型构建键名
  let key = status;
  if (type !== 'default' && typeof status === 'number') {
    key = `${type}_${status}`;
  }
  
  const s = statusMap[key] || statusMap[status] || { class: 'bg-gray-600', text: status };
  return `<span class="status-badge ${s.class}">${s.text}</span>`;
};

// 风险等级数字转文字
const getRiskLevelText = (level) => {
  const map = { 0: 'normal', 1: 'medium', 2: 'high', 3: 'blacklist' };
  return map[level] || level || 'normal';
};

// Toast提示函数
const showToast = (message, type = 'info') => {
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600'
  };
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 ${colors[type] || colors.info} text-white px-6 py-3 rounded-lg shadow-lg z-[200] flex items-center space-x-3 animate-slide-in`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease-in-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// 成功提示的简写
const showSuccess = (message) => showToast(message, 'success');
const showError = (message) => showToast(message, 'error');
const showWarning = (message) => showToast(message, 'warning');

const getRiskBadge = (level) => {
  const map = {
    normal: { class: 'bg-green-600', text: '正常' },
    medium: { class: 'bg-yellow-600', text: '中风险' },
    high: { class: 'bg-orange-600', text: '高风险' },
    blacklist: { class: 'bg-red-600', text: '黑名单' },
    // 数字映射
    0: { class: 'bg-green-600', text: '正常' },
    1: { class: 'bg-yellow-600', text: '中风险' },
    2: { class: 'bg-orange-600', text: '高风险' },
    3: { class: 'bg-red-600', text: '黑名单' }
  };
  const r = map[level] || { class: 'bg-gray-600', text: level };
  return `<span class="status-badge ${r.class}">${r.text}</span>`;
};

const getSeverityBadge = (severity) => {
  const map = {
    low: { class: 'bg-gray-600', text: '低' },
    medium: { class: 'bg-yellow-600', text: '中' },
    high: { class: 'bg-orange-600', text: '高' },
    critical: { class: 'bg-red-600', text: '严重' }
  };
  const s = map[severity] || { class: 'bg-gray-600', text: severity };
  return `<span class="status-badge ${s.class}">${s.text}</span>`;
};

const getGameTypeName = (type) => {
  const map = {
    baccarat: '百家乐',
    dragon_tiger: '龙虎',
    roulette: '轮盘',
    sic_bo: '骰宝',
    bull_bull: '牛牛'
  };
  return map[type] || type;
};

const getTransactionTypeName = (type) => {
  const map = {
    deposit: '存款',
    withdraw: '提款',
    bet: '投注',
    payout: '派彩',
    bonus: '红利',
    commission: '洗码',
    manual_adjust: '人工调整'
  };
  return map[type] || type;
};

// API 请求
const api = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: error.message };
  }
};

// 登录处理
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  const result = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  
  if (result.success) {
    currentUser = result.data;
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showMainApp();
    loadModule('dashboard');
    updatePendingBadges();
  } else {
    alert(result.error || '登录失败');
  }
}

function getRoleName(role) {
  const map = {
    super_admin: '超级管理员',
    finance: '财务总监',
    risk: '风控专员',
    customer_service: '客服主管',
    operator: '运营专员'
  };
  return map[role] || role;
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
}

// 时间更新
function updateTime() {
  document.getElementById('current-time').textContent = dayjs().format('YYYY-MM-DD HH:mm:ss');
}
setInterval(updateTime, 1000);
updateTime();

// 定期刷新顶部提示标识（每30秒）
setInterval(() => {
  if (currentUser) {
    updatePendingBadges();
  }
}, 30000);

// 模块切换
document.querySelectorAll('.sidebar-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const module = item.dataset.module;
    if (module) {
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      loadModule(module);
    }
  });
});

// 数据刷新
function refreshData() {
  loadModule(currentModule);
}

// 模块加载
async function loadModule(module) {
  currentModule = module;
  const container = document.getElementById('content-container');
  
  const titleMap = {
    dashboard: { title: '仪表盘', subtitle: '数据概览与快捷操作' },
    players: { title: '玩家控端', subtitle: '玩家管理、KYC与生命周期' },
    agents: { title: '层级控端', subtitle: '代理体系与佣金配置' },
    finance: { title: '财务控端', subtitle: '资金流水与出入金审核' },
    bets: { title: '注单控端', subtitle: '投注记录与视频回放' },
    commission: { title: '红利与洗码', subtitle: 'V2.1升级 - 洗码策略配置' },
    risk: { title: '风险控端', subtitle: '实时监控与套利识别' },
    reports: { title: '报表中心', subtitle: '多维度经营报表' },
    content: { title: '内容管理', subtitle: '公告与游戏规则' },
    system: { title: '系统设置', subtitle: 'RBAC权限与安全配置' },
    studio: { title: '现场运营控端', subtitle: 'V2.1新增 - 荷官排班与桌台管理' }
  };
  
  const info = titleMap[module] || { title: module, subtitle: '' };
  document.getElementById('page-title').textContent = info.title;
  document.getElementById('page-subtitle').textContent = info.subtitle;
  
  container.innerHTML = '<div class="text-center py-20"><i class="fas fa-spinner fa-spin text-4xl text-primary"></i><p class="mt-4 text-gray-400">加载中...</p></div>';
  
  switch(module) {
    case 'dashboard': await renderDashboard(container); break;
    case 'players': await renderPlayers(container); break;
    case 'agents': await renderAgents(container); break;
    case 'finance': await renderFinance(container); break;
    case 'bets': await renderBets(container); break;
    case 'commission': await renderCommission(container); break;
    case 'risk': await renderRisk(container); break;
    case 'reports': await renderReports(container); break;
    case 'content': await renderContent(container); break;
    case 'system': await renderSystem(container); break;
    case 'studio': await renderStudio(container); break;
  }
}

// =====================
// 1. 仪表盘
// =====================
async function renderDashboard(container) {
  const result = await api('/api/dashboard/stats');
  if (!result.success) {
    container.innerHTML = `<div class="text-center text-red-500">${result.error}</div>`;
    return;
  }
  
  const d = result.data;
  
  container.innerHTML = `
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div class="card-stat rounded-xl p-5 glow-effect">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-gray-400 text-sm">总资金池</p>
            <p class="text-2xl font-bold text-white mt-1">${formatCurrency(d.totalBalance)}</p>
          </div>
          <div class="w-12 h-12 bg-blue-600 bg-opacity-30 rounded-lg flex items-center justify-center">
            <i class="fas fa-university text-blue-400 text-xl"></i>
          </div>
        </div>
        <p class="text-green-400 text-sm mt-3"><i class="fas fa-arrow-up mr-1"></i>公司资金状态</p>
      </div>
      
      <div class="card-stat rounded-xl p-5">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-gray-400 text-sm">今日营收</p>
            <p class="text-2xl font-bold ${d.todayProfit >= 0 ? 'text-green-400' : 'text-red-400'} mt-1">${formatCurrency(d.todayProfit)}</p>
          </div>
          <div class="w-12 h-12 bg-green-600 bg-opacity-30 rounded-lg flex items-center justify-center">
            <i class="fas fa-chart-line text-green-400 text-xl"></i>
          </div>
        </div>
        <p class="text-gray-400 text-sm mt-3">投注: ${formatCurrency(d.todayBet)} / 派彩: ${formatCurrency(d.todayPayout)}</p>
      </div>
      
      <div class="card-stat rounded-xl p-5">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-gray-400 text-sm">今日存款</p>
            <p class="text-2xl font-bold text-cyan-400 mt-1">${formatCurrency(d.todayDeposit)}</p>
          </div>
          <div class="w-12 h-12 bg-cyan-600 bg-opacity-30 rounded-lg flex items-center justify-center">
            <i class="fas fa-arrow-down text-cyan-400 text-xl"></i>
          </div>
        </div>
        <p class="text-gray-400 text-sm mt-3">今日提款: ${formatCurrency(d.todayWithdraw)}</p>
      </div>
      
      <div class="card-stat rounded-xl p-5">
        <div class="flex justify-between items-start">
          <div>
            <p class="text-gray-400 text-sm">实时在线</p>
            <p class="text-2xl font-bold text-purple-400 mt-1">${formatNumber(d.onlinePlayers)}</p>
          </div>
          <div class="w-12 h-12 bg-purple-600 bg-opacity-30 rounded-lg flex items-center justify-center">
            <i class="fas fa-users text-purple-400 text-xl"></i>
          </div>
        </div>
        <p class="text-yellow-400 text-sm mt-3"><i class="fas fa-exclamation-triangle mr-1"></i>待审提款: ${d.pendingWithdraws} 笔</p>
      </div>
    </div>
    
    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-gray-800 rounded-xl p-5">
        <h3 class="text-lg font-semibold mb-4"><i class="fas fa-chart-area text-primary mr-2"></i>7天趋势</h3>
        <canvas id="trendChart" height="200"></canvas>
      </div>
      
      <div class="bg-gray-800 rounded-xl p-5">
        <h3 class="text-lg font-semibold mb-4"><i class="fas fa-bell text-danger mr-2"></i>待处理事项</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600" onclick="loadModule('finance')">
            <div class="flex items-center">
              <i class="fas fa-money-bill-wave text-yellow-400 mr-3"></i>
              <span>待审核提款</span>
            </div>
            <span class="bg-danger text-white text-sm px-3 py-1 rounded-full">${d.pendingWithdraws}</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600" onclick="loadModule('risk')">
            <div class="flex items-center">
              <i class="fas fa-shield-alt text-red-400 mr-3"></i>
              <span>风控预警</span>
            </div>
            <span class="bg-danger text-white text-sm px-3 py-1 rounded-full">${d.pendingAlerts}</span>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600" onclick="loadModule('commission')">
            <div class="flex items-center">
              <i class="fas fa-gift text-green-400 mr-3"></i>
              <span>待发洗码</span>
            </div>
            <span class="bg-warning text-white text-sm px-3 py-1 rounded-full">12</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Quick Actions & Admin Info -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-gray-800 rounded-xl p-5">
        <h3 class="text-lg font-semibold mb-4"><i class="fas fa-bolt text-warning mr-2"></i>快捷操作</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button class="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition" onclick="loadModule('finance')">
            <i class="fas fa-plus-circle text-green-400 text-2xl mb-2"></i>
            <span class="text-sm">人工存款</span>
          </button>
          <button class="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition" onclick="loadModule('finance')">
            <i class="fas fa-minus-circle text-red-400 text-2xl mb-2"></i>
            <span class="text-sm">人工提款</span>
          </button>
          <button class="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition" onclick="loadModule('content')">
            <i class="fas fa-bullhorn text-blue-400 text-2xl mb-2"></i>
            <span class="text-sm">发布公告</span>
          </button>
          <button class="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition" onclick="loadModule('risk')">
            <i class="fas fa-exclamation-triangle text-yellow-400 text-2xl mb-2"></i>
            <span class="text-sm">风控预警</span>
          </button>
        </div>
      </div>
      
      <div class="bg-gray-800 rounded-xl p-5">
        <h3 class="text-lg font-semibold mb-4"><i class="fas fa-user-shield text-primary mr-2"></i>管理员信息</h3>
        <div class="flex items-center mb-4">
          <div class="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            <i class="fas fa-user text-white text-xl"></i>
          </div>
          <div class="ml-4">
            <p class="font-semibold">${currentUser?.nickname || 'Admin'}</p>
            <p class="text-sm text-gray-400">${getRoleName(currentUser?.role)}</p>
          </div>
        </div>
        <div class="text-sm text-gray-400 space-y-2">
          <p><i class="fas fa-desktop mr-2"></i>IP: 192.168.1.102</p>
          <p><i class="fas fa-clock mr-2"></i>登录时间: ${dayjs().format('HH:mm:ss')}</p>
          <div class="flex items-center justify-between">
            <p><i class="fas fa-shield-alt mr-2 ${currentUser?.two_fa_enabled ? 'text-green-400' : 'text-yellow-400'}"></i>2FA: ${currentUser?.two_fa_enabled ? '已启用' : '未启用'}</p>
            <button onclick="show2FASettings()" class="text-xs px-2 py-1 ${currentUser?.two_fa_enabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-yellow-600 hover:bg-yellow-500'} rounded transition" title="管理2FA">
              <i class="fas fa-cog"></i>
            </button>
          </div>
        </div>
        ${!currentUser?.two_fa_enabled ? `
        <button onclick="show2FASettings()" class="w-full mt-4 bg-yellow-600 hover:bg-yellow-500 py-2 rounded-lg text-sm transition">
          <i class="fas fa-shield-alt mr-2"></i>立即启用 2FA 保护账户
        </button>
        ` : ''}
      </div>
    </div>
  `;
  
  // 渲染趋势图
  const ctx = document.getElementById('trendChart').getContext('2d');
  if (dashboardChart) dashboardChart.destroy();
  
  const trendData = d.trendData || [];
  const labels = trendData.map(t => dayjs(t.date).format('MM-DD'));
  
  dashboardChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['今日'],
      datasets: [{
        label: '存款',
        data: trendData.map(t => t.deposits),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6,182,212,0.1)',
        fill: true,
        tension: 0.4
      }, {
        label: '提款',
        data: trendData.map(t => t.withdraws),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#9ca3af' } } },
      scales: {
        x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
        y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
      }
    }
  });
}

// =====================
// 2. 玩家控端
// =====================
async function renderPlayers(container) {
  const result = await api('/api/players');
  if (!result.success) {
    container.innerHTML = `<div class="text-center text-red-500">${result.error}</div>`;
    return;
  }
  
  const players = result.data;
  const stats = result.stats || { total: players.length, online: 0, offline: players.length };
  
  container.innerHTML = `
    <!-- Tabs -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button id="tab-player-list" onclick="switchPlayerTab('list')" class="px-4 py-2 bg-primary rounded-lg">玩家管理</button>
      <button id="tab-vip-config" onclick="switchPlayerTab('vip-config')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"><i class="fas fa-crown text-yellow-400 mr-1"></i>VIP等级配置</button>
    </div>
    
    <!-- 玩家管理 -->
    <div id="player-list">
    <!-- 在线统计卡片 -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-gray-800 rounded-xl p-4 flex items-center">
        <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
          <i class="fas fa-users text-white text-xl"></i>
        </div>
        <div>
          <p class="text-gray-400 text-sm">总玩家</p>
          <p class="text-2xl font-bold">${formatNumber(stats.total)}</p>
        </div>
      </div>
      <div class="bg-gray-800 rounded-xl p-4 flex items-center cursor-pointer hover:bg-gray-700" onclick="filterPlayersByOnline('online')">
        <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
          <i class="fas fa-circle text-white text-xl animate-pulse"></i>
        </div>
        <div>
          <p class="text-gray-400 text-sm">在线玩家</p>
          <p class="text-2xl font-bold text-green-400">${formatNumber(stats.online)}</p>
        </div>
      </div>
      <div class="bg-gray-800 rounded-xl p-4 flex items-center cursor-pointer hover:bg-gray-700" onclick="filterPlayersByOnline('offline')">
        <div class="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center mr-4">
          <i class="fas fa-circle text-gray-400 text-xl"></i>
        </div>
        <div>
          <p class="text-gray-400 text-sm">离线玩家</p>
          <p class="text-2xl font-bold text-gray-400">${formatNumber(stats.offline)}</p>
        </div>
      </div>
    </div>
    
    <!-- 查询条件栏 -->
    <div class="bg-gray-800 rounded-xl p-5 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- 搜索框 -->
        <div>
          <label class="text-gray-300 text-xs block mb-1.5 font-medium">账号/昵称</label>
          <input type="text" id="player-search" placeholder="搜索用户名/昵称..." class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
        </div>
        
        <!-- 所属代理（层级搜索） -->
        <div>
          <label class="text-gray-300 text-xs block mb-1.5 font-medium">所属代理</label>
          <select id="player-agent" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="">全部代理</option>
            <!-- 代理列表将动态加载 -->
          </select>
        </div>
        
        <!-- VIP等级 -->
        <div>
          <label class="text-gray-300 text-xs block mb-1.5 font-medium">VIP等级</label>
          <select id="player-vip" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="">全部等级</option>
            <option value="0">VIP 0</option>
            <option value="1">VIP 1</option>
            <option value="2">VIP 2</option>
            <option value="3">VIP 3</option>
            <option value="4">VIP 4</option>
            <option value="5">VIP 5</option>
            <option value="6">VIP 6</option>
            <option value="7">VIP 7</option>
            <option value="8">VIP 8</option>
            <option value="9">VIP 9</option>
          </select>
        </div>
        
        <!-- 风险等级 -->
        <div>
          <label class="text-gray-300 text-xs block mb-1.5 font-medium">风险等级</label>
          <select id="player-risk" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="">全部风险</option>
            <option value="0">正常</option>
            <option value="1">低风险</option>
            <option value="2">中风险</option>
            <option value="3">高风险</option>
          </select>
        </div>
        
        <!-- 账号状态 -->
        <div>
          <label class="text-gray-300 text-xs block mb-1.5 font-medium">账号状态</label>
          <select id="player-status" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="">全部状态</option>
            <option value="0">正常</option>
            <option value="1">冻结</option>
            <option value="2">锁定</option>
          </select>
        </div>
        
        <!-- 在线状态 -->
        <div>
          <label class="text-gray-300 text-xs block mb-1.5 font-medium">在线状态</label>
          <select id="player-online-status" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="">全部</option>
            <option value="online">在线</option>
            <option value="offline">离线</option>
          </select>
        </div>
        
        <!-- 余额范围 -->
        <div>
          <label class="text-gray-300 text-xs block mb-1.5 font-medium">余额范围</label>
          <div class="flex gap-2">
            <input type="number" id="player-balance-min" placeholder="最小" class="w-1/2 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <input type="number" id="player-balance-max" placeholder="最大" class="w-1/2 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex items-end gap-2">
          <button onclick="searchPlayers()" class="flex-1 bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <i class="fas fa-search mr-1.5"></i>查询
          </button>
          <button onclick="resetPlayerSearch()" class="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <i class="fas fa-redo mr-1.5"></i>重置
          </button>
        </div>
      </div>
      
      <!-- 操作按钮栏 -->
      <div class="flex gap-3 mt-4 pt-4 border-t border-gray-700">
        <button onclick="showAddPlayerModal()" class="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-medium transition-colors">
          <i class="fas fa-plus mr-2"></i>新增玩家
        </button>
        <button onclick="exportPlayers()" class="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-medium transition-colors">
          <i class="fas fa-file-export mr-2"></i>导出报表
        </button>
        <button onclick="refreshPlayers()" class="bg-gray-600 hover:bg-gray-700 px-5 py-2 rounded-lg font-medium transition-colors">
          <i class="fas fa-sync-alt mr-2"></i>刷新
        </button>
      </div>
    </div>
    
    <div class="bg-gray-800 rounded-xl overflow-hidden">
      <table class="w-full data-table" id="players-table">
        <thead class="bg-gray-700">
          <tr>
            <th class="text-left p-4">ID</th>
            <th class="text-left p-4">账号</th>
            <th class="text-left p-4">余额</th>
            <th class="text-left p-4">VIP</th>
            <th class="text-left p-4">所属代理</th>
            <th class="text-left p-4">风险等级</th>
            <th class="text-left p-4">状态</th>
            <th class="text-left p-4">在线</th>
            <th class="text-left p-4">操作</th>
          </tr>
        </thead>
        <tbody>
          ${players.map(p => `
            <tr class="border-t border-gray-700">
              <td class="p-4">${p.id}</td>
              <td class="p-4">
                <div>
                  <p class="font-medium">${playerLink(p.id, p.username)}</p>
                  <p class="text-sm text-gray-400">${p.nickname || '-'}</p>
                </div>
              </td>
              <td class="p-4 font-mono ${p.balance > 10000 ? 'text-green-400' : ''}">${formatCurrency(p.balance)}</td>
              <td class="p-4"><span class="bg-purple-600 px-2 py-1 rounded text-xs">VIP${p.vip_level}</span></td>
              <td class="p-4">${p.agent_id ? agentLink(p.agent_id, p.agent_name) : '-'}</td>
              <td class="p-4">${getRiskBadge(p.risk_level)}</td>
              <td class="p-4">${getStatusBadge(p.status)}</td>
              <td class="p-4">
                ${p.is_online ? '<span class="flex items-center text-green-400"><i class="fas fa-circle text-xs mr-2 animate-pulse"></i>在线</span>' : '<span class="text-gray-500">离线</span>'}
              </td>
              <td class="p-4">
                <button onclick="viewPlayer(${p.id})" class="text-blue-400 hover:text-blue-300 mr-2" title="详情"><i class="fas fa-eye"></i></button>
                <button onclick="togglePlayerStatus(${p.id}, ${p.status})" class="text-yellow-400 hover:text-yellow-300 mr-2" title="${p.status === 1 ? '解冻' : '冻结'}">
                  <i class="fas fa-${p.status === 1 ? 'unlock' : 'lock'}"></i>
                </button>
                ${p.is_online ? '<button onclick="kickPlayer(' + p.id + ')" class="text-red-400 hover:text-red-300" title="踢线"><i class="fas fa-sign-out-alt"></i></button>' : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="flex justify-between items-center mt-4 text-sm text-gray-400">
      <span>共 ${result.pagination?.total || players.length} 条记录</span>
      <div class="flex space-x-2">
        <button class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">上一页</button>
        <button class="px-3 py-1 bg-primary rounded">1</button>
        <button class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">下一页</button>
      </div>
    </div>
    </div>
    
    <!-- VIP等级配置 -->
    <div id="player-vip-config" class="hidden">
      <!-- 说明卡片 -->
      <div class="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl p-4 mb-6 flex items-center">
        <i class="fas fa-crown text-yellow-300 text-3xl mr-4"></i>
        <div>
          <h3 class="font-bold text-white text-lg">VIP等级规则配置</h3>
          <p class="text-sm text-yellow-100 mt-1">配置不同VIP等级的升级条件、专属权益和晋升要求</p>
        </div>
      </div>
      
      <!-- 添加按钮 -->
      <div class="mb-6 flex justify-between items-center">
        <div>
          <h3 class="text-xl font-bold"><i class="fas fa-list-alt text-primary mr-2"></i>VIP等级列表</h3>
          <p class="text-sm text-gray-400 mt-1">系统支持最多10个VIP等级</p>
        </div>
        <button onclick="showAddVipLevelModal()" class="bg-primary hover:bg-blue-700 px-5 py-2.5 rounded-lg font-medium shadow-lg transition-all">
          <i class="fas fa-plus mr-2"></i>新增VIP等级
        </button>
      </div>
      
      <!-- VIP等级卡片网格 -->
      <div id="vip-levels-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="text-center text-gray-400 py-8 col-span-full">
          <i class="fas fa-spinner fa-spin mr-2"></i>加载中...
        </div>
      </div>
    </div>
  `;
  
  // 加载VIP等级配置
  loadVipLevels();
  
  // 加载代理列表用于筛选
  loadAgentsForFilter();
}

// 按在线状态筛选
async function filterPlayersByOnline(status) {
  document.getElementById('player-online-status').value = status;
  searchPlayers();
}

// 玩家搜索（增强版）
async function searchPlayers() {
  const search = document.getElementById('player-search')?.value || '';
  const agent = document.getElementById('player-agent')?.value || '';
  const vip = document.getElementById('player-vip')?.value || '';
  const risk = document.getElementById('player-risk')?.value || '';
  const status = document.getElementById('player-status')?.value || '';
  const onlineStatus = document.getElementById('player-online-status')?.value || '';
  const balanceMin = document.getElementById('player-balance-min')?.value || '';
  const balanceMax = document.getElementById('player-balance-max')?.value || '';
  
  let url = '/api/players?';
  const params = [];
  if (search) params.push('search=' + encodeURIComponent(search));
  if (agent) params.push('agent_id=' + agent);
  if (vip) params.push('vip_level=' + vip);
  if (risk) params.push('risk_level=' + risk);
  if (status) params.push('status=' + status);
  if (onlineStatus) params.push('online_status=' + onlineStatus);
  if (balanceMin) params.push('balance_min=' + balanceMin);
  if (balanceMax) params.push('balance_max=' + balanceMax);
  url += params.join('&');
  
  try {
    const result = await api(url);
    if (!result.success) {
      showToast(result.error || '查询失败', 'error');
      return;
    }
    
    const players = result.data || [];
    const stats = result.stats || { total: players.length, online: 0, offline: players.length };
    
    // 更新统计卡片
    const statsCards = document.querySelector('.grid.grid-cols-3');
    if (statsCards) {
      const totalCard = statsCards.children[0]?.querySelector('.text-2xl');
      const onlineCard = statsCards.children[1]?.querySelector('.text-2xl');
      const offlineCard = statsCards.children[2]?.querySelector('.text-2xl');
      if (totalCard) totalCard.textContent = formatNumber(stats.total);
      if (onlineCard) onlineCard.textContent = formatNumber(stats.online);
      if (offlineCard) offlineCard.textContent = formatNumber(stats.offline);
    }
    
    // 更新表格
    renderPlayersTable(players, result.pagination);
    showToast('查询成功', 'success');
  } catch (error) {
    console.error('Search players error:', error);
    showToast('查询失败: ' + error.message, 'error');
  }
}

// 重置玩家搜索
function resetPlayerSearch() {
  document.getElementById('player-search').value = '';
  document.getElementById('player-agent').value = '';
  document.getElementById('player-vip').value = '';
  document.getElementById('player-risk').value = '';
  document.getElementById('player-status').value = '';
  document.getElementById('player-online-status').value = '';
  document.getElementById('player-balance-min').value = '';
  document.getElementById('player-balance-max').value = '';
  searchPlayers();
}

// 刷新玩家列表
function refreshPlayers() {
  loadModule('players');
  showToast('刷新成功', 'success');
}

// 导出玩家报表
async function exportPlayers() {
  try {
    // 获取当前搜索条件
    const search = document.getElementById('player-search')?.value || '';
    const agent = document.getElementById('player-agent')?.value || '';
    const vip = document.getElementById('player-vip')?.value || '';
    const risk = document.getElementById('player-risk')?.value || '';
    const status = document.getElementById('player-status')?.value || '';
    const onlineStatus = document.getElementById('player-online-status')?.value || '';
    const balanceMin = document.getElementById('player-balance-min')?.value || '';
    const balanceMax = document.getElementById('player-balance-max')?.value || '';
    
    let url = '/api/reports/export?type=players';
    const params = [];
    if (search) params.push('search=' + encodeURIComponent(search));
    if (agent) params.push('agent_id=' + agent);
    if (vip) params.push('vip_level=' + vip);
    if (risk) params.push('risk_level=' + risk);
    if (status) params.push('status=' + status);
    if (onlineStatus) params.push('online_status=' + onlineStatus);
    if (balanceMin) params.push('balance_min=' + balanceMin);
    if (balanceMax) params.push('balance_max=' + balanceMax);
    
    if (params.length > 0) {
      url += '&' + params.join('&');
    }
    
    showToast('正在导出报表...', 'info');
    
    // 下载文件
    window.open(url, '_blank');
    
    showToast('导出成功！请查看下载文件', 'success');
  } catch (error) {
    console.error('Export players error:', error);
    showToast('导出失败: ' + error.message, 'error');
  }
}

// 加载代理列表用于筛选
async function loadAgentsForFilter() {
  try {
    const result = await api('/api/agents?status=1');
    if (result.success && result.data) {
      const select = document.querySelector('#player-agent');
      if (select) {
        const options = result.data.map(agent => {
          const levelBadge = agent.level === 'shareholder' ? '股东' : 
                            agent.level === 'general_agent' ? '总代理' : '代理';
          return `<option value="${agent.id}">${escapeHtml(agent.agent_username || agent.username)} (${levelBadge})</option>`;
        }).join('');
        select.innerHTML = '<option value="">全部代理</option>' + options;
      }
    }
  } catch (error) {
    console.error('Error loading agents for filter:', error);
  }
}

// 渲染玩家表格
function renderPlayersTable(players, pagination) {
  const tbody = document.querySelector('#players-table tbody');
  if (!tbody) return;
  
  tbody.innerHTML = players.map(p => `
    <tr class="border-t border-gray-700">
      <td class="p-4">${p.id}</td>
      <td class="p-4">
        <div>
          <p class="font-medium">${p.username}</p>
          <p class="text-sm text-gray-400">${p.nickname || '-'}</p>
        </div>
      </td>
      <td class="p-4 font-mono ${p.balance > 10000 ? 'text-green-400' : ''}">${formatCurrency(p.balance)}</td>
      <td class="p-4"><span class="bg-purple-600 px-2 py-1 rounded text-xs">VIP${p.vip_level}</span></td>
      <td class="p-4">${p.agent_name || '-'}</td>
      <td class="p-4">${getRiskBadge(p.risk_level)}</td>
      <td class="p-4">${getStatusBadge(p.status)}</td>
      <td class="p-4">
        ${p.is_online ? '<span class="flex items-center text-green-400"><i class="fas fa-circle text-xs mr-2 animate-pulse"></i>在线</span>' : '<span class="text-gray-500">离线</span>'}
      </td>
      <td class="p-4">
        <button onclick="viewPlayer(${p.id})" class="text-blue-400 hover:text-blue-300 mr-2" title="详情"><i class="fas fa-eye"></i></button>
        <button onclick="togglePlayerStatus(${p.id}, ${p.status})" class="text-yellow-400 hover:text-yellow-300 mr-2" title="${p.status === 1 ? '解冻' : '冻结'}">
          <i class="fas fa-${p.status === 1 ? 'unlock' : 'lock'}"></i>
        </button>
        ${p.is_online ? '<button onclick="kickPlayer(' + p.id + ')" class="text-red-400 hover:text-red-300" title="踢线"><i class="fas fa-sign-out-alt"></i></button>' : ''}
      </td>
    </tr>
  `).join('');
  
  // 更新分页信息
  const paginationInfo = document.querySelector('.flex.justify-between.items-center.mt-4 span');
  if (paginationInfo && pagination) {
    paginationInfo.textContent = `共 ${pagination.total || players.length} 条记录`;
  }
}

// 踢出玩家
async function kickPlayer(playerId) {
  if (!confirm('确定要将该玩家踢出登录吗？')) return;
  
  try {
    const result = await api(`/api/players/${playerId}/kick`, { method: 'POST' });
    if (result.success) {
      showToast('玩家已被踢出登录', 'success');
      // 刷新玩家列表
      if (typeof loadPlayers === 'function') {
        loadPlayers();
      }
    } else {
      showToast(result.error || '踢线失败', 'error');
    }
  } catch (error) {
    showToast('踢线失败: ' + error.message, 'error');
  }
}

async function viewPlayer(id) {
  const result = await api(`/api/players/${id}`);
  if (!result.success) {
    alert(result.error);
    return;
  }
  const p = result.data;
  
  // 简单弹窗显示详情
  alert(`玩家详情:
用户名: ${p.username}
昵称: ${p.nickname || '-'}
余额: ${formatCurrency(p.balance)}
VIP等级: ${p.vip_level}
风险等级: ${p.risk_level}
总存款: ${formatCurrency(p.total_deposit)}
总提款: ${formatCurrency(p.total_withdraw)}
总投注: ${formatCurrency(p.total_bet)}
LTV价值: ${formatCurrency(p.ltv_value)}`);
}

async function togglePlayerStatus(id, currentStatus) {
  const newStatus = currentStatus === 'frozen' ? 'active' : 'frozen';
  if (!confirm(`确定要${newStatus === 'frozen' ? '冻结' : '解冻'}该玩家吗？`)) return;
  
  const result = await api(`/api/players/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus })
  });
  
  if (result.success) {
    loadModule('players');
  } else {
    alert(result.error);
  }
}

// =====================
// 3. 层级控端
// =====================
async function renderAgents(container) {
  const [agentsResult, treeResult] = await Promise.all([
    api('/api/agents'),
    api('/api/agents/tree')
  ]);
  
  if (!agentsResult.success) {
    container.innerHTML = `<div class="text-center text-red-500">${agentsResult.error}</div>`;
    return;
  }
  
  const agents = agentsResult.data;
  const tree = treeResult.data || [];
  
  // 计算统计数据
  const stats = {
    total: agents.length,
    shareholders: agents.filter(a => a.level === 'shareholder').length,
    generalAgents: agents.filter(a => a.level === 'general_agent').length,
    agents: agents.filter(a => a.level === 'agent').length,
    totalPlayers: agents.reduce((sum, a) => sum + (a.player_count || 0), 0),
    totalSubs: agents.reduce((sum, a) => sum + (a.sub_agent_count || 0), 0)
  };
  
  const renderTree = (nodes, level = 0) => {
    return nodes.map(n => `
      <div class="ml-${level * 4} mb-2">
        <div class="flex items-center p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer" onclick="viewAgentDetail(${n.id})">
          <i class="fas fa-${n.level === 'shareholder' ? 'crown text-yellow-400' : n.level === 'general_agent' ? 'user-tie text-blue-400' : 'user text-gray-400'} mr-3"></i>
          <div class="flex-1">
            ${agentLink(n.id, n.username)}
            <span class="text-sm text-gray-400 ml-2">${n.nickname || ''}</span>
          </div>
          <span class="text-sm text-gray-400 mr-4">玩家: ${n.player_count}</span>
          ${getStatusBadge(n.status)}
        </div>
        ${n.children && n.children.length ? renderTree(n.children, level + 1) : ''}
      </div>
    `).join('');
  };
  
  container.innerHTML = `
    <!-- Tabs -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button id="tab-agent-hierarchy" onclick="switchAgentTab('hierarchy')" class="px-4 py-2 bg-primary rounded-lg">层级结构</button>
      <button id="tab-agent-list" onclick="switchAgentTab('list')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">代理列表</button>
    </div>
    
    <!-- 层级结构 Tab -->
    <div id="agent-hierarchy">
      <!-- 统计卡片 -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-gray-800 rounded-xl p-4 flex items-center">
          <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
            <i class="fas fa-users text-white text-xl"></i>
          </div>
          <div>
            <p class="text-gray-400 text-sm">总代理数</p>
            <p class="text-2xl font-bold">${formatNumber(stats.total)}</p>
          </div>
        </div>
        <div class="bg-gray-800 rounded-xl p-4 flex items-center">
          <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
            <i class="fas fa-user-friends text-white text-xl"></i>
          </div>
          <div>
            <p class="text-gray-400 text-sm">管理玩家</p>
            <p class="text-2xl font-bold text-green-400">${formatNumber(stats.totalPlayers)}</p>
          </div>
        </div>
        <div class="bg-gray-800 rounded-xl p-4 flex items-center">
          <div class="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
            <i class="fas fa-layer-group text-white text-xl"></i>
          </div>
          <div>
            <p class="text-gray-400 text-sm">下级代理</p>
            <p class="text-2xl font-bold text-purple-400">${formatNumber(stats.totalSubs)}</p>
          </div>
        </div>
      </div>
      
      <!-- 查询条件栏 -->
      <div class="bg-gray-800 rounded-xl p-5 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- 代理账号/ID -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">代理账号/ID</label>
            <input type="text" id="hierarchy-search-keyword" placeholder="账号或ID..." 
              class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
          </div>
          
          <!-- 代理角色 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">代理角色</label>
            <select id="hierarchy-search-level" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="">全部角色</option>
              <option value="shareholder">股东</option>
              <option value="general_agent">总代理</option>
              <option value="agent">代理</option>
            </select>
          </div>
          
          <!-- 状态 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">状态</label>
            <select id="hierarchy-search-status" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="">全部状态</option>
              <option value="1">正常</option>
              <option value="0">禁用</option>
            </select>
          </div>
          
          <!-- 操作按钮 -->
          <div class="flex items-end gap-2">
            <button onclick="searchHierarchy()" class="flex-1 bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <i class="fas fa-search mr-1.5"></i>查询
            </button>
            <button onclick="resetHierarchySearch()" class="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <i class="fas fa-redo mr-1.5"></i>重置
            </button>
          </div>
        </div>
      </div>
      
      <!-- 层级树 -->
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 class="text-lg font-semibold">
            <i class="fas fa-sitemap text-primary mr-2"></i>代理层级结构
          </h3>
          <button onclick="toggleAgentTree()" class="text-gray-400 hover:text-white">
            <i id="tree-toggle-icon" class="fas fa-chevron-down transition-transform"></i>
          </button>
        </div>
        <div id="agent-tree-content" class="p-4 max-h-96 overflow-y-auto">
          ${renderTree(tree)}
        </div>
      </div>
    </div>
    
    <!-- 代理列表 Tab -->
    <div id="agent-list" class="hidden">
      <!-- 统计卡片 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-gray-800 rounded-xl p-4 flex items-center">
          <div class="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mr-4">
            <i class="fas fa-crown text-white text-xl"></i>
          </div>
          <div>
            <p class="text-gray-400 text-sm">股东</p>
            <p class="text-2xl font-bold text-yellow-400">${formatNumber(stats.shareholders)}</p>
          </div>
        </div>
        <div class="bg-gray-800 rounded-xl p-4 flex items-center">
          <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
            <i class="fas fa-user-tie text-white text-xl"></i>
          </div>
          <div>
            <p class="text-gray-400 text-sm">总代理</p>
            <p class="text-2xl font-bold text-blue-400">${formatNumber(stats.generalAgents)}</p>
          </div>
        </div>
        <div class="bg-gray-800 rounded-xl p-4 flex items-center">
          <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
            <i class="fas fa-user text-white text-xl"></i>
          </div>
          <div>
            <p class="text-gray-400 text-sm">代理</p>
            <p class="text-2xl font-bold text-green-400">${formatNumber(stats.agents)}</p>
          </div>
        </div>
        <div class="bg-gray-800 rounded-xl p-4 flex items-center">
          <div class="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
            <i class="fas fa-users text-white text-xl"></i>
          </div>
          <div>
            <p class="text-gray-400 text-sm">管理玩家</p>
            <p class="text-2xl font-bold text-purple-400">${formatNumber(stats.totalPlayers)}</p>
          </div>
        </div>
      </div>
      
      <!-- 查询条件栏 -->
      <div class="bg-gray-800 rounded-xl p-5 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- 代理账号/ID -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">代理账号/ID</label>
            <input type="text" id="agent-search-keyword" placeholder="账号或ID..." 
              class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
          </div>
          
          <!-- 代理角色 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">代理角色</label>
            <select id="agent-search-level" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="">全部角色</option>
              <option value="shareholder">股东</option>
              <option value="general_agent">总代理</option>
              <option value="agent">代理</option>
            </select>
          </div>
          
          <!-- 状态 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">状态</label>
            <select id="agent-search-status" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="">全部状态</option>
              <option value="1">正常</option>
              <option value="0">禁用</option>
            </select>
          </div>
          
          <!-- 上级代理 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">上级代理</label>
            <select id="agent-search-parent" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="">全部上级</option>
              ${[...new Set(agents.filter(a => a.parent_name).map(a => a.parent_name))].map(parent => `
                <option value="${escapeHtml(parent)}">${escapeHtml(parent)}</option>
              `).join('')}
            </select>
          </div>
          
          <!-- 占成比范围 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">占成比范围 (%)</label>
            <div class="flex gap-2">
              <input type="number" id="agent-search-share-min" placeholder="最小" min="0" max="100" step="0.1"
                class="w-1/2 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <input type="number" id="agent-search-share-max" placeholder="最大" min="0" max="100" step="0.1"
                class="w-1/2 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            </div>
          </div>
          
          <!-- 玩家数量 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">玩家数量</label>
            <div class="flex gap-2">
              <input type="number" id="agent-search-players-min" placeholder="最小" min="0"
                class="w-1/2 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <input type="number" id="agent-search-players-max" placeholder="最大" min="0"
                class="w-1/2 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            </div>
          </div>
          
          <!-- 排序方式 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">排序方式</label>
            <select id="agent-search-sort" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="created_desc">注册时间 ↓</option>
              <option value="created_asc">注册时间 ↑</option>
              <option value="players_desc">玩家数 ↓</option>
              <option value="players_asc">玩家数 ↑</option>
              <option value="share_desc">占成比 ↓</option>
              <option value="share_asc">占成比 ↑</option>
            </select>
          </div>
          
          <!-- 操作按钮 -->
          <div class="flex items-end gap-2">
            <button onclick="searchAgents()" class="flex-1 bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <i class="fas fa-search mr-1.5"></i>查询
            </button>
            <button onclick="resetAgentSearch()" class="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <i class="fas fa-redo mr-1.5"></i>重置
            </button>
          </div>
        </div>
        
        <!-- 操作按钮栏 -->
        <div class="flex gap-3 mt-4 pt-4 border-t border-gray-700">
          <button onclick="showAddAgentModal()" class="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-lg font-medium transition-colors">
            <i class="fas fa-plus mr-2"></i>新增代理
          </button>
          <button onclick="exportAgents()" class="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-medium transition-colors">
            <i class="fas fa-file-export mr-2"></i>导出报表
          </button>
          <button onclick="refreshAgents()" class="bg-gray-600 hover:bg-gray-700 px-5 py-2 rounded-lg font-medium transition-colors">
            <i class="fas fa-sync-alt mr-2"></i>刷新
          </button>
        </div>
      </div>
        
        <!-- 数据表格 -->
        <div class="overflow-x-auto">
          <table id="agents-table" class="w-full data-table">
            <thead class="bg-gray-700">
              <tr>
                <th class="text-left p-3">账号</th>
                <th class="text-left p-3">级别</th>
                <th class="text-left p-3">上级</th>
                <th class="text-left p-3">占成比</th>
                <th class="text-left p-3">洗码率</th>
                <th class="text-left p-3">下级/玩家</th>
                <th class="text-left p-3">状态</th>
                <th class="text-left p-3">注册时间</th>
                <th class="text-left p-3">操作</th>
              </tr>
            </thead>
            <tbody id="agents-tbody">
              ${renderAgentsTable(agents)}
            </tbody>
          </table>
        </div>
        
        <!-- 统计信息 -->
        <div class="mt-4 flex justify-between items-center text-sm text-gray-400">
          <div>共 <span id="agent-total-count" class="text-primary font-bold">${agents.length}</span> 个代理</div>
          <div>
            总玩家数: <span class="text-green-400 font-bold">${agents.reduce((sum, a) => sum + (a.player_count || 0), 0)}</span> |
            总下级数: <span class="text-blue-400 font-bold">${agents.reduce((sum, a) => sum + (a.sub_agent_count || 0), 0)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 存储原始数据供搜索使用
  window.allAgents = agents;
  
  // 默认收起层级树
  const treeContent = document.getElementById('agent-tree-content');
  if (treeContent) {
    treeContent.style.display = 'none';
    document.getElementById('tree-toggle-icon').style.transform = 'rotate(-90deg)';
  }
}

// 切换代理Tab
function switchAgentTab(tab) {
  // 切换按钮状态
  document.getElementById('tab-agent-hierarchy').className = tab === 'hierarchy' ? 
    'px-4 py-2 bg-primary rounded-lg' : 'px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600';
  document.getElementById('tab-agent-list').className = tab === 'list' ? 
    'px-4 py-2 bg-primary rounded-lg' : 'px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600';
  
  // 切换内容显示
  document.getElementById('agent-hierarchy').style.display = tab === 'hierarchy' ? 'block' : 'none';
  document.getElementById('agent-list').style.display = tab === 'list' ? 'block' : 'none';
}

// 切换代理层级树显示
function toggleAgentTree() {
  const content = document.getElementById('agent-tree-content');
  const icon = document.getElementById('tree-toggle-icon');
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    icon.style.transform = 'rotate(0deg)';
  } else {
    content.style.display = 'none';
    icon.style.transform = 'rotate(-90deg)';
  }
}

// 层级结构搜索
function searchHierarchy() {
  const keyword = document.getElementById('hierarchy-search-keyword')?.value || '';
  const level = document.getElementById('hierarchy-search-level')?.value || '';
  const status = document.getElementById('hierarchy-search-status')?.value || '';
  
  const allAgents = window.allAgents || [];
  let filtered = allAgents;
  
  if (keyword) {
    filtered = filtered.filter(a => 
      (a.agent_username && a.agent_username.includes(keyword)) ||
      (a.nickname && a.nickname.includes(keyword)) ||
      String(a.id).includes(keyword)
    );
  }
  
  if (level) {
    filtered = filtered.filter(a => a.level === level);
  }
  
  if (status !== '') {
    filtered = filtered.filter(a => a.status == status);
  }
  
  // 重新渲染树形结构
  // 这里简化处理，实际应该重新构建树形数据
  showToast(`找到 ${filtered.length} 个匹配的代理`, 'success');
}

// 重置层级结构搜索
function resetHierarchySearch() {
  document.getElementById('hierarchy-search-keyword').value = '';
  document.getElementById('hierarchy-search-level').value = '';
  document.getElementById('hierarchy-search-status').value = '';
  loadModule('agents');
}

// 刷新代理列表
function refreshAgents() {
  loadModule('agents');
  showToast('刷新成功', 'success');
}

// 导出代理报表
async function exportAgents() {
  try {
    const keyword = document.getElementById('agent-search-keyword')?.value || '';
    const level = document.getElementById('agent-search-level')?.value || '';
    const status = document.getElementById('agent-search-status')?.value || '';
    const parent = document.getElementById('agent-search-parent')?.value || '';
    const shareMin = document.getElementById('agent-search-share-min')?.value || '';
    const shareMax = document.getElementById('agent-search-share-max')?.value || '';
    const playersMin = document.getElementById('agent-search-players-min')?.value || '';
    const playersMax = document.getElementById('agent-search-players-max')?.value || '';
    const sort = document.getElementById('agent-search-sort')?.value || '';
    
    let url = '/api/reports/export?type=agents';
    const params = [];
    if (keyword) params.push('keyword=' + encodeURIComponent(keyword));
    if (level) params.push('level=' + level);
    if (status) params.push('status=' + status);
    if (parent) params.push('parent=' + encodeURIComponent(parent));
    if (shareMin) params.push('share_min=' + shareMin);
    if (shareMax) params.push('share_max=' + shareMax);
    if (playersMin) params.push('players_min=' + playersMin);
    if (playersMax) params.push('players_max=' + playersMax);
    if (sort) params.push('sort=' + sort);
    
    if (params.length > 0) {
      url += '&' + params.join('&');
    }
    
    showToast('正在导出报表...', 'info');
    window.open(url, '_blank');
    showToast('导出成功！请查看下载文件', 'success');
  } catch (error) {
    console.error('Export agents error:', error);
    showToast('导出失败: ' + error.message, 'error');
  }
}

// 渲染代理表格
function renderAgentsTable(agents) {
  if (agents.length === 0) {
    return `
      <tr>
        <td colspan="9" class="p-8 text-center text-gray-500">
          <i class="fas fa-inbox text-4xl mb-2"></i>
          <p>暂无代理数据</p>
        </td>
      </tr>
    `;
  }
  
  return agents.map(a => `
    <tr class="border-t border-gray-700 hover:bg-gray-700 transition-colors">
      <td class="p-3">
        ${agentLink(a.id, a.agent_username)}
        <p class="text-sm text-gray-400">${escapeHtml(a.nickname || '')}</p>
      </td>
      <td class="p-3">
        <span class="px-2 py-1 rounded text-xs ${a.level === 'shareholder' ? 'bg-yellow-600' : a.level === 'general_agent' ? 'bg-blue-600' : 'bg-gray-600'}">
          ${a.level === 'shareholder' ? '股东' : a.level === 'general_agent' ? '总代' : '代理'}
        </span>
      </td>
      <td class="p-3 text-sm">${escapeHtml(a.parent_name || '-')}</td>
      <td class="p-3 font-mono text-sm">${(a.share_ratio * 100).toFixed(1)}%</td>
      <td class="p-3 font-mono text-sm">${(a.turnover_rate * 100).toFixed(2)}%</td>
      <td class="p-3 text-sm">
        <span class="text-blue-400">${a.sub_agent_count || 0}</span> / 
        <span class="text-green-400">${a.player_count || 0}</span>
      </td>
      <td class="p-3">${getStatusBadge(a.status)}</td>
      <td class="p-3 text-sm text-gray-400">${a.created_at ? formatDate(a.created_at) : '-'}</td>
      <td class="p-3">
        <button onclick="showAgentInviteModal(${a.id}, '${escapeJs(a.agent_username)}')" class="text-green-400 hover:text-green-300 mr-2" title="分享链接">
          <i class="fas fa-share-alt"></i>
        </button>
        <button onclick="showEditAgentModal(${a.id})" class="text-blue-400 hover:text-blue-300 mr-2" title="编辑">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="viewAgentDetail(${a.id})" class="text-gray-400 hover:text-gray-300" title="详情">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// 搜索代理
function searchAgents() {
  const keyword = document.getElementById('agent-search-keyword').value.toLowerCase().trim();
  const level = document.getElementById('agent-search-level').value;
  const status = document.getElementById('agent-search-status').value;
  const parent = document.getElementById('agent-search-parent').value;
  const shareMin = parseFloat(document.getElementById('agent-search-share-min').value) || 0;
  const shareMax = parseFloat(document.getElementById('agent-search-share-max').value) || 100;
  const playersMin = parseInt(document.getElementById('agent-search-players-min').value) || 0;
  const playersMax = parseInt(document.getElementById('agent-search-players-max').value) || Infinity;
  const sort = document.getElementById('agent-search-sort').value;
  
  let filtered = window.allAgents.filter(agent => {
    // 关键词过滤
    if (keyword && !agent.agent_username.toLowerCase().includes(keyword) && 
        !String(agent.id).includes(keyword) &&
        !(agent.nickname && agent.nickname.toLowerCase().includes(keyword))) {
      return false;
    }
    
    // 等级过滤
    if (level && agent.level !== level) return false;
    
    // 状态过滤
    if (status !== '' && String(agent.status) !== status) return false;
    
    // 上级过滤
    if (parent && agent.parent_name !== parent) return false;
    
    // 占成比过滤
    const shareRatio = (agent.share_ratio || 0) * 100;
    if (shareRatio < shareMin || shareRatio > shareMax) return false;
    
    // 玩家数量过滤
    const playerCount = agent.player_count || 0;
    if (playerCount < playersMin || playerCount > playersMax) return false;
    
    return true;
  });
  
  // 排序
  filtered.sort((a, b) => {
    switch(sort) {
      case 'created_desc':
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      case 'created_asc':
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      case 'players_desc':
        return (b.player_count || 0) - (a.player_count || 0);
      case 'players_asc':
        return (a.player_count || 0) - (b.player_count || 0);
      case 'share_desc':
        return (b.share_ratio || 0) - (a.share_ratio || 0);
      case 'share_asc':
        return (a.share_ratio || 0) - (b.share_ratio || 0);
      default:
        return 0;
    }
  });
  
  // 更新表格
  document.getElementById('agents-tbody').innerHTML = renderAgentsTable(filtered);
  document.getElementById('agent-total-count').textContent = filtered.length;
  
  showToast(`找到 ${filtered.length} 个代理`, 'success');
}

// 重置搜索
function resetAgentSearch() {
  document.getElementById('agent-search-keyword').value = '';
  document.getElementById('agent-search-level').value = '';
  document.getElementById('agent-search-status').value = '';
  document.getElementById('agent-search-parent').value = '';
  document.getElementById('agent-search-share-min').value = '';
  document.getElementById('agent-search-share-max').value = '';
  document.getElementById('agent-search-players-min').value = '';
  document.getElementById('agent-search-players-max').value = '';
  document.getElementById('agent-search-sort').value = 'created_desc';
  
  // 恢复原始数据
  document.getElementById('agents-tbody').innerHTML = renderAgentsTable(window.allAgents);
  document.getElementById('agent-total-count').textContent = window.allAgents.length;
  
  showToast('已重置查询条件', 'info');
}

// 显示代理分享链接模态框
async function showAgentInviteModal(agentId, agentUsername) {
  const result = await api(`/api/agents/${agentId}`);
  if (!result.success) {
    alert('加载代理信息失败');
    return;
  }
  
  const agent = result.data;
  const baseUrl = window.location.origin;
  
  // 构建分享链接
  let inviteLinks = [];
  if (agent.invite_code) {
    // 默认链接
    inviteLinks.push({ label: '默认注册链接', url: `${baseUrl}/register?invite=${agent.invite_code}` });
    
    // 专属域名链接
    if (agent.custom_domains) {
      try {
        const domains = JSON.parse(agent.custom_domains);
        if (Array.isArray(domains)) {
          domains.forEach(domain => {
            inviteLinks.push({ label: `专属域名链接`, url: `https://${domain}/register?invite=${agent.invite_code}` });
          });
        }
      } catch(e) {}
    }
  }
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold">
          <i class="fas fa-share-alt text-primary mr-2"></i>
          ${escapeHtml(agentUsername)} - 注册分享链接
        </h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <div class="space-y-4 mb-6">
        <!-- 邀请码 -->
        <div class="bg-gray-700 p-4 rounded-lg">
          <label class="block text-sm text-gray-400 mb-2">邀请码</label>
          <div class="flex gap-2">
            <input type="text" value="${escapeHtml(agent.invite_code || '')}" readonly class="flex-1 bg-gray-900 border border-gray-600 rounded px-4 py-2 font-mono text-lg text-center">
            <button onclick="copyToClipboard('${escapeJs(agent.invite_code || '')}')" class="px-4 py-2 bg-primary hover:bg-blue-700 rounded" title="复制">
              <i class="fas fa-copy"></i>
            </button>
            <button onclick="regenerateInviteCode(${agentId})" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded" title="重新生成">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        
        <!-- 分享链接列表 -->
        <div class="bg-gray-700 p-4 rounded-lg">
          <label class="block text-sm text-gray-400 mb-3">注册链接</label>
          ${inviteLinks.length > 0 ? inviteLinks.map((link, idx) => `
            <div class="mb-3 ${idx > 0 ? 'pt-3 border-t border-gray-600' : ''}">
              <p class="text-xs text-gray-400 mb-1">${escapeHtml(link.label)}</p>
              <div class="flex gap-2">
                <input type="text" value="${escapeHtml(link.url)}" readonly class="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm font-mono">
                <button onclick="copyToClipboard('${escapeJs(link.url)}')" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded" title="复制链接">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
          `).join('') : '<p class="text-gray-400 text-center py-4">请先设置邀请码</p>'}
        </div>
        
        <!-- 链接状态开关 -->
        <div class="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
          <div>
            <label class="font-medium">分享链接状态</label>
            <p class="text-sm text-gray-400">关闭后链接将失效</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="invite-status-${agentId}" ${agent.invite_link_status === 1 ? 'checked' : ''} onchange="toggleInviteStatus(${agentId}, this.checked)" class="sr-only peer">
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>
      </div>
      
      <div class="text-center">
        <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">
          关闭
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// 重新生成邀请码
async function regenerateInviteCode(agentId) {
  if (!confirm('确定要重新生成邀请码吗？旧的邀请码将失效！')) return;
  
  const result = await api(`/api/agents/${agentId}/regenerate-invite`, { method: 'POST' });
  if (result.success) {
    alert('邀请码重新生成成功！');
    document.querySelector('.fixed').remove();
    loadModule('agents');
  } else {
    alert('重新生成失败: ' + result.error);
  }
}

// 切换邀请链接状态
async function toggleInviteStatus(agentId, enabled) {
  const result = await api(`/api/agents/${agentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invite_link_status: enabled ? 1 : 0 })
  });
  
  if (result.success) {
    alert(`分享链接已${enabled ? '启用' : '禁用'}`);
  } else {
    alert('操作失败: ' + result.error);
    document.getElementById(`invite-status-${agentId}`).checked = !enabled;
  }
}

// 显示编辑代理模态框
async function showEditAgentModal(agentId) {
  const result = await api(`/api/agents/${agentId}`);
  if (!result.success) {
    alert('加载代理信息失败');
    return;
  }
  
  const agent = result.data;
  const domains = agent.custom_domains ? JSON.parse(agent.custom_domains) : [];
  
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold">
          <i class="fas fa-edit text-primary mr-2"></i>
          编辑代理 - ${escapeHtml(agent.agent_username)}
        </h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <form id="edit-agent-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2">昵称</label>
            <input type="text" name="nickname" value="${escapeHtml(agent.nickname || '')}" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">角色</label>
            <select name="level" id="edit-agent-level-select" onchange="updateEditParentAgentOptions(${agentId})" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
              <option value="shareholder" ${agent.level === 'shareholder' ? 'selected' : ''}>股东</option>
              <option value="general_agent" ${agent.level === 'general_agent' ? 'selected' : ''}>总代理</option>
              <option value="agent" ${agent.level === 'agent' ? 'selected' : ''}>代理</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">
              上级代理 <span class="text-red-500" id="edit-parent-required-mark">*</span>
              <span class="text-xs text-gray-500" id="edit-parent-hint"></span>
            </label>
            <select name="parent_id" id="edit-parent-agent-select" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
              <option value="">加载中...</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">占成比 (%)</label>
            <input type="number" name="share_ratio" value="${(agent.share_ratio || 0) * 100}" min="0" max="100" step="0.1" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">洗码率 (%)</label>
            <input type="number" name="commission_ratio" value="${(agent.commission_ratio || 0) * 100}" min="0" max="100" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">联系电话</label>
            <input type="text" name="contact_phone" value="${escapeHtml(agent.contact_phone || '')}" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">联系邮箱</label>
            <input type="email" name="contact_email" value="${escapeHtml(agent.contact_email || '')}" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
        </div>
        
        <!-- 专属域名绑定 -->
        <div class="border-t border-gray-700 pt-4">
          <label class="block text-sm text-gray-400 mb-3">
            <i class="fas fa-globe text-primary mr-2"></i>
            专属域名绑定
            <span class="text-xs text-gray-500">(可绑定多个域名，用于生成专属注册链接)</span>
          </label>
          <div id="domains-list" class="space-y-2 mb-3">
            ${domains.map((domain, idx) => `
              <div class="flex gap-2">
                <input type="text" value="${escapeHtml(domain)}" data-domain-idx="${idx}" class="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 domain-input" placeholder="example.com">
                <button type="button" onclick="removeDomainField(${idx})" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            `).join('')}
          </div>
          <button type="button" onclick="addDomainField()" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm">
            <i class="fas fa-plus mr-2"></i>添加域名
          </button>
        </div>
        
        <div>
          <label class="block text-sm text-gray-400 mb-2">备注</label>
          <textarea name="notes" rows="3" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">${escapeHtml(agent.notes || '')}</textarea>
        </div>
        
        <div class="flex gap-4 justify-end pt-4 border-t border-gray-700">
          <button type="button" onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">
            取消
          </button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg">
            <i class="fas fa-save mr-2"></i>保存
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  // 初始化上级代理选项
  await updateEditParentAgentOptions(agentId, agent.parent_id);
  
  // 绑定表单提交
  document.getElementById('edit-agent-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateAgentInfo(agentId, modal);
  });
}

// 添加域名输入框
function addDomainField() {
  const container = document.getElementById('domains-list');
  const idx = container.children.length;
  const div = document.createElement('div');
  div.className = 'flex gap-2';
  div.innerHTML = `
    <input type="text" data-domain-idx="${idx}" class="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 domain-input" placeholder="example.com">
    <button type="button" onclick="removeDomainField(${idx})" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
      <i class="fas fa-trash"></i>
    </button>
  `;
  container.appendChild(div);
}

// 移除域名输入框
function removeDomainField(idx) {
  const input = document.querySelector(`[data-domain-idx="${idx}"]`);
  if (input) {
    input.closest('.flex').remove();
  }
}

// 更新代理信息
async function updateAgentInfo(agentId, modal) {
  // 验证层级关系
  if (!validateEditAgentHierarchy()) {
    return;
  }
  
  const form = document.getElementById('edit-agent-form');
  const formData = new FormData(form);
  
  // 收集域名
  const domainInputs = document.querySelectorAll('.domain-input');
  const domains = Array.from(domainInputs)
    .map(input => input.value.trim())
    .filter(v => v !== '');
  
  const data = {
    nickname: formData.get('nickname'),
    level: formData.get('level'),
    parent_id: formData.get('parent_id') || null,
    share_ratio: parseFloat(formData.get('share_ratio')) || 0,
    commission_ratio: parseFloat(formData.get('commission_ratio')) || 0,
    contact_phone: formData.get('contact_phone'),
    contact_email: formData.get('contact_email'),
    notes: formData.get('notes'),
    domains: domains
  };
  
  try {
    const result = await api(`/api/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      showToast('代理信息更新成功', 'success');
      modal.remove();
      loadModule('agents'); // 刷新代理列表
    } else {
      showToast(result.error || '更新失败', 'error');
    }
  } catch (error) {
    console.error('Update agent error:', error);
    showToast('更新失败: ' + error.message, 'error');
  }
}

// 查看代理详情
async function viewAgentDetail(agentId) {
  const result = await api(`/api/agents/${agentId}`);
  if (!result.success) {
    alert('加载详情失败');
    return;
  }
  
  const agent = result.data;
  alert(`代理详情:\n\n账号: ${agent.agent_username}\n昵称: ${agent.nickname || '-'}\n级别: ${agent.level}\n占成比: ${(agent.share_ratio * 100).toFixed(1)}%\n洗码率: ${(agent.commission_ratio * 100).toFixed(2)}%\n邀请码: ${agent.invite_code || '未生成'}`);
}

// 显示新增代理模态框
function showAddAgentModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold">
          <i class="fas fa-plus text-primary mr-2"></i>
          新增代理
        </h3>
        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <form id="add-agent-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2">账号 <span class="text-red-500">*</span></label>
            <input type="text" name="agent_username" required class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">初始密码 <span class="text-red-500">*</span></label>
            <input type="password" name="password" required class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">昵称</label>
            <input type="text" name="nickname" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">角色 <span class="text-red-500">*</span></label>
            <select name="level" id="agent-level-select" onchange="updateParentAgentOptions()" required class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
              <option value="">请选择角色</option>
              <option value="shareholder">股东</option>
              <option value="general_agent">总代理</option>
              <option value="agent">代理</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">
              上级代理 <span class="text-red-500" id="parent-required-mark">*</span>
              <span class="text-xs text-gray-500" id="parent-hint"></span>
            </label>
            <select name="parent_id" id="parent-agent-select" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
              <option value="">请先选择级别</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">占成比 (%)</label>
            <input type="number" name="share_ratio" value="0" min="0" max="100" step="0.1" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">洗码率 (%)</label>
            <input type="number" name="commission_ratio" value="0" min="0" max="100" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">联系电话</label>
            <input type="text" name="contact_phone" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">联系邮箱</label>
            <input type="email" name="contact_email" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
        </div>
        
        <!-- 专属域名绑定 -->
        <div class="border-t border-gray-700 pt-4">
          <label class="block text-sm text-gray-400 mb-3">
            <i class="fas fa-globe text-primary mr-2"></i>
            专属域名绑定（可选）
            <span class="text-xs text-gray-500">(可绑定多个域名)</span>
          </label>
          <div id="new-domains-list" class="space-y-2 mb-3"></div>
          <button type="button" onclick="addNewDomainField()" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm">
            <i class="fas fa-plus mr-2"></i>添加域名
          </button>
        </div>
        
        <div class="flex gap-4 justify-end pt-4 border-t border-gray-700">
          <button type="button" onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">
            取消
          </button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg">
            <i class="fas fa-plus mr-2"></i>创建
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  // 绑定表单提交
  document.getElementById('add-agent-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createAgent(modal);
  });
}

// 添加新增代理域名输入框
function addNewDomainField() {
  const container = document.getElementById('new-domains-list');
  const idx = container.children.length;
  const div = document.createElement('div');
  div.className = 'flex gap-2';
  div.innerHTML = `
    <input type="text" data-new-domain-idx="${idx}" class="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 new-domain-input" placeholder="example.com">
    <button type="button" onclick="removeNewDomainField(${idx})" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
      <i class="fas fa-trash"></i>
    </button>
  `;
  container.appendChild(div);
}

// 移除新增代理域名输入框
function removeNewDomainField(idx) {
  const input = document.querySelector(`[data-new-domain-idx="${idx}"]`);
  if (input) {
    input.closest('.flex').remove();
  }
}

// 创建代理函数已移至文件末尾（带层级验证）

// =====================
// 4. 财务控端
// =====================
async function renderFinance(container) {
  const [withdrawsResult, transactionsResult, depositsResult, paymentMethodsResult] = await Promise.all([
    api('/api/withdraws?status=0'),
    api('/api/transactions?limit=20'),
    api('/api/deposits?status=0'),
    api('/api/payment-methods')
  ]);
  
  const withdraws = withdrawsResult.data || [];
  const transactions = transactionsResult.data || [];
  const deposits = depositsResult.data || [];
  const paymentMethods = paymentMethodsResult.data || [];
  
  container.innerHTML = `
    <!-- Tabs -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button id="tab-manual" onclick="switchFinanceTab('manual')" class="px-4 py-2 bg-primary rounded-lg">人工存取款</button>
      <button id="tab-flow" onclick="switchFinanceTab('flow')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">账户明细</button>
      <button id="tab-withdraw" onclick="switchFinanceTab('withdraw')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">提款审核 <span class="bg-red-500 text-xs px-2 py-0.5 rounded-full ml-1">${withdraws.length}</span></button>
      <button id="tab-deposit" onclick="switchFinanceTab('deposit')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">存款审核 <span class="bg-yellow-500 text-xs px-2 py-0.5 rounded-full ml-1">${deposits.length}</span></button>
      <button id="tab-payment" onclick="switchFinanceTab('payment')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">收款方式设置</button>
      <button id="tab-password" onclick="switchFinanceTab('password')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"><i class="fas fa-key mr-1"></i>财务密码设置</button>
    </div>
    
    <!-- 提款审核 -->
    <div id="finance-withdraw" class="bg-gray-800 rounded-xl overflow-hidden hidden">
      <table class="w-full data-table">
        <thead class="bg-gray-700">
          <tr>
            <th class="text-left p-4">订单号</th>
            <th class="text-left p-4">会员账号</th>
            <th class="text-left p-4">金额</th>
            <th class="text-left p-4">流水检测</th>
            <th class="text-left p-4">风险标识</th>
            <th class="text-left p-4">状态</th>
            <th class="text-left p-4">申请时间</th>
            <th class="text-left p-4">操作</th>
          </tr>
        </thead>
        <tbody>
          ${withdraws.map(w => `
            <tr class="border-t border-gray-700">
              <td class="p-4 font-mono text-sm">${w.order_no}</td>
              <td class="p-4">
                <p class="font-medium">${playerLink(w.player_id, w.player_name, w.vip_level || 0)}</p>
              </td>
              <td class="p-4 font-mono text-red-400">${formatCurrency(w.amount)}</td>
              <td class="p-4">
                <div class="flex items-center">
                  <div class="w-20 h-2 bg-gray-600 rounded-full overflow-hidden mr-2">
                    <div class="h-full ${w.turnover_rate >= 100 ? 'bg-green-500' : 'bg-yellow-500'}" style="width: ${Math.min(w.turnover_rate, 100)}%"></div>
                  </div>
                  <span class="${w.turnover_rate >= 100 ? 'text-green-400' : 'text-yellow-400'}">${w.turnover_rate}%</span>
                </div>
              </td>
              <td class="p-4">${w.risk_alert ? `<span class="text-red-400"><i class="fas fa-exclamation-triangle mr-1"></i>${w.risk_alert}</span>` : getRiskBadge(w.risk_level)}</td>
              <td class="p-4">${getStatusBadge(w.status, 'withdraw')}</td>
              <td class="p-4 text-sm text-gray-400">${formatDateTime(w.created_at)}</td>
              <td class="p-4">
                <button onclick="approveWithdraw(${w.id}, ${w.amount})" class="text-green-400 hover:text-green-300 mr-2" title="通过"><i class="fas fa-check"></i></button>
                <button onclick="rejectWithdraw(${w.id})" class="text-red-400 hover:text-red-300 mr-2" title="拒绝"><i class="fas fa-times"></i></button>
              </td>
            </tr>
          `).join('')}
          ${withdraws.length === 0 ? '<tr><td colspan="8" class="p-8 text-center text-gray-400">暂无待审核提款</td></tr>' : ''}
        </tbody>
      </table>
    </div>
    
    <!-- 存款审核 -->
    <div id="finance-deposit" class="bg-gray-800 rounded-xl overflow-hidden hidden">
      <table class="w-full data-table">
        <thead class="bg-gray-700">
          <tr>
            <th class="text-left p-4">订单号</th>
            <th class="text-left p-4">会员账号</th>
            <th class="text-left p-4">金额</th>
            <th class="text-left p-4">支付方式</th>
            <th class="text-left p-4">首充</th>
            <th class="text-left p-4">状态</th>
            <th class="text-left p-4">申请时间</th>
            <th class="text-left p-4">操作</th>
          </tr>
        </thead>
        <tbody>
          ${deposits.map(d => `
            <tr class="border-t border-gray-700">
              <td class="p-4 font-mono text-sm">${d.order_no}</td>
              <td class="p-4">
                <p class="font-medium">${playerLink(d.player_id, d.player_name, d.vip_level || 0)}</p>
              </td>
              <td class="p-4 font-mono text-green-400">${formatCurrency(d.amount)}</td>
              <td class="p-4">${d.payment_channel || d.payment_method || '-'}</td>
              <td class="p-4">${d.is_first_deposit ? '<span class="bg-orange-600 px-2 py-1 rounded text-xs">首充</span>' : '-'}</td>
              <td class="p-4">${getStatusBadge(d.status, 'deposit')}</td>
              <td class="p-4 text-sm text-gray-400">${formatDateTime(d.created_at)}</td>
              <td class="p-4">
                <button onclick="approveDeposit(${d.id}, ${d.amount})" class="text-green-400 hover:text-green-300 mr-2" title="通过"><i class="fas fa-check"></i></button>
                <button onclick="rejectDeposit(${d.id})" class="text-red-400 hover:text-red-300 mr-2" title="拒绝"><i class="fas fa-times"></i></button>
              </td>
            </tr>
          `).join('')}
          ${deposits.length === 0 ? '<tr><td colspan="8" class="p-8 text-center text-gray-400">暂无待审核存款</td></tr>' : ''}
        </tbody>
      </table>
    </div>
    
    <!-- 人工存取款 -->
    <div id="finance-manual">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- 人工存款 -->
        <div class="bg-gray-800 rounded-xl p-6">
          <h3 class="text-lg font-semibold mb-4"><i class="fas fa-plus-circle text-green-400 mr-2"></i>人工存款</h3>
          <form id="manual-deposit-form" onsubmit="submitManualDeposit(event)">
            <div class="space-y-4">
              <div>
                <label class="block text-gray-400 text-sm mb-2">玩家ID *</label>
                <input type="number" name="player_id" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="输入玩家ID">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">存款金额 *</label>
                <input type="number" name="amount" required min="1" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="输入金额">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">支付方式</label>
                <select name="payment_method" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
                  <option value="manual">人工存款</option>
                  <option value="bank_transfer">银行转账</option>
                  <option value="usdt">USDT</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">备注</label>
                <input type="text" name="remark" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="备注说明">
              </div>
              <button type="submit" class="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold">
                <i class="fas fa-check mr-2"></i>确认存款
              </button>
            </div>
          </form>
        </div>
        
        <!-- 人工取款 -->
        <div class="bg-gray-800 rounded-xl p-6">
          <h3 class="text-lg font-semibold mb-4"><i class="fas fa-minus-circle text-red-400 mr-2"></i>人工取款</h3>
          <form id="manual-withdraw-form" onsubmit="submitManualWithdraw(event)">
            <div class="space-y-4">
              <div>
                <label class="block text-gray-400 text-sm mb-2">玩家ID *</label>
                <input type="number" name="player_id" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="输入玩家ID">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">取款金额 *</label>
                <input type="number" name="amount" required min="1" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="输入金额">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">收款银行</label>
                <input type="text" name="bank_name" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="银行名称">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">银行卡号</label>
                <input type="text" name="bank_card_no" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="银行卡号">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">备注</label>
                <input type="text" name="remark" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="备注说明">
              </div>
              <button type="submit" class="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-semibold">
                <i class="fas fa-check mr-2"></i>确认取款
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- 收款方式设置 -->
    <div id="finance-payment" class="hidden">
      <div class="bg-gray-800 rounded-xl p-5 mb-6 flex justify-between items-center">
        <h3 class="text-lg font-semibold"><i class="fas fa-credit-card text-primary mr-2"></i>收款方式管理</h3>
        <button onclick="showAddPaymentMethod()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg"><i class="fas fa-plus mr-2"></i>添加收款方式</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${paymentMethods.map(pm => `
          <div class="bg-gray-800 rounded-xl p-4 border ${pm.status === 1 ? 'border-gray-700' : 'border-red-700 opacity-60'}">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${getPaymentMethodColor(pm.method_type)}">
                  <i class="${getPaymentMethodIcon(pm.method_type)} text-white"></i>
                </div>
                <div>
                  <p class="font-medium">${escapeHtml(pm.method_name)}</p>
                  <p class="text-sm text-gray-400">${escapeHtml(pm.method_code)}</p>
                </div>
              </div>
              <span class="px-2 py-1 rounded text-xs ${pm.status === 1 ? 'bg-green-600' : 'bg-red-600'}">${pm.status === 1 ? '启用' : '禁用'}</span>
            </div>
            <div class="text-sm text-gray-400 space-y-1 mb-3">
              <p><span class="text-gray-500">币种:</span> ${escapeHtml(pm.currency)}</p>
              <p><span class="text-gray-500">限额:</span> ${formatCurrency(pm.min_amount)} - ${formatCurrency(pm.max_amount)}</p>
              <p><span class="text-gray-500">费率:</span> ${(pm.fee_rate || 0) * 100}% + ${formatCurrency(pm.fee_fixed)}</p>
              ${pm.qr_code_url ? `
              <div class="flex items-center mt-2">
                <span class="text-gray-500 mr-2">二维码:</span>
                <button onclick="previewQrCode('${encodeURIComponent(pm.qr_code_url)}', '${escapeJs(pm.method_name)}')" class="text-primary hover:text-blue-400 text-xs flex items-center">
                  <i class="fas fa-qrcode mr-1"></i>点击预览
                </button>
              </div>
              ` : `
              <div class="flex items-center mt-2">
                <span class="text-gray-500 mr-2">二维码:</span>
                <span class="text-yellow-400 text-xs"><i class="fas fa-exclamation-triangle mr-1"></i>未配置</span>
              </div>
              `}
            </div>
            <div class="flex space-x-2">
              <button onclick="editPaymentMethod(${pm.id})" class="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm"><i class="fas fa-edit mr-1"></i>编辑</button>
              ${pm.qr_code_url ? `
              <button onclick="previewQrCode('${encodeURIComponent(pm.qr_code_url)}', '${escapeJs(pm.method_name)}')" class="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded text-sm" title="查看二维码"><i class="fas fa-qrcode"></i></button>
              ` : `
              <button onclick="editPaymentMethod(${pm.id})" class="bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded text-sm" title="添加二维码"><i class="fas fa-plus"></i></button>
              `}
              <button onclick="togglePaymentMethod(${pm.id}, ${pm.status})" class="flex-1 ${pm.status === 1 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} py-2 rounded text-sm">
                <i class="fas fa-${pm.status === 1 ? 'ban' : 'check'} mr-1"></i>${pm.status === 1 ? '禁用' : '启用'}
              </button>
            </div>
          </div>
        `).join('')}
        ${paymentMethods.length === 0 ? '<div class="col-span-3 text-center text-gray-400 py-8">暂无收款方式，请添加</div>' : ''}
      </div>
    </div>
    
    <!-- 账户明细 -->
    <div id="finance-flow" class="bg-gray-800 rounded-xl overflow-hidden hidden">
      <table class="w-full data-table">
        <thead class="bg-gray-700">
          <tr>
            <th class="text-left p-4">订单号</th>
            <th class="text-left p-4">会员</th>
            <th class="text-left p-4">类型</th>
            <th class="text-left p-4">变动前</th>
            <th class="text-left p-4">变动额</th>
            <th class="text-left p-4">变动后</th>
            <th class="text-left p-4">时间</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr class="border-t border-gray-700">
              <td class="p-4 font-mono text-sm">${t.order_no}</td>
              <td class="p-4">${t.player_id ? playerLink(t.player_id, t.player_name) : (t.player_name || '-')}</td>
              <td class="p-4"><span class="px-2 py-1 rounded text-xs ${t.amount >= 0 ? 'bg-green-600' : 'bg-red-600'}">${getTransactionTypeName(t.transaction_type)}</span></td>
              <td class="p-4 font-mono">${formatCurrency(t.balance_before)}</td>
              <td class="p-4 font-mono ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}">${t.amount >= 0 ? '+' : ''}${formatCurrency(t.amount)}</td>
              <td class="p-4 font-mono">${formatCurrency(t.balance_after)}</td>
              <td class="p-4 text-sm text-gray-400">${formatDateTime(t.created_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- 转账记录 -->
    <div id="finance-transfers" class="hidden">
      <div class="bg-gray-800 rounded-xl p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label class="text-gray-400 text-xs block mb-1">开始日期</label>
            <input type="date" id="transfer-start-date" value="${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
          </div>
          <div>
            <label class="text-gray-400 text-xs block mb-1">结束日期</label>
            <input type="date" id="transfer-end-date" value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
          </div>
          <div>
            <label class="text-gray-400 text-xs block mb-1">订单号</label>
            <input type="text" id="transfer-order-no" placeholder="输入订单号" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
          </div>
          <div>
            <label class="text-gray-400 text-xs block mb-1">转出会员</label>
            <input type="text" id="transfer-from-player" placeholder="账号/ID" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
          </div>
          <div>
            <label class="text-gray-400 text-xs block mb-1">转入会员</label>
            <input type="text" id="transfer-to-player" placeholder="账号/ID" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
          </div>
        </div>
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="text-gray-400 text-xs block mb-1">状态</label>
            <select id="transfer-status" class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
              <option value="">全部状态</option>
              <option value="pending">待处理</option>
              <option value="completed">已完成</option>
              <option value="failed">已失败</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
          <button onclick="loadTransfers()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded text-sm">
            <i class="fas fa-search mr-2"></i>查询
          </button>
          <button onclick="exportTransfers()" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">
            <i class="fas fa-download mr-2"></i>导出
          </button>
        </div>
      </div>
      
      <!-- 统计卡片 -->
      <div id="transfer-stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-gray-400 text-xs mb-1">总转账笔数</p>
          <p class="text-xl font-bold text-white" id="stat-transfer-count">-</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-gray-400 text-xs mb-1">总转账金额</p>
          <p class="text-xl font-bold text-cyan-400" id="stat-transfer-amount">-</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-gray-400 text-xs mb-1">总手续费</p>
          <p class="text-xl font-bold text-orange-400" id="stat-transfer-fee">-</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-gray-400 text-xs mb-1">实际到账</p>
          <p class="text-xl font-bold text-green-400" id="stat-transfer-actual">-</p>
        </div>
      </div>
      
      <!-- 转账记录表格 -->
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3 text-xs">订单号</th>
              <th class="text-left p-3 text-xs">转出会员</th>
              <th class="text-left p-3 text-xs">转入会员</th>
              <th class="text-right p-3 text-xs">转账金额</th>
              <th class="text-right p-3 text-xs">手续费</th>
              <th class="text-right p-3 text-xs">实际到账</th>
              <th class="text-center p-3 text-xs">状态</th>
              <th class="text-left p-3 text-xs">创建时间</th>
              <th class="text-center p-3 text-xs">操作</th>
            </tr>
          </thead>
          <tbody id="transfers-tbody">
            <tr><td colspan="9" class="p-8 text-center text-gray-400">点击查询按钮加载数据</td></tr>
          </tbody>
        </table>
        <div id="transfer-pagination" class="p-4 border-t border-gray-700"></div>
      </div>
    </div>
    
    <!-- 转账手续费设置 -->
    <div id="finance-transfer-fee" class="hidden">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-semibold">
          <i class="fas fa-cog text-primary mr-2"></i>转账手续费配置
        </h3>
        <button onclick="showAddFeeConfigForm()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded text-sm">
          <i class="fas fa-plus mr-2"></i>新增配置
        </button>
      </div>
      
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3 text-xs">配置名称</th>
              <th class="text-center p-3 text-xs">VIP等级</th>
              <th class="text-center p-3 text-xs">金额范围</th>
              <th class="text-center p-3 text-xs">费率类型</th>
              <th class="text-center p-3 text-xs">费率值</th>
              <th class="text-center p-3 text-xs">最低费用</th>
              <th class="text-center p-3 text-xs">最高费用</th>
              <th class="text-center p-3 text-xs">状态/优先级</th>
              <th class="text-center p-3 text-xs">操作</th>
            </tr>
          </thead>
          <tbody id="fee-config-table-body">
            <tr><td colspan="9" class="p-8 text-center text-gray-400">加载中...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 财务密码设置 -->
    <div id="finance-password" class="hidden">
      <div class="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-4 mb-6 flex items-center">
        <i class="fas fa-shield-alt text-white text-3xl mr-4"></i>
        <div>
          <h3 class="font-bold text-white text-lg">财务密码安全设置</h3>
          <p class="text-sm text-red-100 mt-1">用于保护资金操作安全，涉及人工存取款、红利派发等关键操作时需要输入</p>
        </div>
      </div>
      
      <!-- 密码配置卡片 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- 密码1 -->
        <div class="bg-gray-800 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-semibold flex items-center">
              <i class="fas fa-key text-blue-400 mr-2"></i>
              财务密码 #1
            </h4>
            <span id="pwd1-status" class="px-2 py-1 rounded text-xs bg-gray-600">未设置</span>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-gray-400 text-xs block mb-1.5">密码名称</label>
              <input type="text" id="pwd1-name" placeholder="例如：主管密码" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1.5">密码值</label>
              <div class="relative">
                <input type="password" id="pwd1-value" placeholder="6-20位数字或字母" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 text-sm focus:border-primary focus:outline-none">
                <button type="button" onclick="togglePasswordVisibility('pwd1-value')" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" title="显示/隐藏密码">
                  <i class="fas fa-eye" id="pwd1-value-icon"></i>
                </button>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="saveFinancePassword(1)" class="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded font-medium transition-colors">
                <i class="fas fa-save mr-2"></i>保存密码
              </button>
              <button onclick="resetFinancePassword(1)" class="px-4 bg-gray-600 hover:bg-gray-500 py-2 rounded font-medium transition-colors" title="重置密码">
                <i class="fas fa-redo"></i>
              </button>
            </div>
          </div>
        </div>
        
        <!-- 密码2 -->
        <div class="bg-gray-800 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-semibold flex items-center">
              <i class="fas fa-key text-green-400 mr-2"></i>
              财务密码 #2
            </h4>
            <span id="pwd2-status" class="px-2 py-1 rounded text-xs bg-gray-600">未设置</span>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-gray-400 text-xs block mb-1.5">密码名称</label>
              <input type="text" id="pwd2-name" placeholder="例如：经理密码" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1.5">密码值</label>
              <div class="relative">
                <input type="password" id="pwd2-value" placeholder="6-20位数字或字母" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 text-sm focus:border-primary focus:outline-none">
                <button type="button" onclick="togglePasswordVisibility('pwd2-value')" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" title="显示/隐藏密码">
                  <i class="fas fa-eye" id="pwd2-value-icon"></i>
                </button>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="saveFinancePassword(2)" class="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded font-medium transition-colors">
                <i class="fas fa-save mr-2"></i>保存密码
              </button>
              <button onclick="resetFinancePassword(2)" class="px-4 bg-gray-600 hover:bg-gray-500 py-2 rounded font-medium transition-colors" title="重置密码">
                <i class="fas fa-redo"></i>
              </button>
            </div>
          </div>
        </div>
        
        <!-- 密码3 -->
        <div class="bg-gray-800 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-semibold flex items-center">
              <i class="fas fa-key text-purple-400 mr-2"></i>
              财务密码 #3
            </h4>
            <span id="pwd3-status" class="px-2 py-1 rounded text-xs bg-gray-600">未设置</span>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-gray-400 text-xs block mb-1.5">密码名称</label>
              <input type="text" id="pwd3-name" placeholder="例如：总监密码" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-primary focus:outline-none">
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1.5">密码值</label>
              <div class="relative">
                <input type="password" id="pwd3-value" placeholder="6-20位数字或字母" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 text-sm focus:border-primary focus:outline-none">
                <button type="button" onclick="togglePasswordVisibility('pwd3-value')" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" title="显示/隐藏密码">
                  <i class="fas fa-eye" id="pwd3-value-icon"></i>
                </button>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="saveFinancePassword(3)" class="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded font-medium transition-colors">
                <i class="fas fa-save mr-2"></i>保存密码
              </button>
              <button onclick="resetFinancePassword(3)" class="px-4 bg-gray-600 hover:bg-gray-500 py-2 rounded font-medium transition-colors" title="重置密码">
                <i class="fas fa-redo"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 验证规则配置 -->
      <div class="bg-gray-800 rounded-xl p-6">
        <h4 class="font-semibold mb-4 flex items-center">
          <i class="fas fa-cog text-primary mr-2"></i>
          验证规则配置
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="text-gray-300 text-sm block mb-3 font-medium">所需密码数量</label>
            <div class="space-y-2">
              <label class="flex items-center cursor-pointer p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <input type="radio" name="pwd-required-count" value="1" checked class="mr-3">
                <div class="flex-1">
                  <p class="font-medium">需要 1 个密码</p>
                  <p class="text-xs text-gray-400 mt-0.5">输入任意一个已设置的财务密码即可</p>
                </div>
              </label>
              <label class="flex items-center cursor-pointer p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <input type="radio" name="pwd-required-count" value="2" class="mr-3">
                <div class="flex-1">
                  <p class="font-medium">需要 2 个密码</p>
                  <p class="text-xs text-gray-400 mt-0.5">需要同时输入任意两个已设置的财务密码</p>
                </div>
              </label>
              <label class="flex items-center cursor-pointer p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <input type="radio" name="pwd-required-count" value="3" class="mr-3">
                <div class="flex-1">
                  <p class="font-medium">需要 3 个密码</p>
                  <p class="text-xs text-gray-400 mt-0.5">需要同时输入全部三个财务密码（最高安全级别）</p>
                </div>
              </label>
            </div>
          </div>
          
          <div>
            <label class="text-gray-300 text-sm block mb-3 font-medium">应用场景</label>
            <div class="bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
              <div class="flex items-center">
                <i class="fas fa-check-circle text-green-400 mr-2"></i>
                <span>人工存款操作</span>
              </div>
              <div class="flex items-center">
                <i class="fas fa-check-circle text-green-400 mr-2"></i>
                <span>人工取款操作</span>
              </div>
              <div class="flex items-center">
                <i class="fas fa-check-circle text-green-400 mr-2"></i>
                <span>红利派发操作</span>
              </div>
              <div class="flex items-center">
                <i class="fas fa-check-circle text-green-400 mr-2"></i>
                <span>提款审核通过</span>
              </div>
              <div class="flex items-center">
                <i class="fas fa-check-circle text-green-400 mr-2"></i>
                <span>存款审核通过</span>
              </div>
              <div class="flex items-center">
                <i class="fas fa-check-circle text-green-400 mr-2"></i>
                <span>洗码结算审批</span>
              </div>
              <div class="mt-4 pt-4 border-t border-gray-600">
                <p class="text-xs text-gray-400">
                  <i class="fas fa-info-circle mr-1"></i>
                  以上所有涉及资金变动的操作都需要财务密码验证
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end">
          <button onclick="savePasswordRule()" class="bg-primary hover:bg-blue-700 px-6 py-2.5 rounded-lg font-medium transition-colors">
            <i class="fas fa-save mr-2"></i>保存配置
          </button>
        </div>
      </div>
      
      <!-- 密码状态说明 -->
      <div class="bg-gray-800 rounded-xl p-6 mt-6">
        <h4 class="font-semibold mb-4 flex items-center">
          <i class="fas fa-info-circle text-blue-400 mr-2"></i>
          使用说明
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <p class="mb-2"><strong class="text-gray-300">1. 密码设置：</strong></p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li>可以设置 1-3 个财务密码</li>
              <li>每个密码需要设置名称和密码值</li>
              <li>密码长度为 6-20 位数字或字母</li>
              <li>建议不同人员保管不同密码</li>
            </ul>
          </div>
          <div>
            <p class="mb-2"><strong class="text-gray-300">2. 验证规则：</strong></p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li>选择需要几个密码才能验证通过</li>
              <li>安全级别：1个（低）< 2个（中）< 3个（高）</li>
              <li>验证规则适用于所有资金操作</li>
              <li>可以随时修改验证规则</li>
            </ul>
          </div>
          <div>
            <p class="mb-2"><strong class="text-gray-300">3. 密码管理：</strong></p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li>密码修改后立即生效</li>
              <li>建议定期更换财务密码</li>
              <li>妥善保管密码，防止泄露</li>
              <li>遗忘密码请联系超级管理员重置</li>
            </ul>
          </div>
          <div>
            <p class="mb-2"><strong class="text-gray-300">4. 安全建议：</strong></p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li>大额操作建议使用 3 个密码验证</li>
              <li>不同密码由不同人员保管</li>
              <li>避免在公共场合输入密码</li>
              <li>发现密码泄露立即修改</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 加载财务密码配置
  loadFinancePasswordConfig();
}

// 支付方式图标和颜色
function getPaymentMethodIcon(type) {
  const icons = {
    bank: 'fas fa-university',
    ewallet: 'fas fa-wallet',
    crypto: 'fab fa-bitcoin',
    quickpay: 'fas fa-bolt'
  };
  return icons[type] || 'fas fa-credit-card';
}

function getPaymentMethodColor(type) {
  const colors = {
    bank: 'bg-blue-600',
    ewallet: 'bg-green-600',
    crypto: 'bg-orange-600',
    quickpay: 'bg-purple-600'
  };
  return colors[type] || 'bg-gray-600';
}

function switchFinanceTab(tab) {
  document.querySelectorAll('[id^="finance-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('bg-primary');
    el.classList.add('bg-gray-700');
  });
  document.getElementById(`finance-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.remove('bg-gray-700');
  document.getElementById(`tab-${tab}`).classList.add('bg-primary');
  
  // 加载对应数据
  if (tab === 'transfer-fee') {
    loadTransferFeeConfigs();
  } else if (tab === 'password') {
    loadFinancePasswordConfig();
  }
}

// ========================================
// 转账手续费配置管理函数（财务控端）
// ========================================

// 加载手续费配置列表
async function loadTransferFeeConfigs() {
  try {
    const tbody = document.getElementById('fee-config-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center p-8"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
    }
    
    const response = await fetch('/api/transfer-fee-configs', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    if (!response.ok) throw new Error('Failed to fetch fee configs');
    const data = await response.json();

    if (data.configs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-gray-400 p-8">暂无配置</td></tr>';
      return;
    }

    const feeTypeTexts = {
      percentage: '百分比',
      fixed: '固定金额'
    };

    tbody.innerHTML = data.configs.map(c => `
      <tr class="border-t border-gray-700 hover:bg-gray-750">
        <td class="p-3 text-sm font-semibold">${escapeHtml(c.name)}</td>
        <td class="p-3 text-sm">
          ${c.vip_level === -1 ? '<span class="text-blue-400">全部等级</span>' : `<span class="text-purple-400">VIP ${c.vip_level}</span>`}
        </td>
        <td class="p-3 text-sm text-gray-300">
          $${c.min_amount.toFixed(2)} ~ ${c.max_amount ? '$' + c.max_amount.toFixed(2) : '<span class="text-gray-500">无上限</span>'}
        </td>
        <td class="p-3 text-sm text-gray-400">${feeTypeTexts[c.fee_type]}</td>
        <td class="p-3 text-sm font-semibold text-orange-400">
          ${c.fee_type === 'percentage' ? c.fee_rate + '%' : '$' + c.fee_amount.toFixed(2)}
        </td>
        <td class="p-3 text-sm text-gray-300">$${c.min_fee.toFixed(2)}</td>
        <td class="p-3 text-sm text-gray-300">${c.max_fee ? '$' + c.max_fee.toFixed(2) : '<span class="text-gray-500">无上限</span>'}</td>
        <td class="p-3 text-sm">
          <span class="px-2 py-1 rounded-full text-xs font-semibold ${c.is_active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}">
            ${c.is_active ? '启用' : '停用'}
          </span>
          <span class="ml-2 text-xs text-gray-500">优先级: ${c.priority}</span>
        </td>
        <td class="p-3 text-sm">
          <button onclick="editFeeConfig(${c.id})" class="text-blue-400 hover:text-blue-300 mr-2" title="编辑">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="toggleFeeConfig(${c.id}, ${c.is_active ? 0 : 1})" class="text-${c.is_active ? 'gray' : 'green'}-400 hover:text-${c.is_active ? 'gray' : 'green'}-300 mr-2" title="${c.is_active ? '停用' : '启用'}">
            <i class="fas fa-${c.is_active ? 'toggle-off' : 'toggle-on'}"></i>
          </button>
          <button onclick="deleteFeeConfig(${c.id})" class="text-red-400 hover:text-red-300" title="删除">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    showToast('加载手续费配置失败: ' + error.message, 'error');
    const tbody = document.getElementById('fee-config-table-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center text-red-400 p-8">加载失败</td></tr>';
    }
  }
}

// 显示新增手续费配置表单
function showAddFeeConfigForm() {
  const modalHtml = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="this.remove()">
      <div class="bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto" onclick="event.stopPropagation()">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white">
            <i class="fas fa-plus-circle mr-2 text-blue-400"></i>新增手续费配置
          </h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <form id="fee-config-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-300">配置名称 *</label>
              <input type="text" name="name" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500" placeholder="例如: VIP5专属优惠">
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-300">会员等级</label>
              <select name="vip_level" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
                <option value="-1">全部等级</option>
                ${[...Array(11)].map((_, i) => `<option value="${i}">VIP ${i}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-300">最小金额 *</label>
              <input type="number" name="min_amount" step="0.01" min="0" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500" placeholder="0.00">
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-300">最大金额</label>
              <input type="number" name="max_amount" step="0.01" min="0" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500" placeholder="留空表示无上限">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-300">手续费类型 *</label>
              <select name="fee_type" onchange="toggleFeeInputs(this.value)" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
                <option value="percentage">百分比</option>
                <option value="fixed">固定金额</option>
              </select>
            </div>
            <div id="fee-rate-div">
              <label class="block text-sm font-semibold mb-1 text-gray-300">费率 (%) *</label>
              <input type="number" name="fee_rate" step="0.01" min="0" max="100" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500" placeholder="例如: 0.5">
            </div>
            <div id="fee-amount-div" style="display:none;">
              <label class="block text-sm font-semibold mb-1 text-gray-300">手续费金额 *</label>
              <input type="number" name="fee_amount" step="0.01" min="0" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500" placeholder="0.00">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-300">最低手续费 *</label>
              <input type="number" name="min_fee" step="0.01" min="0" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500" placeholder="0.00">
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-300">最高手续费</label>
              <input type="number" name="max_fee" step="0.01" min="0" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500" placeholder="留空表示无上限">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-300">优先级 *</label>
              <input type="number" name="priority" min="0" value="0" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
              <div class="text-xs text-gray-500 mt-1">数值越大优先级越高</div>
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1 text-gray-300">状态</label>
              <select name="is_active" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
                <option value="1">启用</option>
                <option value="0">停用</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end space-x-2 pt-4 border-t border-gray-700">
            <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              <i class="fas fa-times mr-1"></i>取消
            </button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              <i class="fas fa-save mr-1"></i>保存
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('fee-config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      if (value === '') continue;
      if (['min_amount', 'max_amount', 'fee_rate', 'fee_amount', 'min_fee', 'max_fee'].includes(key)) {
        data[key] = parseFloat(value);
      } else if (['vip_level', 'priority', 'is_active'].includes(key)) {
        data[key] = parseInt(value);
      } else {
        data[key] = value;
      }
    }

    try {
      const response = await fetch('/api/transfer-fee-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to create config');
      
      showToast('手续费配置创建成功', 'success');
      document.querySelector('.fixed').remove();
      loadTransferFeeConfigs();

    } catch (error) {
      showToast('创建失败: ' + error.message, 'error');
    }
  });
}

// 切换费率输入框显示
function toggleFeeInputs(feeType) {
  document.getElementById('fee-rate-div').style.display = feeType === 'percentage' ? 'block' : 'none';
  document.getElementById('fee-amount-div').style.display = feeType === 'fixed' ? 'block' : 'none';
}

// 编辑手续费配置
async function editFeeConfig(configId) {
  try {
    const response = await fetch('/api/transfer-fee-configs', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    const config = data.configs.find(c => c.id === configId);

    if (!config) {
      showToast('未找到配置', 'error');
      return;
    }

    const modalHtml = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="this.remove()">
        <div class="bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-white">
              <i class="fas fa-edit mr-2 text-blue-400"></i>编辑手续费配置
            </h3>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <form id="fee-config-edit-form" class="space-y-4">
            <input type="hidden" name="id" value="${config.id}">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1 text-gray-300">配置名称 *</label>
                <input type="text" name="name" value="${escapeHtml(config.name)}" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1 text-gray-300">会员等级</label>
                <select name="vip_level" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
                  <option value="-1" ${config.vip_level === -1 ? 'selected' : ''}>全部等级</option>
                  ${[...Array(11)].map((_, i) => `<option value="${i}" ${config.vip_level === i ? 'selected' : ''}>VIP ${i}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1 text-gray-300">最小金额 *</label>
                <input type="number" name="min_amount" step="0.01" value="${config.min_amount}" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1 text-gray-300">最大金额</label>
                <input type="number" name="max_amount" step="0.01" value="${config.max_amount || ''}" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1 text-gray-300">手续费类型 *</label>
                <select name="fee_type" onchange="toggleFeeInputs(this.value)" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
                  <option value="percentage" ${config.fee_type === 'percentage' ? 'selected' : ''}>百分比</option>
                  <option value="fixed" ${config.fee_type === 'fixed' ? 'selected' : ''}>固定金额</option>
                </select>
              </div>
              <div id="fee-rate-div" style="display:${config.fee_type === 'percentage' ? 'block' : 'none'}">
                <label class="block text-sm font-semibold mb-1 text-gray-300">费率 (%) *</label>
                <input type="number" name="fee_rate" step="0.01" value="${config.fee_rate || ''}" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
              </div>
              <div id="fee-amount-div" style="display:${config.fee_type === 'fixed' ? 'block' : 'none'}">
                <label class="block text-sm font-semibold mb-1 text-gray-300">手续费金额 *</label>
                <input type="number" name="fee_amount" step="0.01" value="${config.fee_amount || ''}" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1 text-gray-300">最低手续费 *</label>
                <input type="number" name="min_fee" step="0.01" value="${config.min_fee}" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1 text-gray-300">最高手续费</label>
                <input type="number" name="max_fee" step="0.01" value="${config.max_fee || ''}" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold mb-1 text-gray-300">优先级 *</label>
                <input type="number" name="priority" value="${config.priority}" required class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
              </div>
              <div>
                <label class="block text-sm font-semibold mb-1 text-gray-300">状态</label>
                <select name="is_active" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:border-blue-500">
                  <option value="1" ${config.is_active ? 'selected' : ''}>启用</option>
                  <option value="0" ${!config.is_active ? 'selected' : ''}>停用</option>
                </select>
              </div>
            </div>
            <div class="flex justify-end space-x-2 pt-4 border-t border-gray-700">
              <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                <i class="fas fa-times mr-1"></i>取消
              </button>
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <i class="fas fa-save mr-1"></i>保存
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('fee-config-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {};
      
      for (let [key, value] of formData.entries()) {
        if (value === '' && key !== 'max_amount' && key !== 'max_fee') continue;
        if (['min_amount', 'max_amount', 'fee_rate', 'fee_amount', 'min_fee', 'max_fee'].includes(key)) {
          data[key] = value ? parseFloat(value) : null;
        } else if (['id', 'vip_level', 'priority', 'is_active'].includes(key)) {
          data[key] = parseInt(value);
        } else {
          data[key] = value;
        }
      }

      try {
        const response = await fetch('/api/transfer-fee-configs', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to update config');
        
        showToast('手续费配置更新成功', 'success');
        document.querySelector('.fixed').remove();
        loadTransferFeeConfigs();

      } catch (error) {
        showToast('更新失败: ' + error.message, 'error');
      }
    });

  } catch (error) {
    showToast('加载配置失败: ' + error.message, 'error');
  }
}

// 切换手续费配置状态
async function toggleFeeConfig(configId, isActive) {
  try {
    const response = await fetch('/api/transfer-fee-configs', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id: configId, is_active: isActive })
    });

    if (!response.ok) throw new Error('Failed to toggle config');
    
    showToast(isActive ? '配置已启用' : '配置已停用', 'success');
    loadTransferFeeConfigs();

  } catch (error) {
    showToast('操作失败: ' + error.message, 'error');
  }
}

// 删除手续费配置
async function deleteFeeConfig(configId) {
  if (!confirm('确定要删除这个手续费配置吗?')) return;

  try {
    const response = await fetch('/api/transfer-fee-configs', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ id: configId })
    });

    if (!response.ok) throw new Error('Failed to delete config');
    
    showToast('配置删除成功', 'success');
    loadTransferFeeConfigs();

  } catch (error) {
    showToast('删除失败: ' + error.message, 'error');
  }
}

// 人工存款
async function submitManualDeposit(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    player_id: parseInt(form.player_id.value),
    amount: parseFloat(form.amount.value),
    payment_method: form.payment_method.value,
    remark: form.remark.value,
    operator_id: currentUser?.id,
    operator_name: currentUser?.nickname || currentUser?.username
  };
  
  if (!confirm(`确定为玩家ID ${data.player_id} 存入 $${data.amount}？`)) return;
  
  // 验证财务密码
  const verified = await verifyFinancePassword('manual_deposit', data.amount);
  if (!verified) {
    return; // 验证失败，不执行存款
  }
  
  const result = await api('/api/manual-deposit', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  if (result.success) {
    showSuccess(`存款成功！\n订单号: ${result.data.order_no}\n新余额: $${result.data.new_balance}`);
    form.reset();
  } else {
    showError('存款失败: ' + result.error);
  }
}

// 人工取款
async function submitManualWithdraw(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    player_id: parseInt(form.player_id.value),
    amount: parseFloat(form.amount.value),
    bank_name: form.bank_name.value,
    bank_card_no: form.bank_card_no.value,
    remark: form.remark.value,
    operator_id: currentUser?.id,
    operator_name: currentUser?.nickname || currentUser?.username
  };
  
  if (!confirm(`确定为玩家ID ${data.player_id} 取出 $${data.amount}？`)) return;
  
  // 验证财务密码
  const verified = await verifyFinancePassword('manual_withdrawal', data.amount);
  if (!verified) {
    return; // 验证失败，不执行取款
  }
  
  const result = await api('/api/manual-withdraw', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  if (result.success) {
    showSuccess(`取款成功！\n订单号: ${result.data.order_no}\n新余额: $${result.data.new_balance}`);
    form.reset();
  } else {
    showError('取款失败: ' + result.error);
  }
}

// 存款审核
async function approveDeposit(id, amount) {
  if (!confirm('确定通过该存款申请？')) return;
  
  // 验证财务密码
  const verified = await verifyFinancePassword('deposit_approval', amount || 0);
  if (!verified) {
    return; // 验证失败，不执行审批
  }
  
  const result = await api(`/api/deposits/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 2, reviewer_id: currentUser?.id, reviewer_name: currentUser?.nickname })
  });
  if (result.success) {
    showSuccess('存款审核通过');
    loadModule('finance');
  } else {
    showError(result.error);
  }
}

async function rejectDeposit(id) {
  const remark = prompt('请输入拒绝原因:');
  if (!remark) return;
  const result = await api(`/api/deposits/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 3, remark, reviewer_id: currentUser?.id, reviewer_name: currentUser?.nickname })
  });
  if (result.success) loadModule('finance');
  else alert(result.error);
}

async function approveWithdraw(id, amount) {
  if (!confirm('确定通过该提款申请？')) return;
  
  // 验证财务密码
  const verified = await verifyFinancePassword('withdrawal_approval', amount || 0);
  if (!verified) {
    return; // 验证失败，不执行审批
  }
  
  const result = await api(`/api/withdraws/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 4, reviewer_id: currentUser?.id, reviewer_name: currentUser?.nickname })
  });
  if (result.success) {
    showSuccess('提款审核通过');
    loadModule('finance');
  } else {
    showError(result.error);
  }
}

async function rejectWithdraw(id) {
  const remark = prompt('请输入拒绝原因:');
  if (!remark) return;
  const result = await api(`/api/withdraws/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 5, remark, reviewer_id: currentUser?.id, reviewer_name: currentUser?.nickname })
  });
  if (result.success) loadModule('finance');
  else alert(result.error);
}

// 收款方式管理
function showAddPaymentMethod() {
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="payment-modal">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4"><i class="fas fa-plus-circle text-primary mr-2"></i>添加收款方式</h3>
        <form onsubmit="submitPaymentMethod(event)">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-2">方式代码 *</label>
                <input type="text" name="method_code" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2" placeholder="如: USDT_TRC20">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">方式名称 *</label>
                <input type="text" name="method_name" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2" placeholder="如: USDT-TRC20">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-2">类型</label>
                <select name="method_type" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2" onchange="toggleQrCodeSection(this.value)">
                  <option value="bank">银行卡</option>
                  <option value="ewallet">电子钱包</option>
                  <option value="crypto">加密货币</option>
                  <option value="quickpay">快捷支付</option>
                </select>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">币种</label>
                <select name="currency" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                  <option value="USD" selected>USD (美元)</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-2">最低金额</label>
                <input type="number" name="min_amount" value="100" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">最高金额</label>
                <input type="number" name="max_amount" value="1000000" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
              </div>
            </div>
            <!-- 二维码设置区域 -->
            <div id="qr-code-section" class="bg-gray-700/50 rounded-lg p-4">
              <div class="flex items-center mb-3">
                <i class="fas fa-qrcode text-purple-400 mr-2"></i>
                <span class="font-medium">收款二维码设置</span>
                <span class="text-xs text-gray-400 ml-2">(可选，用于展示给用户扫码付款)</span>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">二维码图片URL</label>
                <input type="url" name="qr_code_url" id="qr-code-input" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2" placeholder="https://example.com/qrcode.png" oninput="previewQrCodeInput(this.value)">
                <p class="text-xs text-gray-500 mt-1">请输入二维码图片的完整网址，支持 PNG、JPG 格式</p>
              </div>
              <!-- 二维码预览 -->
              <div id="qr-preview-container" class="mt-3 hidden">
                <label class="block text-gray-400 text-sm mb-2">预览效果</label>
                <div class="flex items-center justify-center bg-white rounded-lg p-2 w-32 h-32 mx-auto">
                  <img id="qr-preview-img" class="max-w-full max-h-full" alt="二维码预览" onerror="handleQrPreviewError()">
                </div>
              </div>
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">使用说明</label>
              <textarea name="instructions" rows="2" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2" placeholder="充值说明，如：请扫描二维码转账..."></textarea>
            </div>
          </div>
          <div class="flex space-x-3 mt-6">
            <button type="button" onclick="closePaymentModal()" class="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-lg">取消</button>
            <button type="submit" class="flex-1 bg-primary hover:bg-blue-700 py-2 rounded-lg"><i class="fas fa-save mr-2"></i>保存</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

// 二维码输入预览
function previewQrCodeInput(url) {
  const container = document.getElementById('qr-preview-container');
  const img = document.getElementById('qr-preview-img');
  if (url && url.trim()) {
    container.classList.remove('hidden');
    img.src = url;
  } else {
    container.classList.add('hidden');
    img.src = '';
  }
}

// 处理二维码预览加载错误
function handleQrPreviewError() {
  const container = document.getElementById('qr-preview-container');
  if (container) {
    container.innerHTML = `
      <label class="block text-gray-400 text-sm mb-2">预览效果</label>
      <div class="flex items-center justify-center bg-gray-600 rounded-lg p-4 text-center">
        <div>
          <i class="fas fa-exclamation-triangle text-yellow-400 text-2xl mb-2"></i>
          <p class="text-xs text-gray-400">图片加载失败，请检查URL是否正确</p>
        </div>
      </div>
    `;
  }
}

// 根据支付类型切换二维码区域提示
function toggleQrCodeSection(type) {
  const section = document.getElementById('qr-code-section');
  if (!section) return;
  
  const tips = {
    bank: '银行卡通常不需要二维码，但可以添加收款码',
    ewallet: '电子钱包建议添加支付宝/微信收款二维码',
    crypto: '加密货币建议添加钱包地址二维码',
    quickpay: '快捷支付通常由系统自动生成'
  };
  
  const tipEl = section.querySelector('.text-xs.text-gray-400');
  if (tipEl) {
    tipEl.textContent = `(${tips[type] || '可选，用于展示给用户扫码付款'})`;
  }
}

function closePaymentModal() {
  document.getElementById('payment-modal')?.remove();
}

async function submitPaymentMethod(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    method_code: form.method_code.value,
    method_name: form.method_name.value,
    method_type: form.method_type.value,
    currency: form.currency?.value || 'USD',
    min_amount: parseFloat(form.min_amount.value),
    max_amount: parseFloat(form.max_amount.value),
    qr_code_url: form.qr_code_url?.value?.trim() || null,
    instructions: form.instructions.value,
    created_by: currentUser?.id
  };
  
  const result = await api('/api/payment-methods', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  if (result.success) {
    closePaymentModal();
    loadModule('finance');
    setTimeout(() => switchFinanceTab('payment'), 100);
    alert('收款方式添加成功！');
  } else {
    alert('添加失败: ' + result.error);
  }
}

async function togglePaymentMethod(id, currentStatus) {
  const newStatus = currentStatus === 1 ? 0 : 1;
  const action = newStatus === 1 ? '启用' : '禁用';
  if (!confirm(`确定${action}该收款方式？`)) return;
  
  const result = await api(`/api/payment-methods/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus })
  });
  
  if (result.success) {
    loadModule('finance');
    setTimeout(() => switchFinanceTab('payment'), 100);
  } else {
    alert('操作失败: ' + result.error);
  }
}

// 编辑收款方式
async function editPaymentMethod(id) {
  // 获取收款方式详情
  const result = await api('/api/payment-methods');
  if (!result.success) {
    alert('获取数据失败: ' + result.error);
    return;
  }
  
  const pm = result.data.find(p => p.id === id);
  if (!pm) {
    alert('收款方式不存在');
    return;
  }
  
  // 安全转义所有用户输入的内容
  const safeMethodCode = escapeHtml(pm.method_code);
  const safeMethodName = escapeHtml(pm.method_name);
  const safeQrCodeUrl = escapeHtml(pm.qr_code_url || '');
  const safeInstructions = escapeHtml(pm.instructions || '');
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="payment-modal">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4"><i class="fas fa-edit text-primary mr-2"></i>编辑收款方式</h3>
        <form onsubmit="submitEditPaymentMethod(event, ${id})">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-2">方式代码</label>
                <input type="text" name="method_code" value="${safeMethodCode}" class="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-2 cursor-not-allowed" readonly>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">方式名称 *</label>
                <input type="text" name="method_name" value="${safeMethodName}" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-2">类型</label>
                <select name="method_type" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2" onchange="toggleQrCodeSection(this.value)">
                  <option value="bank" ${pm.method_type === 'bank' ? 'selected' : ''}>银行卡</option>
                  <option value="ewallet" ${pm.method_type === 'ewallet' ? 'selected' : ''}>电子钱包</option>
                  <option value="crypto" ${pm.method_type === 'crypto' ? 'selected' : ''}>加密货币</option>
                  <option value="quickpay" ${pm.method_type === 'quickpay' ? 'selected' : ''}>快捷支付</option>
                </select>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">币种</label>
                <select name="currency" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                  <option value="USD" selected>USD (美元)</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-2">最低金额</label>
                <input type="number" name="min_amount" value="${pm.min_amount}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">最高金额</label>
                <input type="number" name="max_amount" value="${pm.max_amount}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-2">费率 (%)</label>
                <input type="number" name="fee_rate" value="${(pm.fee_rate || 0) * 100}" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">固定手续费</label>
                <input type="number" name="fee_fixed" value="${pm.fee_fixed || 0}" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
              </div>
            </div>
            <!-- 二维码设置区域 -->
            <div id="qr-code-section" class="bg-gray-700/50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                  <i class="fas fa-qrcode text-purple-400 mr-2"></i>
                  <span class="font-medium">收款二维码设置</span>
                </div>
                ${pm.qr_code_url ? '<span class="text-xs text-green-400"><i class="fas fa-check-circle mr-1"></i>已配置</span>' : '<span class="text-xs text-yellow-400"><i class="fas fa-exclamation-triangle mr-1"></i>未配置</span>'}
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-2">二维码图片URL</label>
                <input type="url" name="qr_code_url" id="qr-code-input" value="${safeQrCodeUrl}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2" placeholder="https://example.com/qrcode.png" oninput="previewQrCodeInput(this.value)">
                <p class="text-xs text-gray-500 mt-1">请输入二维码图片的完整网址，留空则不显示二维码</p>
              </div>
              <!-- 二维码预览 -->
              <div id="qr-preview-container" class="mt-3 ${pm.qr_code_url ? '' : 'hidden'}">
                <label class="block text-gray-400 text-sm mb-2">当前二维码</label>
                <div class="flex items-center justify-center bg-white rounded-lg p-2 w-32 h-32 mx-auto">
                  <img id="qr-preview-img" src="${safeQrCodeUrl}" class="max-w-full max-h-full" alt="二维码预览" onerror="handleQrPreviewError()">
                </div>
              </div>
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">使用说明</label>
              <textarea name="instructions" rows="2" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2" placeholder="充值说明...">${safeInstructions}</textarea>
            </div>
          </div>
          <div class="flex space-x-3 mt-6">
            <button type="button" onclick="closePaymentModal()" class="flex-1 bg-gray-600 hover:bg-gray-500 py-2 rounded-lg">取消</button>
            <button type="submit" class="flex-1 bg-primary hover:bg-blue-700 py-2 rounded-lg"><i class="fas fa-save mr-2"></i>保存修改</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

// 提交编辑后的收款方式
async function submitEditPaymentMethod(e, id) {
  e.preventDefault();
  const form = e.target;
  const data = {
    method_name: form.method_name.value,
    method_type: form.method_type.value,
    currency: form.currency?.value || 'USD',
    min_amount: parseFloat(form.min_amount.value),
    max_amount: parseFloat(form.max_amount.value),
    fee_rate: parseFloat(form.fee_rate.value) / 100,
    fee_fixed: parseFloat(form.fee_fixed.value),
    qr_code_url: form.qr_code_url?.value?.trim() || null,
    instructions: form.instructions.value
  };
  
  const result = await api(`/api/payment-methods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  
  if (result.success) {
    closePaymentModal();
    loadModule('finance');
    setTimeout(() => switchFinanceTab('payment'), 100);
    alert('收款方式更新成功！');
  } else {
    alert('更新失败: ' + result.error);
  }
}

// 二维码预览弹窗
function previewQrCode(encodedUrl, methodName) {
  const url = decodeURIComponent(encodedUrl);
  // 验证URL格式
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    alert('无效的二维码链接');
    return;
  }
  
  const safeMethodName = escapeHtml(methodName);
  const safeUrl = escapeHtml(url);
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" id="qr-modal" onclick="closeQrModal(event)">
      <div class="bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold"><i class="fas fa-qrcode text-purple-400 mr-2"></i>${safeMethodName} 二维码</h3>
          <button onclick="closeQrModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
        </div>
        <div class="flex items-center justify-center bg-white rounded-lg p-4 mb-4" id="qr-image-container">
          <img src="${safeUrl}" class="max-w-full max-h-64" alt="${safeMethodName} 二维码" onerror="document.getElementById('qr-image-container').innerHTML='<div class=\\'text-center text-red-500 p-4\\'>图片加载失败<br><small class=\\'text-gray-500\\'>请检查图片链接是否有效</small></div>'">
        </div>
        <div class="text-center text-sm text-gray-400 mb-4">
          <p>请用户扫描以上二维码完成付款</p>
        </div>
        <div class="space-y-2">
          <input type="text" id="qr-url-input" value="${safeUrl}" readonly class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-400">
          <button onclick="copyQrUrlFromInput()" class="w-full bg-primary hover:bg-blue-700 py-2 rounded-lg text-sm"><i class="fas fa-copy mr-2"></i>复制链接</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

// 关闭二维码弹窗
function closeQrModal(event) {
  // 如果有event参数，检查是否点击的是背景层
  if (event && event.target && event.target.id !== 'qr-modal') return;
  document.getElementById('qr-modal')?.remove();
}

// 从输入框复制二维码链接（更安全的方式）
function copyQrUrlFromInput() {
  const input = document.getElementById('qr-url-input');
  if (!input) return;
  
  const url = input.value;
  navigator.clipboard.writeText(url).then(() => {
    alert('链接已复制到剪贴板！');
  }).catch(() => {
    // 降级方案
    input.select();
    document.execCommand('copy');
    alert('链接已复制到剪贴板！');
  });
}

// =====================
// 2FA 双因素认证管理
// =====================

// 显示2FA设置弹窗
async function show2FASettings() {
  if (!currentUser?.id) {
    alert('请先登录');
    return;
  }
  
  // 获取当前2FA状态
  const statusResult = await api(`/api/auth/2fa/status?admin_id=${currentUser.id}`);
  const is2FAEnabled = statusResult.success && statusResult.data?.two_fa_enabled;
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="twofa-modal">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">
            <i class="fas fa-shield-alt text-primary mr-2"></i>双因素认证 (2FA)
          </h3>
          <button onclick="close2FAModal()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="mb-6">
          <div class="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div class="flex items-center">
              <i class="fas fa-lock text-2xl ${is2FAEnabled ? 'text-green-400' : 'text-yellow-400'} mr-3"></i>
              <div>
                <p class="font-medium">当前状态</p>
                <p class="text-sm ${is2FAEnabled ? 'text-green-400' : 'text-yellow-400'}">
                  ${is2FAEnabled ? '已启用' : '未启用'}
                </p>
              </div>
            </div>
            ${is2FAEnabled 
              ? '<span class="px-3 py-1 bg-green-600 rounded-full text-sm">安全</span>' 
              : '<span class="px-3 py-1 bg-yellow-600 rounded-full text-sm">建议开启</span>'}
          </div>
        </div>
        
        <div class="space-y-3">
          ${is2FAEnabled ? `
            <p class="text-sm text-gray-400 mb-4">
              <i class="fas fa-info-circle mr-1"></i>
              您已启用双因素认证，账户更加安全。如需更换设备，请先解绑再重新绑定。
            </p>
            <button onclick="show2FADisable()" class="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg transition">
              <i class="fas fa-unlink mr-2"></i>解绑 2FA
            </button>
          ` : `
            <p class="text-sm text-gray-400 mb-4">
              <i class="fas fa-info-circle mr-1"></i>
              启用双因素认证可以大幅提升账户安全性。您需要使用身份验证器App（如Google Authenticator、Microsoft Authenticator等）。
            </p>
            <button onclick="start2FASetup()" class="w-full bg-primary hover:bg-blue-700 py-3 rounded-lg transition">
              <i class="fas fa-plus-circle mr-2"></i>绑定 2FA
            </button>
          `}
          <button onclick="close2FAModal()" class="w-full bg-gray-600 hover:bg-gray-500 py-3 rounded-lg transition">
            关闭
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

// 关闭2FA弹窗
function close2FAModal() {
  document.getElementById('twofa-modal')?.remove();
}

// 开始2FA设置流程
async function start2FASetup() {
  close2FAModal();
  
  const result = await api('/api/auth/2fa/setup', {
    method: 'POST',
    body: JSON.stringify({ admin_id: currentUser?.id })
  });
  
  if (!result.success) {
    alert('生成2FA密钥失败: ' + result.error);
    return;
  }
  
  const data = result.data;
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="twofa-modal">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">
            <i class="fas fa-qrcode text-primary mr-2"></i>绑定双因素认证
          </h3>
          <button onclick="close2FAModal()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- 步骤指示 -->
        <div class="flex items-center justify-center mb-6">
          <div class="flex items-center">
            <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <span class="ml-2 text-sm">扫描二维码</span>
          </div>
          <div class="w-8 h-px bg-gray-600 mx-2"></div>
          <div class="flex items-center">
            <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <span class="ml-2 text-sm text-gray-400">验证绑定</span>
          </div>
        </div>
        
        <!-- 二维码 -->
        <div class="bg-white rounded-xl p-4 mb-6 mx-auto w-fit">
          <img src="${escapeHtml(data.qr_code_url)}" alt="2FA QR Code" class="w-48 h-48" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22>加载失败</text></svg>'">
        </div>
        
        <div class="text-center mb-6">
          <p class="text-sm text-gray-400 mb-2">使用身份验证器App扫描上方二维码</p>
          <p class="text-xs text-gray-500">支持: Google Authenticator, Microsoft Authenticator, Authy 等</p>
        </div>
        
        <!-- 手动输入密钥 -->
        <div class="bg-gray-700 rounded-lg p-4 mb-6">
          <p class="text-sm text-gray-400 mb-2">无法扫描？手动输入密钥:</p>
          <div class="flex items-center">
            <code class="flex-1 bg-gray-800 px-3 py-2 rounded text-sm font-mono tracking-wider text-green-400">${escapeHtml(data.manual_entry_key)}</code>
            <button onclick="copyToClipboard('${escapeJs(data.secret)}')" class="ml-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded" title="复制">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
        
        <!-- 验证表单 -->
        <form onsubmit="verify2FASetup(event)" class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">输入验证器显示的6位验证码</label>
            <input type="text" name="token" maxlength="6" pattern="[0-9]{6}" required
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-primary"
                   placeholder="000000" autocomplete="off">
          </div>
          <div class="flex space-x-3">
            <button type="button" onclick="close2FAModal()" class="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg transition">
              取消
            </button>
            <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg transition">
              <i class="fas fa-check mr-2"></i>验证并绑定
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

// 验证并完成2FA绑定
async function verify2FASetup(e) {
  e.preventDefault();
  const form = e.target;
  const token = form.token.value.trim();
  
  if (!/^\d{6}$/.test(token)) {
    alert('请输入6位数字验证码');
    return;
  }
  
  const result = await api('/api/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({
      admin_id: currentUser?.id,
      token: token
    })
  });
  
  if (result.success) {
    close2FAModal();
    // 更新本地用户状态
    currentUser.two_fa_enabled = true;
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    alert('🎉 2FA绑定成功！\n\n您的账户现在受到双因素认证保护。下次登录时需要输入验证码。');
    
    // 刷新当前页面
    loadModule(currentModule);
  } else {
    alert('验证失败: ' + result.error);
  }
}

// 显示解绑2FA弹窗
function show2FADisable() {
  close2FAModal();
  
  const html = `
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="twofa-modal">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-red-400">
            <i class="fas fa-exclamation-triangle mr-2"></i>解绑双因素认证
          </h3>
          <button onclick="close2FAModal()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
          <p class="text-sm text-red-300">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <strong>警告：</strong>解绑2FA会降低账户安全性。请确保您确实需要解绑，解绑后可以重新绑定。
          </p>
        </div>
        
        <form onsubmit="confirm2FADisable(event)" class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">输入登录密码确认身份</label>
            <input type="password" name="password" required
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
                   placeholder="请输入您的登录密码">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">输入当前2FA验证码</label>
            <input type="text" name="token" maxlength="6" pattern="[0-9]{6}" required
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-center tracking-widest font-mono focus:outline-none focus:border-primary"
                   placeholder="000000" autocomplete="off">
          </div>
          <div class="flex space-x-3 pt-4">
            <button type="button" onclick="close2FAModal()" class="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg transition">
              取消
            </button>
            <button type="submit" class="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-lg transition">
              <i class="fas fa-unlink mr-2"></i>确认解绑
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

// 确认解绑2FA
async function confirm2FADisable(e) {
  e.preventDefault();
  const form = e.target;
  
  if (!confirm('确定要解绑双因素认证吗？这将降低您的账户安全性。')) {
    return;
  }
  
  const result = await api('/api/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({
      admin_id: currentUser?.id,
      password: form.password.value,
      token: form.token.value.trim()
    })
  });
  
  if (result.success) {
    close2FAModal();
    // 更新本地用户状态
    currentUser.two_fa_enabled = false;
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    alert('2FA已解绑。建议您尽快重新绑定以保护账户安全。');
    
    // 刷新当前页面
    loadModule(currentModule);
  } else {
    alert('解绑失败: ' + result.error);
  }
}

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('已复制到剪贴板');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('已复制到剪贴板');
  });
}

// =====================
// 5. 注单控端
// =====================
async function renderBets(container) {
  // 获取代理列表用于筛选
  const agentsResult = await api('/api/agents?limit=100');
  const agents = agentsResult.data || [];
  
  container.innerHTML = `
    <!-- 页面标题 -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold"><i class="fas fa-clipboard-list text-primary mr-2"></i>注单查询</h2>
        <p class="text-gray-400 text-sm mt-1">完整的注单数据查询与导出功能</p>
      </div>
      <button onclick="exportBetsReport()" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm">
        <i class="fas fa-file-export mr-2"></i>导出报表
      </button>
    </div>
    
    <!-- 统计卡片 -->
    <div id="bet-stats" class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <div class="bg-gray-800 rounded-xl p-4">
        <p class="text-gray-400 text-xs">注单总数</p>
        <p class="text-xl font-bold text-white" id="stat-bet-count">-</p>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <p class="text-gray-400 text-xs">总投注额</p>
        <p class="text-xl font-bold text-cyan-400" id="stat-bet-amount">-</p>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <p class="text-gray-400 text-xs">有效投注</p>
        <p class="text-xl font-bold text-blue-400" id="stat-valid-bet">-</p>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <p class="text-gray-400 text-xs">总派彩</p>
        <p class="text-xl font-bold text-purple-400" id="stat-payout">-</p>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <p class="text-gray-400 text-xs">会员输赢</p>
        <p class="text-xl font-bold" id="stat-win-loss">-</p>
      </div>
      <div class="bg-gray-800 rounded-xl p-4">
        <p class="text-gray-400 text-xs">公司盈亏</p>
        <p class="text-xl font-bold" id="stat-company-profit">-</p>
      </div>
    </div>
    
    <!-- 高级筛选 -->
    <div class="bg-gray-800 rounded-xl p-5 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
        <div>
          <label class="text-gray-400 text-xs block mb-1">注单号</label>
          <input type="text" id="filter-bet-no" placeholder="精确匹配" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">会员账号/昵称</label>
          <input type="text" id="filter-username" placeholder="模糊搜索" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">所属代理</label>
          <select id="filter-agent" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="">全部代理</option>
            ${agents.map(a => `<option value="${a.id}">${escapeHtml(a.agent_username)} - ${escapeHtml(a.nickname || '')}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">游戏类型</label>
          <select id="filter-game-type" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="">全部游戏</option>
            <option value="baccarat">百家乐</option>
            <option value="dragon_tiger">龙虎</option>
            <option value="roulette">轮盘</option>
            <option value="sic_bo">骰宝</option>
            <option value="bull_bull">牛牛</option>
          </select>
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">桌台号</label>
          <input type="text" id="filter-table-code" placeholder="如: A01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">注单状态</label>
          <select id="filter-bet-status" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
            <option value="">全部状态</option>
            <option value="0">未结算</option>
            <option value="1">已结算</option>
            <option value="3">已作废</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
        <div>
          <label class="text-gray-400 text-xs block mb-1">开始日期</label>
          <input type="date" id="filter-start-date" value="${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">结束日期</label>
          <input type="date" id="filter-end-date" value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">开始时间</label>
          <input type="time" id="filter-start-time" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">结束时间</label>
          <input type="time" id="filter-end-time" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">最小金额</label>
          <input type="number" id="filter-min-amount" placeholder="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="text-gray-400 text-xs block mb-1">最大金额</label>
          <input type="number" id="filter-max-amount" placeholder="不限" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
        </div>
      </div>
      <div class="flex flex-wrap gap-4 items-center">
        <label class="flex items-center cursor-pointer text-sm">
          <input type="checkbox" id="filter-high-odds" class="mr-2 accent-primary"> 仅高赔率注单
        </label>
        <label class="flex items-center cursor-pointer text-sm">
          <input type="checkbox" id="filter-large-bet" class="mr-2 accent-primary"> 仅大额注单
        </label>
        <div class="flex-1"></div>
        <button onclick="resetBetFilters()" class="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-sm">
          <i class="fas fa-undo mr-1"></i>重置
        </button>
        <button onclick="searchBets()" class="bg-primary hover:bg-blue-700 px-6 py-2 rounded-lg text-sm">
          <i class="fas fa-search mr-2"></i>查询
        </button>
      </div>
    </div>
    
    <!-- 注单列表 -->
    <div class="bg-gray-800 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full data-table min-w-[1200px]">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3 text-xs">注单号</th>
              <th class="text-left p-3 text-xs">时间</th>
              <th class="text-left p-3 text-xs">会员</th>
              <th class="text-left p-3 text-xs">代理</th>
              <th class="text-left p-3 text-xs">游戏</th>
              <th class="text-left p-3 text-xs">期号</th>
              <th class="text-left p-3 text-xs">类型</th>
              <th class="text-left p-3 text-xs">投注点</th>
              <th class="text-right p-3 text-xs">投注金额</th>
              <th class="text-right p-3 text-xs">有效投注</th>
              <th class="text-right p-3 text-xs">派彩</th>
              <th class="text-right p-3 text-xs">输赢</th>
              <th class="text-left p-3 text-xs">IP/区域</th>
              <th class="text-center p-3 text-xs">状态</th>
              <th class="text-center p-3 text-xs">操作</th>
            </tr>
          </thead>
          <tbody id="bets-tbody">
            <tr><td colspan="15" class="p-8 text-center text-gray-400">点击「查询」加载注单数据</td></tr>
          </tbody>
        </table>
      </div>
      <!-- 分页 -->
      <div id="bets-pagination" class="p-4 border-t border-gray-700 flex justify-between items-center">
        <div class="text-sm text-gray-400">
          <span id="pagination-info">-</span>
        </div>
        <div class="flex gap-2">
          <button onclick="changeBetPage(-1)" class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm" id="btn-prev-page">上一页</button>
          <button onclick="changeBetPage(1)" class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm" id="btn-next-page">下一页</button>
        </div>
      </div>
    </div>
  `;
  
  // 自动加载数据
  searchBets();
}

// 注单查询相关变量
let currentBetPage = 1;
const betPageSize = 50;

// 搜索注单
async function searchBets(page = 1) {
  currentBetPage = page;
  const tbody = document.getElementById('bets-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="13" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  }
  
  // 收集筛选条件
  const params = new URLSearchParams();
  const betNo = document.getElementById('filter-bet-no')?.value;
  const username = document.getElementById('filter-username')?.value;
  const agentId = document.getElementById('filter-agent')?.value;
  const gameType = document.getElementById('filter-game-type')?.value;
  const tableCode = document.getElementById('filter-table-code')?.value;
  const betStatus = document.getElementById('filter-bet-status')?.value;
  const startDate = document.getElementById('filter-start-date')?.value;
  const endDate = document.getElementById('filter-end-date')?.value;
  const startTime = document.getElementById('filter-start-time')?.value;
  const endTime = document.getElementById('filter-end-time')?.value;
  const minAmount = document.getElementById('filter-min-amount')?.value;
  const maxAmount = document.getElementById('filter-max-amount')?.value;
  const highOdds = document.getElementById('filter-high-odds')?.checked;
  const largeBet = document.getElementById('filter-large-bet')?.checked;
  
  if (betNo) params.append('bet_no', betNo);
  if (username) params.append('username', username);
  if (agentId) params.append('agent_id', agentId);
  if (gameType) params.append('game_type', gameType);
  if (tableCode) params.append('table_code', tableCode);
  if (betStatus) params.append('bet_status', betStatus);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (startTime) params.append('start_time', startTime);
  if (endTime) params.append('end_time', endTime);
  if (minAmount) params.append('min_amount', minAmount);
  if (maxAmount) params.append('max_amount', maxAmount);
  if (highOdds) params.append('is_high_odds', '1');
  if (largeBet) params.append('is_large_bet', '1');
  params.append('page', page.toString());
  params.append('limit', betPageSize.toString());
  
  try {
    const result = await api(`/api/reports/bet-details?${params.toString()}`);
    if (result.success) {
      const bets = result.data || [];
      const stats = result.stats || {};
      const pagination = result.pagination || {};
      
      // 更新统计
      document.getElementById('stat-bet-count').textContent = formatNumber(stats.total_count || 0);
      document.getElementById('stat-bet-amount').textContent = formatCurrency(stats.total_bet || 0);
      document.getElementById('stat-valid-bet').textContent = formatCurrency(stats.total_valid_bet || 0);
      document.getElementById('stat-payout').textContent = formatCurrency(stats.total_payout || 0);
      
      const winLoss = stats.total_win_loss || 0;
      const winLossEl = document.getElementById('stat-win-loss');
      winLossEl.textContent = (winLoss >= 0 ? '+' : '') + formatCurrency(winLoss);
      winLossEl.className = `text-xl font-bold ${winLoss >= 0 ? 'text-green-400' : 'text-red-400'}`;
      
      const companyProfit = stats.company_profit || 0;
      const companyEl = document.getElementById('stat-company-profit');
      companyEl.textContent = (companyProfit >= 0 ? '+' : '') + formatCurrency(companyProfit);
      companyEl.className = `text-xl font-bold ${companyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`;
      
      // 更新分页信息
      const totalPages = Math.ceil((pagination.total || 0) / betPageSize);
      document.getElementById('pagination-info').textContent = 
        `共 ${formatNumber(pagination.total || 0)} 条记录，第 ${page} / ${totalPages || 1} 页`;
      document.getElementById('btn-prev-page').disabled = page <= 1;
      document.getElementById('btn-next-page').disabled = page >= totalPages;
      
      // 渲染表格
      if (bets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" class="p-8 text-center text-gray-400">暂无符合条件的注单</td></tr>';
        return;
      }
      
      tbody.innerHTML = bets.map(b => {
        const winLoss = b.win_loss_amount || 0;
        const statusClass = b.bet_status === 1 ? 'bg-green-600' : b.bet_status === 0 ? 'bg-yellow-600' : 'bg-gray-600';
        const statusText = b.bet_status === 1 ? '已结算' : b.bet_status === 0 ? '未结算' : '已作废';
        
        return `
          <tr class="border-t border-gray-700 hover:bg-gray-750 ${b.is_high_odds ? 'bg-yellow-900 bg-opacity-10' : ''} ${b.is_large_bet ? 'bg-red-900 bg-opacity-10' : ''}">
            <td class="p-3">
              <span class="font-mono text-xs text-primary cursor-pointer hover:underline" onclick="showBetDetail(${b.id})">${escapeHtml(b.bet_no)}</span>
              ${b.is_high_odds ? '<i class="fas fa-star text-yellow-400 ml-1 text-xs" title="高赔率"></i>' : ''}
              ${b.is_large_bet ? '<i class="fas fa-exclamation-triangle text-red-400 ml-1 text-xs" title="大额注单"></i>' : ''}
            </td>
            <td class="p-3 text-xs text-gray-400">${formatDateTime(b.created_at)}</td>
            <td class="p-3">
              <p class="font-medium text-sm">${escapeHtml(b.username || '-')}</p>
              <p class="text-xs text-gray-400">${escapeHtml(b.nickname || '')} <span class="text-purple-400">VIP${b.vip_level || 0}</span></p>
            </td>
            <td class="p-3 text-xs">${escapeHtml(b.agent_username || '-')}</td>
            <td class="p-3">
              <p class="text-sm">${getGameTypeName(b.game_type)}</p>
              <p class="text-xs text-gray-400">${escapeHtml(b.table_code || '-')}</p>
            </td>
            <td class="p-3">
              <p class="font-mono text-xs text-cyan-400">${escapeHtml(b.game_round || '-')}</p>
            </td>
            <td class="p-3 text-xs">${escapeHtml(b.bet_type || '-')}</td>
            <td class="p-3 text-xs">
              <span class="px-2 py-1 bg-blue-900 bg-opacity-30 rounded text-xs">${escapeHtml(b.bet_selection || '-')}</span>
            </td>
            <td class="p-3 text-right font-mono text-sm">${formatCurrency(b.bet_amount)}</td>
            <td class="p-3 text-right font-mono text-sm text-gray-400">${formatCurrency(b.valid_bet_amount)}</td>
            <td class="p-3 text-right font-mono text-sm">${formatCurrency(b.payout)}</td>
            <td class="p-3 text-right font-mono text-sm ${winLoss > 0 ? 'text-green-400' : winLoss < 0 ? 'text-red-400' : ''}">${winLoss > 0 ? '+' : ''}${formatCurrency(winLoss)}</td>
            <td class="p-3">
              <p class="text-xs">${escapeHtml(b.bet_ip || '-')}</p>
              <p class="text-xs text-gray-400">${escapeHtml(b.ip_location || '-')}</p>
            </td>
            <td class="p-3 text-center"><span class="px-2 py-1 rounded text-xs ${statusClass}">${statusText}</span></td>
            <td class="p-3 text-center">
              <button onclick="showBetDetail(${b.id})" class="text-blue-400 hover:text-blue-300 mx-1" title="详情"><i class="fas fa-eye"></i></button>
              ${b.video_url ? `<button onclick="playBetVideo('${escapeJs(b.video_url)}')" class="text-purple-400 hover:text-purple-300 mx-1" title="回放"><i class="fas fa-play-circle"></i></button>` : ''}
              ${b.bet_status !== 3 ? `<button onclick="voidBet(${b.id})" class="text-red-400 hover:text-red-300 mx-1" title="作废"><i class="fas fa-ban"></i></button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="15" class="p-8 text-center text-red-400">加载失败: ${result.error}</td></tr>`;
    }
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="15" class="p-8 text-center text-red-400">加载失败，请稍后重试</td></tr>';
  }
}

// 翻页
function changeBetPage(delta) {
  searchBets(currentBetPage + delta);
}

// 重置筛选
function resetBetFilters() {
  document.getElementById('filter-bet-no').value = '';
  document.getElementById('filter-username').value = '';
  document.getElementById('filter-agent').value = '';
  document.getElementById('filter-game-type').value = '';
  document.getElementById('filter-table-code').value = '';
  document.getElementById('filter-bet-status').value = '';
  document.getElementById('filter-start-date').value = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  document.getElementById('filter-end-date').value = dayjs().format('YYYY-MM-DD');
  document.getElementById('filter-start-time').value = '';
  document.getElementById('filter-end-time').value = '';
  document.getElementById('filter-min-amount').value = '';
  document.getElementById('filter-max-amount').value = '';
  document.getElementById('filter-high-odds').checked = false;
  document.getElementById('filter-large-bet').checked = false;
}

// 导出注单报表
async function exportBetsReport() {
  const startDate = document.getElementById('filter-start-date')?.value || dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = document.getElementById('filter-end-date')?.value || dayjs().format('YYYY-MM-DD');
  
  const url = `/api/reports/export?type=bets&start_date=${startDate}&end_date=${endDate}`;
  window.open(url, '_blank');
}

// 注单详情弹窗
async function showBetDetail(id) {
  const result = await api(`/api/bets/${id}`);
  if (!result.success) {
    alert('获取详情失败: ' + result.error);
    return;
  }
  
  const b = result.data;
  const winLoss = b.win_loss_amount || 0;
  
  const modal = document.createElement('div');
  modal.id = 'bet-detail-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-file-alt text-primary mr-2"></i>注单详情</h3>
        <button onclick="document.getElementById('bet-detail-modal').remove()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">注单号</p>
            <p class="font-mono text-primary">${escapeHtml(b.bet_no)}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">投注时间</p>
            <p>${formatDateTime(b.created_at)}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">会员账号</p>
            <p class="font-medium">${escapeHtml(b.player_name || '-')}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">VIP等级</p>
            <p class="text-purple-400">VIP${b.vip_level || 0}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">风险等级</p>
            <p>${b.risk_level || '正常'}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">游戏类型</p>
            <p>${getGameTypeName(b.game_type)}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">桌台/局号</p>
            <p>${escapeHtml(b.table_code || '-')} / ${escapeHtml(b.game_round_id || '-')}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">投注类型</p>
            <p>${escapeHtml(b.bet_type || '-')}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">赔率</p>
            <p class="text-yellow-400">${b.odds || 1}x</p>
          </div>
        </div>
        
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">投注金额</p>
            <p class="font-mono text-lg">${formatCurrency(b.bet_amount)}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">有效投注</p>
            <p class="font-mono">${formatCurrency(b.valid_bet_amount)}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">派彩</p>
            <p class="font-mono">${formatCurrency(b.payout)}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">输赢</p>
            <p class="font-mono text-lg ${winLoss >= 0 ? 'text-green-400' : 'text-red-400'}">${winLoss >= 0 ? '+' : ''}${formatCurrency(winLoss)}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">投注IP</p>
            <p>${escapeHtml(b.bet_ip || '-')}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">IP区域</p>
            <p>${escapeHtml(b.ip_location || '-')}</p>
          </div>
        </div>
        
        ${b.result_summary ? `
        <div class="bg-gray-700 rounded-lg p-3">
          <p class="text-gray-400 text-xs mb-2">开奖结果</p>
          <p>${escapeHtml(b.result_summary)}</p>
        </div>
        ` : ''}
        
        ${b.video_url || b.round_video_url ? `
        <div class="text-center">
          <button onclick="playBetVideo('${escapeJs(b.video_url || b.round_video_url)}')" class="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg">
            <i class="fas fa-play-circle mr-2"></i>观看视频回放
          </button>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// 播放视频
function playBetVideo(url) {
  if (!url) {
    alert('暂无视频回放');
    return;
  }
  window.open(url, '_blank');
}

// 作废注单
async function voidBet(id) {
  const reason = prompt('请输入作废原因:');
  if (!reason) return;
  
  const result = await api(`/api/bets/${id}/void`, {
    method: 'PUT',
    body: JSON.stringify({ reason, operator_id: currentUser?.id, operator_name: currentUser?.username })
  });
  
  if (result.success) {
    alert('注单已作废');
    searchBets(currentBetPage);
  } else {
    alert('操作失败: ' + result.error);
  }
}

// =====================
// 6. 红利与洗码 (V2.1升级)
// =====================
async function renderCommission(container) {
  const [schemesResult, recordsResult] = await Promise.all([
    api('/api/commission/schemes'),
    api('/api/commission/records?status=pending')
  ]);
  
  const schemes = schemesResult.data || [];
  const records = recordsResult.data || [];
  const stats = recordsResult.stats || {};
  
  container.innerHTML = `
    <!-- V2.1升级提示 -->
    <div class="bg-gradient-to-r from-primary to-secondary rounded-xl p-4 mb-6 flex items-center justify-between">
      <div class="flex items-center">
        <i class="fas fa-star text-yellow-300 text-2xl mr-3"></i>
        <div>
          <h3 class="font-bold text-white">V2.1 洗码系统升级</h3>
          <p class="text-sm text-blue-100">从"简单计算"升级为"策略配置"，支持多方案模板、差异化返水</p>
        </div>
      </div>
      <span class="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">HOT</span>
    </div>
    
    <!-- Tabs -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button id="tab-records" onclick="switchCommissionTab('records')" class="px-4 py-2 bg-primary rounded-lg">待审核发放 <span class="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full ml-1">${stats.pending_count || 0}</span></button>
      <button id="tab-schemes" onclick="switchCommissionTab('schemes')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">洗码方案配置</button>
      <button id="tab-bonus" onclick="switchCommissionTab('bonus')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">红利派发</button>
      <button id="tab-triggers" onclick="switchCommissionTab('triggers')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"><i class="fas fa-bolt text-yellow-400 mr-1"></i>红利触发</button>
      <button id="tab-turnover" onclick="switchCommissionTab('turnover')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">流水稽核设置</button>
    </div>
    
    <!-- 洗码方案配置 -->
    <div id="commission-schemes" class="hidden">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        ${schemes.map(s => {
          const settleCycleName = s.settlement_cycle === 1 ? '日结' : s.settlement_cycle === 2 ? '周结' : '实时';
          return `
          <div class="bg-gray-800 rounded-xl p-5 ${s.status === 1 ? '' : 'opacity-60'}">
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center">
                <span class="w-3 h-3 rounded-full ${s.status === 1 ? 'bg-green-500' : 'bg-gray-500'} mr-3"></span>
                <div>
                  <h4 class="font-semibold text-lg">${escapeHtml(s.scheme_name || s.name || '未命名')}</h4>
                  <p class="text-sm text-gray-400">${escapeHtml(s.description || '')}</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <button onclick="editCommissionScheme(${s.id})" class="text-blue-400 hover:text-blue-300 p-1" title="编辑"><i class="fas fa-edit"></i></button>
                <button onclick="toggleCommissionScheme(${s.id}, ${s.status === 1 ? 0 : 1})" class="text-yellow-400 hover:text-yellow-300 p-1" title="${s.status === 1 ? '禁用' : '启用'}">
                  <i class="fas fa-${s.status === 1 ? 'pause' : 'play'}"></i>
                </button>
                <button onclick="deleteCommissionScheme(${s.id}, '${escapeJs(s.scheme_name || s.name)}')" class="text-red-400 hover:text-red-300 p-1" title="删除"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span class="text-gray-400">结算周期</span>
                <span class="text-primary">${settleCycleName}</span>
              </div>
              <div class="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span class="text-gray-400">最低有效投注</span>
                <span>${formatCurrency(s.min_valid_bet || s.min_bet || 0)}</span>
              </div>
              <div class="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span class="text-gray-400">单日上限</span>
                <span>${s.daily_max_amount || s.max_payout ? formatCurrency(s.daily_max_amount || s.max_payout) : '不限'}</span>
              </div>
              <div class="flex justify-between items-center p-2 bg-gray-700 rounded">
                <span class="text-gray-400">自动发放阈值</span>
                <span>${formatCurrency(s.auto_payout_threshold || 1000)}</span>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-700">
              <p class="text-sm text-gray-400 mb-2">返水比例配置</p>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="flex justify-between"><span>百家乐</span><span class="text-green-400">${((s.baccarat_rate || 0.006) * 100).toFixed(2)}%</span></div>
                <div class="flex justify-between"><span>龙虎</span><span class="text-green-400">${((s.dragon_tiger_rate || 0.006) * 100).toFixed(2)}%</span></div>
                <div class="flex justify-between"><span>轮盘</span><span class="text-green-400">${((s.roulette_rate || 0.004) * 100).toFixed(2)}%</span></div>
                <div class="flex justify-between"><span>骰宝</span><span class="text-green-400">${((s.sicbo_rate || 0.005) * 100).toFixed(2)}%</span></div>
                <div class="flex justify-between"><span>牛牛</span><span class="text-green-400">${((s.niuniu_rate || 0.005) * 100).toFixed(2)}%</span></div>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-600 flex justify-between text-xs text-gray-400">
              <span>绑定玩家: ${s.player_count || 0}</span>
              <span>绑定代理: ${s.agent_count || 0}</span>
            </div>
          </div>
        `}).join('')}
        
        <!-- 新增方案卡片 -->
        <div onclick="showAddCommissionSchemeModal()" class="bg-gray-800 rounded-xl p-5 border-2 border-dashed border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-primary min-h-[300px]">
          <i class="fas fa-plus-circle text-4xl text-gray-500 mb-3"></i>
          <p class="text-gray-400">新增洗码方案</p>
        </div>
      </div>
    </div>
    
    <!-- 待审核洗码 -->
    <div id="commission-records">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-gray-400 text-sm">待审核金额</p>
          <p class="text-2xl font-bold text-yellow-400">${formatCurrency(stats.pending_amount)}</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-gray-400 text-sm">今日已发放</p>
          <p class="text-2xl font-bold text-green-400">${formatCurrency(stats.paid_amount)}</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-gray-400 text-sm">待审核笔数</p>
          <p class="text-2xl font-bold text-white">${stats.pending_count || 0}</p>
        </div>
      </div>
      
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex justify-between items-center">
          <span>待审核列表 (${dayjs().format('YYYY-MM-DD')})</span>
          <div>
            <button class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-sm mr-2"><i class="fas fa-check-double mr-2"></i>批量通过</button>
            <button class="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-sm"><i class="fas fa-download mr-2"></i>导出Excel</button>
          </div>
        </div>
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-4">会员账号</th>
              <th class="text-left p-4">游戏类型</th>
              <th class="text-left p-4">有效投注</th>
              <th class="text-left p-4">洗码比例</th>
              <th class="text-left p-4">返水金额</th>
              <th class="text-left p-4">状态</th>
              <th class="text-left p-4">操作</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr class="border-t border-gray-700">
                <td class="p-4">${r.player_name}</td>
                <td class="p-4">${getGameTypeName(r.game_type)}</td>
                <td class="p-4 font-mono">${formatCurrency(r.valid_bet)}</td>
                <td class="p-4">${(r.rate * 100).toFixed(2)}%</td>
                <td class="p-4 font-mono text-green-400">${formatCurrency(r.amount)}</td>
                <td class="p-4">${getStatusBadge(r.status)}</td>
                <td class="p-4">
                  <button onclick="approveCommission(${r.id}, ${r.amount})" class="text-green-400 hover:text-green-300 mr-2" title="通过"><i class="fas fa-check"></i></button>
                  <button onclick="rejectCommission(${r.id})" class="text-red-400 hover:text-red-300" title="拒绝"><i class="fas fa-times"></i></button>
                </td>
              </tr>
            `).join('')}
            ${records.length === 0 ? '<tr><td colspan="7" class="p-8 text-center text-gray-400">暂无待审核洗码</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 红利派发 -->
    <div id="commission-bonus" class="hidden">
      <div class="bg-gray-800 rounded-xl p-5">
        <h4 class="font-semibold mb-4"><i class="fas fa-gift text-warning mr-2"></i>手动红利派发</h4>
        <form id="bonus-payout-form" onsubmit="submitBonusPayout(event)">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-gray-400 text-sm mb-2">玩家账号 <span class="text-red-400">*</span></label>
              <input type="text" id="bonus-player" name="player" required placeholder="输入玩家用户名" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">红利金额 <span class="text-red-400">*</span></label>
              <input type="number" id="bonus-amount" name="amount" required min="1" step="0.01" placeholder="输入金额" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">红利类型</label>
              <select id="bonus-type" name="bonus_type" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
                <option value="manual">手动红利</option>
                <option value="birthday">生日彩金</option>
                <option value="promotion">活动奖励</option>
                <option value="compensation">误操作补偿</option>
                <option value="vip_upgrade">VIP晋级礼金</option>
                <option value="rebate">返水红利</option>
              </select>
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">流水稀核方案</label>
              <select id="bonus-turnover" name="turnover_setting_id" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
                <option value="">无需流水（可直接提现）</option>
                <!-- 动态加载流水稀核方案 -->
              </select>
              <p class="text-xs text-gray-500 mt-1">选择后，玩家需完成对应流水要求才能提现</p>
            </div>
            <div class="md:col-span-2">
              <label class="block text-gray-400 text-sm mb-2">备注说明</label>
              <textarea id="bonus-remark" name="remark" placeholder="如：生日彩金、活动奖励、误操作补偿等" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-20 focus:outline-none focus:border-primary"></textarea>
            </div>
          </div>
          <div class="mt-4 p-4 bg-gray-700 rounded-lg" id="bonus-preview" style="display:none;">
            <h5 class="font-semibold text-sm mb-2"><i class="fas fa-info-circle text-primary mr-2"></i>派发预览</h5>
            <div id="bonus-preview-content" class="text-sm text-gray-300"></div>
          </div>
          <div class="mt-4 flex justify-end space-x-4">
            <button type="button" onclick="previewBonusPayout()" class="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded-lg"><i class="fas fa-eye mr-2"></i>预览</button>
            <button type="submit" class="bg-primary hover:bg-blue-700 px-6 py-2 rounded-lg"><i class="fas fa-paper-plane mr-2"></i>派发红利</button>
          </div>
        </form>
      </div>
      
      <!-- 红利派发记录 -->
      <div class="bg-gray-800 rounded-xl p-5 mt-6">
        <h4 class="font-semibold mb-4"><i class="fas fa-history text-primary mr-2"></i>近期红利派发记录</h4>
        <div id="bonus-history-list" class="overflow-x-auto">
          <p class="text-center text-gray-400 py-4">加载中...</p>
        </div>
      </div>
    </div>
    
    <!-- 红利触发 (V2.1新增) -->
    <div id="commission-triggers" class="hidden">
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h4 class="font-semibold"><i class="fas fa-bolt text-yellow-400 mr-2"></i>红利触发规则</h4>
            <p class="text-sm text-gray-400 mt-1">配置存款金额比例派发规则，玩家存款时自动触发红利</p>
          </div>
          <div class="flex gap-2">
            <button onclick="showDepositTriggerLogs()" class="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-lg text-sm">
              <i class="fas fa-history mr-1"></i>触发记录
            </button>
            <button onclick="showAddDepositTriggerModal()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
              <i class="fas fa-plus mr-1"></i>新增规则
            </button>
          </div>
        </div>
        
        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-gray-700">
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">已启用规则</p>
            <p id="trigger-stat-enabled" class="text-xl font-bold text-green-400">0</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">今日触发次数</p>
            <p id="trigger-stat-today" class="text-xl font-bold text-primary">0</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">今日派发红利</p>
            <p id="trigger-stat-bonus" class="text-xl font-bold text-yellow-400">$0</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">累计触发金额</p>
            <p id="trigger-stat-total" class="text-xl font-bold text-purple-400">$0</p>
          </div>
        </div>
        
        <div id="deposit-triggers-list" class="p-4">
          <p class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</p>
        </div>
      </div>
    </div>
    
    <!-- 流水稽核设置 -->
    <div id="commission-turnover" class="hidden">
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h4 class="font-semibold"><i class="fas fa-clipboard-check text-primary mr-2"></i>流水稽核设置</h4>
            <p class="text-sm text-gray-400 mt-1">红利派送需达到流水稽核要求后才能申请提现</p>
          </div>
          <button onclick="showAddTurnoverModal()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
            <i class="fas fa-plus mr-1"></i>新增设置
          </button>
        </div>
        <div id="turnover-settings-list" class="p-4">
          <p class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</p>
        </div>
      </div>
    </div>
  `;
}

function switchCommissionTab(tab) {
  document.querySelectorAll('[id^="commission-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('bg-primary');
    el.classList.add('bg-gray-700');
  });
  document.getElementById(`commission-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.remove('bg-gray-700');
  document.getElementById(`tab-${tab}`).classList.add('bg-primary');
  
  // 切换到流水稽核时加载数据
  if (tab === 'turnover') {
    loadTurnoverSettings();
  }
  // 切换到红利派发时加载流水方案和历史记录
  if (tab === 'bonus') {
    loadTurnoverOptionsForBonus();
    loadBonusHistory();
  }
  // 切换到红利触发时加载规则列表
  if (tab === 'triggers') {
    loadDepositTriggers();
  }
}

// =====================
// 洗码方案管理函数
// =====================
function showAddCommissionSchemeModal() {
  const modal = document.createElement('div');
  modal.id = 'commission-scheme-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-plus-circle text-primary mr-2"></i>新增洗码方案</h3>
        <button onclick="closeCommissionSchemeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="commission-scheme-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-gray-400 text-sm mb-2">方案名称 <span class="text-red-400">*</span></label>
            <input type="text" name="scheme_name" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：VIP专属方案、高额返水方案">
          </div>
          <div class="col-span-2">
            <label class="block text-gray-400 text-sm mb-2">方案说明</label>
            <input type="text" name="description" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="方案描述...">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">结算周期 <span class="text-red-400">*</span></label>
            <select name="settlement_cycle" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="1">日结</option>
              <option value="2">周结</option>
              <option value="0">实时结算</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">最低有效投注</label>
            <input type="number" name="min_valid_bet" step="0.01" min="0" value="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：1000">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">单日上限</label>
            <input type="number" name="daily_max_amount" step="0.01" min="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="不填则无上限">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">自动发放阈值</label>
            <input type="number" name="auto_payout_threshold" step="0.01" min="0" value="1000" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="达到此金额自动发放">
          </div>
        </div>
        
        <div class="bg-gray-700 rounded-lg p-4">
          <h4 class="font-semibold mb-3"><i class="fas fa-percentage text-green-400 mr-2"></i>返水比例配置</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-gray-400 text-xs mb-1">百家乐 (%)</label>
              <input type="number" name="baccarat_rate" step="0.01" min="0" max="100" value="0.6" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-xs mb-1">龙虎 (%)</label>
              <input type="number" name="dragon_tiger_rate" step="0.01" min="0" max="100" value="0.6" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-xs mb-1">轮盘 (%)</label>
              <input type="number" name="roulette_rate" step="0.01" min="0" max="100" value="0.4" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-xs mb-1">骰宝 (%)</label>
              <input type="number" name="sicbo_rate" step="0.01" min="0" max="100" value="0.5" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-xs mb-1">牛牛 (%)</label>
              <input type="number" name="niuniu_rate" step="0.01" min="0" max="100" value="0.5" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">* 比例为百分比，如0.6表示0.6%返水</p>
        </div>
        
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeCommissionSchemeModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存方案</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('commission-scheme-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const data = {
      scheme_name: form.scheme_name.value,
      description: form.description.value,
      settlement_cycle: parseInt(form.settlement_cycle.value),
      min_valid_bet: parseFloat(form.min_valid_bet.value) || 0,
      daily_max_amount: form.daily_max_amount.value ? parseFloat(form.daily_max_amount.value) : null,
      auto_payout_threshold: parseFloat(form.auto_payout_threshold.value) || 1000,
      baccarat_rate: parseFloat(form.baccarat_rate.value) / 100 || 0.006,
      dragon_tiger_rate: parseFloat(form.dragon_tiger_rate.value) / 100 || 0.006,
      roulette_rate: parseFloat(form.roulette_rate.value) / 100 || 0.004,
      sicbo_rate: parseFloat(form.sicbo_rate.value) / 100 || 0.005,
      niuniu_rate: parseFloat(form.niuniu_rate.value) / 100 || 0.005,
      status: 1
    };
    
    const result = await api('/api/commission/schemes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('洗码方案创建成功！');
      closeCommissionSchemeModal();
      loadModule('commission');
    } else {
      alert('创建失败: ' + result.error);
    }
  };
}

async function editCommissionScheme(id) {
  const result = await api(`/api/commission/schemes/${id}`);
  if (!result.success) return alert('获取方案失败: ' + result.error);
  
  const s = result.data;
  
  const modal = document.createElement('div');
  modal.id = 'commission-scheme-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-edit text-primary mr-2"></i>编辑洗码方案</h3>
        <button onclick="closeCommissionSchemeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="commission-scheme-form" class="space-y-4">
        <input type="hidden" name="id" value="${id}">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-gray-400 text-sm mb-2">方案名称 <span class="text-red-400">*</span></label>
            <input type="text" name="scheme_name" required value="${escapeHtml(s.scheme_name || '')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div class="col-span-2">
            <label class="block text-gray-400 text-sm mb-2">方案说明</label>
            <input type="text" name="description" value="${escapeHtml(s.description || '')}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">结算周期 <span class="text-red-400">*</span></label>
            <select name="settlement_cycle" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="1" ${s.settlement_cycle === 1 ? 'selected' : ''}>日结</option>
              <option value="2" ${s.settlement_cycle === 2 ? 'selected' : ''}>周结</option>
              <option value="0" ${s.settlement_cycle === 0 ? 'selected' : ''}>实时结算</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">最低有效投注</label>
            <input type="number" name="min_valid_bet" step="0.01" min="0" value="${s.min_valid_bet || 0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">单日上限</label>
            <input type="number" name="daily_max_amount" step="0.01" min="0" value="${s.daily_max_amount || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">自动发放阈值</label>
            <input type="number" name="auto_payout_threshold" step="0.01" min="0" value="${s.auto_payout_threshold || 1000}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        
        <div class="bg-gray-700 rounded-lg p-4">
          <h4 class="font-semibold mb-3"><i class="fas fa-percentage text-green-400 mr-2"></i>返水比例配置</h4>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-gray-400 text-xs mb-1">百家乐 (%)</label>
              <input type="number" name="baccarat_rate" step="0.01" min="0" max="100" value="${((s.baccarat_rate || 0.006) * 100).toFixed(2)}" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-xs mb-1">龙虎 (%)</label>
              <input type="number" name="dragon_tiger_rate" step="0.01" min="0" max="100" value="${((s.dragon_tiger_rate || 0.006) * 100).toFixed(2)}" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-xs mb-1">轮盘 (%)</label>
              <input type="number" name="roulette_rate" step="0.01" min="0" max="100" value="${((s.roulette_rate || 0.004) * 100).toFixed(2)}" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-xs mb-1">骰宝 (%)</label>
              <input type="number" name="sicbo_rate" step="0.01" min="0" max="100" value="${((s.sicbo_rate || 0.005) * 100).toFixed(2)}" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-xs mb-1">牛牛 (%)</label>
              <input type="number" name="niuniu_rate" step="0.01" min="0" max="100" value="${((s.niuniu_rate || 0.005) * 100).toFixed(2)}" class="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary">
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">* 比例为百分比，如0.6表示0.6%返水</p>
        </div>
        
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeCommissionSchemeModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存修改</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('commission-scheme-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const data = {
      scheme_name: form.scheme_name.value,
      description: form.description.value,
      settlement_cycle: parseInt(form.settlement_cycle.value),
      min_valid_bet: parseFloat(form.min_valid_bet.value) || 0,
      daily_max_amount: form.daily_max_amount.value ? parseFloat(form.daily_max_amount.value) : null,
      auto_payout_threshold: parseFloat(form.auto_payout_threshold.value) || 1000,
      baccarat_rate: parseFloat(form.baccarat_rate.value) / 100 || 0.006,
      dragon_tiger_rate: parseFloat(form.dragon_tiger_rate.value) / 100 || 0.006,
      roulette_rate: parseFloat(form.roulette_rate.value) / 100 || 0.004,
      sicbo_rate: parseFloat(form.sicbo_rate.value) / 100 || 0.005,
      niuniu_rate: parseFloat(form.niuniu_rate.value) / 100 || 0.005
    };
    
    const result = await api(`/api/commission/schemes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('洗码方案更新成功！');
      closeCommissionSchemeModal();
      loadModule('commission');
    } else {
      alert('更新失败: ' + result.error);
    }
  };
}

function closeCommissionSchemeModal() {
  const modal = document.getElementById('commission-scheme-modal');
  if (modal) modal.remove();
}

async function toggleCommissionScheme(id, newStatus) {
  const result = await api(`/api/commission/schemes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus })
  });
  
  if (result.success) {
    loadModule('commission');
  } else {
    alert('操作失败: ' + result.error);
  }
}

async function deleteCommissionScheme(id, name) {
  if (!confirm(`确定要删除洗码方案「${name}」吗？\n\n注意：已绑定此方案的玩家和代理将失去洗码配置。`)) return;
  
  const result = await api(`/api/commission/schemes/${id}`, {
    method: 'DELETE'
  });
  
  if (result.success) {
    alert('洗码方案已删除');
    loadModule('commission');
  } else {
    alert('删除失败: ' + result.error);
  }
}

// 加载流水稀核方案到红利派发下拉框
async function loadTurnoverOptionsForBonus() {
  const select = document.getElementById('bonus-turnover');
  if (!select) return;
  
  try {
    const result = await api('/api/bonus/turnover-settings');
    if (result.success && result.data) {
      const settings = result.data.filter(s => s.is_enabled);
      select.innerHTML = '<option value="">无需流水（可直接提现）</option>' + 
        settings.map(s => `<option value="${s.id}" data-multiplier="${s.turnover_multiplier}" data-name="${escapeHtml(s.setting_name)}">${escapeHtml(s.setting_name)} (${s.turnover_multiplier}倍流水)</option>`).join('');
    }
  } catch (error) {
    console.error('Load turnover options error:', error);
  }
}

// 预览红利派发
function previewBonusPayout() {
  const player = document.getElementById('bonus-player').value;
  const amount = parseFloat(document.getElementById('bonus-amount').value) || 0;
  const bonusType = document.getElementById('bonus-type');
  const turnoverSelect = document.getElementById('bonus-turnover');
  const remark = document.getElementById('bonus-remark').value;
  
  if (!player || !amount) {
    alert('请填写玩家账号和红利金额');
    return;
  }
  
  const bonusTypeName = bonusType.options[bonusType.selectedIndex].text;
  const turnoverOption = turnoverSelect.options[turnoverSelect.selectedIndex];
  const turnoverName = turnoverOption.value ? turnoverOption.dataset.name : '无需流水';
  const multiplier = turnoverOption.dataset.multiplier || 0;
  const requiredTurnover = multiplier > 0 ? amount * multiplier : 0;
  
  const previewDiv = document.getElementById('bonus-preview');
  const contentDiv = document.getElementById('bonus-preview-content');
  
  contentDiv.innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div><span class="text-gray-400">玩家账号:</span> <span class="text-white font-medium">${escapeHtml(player)}</span></div>
      <div><span class="text-gray-400">红利金额:</span> <span class="text-green-400 font-bold">${formatCurrency(amount)}</span></div>
      <div><span class="text-gray-400">红利类型:</span> <span class="text-yellow-400">${escapeHtml(bonusTypeName)}</span></div>
      <div><span class="text-gray-400">流水方案:</span> <span class="text-purple-400">${escapeHtml(turnoverName)}</span></div>
      ${multiplier > 0 ? `
      <div class="col-span-2 p-3 bg-gray-800 rounded mt-2">
        <p class="text-warning"><i class="fas fa-exclamation-triangle mr-2"></i>流水要求：玩家需完成 <span class="font-bold text-white">${formatCurrency(requiredTurnover)}</span> 有效投注后才能提现此笔红利</p>
      </div>
      ` : '<div class="col-span-2 text-green-400"><i class="fas fa-check-circle mr-2"></i>无流水要求，红利到账后可直接提现</div>'}
    </div>
  `;
  previewDiv.style.display = 'block';
}

// 提交红利派发
async function submitBonusPayout(event) {
  event.preventDefault();
  
  const player = document.getElementById('bonus-player').value;
  const amount = parseFloat(document.getElementById('bonus-amount').value);
  const bonusType = document.getElementById('bonus-type').value;
  const turnoverSettingId = document.getElementById('bonus-turnover').value;
  const remark = document.getElementById('bonus-remark').value;
  
  if (!player || !amount) {
    alert('请填写玩家账号和红利金额');
    return;
  }
  
  const turnoverOption = document.getElementById('bonus-turnover').options[document.getElementById('bonus-turnover').selectedIndex];
  const multiplier = parseFloat(turnoverOption.dataset.multiplier) || 0;
  const requiredTurnover = multiplier > 0 ? amount * multiplier : 0;
  
  if (!confirm(`确认派发红利？\n\n玩家: ${player}\n金额: ${formatCurrency(amount)}\n${requiredTurnover > 0 ? `流水要求: ${formatCurrency(requiredTurnover)}` : '无流水要求'}`)) {
    return;
  }
  
  // 验证财务密码
  const verified = await verifyFinancePassword('bonus_payout', amount);
  if (!verified) {
    return; // 验证失败，不执行派发
  }
  
  try {
    const result = await api('/api/bonus/payout', {
      method: 'POST',
      body: JSON.stringify({
        username: player,
        amount: amount,
        bonus_type: bonusType,
        turnover_setting_id: turnoverSettingId || null,
        required_turnover: requiredTurnover,
        remark: remark,
        operator_id: currentUser?.id
      })
    });
    
    if (result.success) {
      showSuccess('红利派发成功！');
      document.getElementById('bonus-payout-form').reset();
      document.getElementById('bonus-preview').style.display = 'none';
      loadBonusHistory();
    } else {
      showError('派发失败: ' + result.error);
    }
  } catch (error) {
    showError('派发失败: ' + error.message);
  }
}

// 加载红利派发历史
async function loadBonusHistory() {
  const container = document.getElementById('bonus-history-list');
  if (!container) return;
  
  try {
    const result = await api('/api/bonus/history?limit=10');
    if (result.success) {
      const records = result.data || [];
      if (records.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">暂无红利派发记录</p>';
        return;
      }
      
      container.innerHTML = `
        <table class="w-full text-sm">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3">时间</th>
              <th class="text-left p-3">玩家</th>
              <th class="text-left p-3">类型</th>
              <th class="text-right p-3">金额</th>
              <th class="text-left p-3">流水要求</th>
              <th class="text-left p-3">状态</th>
              <th class="text-left p-3">操作员</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr class="border-t border-gray-700">
                <td class="p-3 text-gray-400">${formatDateTime(r.created_at)}</td>
                <td class="p-3">${escapeHtml(r.username || r.player_username || '-')}</td>
                <td class="p-3"><span class="px-2 py-1 rounded text-xs ${getBonusTypeBadge(r.bonus_type)}">${getBonusTypeName(r.bonus_type)}</span></td>
                <td class="p-3 text-right font-mono text-green-400">${formatCurrency(r.amount)}</td>
                <td class="p-3">${r.required_turnover > 0 ? `<span class="text-yellow-400">${formatCurrency(r.required_turnover)}</span>` : '<span class="text-gray-500">无</span>'}</td>
                <td class="p-3">${getBonusStatusBadge(r.status, r.completed_turnover, r.required_turnover)}</td>
                <td class="p-3 text-gray-400">${escapeHtml(r.operator_name || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (error) {
    container.innerHTML = '<p class="text-center text-red-400 py-4">加载失败</p>';
  }
}

function getBonusTypeName(type) {
  const map = {
    'manual': '手动红利',
    'birthday': '生日彩金',
    'promotion': '活动奖励',
    'compensation': '误操作补偿',
    'vip_upgrade': 'VIP晋级礼金',
    'rebate': '返水红利',
    'deposit': '存款红利',
    'register': '注册红利'
  };
  return map[type] || type || '其他';
}

function getBonusTypeBadge(type) {
  const map = {
    'manual': 'bg-blue-600',
    'birthday': 'bg-pink-600',
    'promotion': 'bg-purple-600',
    'compensation': 'bg-orange-600',
    'vip_upgrade': 'bg-yellow-600',
    'rebate': 'bg-green-600',
    'deposit': 'bg-cyan-600',
    'register': 'bg-indigo-600'
  };
  return map[type] || 'bg-gray-600';
}

function getBonusStatusBadge(status, completed, required) {
  if (!required || required <= 0) {
    return '<span class="px-2 py-1 rounded text-xs bg-green-600">已完成</span>';
  }
  const percent = Math.min(100, Math.round((completed || 0) / required * 100));
  if (percent >= 100) {
    return '<span class="px-2 py-1 rounded text-xs bg-green-600">已达标</span>';
  }
  return `<span class="px-2 py-1 rounded text-xs bg-yellow-600">${percent}%</span>`;
}

// =====================
// 红利触发规则管理函数 (V2.1 新增)
// =====================
async function loadDepositTriggers() {
  const container = document.getElementById('deposit-triggers-list');
  if (!container) return;
  
  try {
    const result = await api('/api/bonus/deposit-triggers');
    if (result.success) {
      const triggers = result.data || [];
      
      // 更新统计数据
      const enabledCount = triggers.filter(t => t.is_enabled).length;
      const totalBonus = triggers.reduce((sum, t) => sum + (t.total_bonus || 0), 0);
      const totalCount = triggers.reduce((sum, t) => sum + (t.used_count || 0), 0);
      
      document.getElementById('trigger-stat-enabled').textContent = enabledCount;
      document.getElementById('trigger-stat-total').textContent = formatCurrency(totalBonus);
      
      // 获取今日触发统计
      try {
        const today = dayjs().format('YYYY-MM-DD');
        const logsResult = await api(`/api/bonus/deposit-trigger-logs?start_date=${today}&end_date=${today}`);
        if (logsResult.success) {
          document.getElementById('trigger-stat-today').textContent = logsResult.stats?.total_count || 0;
          document.getElementById('trigger-stat-bonus').textContent = formatCurrency(logsResult.stats?.total_bonus || 0);
        }
      } catch (e) {}
      
      if (triggers.length === 0) {
        container.innerHTML = `
          <div class="text-center py-12">
            <i class="fas fa-gift text-gray-600 text-5xl mb-4"></i>
            <p class="text-gray-400 mb-4">暂无红利触发规则</p>
            <button onclick="showAddDepositTriggerModal()" class="bg-primary hover:bg-blue-700 px-6 py-2 rounded-lg">
              <i class="fas fa-plus mr-2"></i>创建第一个规则
            </button>
          </div>
        `;
        return;
      }
      
      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${triggers.map(t => {
            // 根据触发类型显示不同标签
            const getTriggerTypeLabel = (trigger) => {
              switch(trigger.trigger_type) {
                case 'percentage':
                  return { label: `${trigger.bonus_percentage}% 比例派发`, badge: 'bg-blue-600' };
                case 'first_deposit_percentage':
                  return { label: `首充 ${trigger.bonus_percentage}%`, badge: 'bg-purple-600' };
                case 'cumulative_deposit':
                  return { label: `累计存款 ${trigger.bonus_percentage}%`, badge: 'bg-orange-600' };
                case 'fixed':
                  return { label: `固定 ${formatCurrency(trigger.fixed_bonus)}`, badge: 'bg-green-600' };
                default:
                  return { label: '未知类型', badge: 'bg-gray-600' };
              }
            };
            const typeInfo = getTriggerTypeLabel(t);
            const statusClass = t.is_enabled ? 'bg-green-500' : 'bg-gray-500';
            const validDate = t.start_date || t.end_date 
              ? `${t.start_date ? dayjs(t.start_date).format('MM/DD') : '不限'} - ${t.end_date ? dayjs(t.end_date).format('MM/DD') : '不限'}`
              : '长期有效';
            
            // 自动触发事件类型显示
            const autoTriggerEventLabel = {
              'register': '注册成功', 'first_deposit': '首次存款', 'birthday': '生日当天',
              'vip_upgrade': 'VIP升级', 'daily_login': '每日首次登录', 'weekly_login': '每周首次登录',
              'monthly_login': '每月首次登录', 'referral': '邀请好友注册', 'referral_deposit': '邀请好友首存',
              'bet_milestone': '投注里程碑', 'loss_rebate': '亏损补贴', 'deposit_count': '存款次数达标',
              'continuous_login': '连续登录奖励'
            }[t.auto_trigger_event] || '';
            
            return `
              <div class="bg-gray-700 rounded-lg p-4 ${!t.is_enabled ? 'opacity-60' : ''}">
                <div class="flex justify-between items-start mb-3">
                  <div class="flex items-center">
                    <span class="w-3 h-3 rounded-full ${statusClass} mr-3"></span>
                    <div>
                      <h5 class="font-semibold">${escapeHtml(t.trigger_name)}</h5>
                      <p class="text-sm"><span class="px-2 py-0.5 rounded text-xs ${typeInfo.badge}">${typeInfo.label}</span></p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button onclick="editDepositTrigger(${t.id})" class="text-blue-400 hover:text-blue-300 p-1" title="编辑"><i class="fas fa-edit"></i></button>
                    <button onclick="toggleDepositTrigger(${t.id}, ${t.is_enabled ? 0 : 1})" class="text-yellow-400 hover:text-yellow-300 p-1" title="${t.is_enabled ? '禁用' : '启用'}">
                      <i class="fas fa-${t.is_enabled ? 'pause' : 'play'}"></i>
                    </button>
                    <button onclick="deleteDepositTrigger(${t.id}, '${escapeJs(t.trigger_name)}')" class="text-red-400 hover:text-red-300 p-1" title="删除"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
                <div class="space-y-2 text-sm">
                  ${t.trigger_type === 'fixed' && autoTriggerEventLabel ? `
                  <div class="flex justify-between items-center p-2 bg-purple-900 bg-opacity-30 rounded">
                    <span class="text-gray-400">触发事件</span>
                    <span class="text-purple-400">${autoTriggerEventLabel}</span>
                  </div>
                  ` : ''}
                  ${t.trigger_type === 'cumulative_deposit' && t.cumulative_target ? `
                  <div class="flex justify-between items-center p-2 bg-orange-900 bg-opacity-30 rounded">
                    <span class="text-gray-400">累计目标</span>
                    <span class="text-orange-400">${formatCurrency(t.cumulative_target)}</span>
                  </div>
                  ` : ''}
                  <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span class="text-gray-400">存款范围</span>
                    <span>${formatCurrency(t.min_deposit)} ${t.max_deposit ? '- ' + formatCurrency(t.max_deposit) : '以上'}</span>
                  </div>
                  ${t.max_bonus ? `
                  <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span class="text-gray-400">红利上限</span>
                    <span class="text-yellow-400">${formatCurrency(t.max_bonus)}</span>
                  </div>
                  ` : ''}
                  <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span class="text-gray-400">流水倍数</span>
                    <span class="text-primary">${t.turnover_multiplier || 1}x</span>
                  </div>
                  <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span class="text-gray-400">每日限次</span>
                    <span>${t.player_daily_limit || '不限'}</span>
                  </div>
                  <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span class="text-gray-400">有效期</span>
                    <span class="text-xs">${validDate}</span>
                  </div>
                  ${t.is_first_deposit_only ? `
                  <div class="p-2 bg-purple-900 bg-opacity-30 rounded text-center">
                    <span class="text-purple-400 text-xs"><i class="fas fa-star mr-1"></i>仅限首存</span>
                  </div>
                  ` : ''}
                </div>
                <div class="mt-3 pt-3 border-t border-gray-600 flex justify-between text-xs text-gray-400">
                  <span>已触发 ${t.used_count || 0} 次</span>
                  <span>派发 ${formatCurrency(t.total_bonus || 0)}</span>
                </div>
                ${t.description ? `<p class="text-xs text-gray-500 mt-2">${escapeHtml(t.description)}</p>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      container.innerHTML = '<p class="text-center text-red-400 py-8">加载失败: ' + (result.error || '未知错误') + '</p>';
    }
  } catch (error) {
    container.innerHTML = '<p class="text-center text-red-400 py-8">加载失败，请稍后重试</p>';
  }
}

// 新增存款红利触发规则弹窗
function showAddDepositTriggerModal() {
  const modal = document.createElement('div');
  modal.id = 'deposit-trigger-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-plus-circle text-yellow-400 mr-2"></i>新增存款红利触发规则</h3>
        <button onclick="closeDepositTriggerModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="deposit-trigger-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-gray-400 text-sm mb-2">规则名称 <span class="text-red-400">*</span></label>
            <input type="text" name="trigger_name" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：首存100%红利、注册彩金、生日礼金">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">触发方式 <span class="text-red-400">*</span></label>
            <select name="trigger_type" required onchange="toggleTriggerTypeFields(this.value)" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="percentage">按存款比例派发</option>
              <option value="first_deposit_percentage">首充比例派发</option>
              <option value="cumulative_deposit">累计存款派发</option>
              <option value="fixed">固定金额派发</option>
            </select>
          </div>
          <div id="percentage-field">
            <label class="block text-gray-400 text-sm mb-2">红利比例 (%) <span class="text-red-400">*</span></label>
            <input type="number" name="bonus_percentage" step="0.1" min="0.1" max="1000" value="10" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：10 表示10%">
          </div>
          <div id="fixed-field" class="hidden">
            <label class="block text-gray-400 text-sm mb-2">固定红利金额 <span class="text-red-400">*</span></label>
            <input type="number" name="fixed_bonus" step="0.01" min="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：88">
          </div>
        </div>
        
        <!-- 固定金额派发时的自动派发类型 -->
        <div id="auto-trigger-type-field" class="hidden">
          <label class="block text-gray-400 text-sm mb-2">自动派发触发类型 <span class="text-red-400">*</span></label>
          <select name="auto_trigger_event" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
            <option value="register">注册成功</option>
            <option value="first_deposit">首次存款</option>
            <option value="birthday">生日当天</option>
            <option value="vip_upgrade">VIP升级</option>
            <option value="daily_login">每日首次登录</option>
            <option value="weekly_login">每周首次登录</option>
            <option value="monthly_login">每月首次登录</option>
            <option value="referral">邀请好友注册</option>
            <option value="referral_deposit">邀请好友首存</option>
            <option value="bet_milestone">投注里程碑</option>
            <option value="loss_rebate">亏损补贴</option>
            <option value="deposit_count">存款次数达标</option>
            <option value="continuous_login">连续登录奖励</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">选择触发红利派发的事件类型</p>
        </div>
        
        <!-- 累计存款派发时的累计金额设置 -->
        <div id="cumulative-field" class="hidden">
          <label class="block text-gray-400 text-sm mb-2">累计存款目标金额 <span class="text-red-400">*</span></label>
          <input type="number" name="cumulative_target" step="0.01" min="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：10000 表示累计存款达10000时触发">
          <p class="text-xs text-gray-500 mt-1">玩家累计存款达到此金额时触发红利派发</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">最低存款金额</label>
            <input type="number" name="min_deposit" step="0.01" min="0" value="100" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：100">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">最高存款金额</label>
            <input type="number" name="max_deposit" step="0.01" min="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="不填则无上限">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">红利上限</label>
            <input type="number" name="max_bonus" step="0.01" min="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="不填则无上限">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">流水稽核方案</label>
            <select name="turnover_setting_id" id="add-trigger-turnover" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="">无需流水（可直接提现）</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">选择流水稽核方案，红利需完成流水后提现</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">每人每日限次</label>
            <input type="number" name="player_daily_limit" min="0" value="1" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0表示不限">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">优先级</label>
            <input type="number" name="priority" min="0" value="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="数值越大优先级越高">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">开始日期</label>
            <input type="datetime-local" name="start_date" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">结束日期</label>
            <input type="datetime-local" name="end_date" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        
        <div class="flex items-center space-x-4">
          <label class="flex items-center cursor-pointer">
            <input type="checkbox" name="is_first_deposit_only" class="mr-2">
            <span class="text-sm">仅限首次存款</span>
          </label>
        </div>
        
        <div>
          <label class="block text-gray-400 text-sm mb-2">规则说明</label>
          <textarea name="description" rows="2" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="规则描述，如活动说明、限制条件等..."></textarea>
        </div>
        
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeDepositTriggerModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存规则</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  // 加载流水稽核方案选项
  loadTurnoverOptionsForTrigger('add-trigger-turnover');
  
  document.getElementById('deposit-trigger-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const triggerType = form.trigger_type.value;
    const turnoverSelect = form.turnover_setting_id;
    const turnoverOption = turnoverSelect.options[turnoverSelect.selectedIndex];
    const turnoverMultiplier = turnoverOption.dataset?.multiplier || 1;
    
    // 根据触发类型决定是否需要红利比例或固定金额
    const needsPercentage = ['percentage', 'first_deposit_percentage', 'cumulative_deposit'].includes(triggerType);
    const needsFixedBonus = triggerType === 'fixed';
    const needsAutoTriggerEvent = triggerType === 'fixed';
    const needsCumulativeTarget = triggerType === 'cumulative_deposit';
    
    const data = {
      trigger_name: form.trigger_name.value,
      trigger_type: triggerType,
      bonus_percentage: needsPercentage ? parseFloat(form.bonus_percentage.value) : 0,
      fixed_bonus: needsFixedBonus ? parseFloat(form.fixed_bonus.value) : 0,
      auto_trigger_event: needsAutoTriggerEvent ? form.auto_trigger_event.value : null,
      cumulative_target: needsCumulativeTarget ? parseFloat(form.cumulative_target.value) : null,
      min_deposit: parseFloat(form.min_deposit.value) || 0,
      max_deposit: form.max_deposit.value ? parseFloat(form.max_deposit.value) : null,
      max_bonus: form.max_bonus.value ? parseFloat(form.max_bonus.value) : null,
      turnover_setting_id: turnoverSelect.value || null,
      turnover_multiplier: parseFloat(turnoverMultiplier) || 1,
      player_daily_limit: parseInt(form.player_daily_limit.value) || 1,
      priority: parseInt(form.priority.value) || 0,
      start_date: form.start_date.value || null,
      end_date: form.end_date.value || null,
      // 首充比例派发自动设为仅限首存
      is_first_deposit_only: triggerType === 'first_deposit_percentage' ? true : form.is_first_deposit_only.checked,
      description: form.description.value,
      created_by: currentUser?.id
    };
    
    // 验证
    if (needsPercentage && (!data.bonus_percentage || data.bonus_percentage <= 0)) {
      alert('请设置有效的红利比例');
      return;
    }
    if (needsFixedBonus && (!data.fixed_bonus || data.fixed_bonus <= 0)) {
      alert('请设置有效的固定红利金额');
      return;
    }
    if (needsCumulativeTarget && (!data.cumulative_target || data.cumulative_target <= 0)) {
      alert('请设置有效的累计存款目标金额');
      return;
    }
    
    const result = await api('/api/bonus/deposit-triggers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('红利触发规则创建成功！');
      closeDepositTriggerModal();
      loadDepositTriggers();
    } else {
      alert('创建失败: ' + result.error);
    }
  };
}

// 加载流水稽核方案到红利触发选择框
async function loadTurnoverOptionsForTrigger(selectId, selectedId = null) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  try {
    const result = await api('/api/bonus/turnover-settings');
    if (result.success && result.data) {
      const settings = result.data.filter(s => s.is_enabled);
      select.innerHTML = '<option value="">无需流水（可直接提现）</option>' + 
        settings.map(s => `
          <option value="${s.id}" 
                  data-multiplier="${s.turnover_multiplier}" 
                  data-name="${escapeHtml(s.setting_name)}"
                  ${selectedId && s.id == selectedId ? 'selected' : ''}>
            ${escapeHtml(s.setting_name)} (${s.turnover_multiplier}倍流水)
          </option>
        `).join('');
    }
  } catch (error) {
    console.error('Load turnover options error:', error);
  }
}

function toggleTriggerTypeFields(type) {
  const percentageField = document.getElementById('percentage-field');
  const fixedField = document.getElementById('fixed-field');
  const autoTriggerField = document.getElementById('auto-trigger-type-field');
  const cumulativeField = document.getElementById('cumulative-field');
  const firstDepositCheckbox = document.querySelector('input[name="is_first_deposit_only"]');
  const firstDepositLabel = firstDepositCheckbox?.closest('label');
  
  // 根据触发类型显示/隐藏相应字段
  if (type === 'percentage') {
    // 按存款比例派发
    if (percentageField) percentageField.classList.remove('hidden');
    if (fixedField) fixedField.classList.add('hidden');
    if (autoTriggerField) autoTriggerField.classList.add('hidden');
    if (cumulativeField) cumulativeField.classList.add('hidden');
    if (firstDepositLabel) firstDepositLabel.style.display = '';
  } else if (type === 'first_deposit_percentage') {
    // 首充比例派发
    if (percentageField) percentageField.classList.remove('hidden');
    if (fixedField) fixedField.classList.add('hidden');
    if (autoTriggerField) autoTriggerField.classList.add('hidden');
    if (cumulativeField) cumulativeField.classList.add('hidden');
    // 首充比例自动勾选仅限首存
    if (firstDepositCheckbox) {
      firstDepositCheckbox.checked = true;
      firstDepositCheckbox.disabled = true;
    }
    if (firstDepositLabel) firstDepositLabel.style.display = '';
  } else if (type === 'cumulative_deposit') {
    // 累计存款派发
    if (percentageField) percentageField.classList.remove('hidden');
    if (fixedField) fixedField.classList.add('hidden');
    if (autoTriggerField) autoTriggerField.classList.add('hidden');
    if (cumulativeField) cumulativeField.classList.remove('hidden');
    if (firstDepositCheckbox) firstDepositCheckbox.disabled = false;
    if (firstDepositLabel) firstDepositLabel.style.display = '';
  } else if (type === 'fixed') {
    // 固定金额派发
    if (percentageField) percentageField.classList.add('hidden');
    if (fixedField) fixedField.classList.remove('hidden');
    if (autoTriggerField) autoTriggerField.classList.remove('hidden');
    if (cumulativeField) cumulativeField.classList.add('hidden');
    if (firstDepositCheckbox) firstDepositCheckbox.disabled = false;
    if (firstDepositLabel) firstDepositLabel.style.display = '';
  } else {
    // 默认/其他类型
    if (percentageField) percentageField.classList.add('hidden');
    if (fixedField) fixedField.classList.add('hidden');
    if (autoTriggerField) autoTriggerField.classList.add('hidden');
    if (cumulativeField) cumulativeField.classList.add('hidden');
    if (firstDepositCheckbox) firstDepositCheckbox.disabled = false;
  }
}

function closeDepositTriggerModal() {
  const modal = document.getElementById('deposit-trigger-modal');
  if (modal) modal.remove();
}

// 编辑存款红利触发规则
async function editDepositTrigger(id) {
  const result = await api(`/api/bonus/deposit-triggers/${id}`);
  if (!result.success) return alert('获取规则失败: ' + result.error);
  
  const t = result.data;
  
  // 判断字段显示状态
  const showPercentage = ['percentage', 'first_deposit_percentage', 'cumulative_deposit'].includes(t.trigger_type);
  const showFixed = t.trigger_type === 'fixed';
  const showAutoTrigger = t.trigger_type === 'fixed';
  const showCumulative = t.trigger_type === 'cumulative_deposit';
  const isFirstDepositType = t.trigger_type === 'first_deposit_percentage';
  
  const modal = document.createElement('div');
  modal.id = 'deposit-trigger-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-edit text-yellow-400 mr-2"></i>编辑红利触发规则</h3>
        <button onclick="closeDepositTriggerModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="deposit-trigger-form" class="space-y-4">
        <input type="hidden" name="id" value="${id}">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-gray-400 text-sm mb-2">规则名称 <span class="text-red-400">*</span></label>
            <input type="text" name="trigger_name" required value="${escapeHtml(t.trigger_name)}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">触发方式 <span class="text-red-400">*</span></label>
            <select name="trigger_type" required onchange="toggleTriggerTypeFields(this.value)" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="percentage" ${t.trigger_type === 'percentage' ? 'selected' : ''}>按存款比例派发</option>
              <option value="first_deposit_percentage" ${t.trigger_type === 'first_deposit_percentage' ? 'selected' : ''}>首充比例派发</option>
              <option value="cumulative_deposit" ${t.trigger_type === 'cumulative_deposit' ? 'selected' : ''}>累计存款派发</option>
              <option value="fixed" ${t.trigger_type === 'fixed' ? 'selected' : ''}>固定金额派发</option>
            </select>
          </div>
          <div id="percentage-field" class="${showPercentage ? '' : 'hidden'}">
            <label class="block text-gray-400 text-sm mb-2">红利比例 (%)</label>
            <input type="number" name="bonus_percentage" step="0.1" min="0.1" max="1000" value="${t.bonus_percentage || 10}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div id="fixed-field" class="${showFixed ? '' : 'hidden'}">
            <label class="block text-gray-400 text-sm mb-2">固定红利金额</label>
            <input type="number" name="fixed_bonus" step="0.01" min="0" value="${t.fixed_bonus || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        
        <!-- 固定金额派发时的自动派发类型 -->
        <div id="auto-trigger-type-field" class="${showAutoTrigger ? '' : 'hidden'}">
          <label class="block text-gray-400 text-sm mb-2">自动派发触发类型 <span class="text-red-400">*</span></label>
          <select name="auto_trigger_event" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
            <option value="register" ${t.auto_trigger_event === 'register' ? 'selected' : ''}>注册成功</option>
            <option value="first_deposit" ${t.auto_trigger_event === 'first_deposit' ? 'selected' : ''}>首次存款</option>
            <option value="birthday" ${t.auto_trigger_event === 'birthday' ? 'selected' : ''}>生日当天</option>
            <option value="vip_upgrade" ${t.auto_trigger_event === 'vip_upgrade' ? 'selected' : ''}>VIP升级</option>
            <option value="daily_login" ${t.auto_trigger_event === 'daily_login' ? 'selected' : ''}>每日首次登录</option>
            <option value="weekly_login" ${t.auto_trigger_event === 'weekly_login' ? 'selected' : ''}>每周首次登录</option>
            <option value="monthly_login" ${t.auto_trigger_event === 'monthly_login' ? 'selected' : ''}>每月首次登录</option>
            <option value="referral" ${t.auto_trigger_event === 'referral' ? 'selected' : ''}>邀请好友注册</option>
            <option value="referral_deposit" ${t.auto_trigger_event === 'referral_deposit' ? 'selected' : ''}>邀请好友首存</option>
            <option value="bet_milestone" ${t.auto_trigger_event === 'bet_milestone' ? 'selected' : ''}>投注里程碑</option>
            <option value="loss_rebate" ${t.auto_trigger_event === 'loss_rebate' ? 'selected' : ''}>亏损补贴</option>
            <option value="deposit_count" ${t.auto_trigger_event === 'deposit_count' ? 'selected' : ''}>存款次数达标</option>
            <option value="continuous_login" ${t.auto_trigger_event === 'continuous_login' ? 'selected' : ''}>连续登录奖励</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">选择触发红利派发的事件类型</p>
        </div>
        
        <!-- 累计存款派发时的累计金额设置 -->
        <div id="cumulative-field" class="${showCumulative ? '' : 'hidden'}">
          <label class="block text-gray-400 text-sm mb-2">累计存款目标金额 <span class="text-red-400">*</span></label>
          <input type="number" name="cumulative_target" step="0.01" min="0" value="${t.cumulative_target || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：10000 表示累计存款达10000时触发">
          <p class="text-xs text-gray-500 mt-1">玩家累计存款达到此金额时触发红利派发</p>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">最低存款金额</label>
            <input type="number" name="min_deposit" step="0.01" min="0" value="${t.min_deposit || 0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">最高存款金额</label>
            <input type="number" name="max_deposit" step="0.01" min="0" value="${t.max_deposit || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">红利上限</label>
            <input type="number" name="max_bonus" step="0.01" min="0" value="${t.max_bonus || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">流水稽核方案</label>
            <select name="turnover_setting_id" id="edit-trigger-turnover" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="">无需流水（可直接提现）</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">选择流水稽核方案，红利需完成流水后提现</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">每人每日限次</label>
            <input type="number" name="player_daily_limit" min="0" value="${t.player_daily_limit || 1}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">优先级</label>
            <input type="number" name="priority" min="0" value="${t.priority || 0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">开始日期</label>
            <input type="datetime-local" name="start_date" value="${t.start_date ? dayjs(t.start_date).format('YYYY-MM-DDTHH:mm') : ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">结束日期</label>
            <input type="datetime-local" name="end_date" value="${t.end_date ? dayjs(t.end_date).format('YYYY-MM-DDTHH:mm') : ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        
        <div class="flex items-center space-x-4">
          <label class="flex items-center cursor-pointer">
            <input type="checkbox" name="is_first_deposit_only" ${t.is_first_deposit_only ? 'checked' : ''} ${isFirstDepositType ? 'disabled' : ''} class="mr-2">
            <span class="text-sm">仅限首次存款</span>
          </label>
        </div>
        
        <div>
          <label class="block text-gray-400 text-sm mb-2">规则说明</label>
          <textarea name="description" rows="2" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">${escapeHtml(t.description || '')}</textarea>
        </div>
        
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeDepositTriggerModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存修改</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  // 加载流水稽核方案选项并选中当前值
  loadTurnoverOptionsForTrigger('edit-trigger-turnover', t.turnover_setting_id);
  
  document.getElementById('deposit-trigger-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const triggerType = form.trigger_type.value;
    const turnoverSelect = form.turnover_setting_id;
    const turnoverOption = turnoverSelect.options[turnoverSelect.selectedIndex];
    const turnoverMultiplier = turnoverOption.dataset?.multiplier || 1;
    
    const needsPercentage = ['percentage', 'first_deposit_percentage', 'cumulative_deposit'].includes(triggerType);
    const needsFixedBonus = triggerType === 'fixed';
    const needsAutoTriggerEvent = triggerType === 'fixed';
    const needsCumulativeTarget = triggerType === 'cumulative_deposit';
    
    const data = {
      trigger_name: form.trigger_name.value,
      trigger_type: triggerType,
      bonus_percentage: needsPercentage ? parseFloat(form.bonus_percentage.value) : 0,
      fixed_bonus: needsFixedBonus ? parseFloat(form.fixed_bonus.value) : 0,
      auto_trigger_event: needsAutoTriggerEvent ? form.auto_trigger_event.value : null,
      cumulative_target: needsCumulativeTarget ? parseFloat(form.cumulative_target.value) : null,
      min_deposit: parseFloat(form.min_deposit.value) || 0,
      max_deposit: form.max_deposit.value ? parseFloat(form.max_deposit.value) : null,
      max_bonus: form.max_bonus.value ? parseFloat(form.max_bonus.value) : null,
      turnover_setting_id: turnoverSelect.value || null,
      turnover_multiplier: parseFloat(turnoverMultiplier) || 1,
      player_daily_limit: parseInt(form.player_daily_limit.value) || 1,
      priority: parseInt(form.priority.value) || 0,
      start_date: form.start_date.value || null,
      end_date: form.end_date.value || null,
      is_first_deposit_only: triggerType === 'first_deposit_percentage' ? true : form.is_first_deposit_only.checked,
      description: form.description.value,
      updated_by: currentUser?.id
    };
    
    // 验证
    if (needsPercentage && (!data.bonus_percentage || data.bonus_percentage <= 0)) {
      alert('请设置有效的红利比例');
      return;
    }
    if (needsFixedBonus && (!data.fixed_bonus || data.fixed_bonus <= 0)) {
      alert('请设置有效的固定红利金额');
      return;
    }
    if (needsCumulativeTarget && (!data.cumulative_target || data.cumulative_target <= 0)) {
      alert('请设置有效的累计存款目标金额');
      return;
    }
    
    const result = await api(`/api/bonus/deposit-triggers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('红利触发规则更新成功！');
      closeDepositTriggerModal();
      loadDepositTriggers();
    } else {
      alert('更新失败: ' + result.error);
    }
  };
}

// 切换存款红利触发规则状态
async function toggleDepositTrigger(id, newStatus) {
  const result = await api(`/api/bonus/deposit-triggers/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ is_enabled: newStatus, updated_by: currentUser?.id })
  });
  
  if (result.success) {
    loadDepositTriggers();
  } else {
    alert('操作失败: ' + result.error);
  }
}

// 删除存款红利触发规则
async function deleteDepositTrigger(id, name) {
  if (!confirm(`确定要删除规则「${name}」吗？此操作不可恢复。`)) return;
  
  const result = await api(`/api/bonus/deposit-triggers/${id}?deleted_by=${currentUser?.id}`, {
    method: 'DELETE'
  });
  
  if (result.success) {
    alert('规则已删除');
    loadDepositTriggers();
  } else {
    alert('删除失败: ' + result.error);
  }
}

// 查看存款红利触发记录
async function showDepositTriggerLogs() {
  const modal = document.createElement('div');
  modal.id = 'trigger-logs-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-history text-primary mr-2"></i>红利触发记录</h3>
        <button onclick="document.getElementById('trigger-logs-modal').remove()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      
      <div class="flex flex-wrap gap-4 mb-6">
        <div>
          <label class="block text-gray-400 text-xs mb-1">开始日期</label>
          <input type="date" id="log-start-date" value="${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm">
        </div>
        <div>
          <label class="block text-gray-400 text-xs mb-1">结束日期</label>
          <input type="date" id="log-end-date" value="${dayjs().format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm">
        </div>
        <div class="flex items-end">
          <button onclick="loadTriggerLogs()" class="bg-primary hover:bg-blue-700 px-4 py-1 rounded text-sm"><i class="fas fa-search mr-1"></i>查询</button>
        </div>
      </div>
      
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-gray-700 rounded-lg p-3">
          <p class="text-gray-400 text-xs">触发次数</p>
          <p id="log-stat-count" class="text-xl font-bold text-primary">-</p>
        </div>
        <div class="bg-gray-700 rounded-lg p-3">
          <p class="text-gray-400 text-xs">存款总额</p>
          <p id="log-stat-deposit" class="text-xl font-bold text-green-400">-</p>
        </div>
        <div class="bg-gray-700 rounded-lg p-3">
          <p class="text-gray-400 text-xs">红利总额</p>
          <p id="log-stat-bonus" class="text-xl font-bold text-yellow-400">-</p>
        </div>
      </div>
      
      <div id="trigger-logs-list" class="overflow-x-auto">
        <p class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  loadTriggerLogs();
}

async function loadTriggerLogs() {
  const container = document.getElementById('trigger-logs-list');
  const startDate = document.getElementById('log-start-date')?.value || dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = document.getElementById('log-end-date')?.value || dayjs().format('YYYY-MM-DD');
  
  try {
    const result = await api(`/api/bonus/deposit-trigger-logs?start_date=${startDate}&end_date=${endDate}&limit=100`);
    if (result.success) {
      const logs = result.data || [];
      const stats = result.stats || {};
      
      document.getElementById('log-stat-count').textContent = stats.total_count || 0;
      document.getElementById('log-stat-deposit').textContent = formatCurrency(stats.total_deposit || 0);
      document.getElementById('log-stat-bonus').textContent = formatCurrency(stats.total_bonus || 0);
      
      if (logs.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">暂无触发记录</p>';
        return;
      }
      
      container.innerHTML = `
        <table class="w-full text-sm">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3">时间</th>
              <th class="text-left p-3">玩家</th>
              <th class="text-left p-3">触发规则</th>
              <th class="text-right p-3">存款金额</th>
              <th class="text-right p-3">红利金额</th>
              <th class="text-right p-3">流水要求</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr class="border-t border-gray-700">
                <td class="p-3 text-gray-400 text-xs">${formatDateTime(log.created_at)}</td>
                <td class="p-3">
                  <p>${escapeHtml(log.player_name || '-')}</p>
                  <p class="text-xs text-gray-400">VIP${log.vip_level || 0}</p>
                </td>
                <td class="p-3 text-primary">${escapeHtml(log.trigger_name || '-')}</td>
                <td class="p-3 text-right font-mono">${formatCurrency(log.deposit_amount)}</td>
                <td class="p-3 text-right font-mono text-yellow-400">+${formatCurrency(log.bonus_amount)}</td>
                <td class="p-3 text-right font-mono text-gray-400">${formatCurrency(log.turnover_required)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      container.innerHTML = `<p class="text-center text-red-400 py-8">加载失败: ${result.error}</p>`;
    }
  } catch (error) {
    container.innerHTML = '<p class="text-center text-red-400 py-8">加载失败</p>';
  }
}

// 流水稽核设置管理函数
async function loadTurnoverSettings() {
  const container = document.getElementById('turnover-settings-list');
  if (!container) return;
  
  try {
    const result = await api('/api/bonus/turnover-settings');
    if (result.success) {
      const settings = result.data || [];
      if (settings.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">暂无流水稽核设置，点击「新增设置」创建</p>';
        return;
      }
      
      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${settings.map(s => {
            const validGames = s.valid_games ? JSON.parse(s.valid_games) : [];
            return `
              <div class="bg-gray-700 rounded-lg p-4">
                <div class="flex justify-between items-start mb-3">
                  <div class="flex items-center">
                    <span class="w-3 h-3 rounded-full ${s.is_enabled ? 'bg-green-500' : 'bg-gray-500'} mr-3"></span>
                    <div>
                      <h5 class="font-semibold">${escapeHtml(s.setting_name)}</h5>
                      <p class="text-sm text-gray-400">${getBonusTypeName(s.bonus_type)}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button onclick="editTurnoverSetting(${s.id})" class="text-blue-400 hover:text-blue-300 p-1" title="编辑"><i class="fas fa-edit"></i></button>
                    <button onclick="toggleTurnoverSetting(${s.id}, ${s.is_enabled ? 0 : 1})" class="text-yellow-400 hover:text-yellow-300 p-1" title="${s.is_enabled ? '禁用' : '启用'}">
                      <i class="fas fa-${s.is_enabled ? 'pause' : 'play'}"></i>
                    </button>
                    <button onclick="deleteTurnoverSetting(${s.id}, '${escapeJs(s.setting_name)}')" class="text-red-400 hover:text-red-300 p-1" title="删除"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span class="text-gray-400">流水倍数</span>
                    <span class="font-bold text-primary">${s.turnover_multiplier}x</span>
                  </div>
                  <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span class="text-gray-400">最低赔率</span>
                    <span>${s.min_odds || 1.0}</span>
                  </div>
                  ${s.max_single_bet ? `
                  <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span class="text-gray-400">单注上限</span>
                    <span>${formatCurrency(s.max_single_bet)}</span>
                  </div>
                  ` : ''}
                  ${s.time_limit_hours > 0 ? `
                  <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                    <span class="text-gray-400">时间限制</span>
                    <span>${s.time_limit_hours}小时</span>
                  </div>
                  ` : ''}
                  ${validGames.length > 0 ? `
                  <div class="p-2 bg-gray-800 rounded">
                    <span class="text-gray-400 text-xs">有效游戏: </span>
                    <span class="text-xs">${validGames.map(g => getGameTypeName(g)).join(', ')}</span>
                  </div>
                  ` : ''}
                </div>
                <p class="text-xs text-gray-500 mt-3">${escapeHtml(s.description || '暂无描述')}</p>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      container.innerHTML = `<p class="text-center text-red-400 py-8">加载失败: ${result.error}</p>`;
    }
  } catch (error) {
    container.innerHTML = '<p class="text-center text-red-400 py-8">加载失败，请稍后重试</p>';
  }
}

function showAddTurnoverModal() {
  const modal = document.createElement('div');
  modal.id = 'turnover-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-plus-circle text-primary mr-2"></i>新增流水稽核设置</h3>
        <button onclick="closeTurnoverModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="turnover-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">设置名称 <span class="text-red-400">*</span></label>
            <input type="text" name="setting_name" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：新人首存红利">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">红利类型 <span class="text-red-400">*</span></label>
            <select name="bonus_type" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="signup">注册彩金</option>
              <option value="deposit">存款红利</option>
              <option value="rebate">返水红利</option>
              <option value="birthday">生日彩金</option>
              <option value="vip">VIP红利</option>
              <option value="activity">活动红利</option>
              <option value="compensation">补偿红利</option>
              <option value="custom">自定义红利</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">流水倍数 <span class="text-red-400">*</span></label>
            <input type="number" name="turnover_multiplier" required step="0.1" min="0.1" value="1" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：3">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">最低赔率</label>
            <input type="number" name="min_odds" step="0.01" min="1" value="1.0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：1.5">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">单注上限</label>
            <input type="number" name="max_single_bet" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="不填则无限制">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">时间限制（小时）</label>
            <input type="number" name="time_limit_hours" value="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0表示无时间限制">
          </div>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">有效游戏</label>
          <div class="flex flex-wrap gap-3">
            <label class="flex items-center"><input type="checkbox" name="game_baccarat" checked class="mr-2">百家乐</label>
            <label class="flex items-center"><input type="checkbox" name="game_roulette" checked class="mr-2">轮盘</label>
            <label class="flex items-center"><input type="checkbox" name="game_blackjack" checked class="mr-2">21点</label>
            <label class="flex items-center"><input type="checkbox" name="game_sicbo" checked class="mr-2">骰宝</label>
            <label class="flex items-center"><input type="checkbox" name="game_dragonTiger" checked class="mr-2">龙虎</label>
            <label class="flex items-center"><input type="checkbox" name="game_poker" class="mr-2">德州扑克</label>
          </div>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">说明</label>
          <textarea name="description" rows="3" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="流水稽核规则说明..."></textarea>
        </div>
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeTurnoverModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存设置</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('turnover-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const validGames = [];
    if (form.game_baccarat.checked) validGames.push('baccarat');
    if (form.game_roulette.checked) validGames.push('roulette');
    if (form.game_blackjack.checked) validGames.push('blackjack');
    if (form.game_sicbo.checked) validGames.push('sicbo');
    if (form.game_dragonTiger.checked) validGames.push('dragonTiger');
    if (form.game_poker.checked) validGames.push('poker');
    
    const data = {
      setting_name: form.setting_name.value,
      bonus_type: form.bonus_type.value,
      turnover_multiplier: parseFloat(form.turnover_multiplier.value),
      min_odds: form.min_odds.value ? parseFloat(form.min_odds.value) : 1.0,
      max_single_bet: form.max_single_bet.value ? parseFloat(form.max_single_bet.value) : null,
      time_limit_hours: parseInt(form.time_limit_hours.value) || 0,
      valid_games: validGames,
      description: form.description.value,
      created_by: currentUser?.id
    };
    
    const result = await api('/api/bonus/turnover-settings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('流水稽核设置创建成功！');
      closeTurnoverModal();
      loadTurnoverSettings();
    } else {
      alert('创建失败: ' + result.error);
    }
  };
}

function closeTurnoverModal() {
  const modal = document.getElementById('turnover-modal');
  if (modal) modal.remove();
}

async function editTurnoverSetting(id) {
  const result = await api('/api/bonus/turnover-settings');
  if (!result.success) return alert('获取设置失败');
  
  const setting = result.data.find(s => s.id === id);
  if (!setting) return alert('设置不存在');
  
  const validGames = setting.valid_games ? JSON.parse(setting.valid_games) : [];
  
  const modal = document.createElement('div');
  modal.id = 'turnover-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-edit text-primary mr-2"></i>编辑流水稽核设置</h3>
        <button onclick="closeTurnoverModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="turnover-form" class="space-y-4">
        <input type="hidden" name="id" value="${id}">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">设置名称 <span class="text-red-400">*</span></label>
            <input type="text" name="setting_name" required value="${escapeHtml(setting.setting_name)}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">红利类型 <span class="text-red-400">*</span></label>
            <select name="bonus_type" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="signup" ${setting.bonus_type === 'signup' ? 'selected' : ''}>注册彩金</option>
              <option value="deposit" ${setting.bonus_type === 'deposit' ? 'selected' : ''}>存款红利</option>
              <option value="rebate" ${setting.bonus_type === 'rebate' ? 'selected' : ''}>返水红利</option>
              <option value="birthday" ${setting.bonus_type === 'birthday' ? 'selected' : ''}>生日彩金</option>
              <option value="vip" ${setting.bonus_type === 'vip' ? 'selected' : ''}>VIP红利</option>
              <option value="activity" ${setting.bonus_type === 'activity' ? 'selected' : ''}>活动红利</option>
              <option value="compensation" ${setting.bonus_type === 'compensation' ? 'selected' : ''}>补偿红利</option>
              <option value="custom" ${setting.bonus_type === 'custom' ? 'selected' : ''}>自定义红利</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">流水倍数 <span class="text-red-400">*</span></label>
            <input type="number" name="turnover_multiplier" required step="0.1" min="0.1" value="${setting.turnover_multiplier}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">最低赔率</label>
            <input type="number" name="min_odds" step="0.01" min="1" value="${setting.min_odds || 1.0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">单注上限</label>
            <input type="number" name="max_single_bet" value="${setting.max_single_bet || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">时间限制（小时）</label>
            <input type="number" name="time_limit_hours" value="${setting.time_limit_hours || 0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">有效游戏</label>
          <div class="flex flex-wrap gap-3">
            <label class="flex items-center"><input type="checkbox" name="game_baccarat" ${validGames.includes('baccarat') ? 'checked' : ''} class="mr-2">百家乐</label>
            <label class="flex items-center"><input type="checkbox" name="game_roulette" ${validGames.includes('roulette') ? 'checked' : ''} class="mr-2">轮盘</label>
            <label class="flex items-center"><input type="checkbox" name="game_blackjack" ${validGames.includes('blackjack') ? 'checked' : ''} class="mr-2">21点</label>
            <label class="flex items-center"><input type="checkbox" name="game_sicbo" ${validGames.includes('sicbo') ? 'checked' : ''} class="mr-2">骰宝</label>
            <label class="flex items-center"><input type="checkbox" name="game_dragonTiger" ${validGames.includes('dragonTiger') ? 'checked' : ''} class="mr-2">龙虎</label>
            <label class="flex items-center"><input type="checkbox" name="game_poker" ${validGames.includes('poker') ? 'checked' : ''} class="mr-2">德州扑克</label>
          </div>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">说明</label>
          <textarea name="description" rows="3" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">${escapeHtml(setting.description || '')}</textarea>
        </div>
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeTurnoverModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存修改</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('turnover-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const validGames = [];
    if (form.game_baccarat.checked) validGames.push('baccarat');
    if (form.game_roulette.checked) validGames.push('roulette');
    if (form.game_blackjack.checked) validGames.push('blackjack');
    if (form.game_sicbo.checked) validGames.push('sicbo');
    if (form.game_dragonTiger.checked) validGames.push('dragonTiger');
    if (form.game_poker.checked) validGames.push('poker');
    
    const data = {
      setting_name: form.setting_name.value,
      bonus_type: form.bonus_type.value,
      turnover_multiplier: parseFloat(form.turnover_multiplier.value),
      min_odds: form.min_odds.value ? parseFloat(form.min_odds.value) : 1.0,
      max_single_bet: form.max_single_bet.value ? parseFloat(form.max_single_bet.value) : null,
      time_limit_hours: parseInt(form.time_limit_hours.value) || 0,
      valid_games: validGames,
      description: form.description.value,
      updated_by: currentUser?.id
    };
    
    const result = await api(`/api/bonus/turnover-settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('流水稽核设置更新成功！');
      closeTurnoverModal();
      loadTurnoverSettings();
    } else {
      alert('更新失败: ' + result.error);
    }
  };
}

async function toggleTurnoverSetting(id, newStatus) {
  const result = await api(`/api/bonus/turnover-settings/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ is_enabled: newStatus, updated_by: currentUser?.id })
  });
  
  if (result.success) {
    loadTurnoverSettings();
  } else {
    alert('操作失败: ' + result.error);
  }
}

async function deleteTurnoverSetting(id, name) {
  if (!confirm(`确定要删除设置「${name}」吗？此操作不可恢复。`)) return;
  
  const result = await api(`/api/bonus/turnover-settings/${id}?deleted_by=${currentUser?.id}`, {
    method: 'DELETE'
  });
  
  if (result.success) {
    alert('设置已删除');
    loadTurnoverSettings();
  } else {
    alert('删除失败: ' + result.error);
  }
}

async function approveCommission(id, amount) {
  // 验证财务密码后再审批洗码结算
  const verified = await verifyFinancePassword('commission_approval', amount || 0);
  if (!verified) {
    return; // 验证失败，不执行操作
  }

  const result = await api(`/api/commission/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'approved', reviewer_id: currentUser?.id })
  });
  if (result.success) {
    showSuccess('洗码结算审批通过');
    loadModule('commission');
  } else {
    alert(result.error);
  }
}

async function rejectCommission(id) {
  // 拒绝操作需要确认，但不需要财务密码验证
  if (!confirm('确认拒绝该笔洗码结算？')) {
    return;
  }

  const result = await api(`/api/commission/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'rejected', reviewer_id: currentUser?.id })
  });
  if (result.success) {
    showSuccess('洗码结算已拒绝');
    loadModule('commission');
  } else {
    alert(result.error);
  }
}

// =====================
// 7. 风险控端
// =====================
async function renderRisk(container) {
  const [alertsResult, limitGroupsResult] = await Promise.all([
    api('/api/risk/alerts'),
    api('/api/risk/limit-groups')
  ]);
  
  const alerts = alertsResult.data || [];
  const limitGroups = limitGroupsResult.data || [];
  const stats = alertsResult.stats || [];
  
  const pendingAlerts = alerts.filter(a => a.status === 'pending');
  
  container.innerHTML = `
    <!-- 风险指数 -->
    <div class="bg-gradient-to-r from-red-900 to-orange-900 rounded-xl p-5 mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-16 h-16 bg-red-600 bg-opacity-50 rounded-full flex items-center justify-center mr-4">
            <i class="fas fa-exclamation-triangle text-3xl text-yellow-300"></i>
          </div>
          <div>
            <p class="text-gray-300">当前系统风险指数</p>
            <p class="text-3xl font-bold text-white">${pendingAlerts.length > 5 ? 'HIGH LEVEL' : pendingAlerts.length > 2 ? 'MEDIUM' : 'LOW'}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-5xl font-bold text-yellow-300">${pendingAlerts.length}</p>
          <p class="text-gray-300">待处理预警</p>
        </div>
      </div>
    </div>
    
    <!-- 预警统计 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      ${['critical', 'high', 'medium', 'low'].map(s => {
        const count = stats.find(st => st.severity === s)?.count || 0;
        const colors = { critical: 'red', high: 'orange', medium: 'yellow', low: 'gray' };
        const names = { critical: '严重', high: '高危', medium: '中等', low: '低危' };
        return `
          <div class="bg-gray-800 rounded-xl p-4 border-l-4 border-${colors[s]}-500">
            <p class="text-gray-400 text-sm">${names[s]}预警</p>
            <p class="text-2xl font-bold text-${colors[s]}-400">${count}</p>
          </div>
        `;
      }).join('')}
    </div>
    
    <!-- Tabs -->
    <div class="flex space-x-4 mb-6">
      <button id="tab-alerts" onclick="switchRiskTab('alerts')" class="px-4 py-2 bg-primary rounded-lg">实时预警</button>
      <button id="tab-limits" onclick="switchRiskTab('limits')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">限红配置</button>
      <button id="tab-rules" onclick="switchRiskTab('rules')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">风控规则设置</button>
    </div>
    
    <!-- 预警列表 -->
    <div id="risk-alerts" class="bg-gray-800 rounded-xl overflow-hidden">
      <table class="w-full data-table">
        <thead class="bg-gray-700">
          <tr>
            <th class="text-left p-4">时间</th>
            <th class="text-left p-4">会员账号</th>
            <th class="text-left p-4">预警类型</th>
            <th class="text-left p-4">严重程度</th>
            <th class="text-left p-4">描述</th>
            <th class="text-left p-4">状态</th>
            <th class="text-left p-4">操作</th>
          </tr>
        </thead>
        <tbody>
          ${alerts.map(a => `
            <tr class="border-t border-gray-700 ${a.status === 'pending' && a.severity === 'critical' ? 'bg-red-900 bg-opacity-30' : ''}">
              <td class="p-4 text-sm text-gray-400">${formatDateTime(a.created_at)}</td>
              <td class="p-4">
                <p class="font-medium">${a.player_name || '-'}</p>
                <p class="text-sm">${getRiskBadge(a.risk_level)}</p>
              </td>
              <td class="p-4">${getAlertTypeName(a.alert_type)}</td>
              <td class="p-4">${getSeverityBadge(a.severity)}</td>
              <td class="p-4 max-w-xs truncate" title="${a.description}">${a.description}</td>
              <td class="p-4">${getStatusBadge(a.status)}</td>
              <td class="p-4">
                ${a.status === 'pending' ? `
                  <button onclick="handleAlert(${a.id}, 'handled')" class="text-green-400 hover:text-green-300 mr-2" title="处理"><i class="fas fa-check"></i></button>
                  <button onclick="handleAlert(${a.id}, 'ignored')" class="text-gray-400 hover:text-gray-300" title="忽略"><i class="fas fa-eye-slash"></i></button>
                ` : '<span class="text-gray-500">-</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- 限红配置 -->
    <div id="risk-limits" class="hidden">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${limitGroups.map(g => {
          const limits = JSON.parse(g.limits || '{}');
          return `
            <div class="bg-gray-800 rounded-xl p-5">
              <div class="flex justify-between items-start mb-4">
                <h4 class="font-semibold">${g.name}</h4>
                ${getStatusBadge(g.status)}
              </div>
              <p class="text-sm text-gray-400 mb-4">${g.description || ''}</p>
              <div class="space-y-2 text-sm">
                ${Object.entries(limits).map(([game, l]) => `
                  <div class="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <span>${getGameTypeName(game)}</span>
                    <span class="font-mono">${formatNumber(l.min)} - ${formatNumber(l.max)}</span>
                  </div>
                `).join('')}
              </div>
              <button class="w-full mt-4 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm"><i class="fas fa-edit mr-2"></i>编辑</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    
    <!-- 风控规则设置 -->
    <div id="risk-rules" class="hidden">
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex justify-between items-center">
          <h4 class="font-semibold"><i class="fas fa-shield-alt text-primary mr-2"></i>风控规则列表</h4>
          <button onclick="showAddRiskRuleModal()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
            <i class="fas fa-plus mr-1"></i>新增规则
          </button>
        </div>
        <div id="risk-rules-list" class="p-4">
          <p class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</p>
        </div>
      </div>
    </div>
  `;
}

function getAlertTypeName(type) {
  const map = {
    large_bet: '大额投注',
    frequent_deposit: '频繁存款',
    arb_suspect: '套利嫌疑',
    ip_change: 'IP变更',
    win_streak: '连赢预警',
    high_frequency: '高频投注'
  };
  return map[type] || type;
}

function switchRiskTab(tab) {
  document.querySelectorAll('[id^="risk-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('bg-primary');
    el.classList.add('bg-gray-700');
  });
  document.getElementById(`risk-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.remove('bg-gray-700');
  document.getElementById(`tab-${tab}`).classList.add('bg-primary');
  
  // 切换到风控规则时加载数据
  if (tab === 'rules') {
    loadRiskRules();
  }
}

async function handleAlert(id, status) {
  const remark = status === 'handled' ? prompt('处理备注:') : '忽略';
  const result = await api(`/api/risk/alerts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status, handler_id: currentUser?.id, handle_remark: remark })
  });
  if (result.success) loadModule('risk');
  else alert(result.error);
}

// 风控规则管理函数
async function loadRiskRules() {
  const container = document.getElementById('risk-rules-list');
  if (!container) return;
  
  try {
    const result = await api('/api/risk/rules');
    if (result.success) {
      const rules = result.data || [];
      if (rules.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">暂无风控规则，点击「新增规则」创建</p>';
        return;
      }
      
      container.innerHTML = `
        <div class="space-y-4">
          ${rules.map(r => {
            const conditions = JSON.parse(r.conditions || '{}');
            const actions = JSON.parse(r.actions || '{}');
            return `
              <div class="bg-gray-700 rounded-lg p-4">
                <div class="flex justify-between items-start mb-3">
                  <div class="flex items-center">
                    <span class="w-3 h-3 rounded-full ${r.is_enabled ? 'bg-green-500' : 'bg-gray-500'} mr-3"></span>
                    <div>
                      <h5 class="font-semibold">${escapeHtml(r.rule_name)}</h5>
                      <p class="text-sm text-gray-400">${getRuleTypeName(r.rule_type)}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    ${getSeverityBadge(r.severity)}
                    <button onclick="editRiskRule(${r.id})" class="text-blue-400 hover:text-blue-300 p-1" title="编辑"><i class="fas fa-edit"></i></button>
                    <button onclick="toggleRiskRule(${r.id}, ${r.is_enabled ? 0 : 1})" class="text-yellow-400 hover:text-yellow-300 p-1" title="${r.is_enabled ? '禁用' : '启用'}">
                      <i class="fas fa-${r.is_enabled ? 'pause' : 'play'}"></i>
                    </button>
                    <button onclick="deleteRiskRule(${r.id}, '${escapeJs(r.rule_name)}')" class="text-red-400 hover:text-red-300 p-1" title="删除"><i class="fas fa-trash"></i></button>
                  </div>
                </div>
                <p class="text-sm text-gray-300 mb-3">${escapeHtml(r.description || '暂无描述')}</p>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div class="bg-gray-800 p-3 rounded">
                    <p class="text-gray-400 mb-1"><i class="fas fa-filter mr-1"></i>触发条件</p>
                    <p class="text-gray-200">${formatRuleConditions(conditions)}</p>
                  </div>
                  <div class="bg-gray-800 p-3 rounded">
                    <p class="text-gray-400 mb-1"><i class="fas fa-bolt mr-1"></i>执行动作</p>
                    <p class="text-gray-200">${formatRuleActions(actions)}</p>
                  </div>
                </div>
                <p class="text-xs text-gray-500 mt-3">创建者: ${escapeHtml(r.created_by_name || '-')} | 创建时间: ${formatDateTime(r.created_at)}</p>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      container.innerHTML = `<p class="text-center text-red-400 py-8">加载失败: ${result.error}</p>`;
    }
  } catch (error) {
    container.innerHTML = '<p class="text-center text-red-400 py-8">加载失败，请稍后重试</p>';
  }
}

function getRuleTypeName(type) {
  const map = {
    // 新增规则类型
    single_win: '单笔赢额',
    daily_win: '日赢额',
    daily_loss: '日输额',
    consecutive_win: '连续赢',
    ip_multi_account: 'IP多账号',
    device_multi_account: '设备多账号',
    hedge_suspect: '对冲嫌疑',
    // 原有规则类型
    large_bet: '大额投注监控',
    frequent_bet: '高频投注监控',
    win_rate: '胜率异常监控',
    ip_change: 'IP变更监控',
    deposit: '存款异常监控',
    withdrawal: '提款异常监控',
    arb_detect: '套利行为检测',
    custom: '自定义规则'
  };
  return map[type] || type;
}

function formatRuleConditions(conditions) {
  if (!conditions || Object.keys(conditions).length === 0) return '无条件';
  const parts = [];
  // 金额相关
  if (conditions.amount_min) parts.push(`金额 ≥ ${formatNumber(conditions.amount_min)}`);
  if (conditions.amount_max) parts.push(`金额 ≤ ${formatNumber(conditions.amount_max)}`);
  if (conditions.win_amount) parts.push(`赢额 ≥ ${formatNumber(conditions.win_amount)}`);
  if (conditions.loss_amount) parts.push(`输额 ≥ ${formatNumber(conditions.loss_amount)}`);
  if (conditions.daily_win_limit) parts.push(`日赢额 ≥ ${formatNumber(conditions.daily_win_limit)}`);
  if (conditions.daily_loss_limit) parts.push(`日输额 ≥ ${formatNumber(conditions.daily_loss_limit)}`);
  // 频率和次数相关
  if (conditions.frequency) parts.push(`频率 ≥ ${conditions.frequency}次/小时`);
  if (conditions.consecutive_wins) parts.push(`连续赢 ≥ ${conditions.consecutive_wins}局`);
  if (conditions.win_rate) parts.push(`胜率 ≥ ${conditions.win_rate}%`);
  // IP和设备相关
  if (conditions.ip_change_count) parts.push(`IP变更 ≥ ${conditions.ip_change_count}次`);
  if (conditions.ip_account_count) parts.push(`同IP账号 ≥ ${conditions.ip_account_count}个`);
  if (conditions.device_account_count) parts.push(`同设备账号 ≥ ${conditions.device_account_count}个`);
  // 对冲相关
  if (conditions.hedge_threshold) parts.push(`对冲阈值 ≥ ${conditions.hedge_threshold}%`);
  if (conditions.time_window) parts.push(`时间窗口 ${conditions.time_window}分钟`);
  return parts.length > 0 ? parts.join(', ') : JSON.stringify(conditions);
}

function formatRuleActions(actions) {
  if (!actions || Object.keys(actions).length === 0) return '无动作';
  const parts = [];
  if (actions.alert) parts.push('生成预警');
  if (actions.notify) parts.push('通知管理员');
  if (actions.freeze) parts.push('冻结账户');
  if (actions.limit_bet) parts.push('限制投注');
  if (actions.require_verify) parts.push('要求验证');
  return parts.length > 0 ? parts.join(', ') : JSON.stringify(actions);
}

// 根据规则类型切换显示/隐藏动态字段
function toggleRuleTypeFields(ruleType) {
  // 所有可切换的字段容器
  const fieldGroups = {
    amount: document.getElementById('field-amount'),           // 金额阈值
    frequency: document.getElementById('field-frequency'),     // 频率阈值
    winRate: document.getElementById('field-win-rate'),        // 胜率阈值
    consecutive: document.getElementById('field-consecutive'), // 连续赢局数
    ipAccount: document.getElementById('field-ip-account'),    // 同IP账号数
    deviceAccount: document.getElementById('field-device-account'), // 同设备账号数
    hedge: document.getElementById('field-hedge'),             // 对冲阈值
    timeWindow: document.getElementById('field-time-window'),  // 时间窗口
    ipChange: document.getElementById('field-ip-change'),      // IP变更次数
  };
  
  // 隐藏所有动态字段
  Object.values(fieldGroups).forEach(field => {
    if (field) field.classList.add('hidden');
  });
  
  // 根据规则类型显示对应字段
  switch (ruleType) {
    case 'single_win':     // 单笔赢额
    case 'daily_win':      // 日赢额
    case 'daily_loss':     // 日输额
    case 'large_bet':      // 大额投注
    case 'deposit':        // 存款异常
    case 'withdrawal':     // 提款异常
      if (fieldGroups.amount) fieldGroups.amount.classList.remove('hidden');
      break;
    case 'consecutive_win': // 连续赢
      if (fieldGroups.consecutive) fieldGroups.consecutive.classList.remove('hidden');
      break;
    case 'ip_multi_account': // IP多账号
      if (fieldGroups.ipAccount) fieldGroups.ipAccount.classList.remove('hidden');
      if (fieldGroups.timeWindow) fieldGroups.timeWindow.classList.remove('hidden');
      break;
    case 'device_multi_account': // 设备多账号
      if (fieldGroups.deviceAccount) fieldGroups.deviceAccount.classList.remove('hidden');
      if (fieldGroups.timeWindow) fieldGroups.timeWindow.classList.remove('hidden');
      break;
    case 'hedge_suspect':  // 对冲嫌疑
    case 'arb_detect':     // 套利检测
      if (fieldGroups.hedge) fieldGroups.hedge.classList.remove('hidden');
      if (fieldGroups.timeWindow) fieldGroups.timeWindow.classList.remove('hidden');
      break;
    case 'frequent_bet':   // 高频投注
      if (fieldGroups.frequency) fieldGroups.frequency.classList.remove('hidden');
      break;
    case 'win_rate':       // 胜率异常
      if (fieldGroups.winRate) fieldGroups.winRate.classList.remove('hidden');
      break;
    case 'ip_change':      // IP变更
      if (fieldGroups.ipChange) fieldGroups.ipChange.classList.remove('hidden');
      if (fieldGroups.timeWindow) fieldGroups.timeWindow.classList.remove('hidden');
      break;
    case 'custom':         // 自定义 - 显示所有字段
      Object.values(fieldGroups).forEach(field => {
        if (field) field.classList.remove('hidden');
      });
      break;
  }
}

// 获取风控规则类型选项HTML
function getRiskRuleTypeOptions(selectedType = '') {
  return `
    <optgroup label="赢输监控">
      <option value="single_win" ${selectedType === 'single_win' ? 'selected' : ''}>单笔赢额</option>
      <option value="daily_win" ${selectedType === 'daily_win' ? 'selected' : ''}>日赢额</option>
      <option value="daily_loss" ${selectedType === 'daily_loss' ? 'selected' : ''}>日输额</option>
      <option value="consecutive_win" ${selectedType === 'consecutive_win' ? 'selected' : ''}>连续赢</option>
    </optgroup>
    <optgroup label="多账号监控">
      <option value="ip_multi_account" ${selectedType === 'ip_multi_account' ? 'selected' : ''}>IP多账号</option>
      <option value="device_multi_account" ${selectedType === 'device_multi_account' ? 'selected' : ''}>设备多账号</option>
    </optgroup>
    <optgroup label="异常行为">
      <option value="hedge_suspect" ${selectedType === 'hedge_suspect' ? 'selected' : ''}>对冲嫌疑</option>
      <option value="arb_detect" ${selectedType === 'arb_detect' ? 'selected' : ''}>套利行为检测</option>
    </optgroup>
    <optgroup label="传统监控">
      <option value="large_bet" ${selectedType === 'large_bet' ? 'selected' : ''}>大额投注监控</option>
      <option value="frequent_bet" ${selectedType === 'frequent_bet' ? 'selected' : ''}>高频投注监控</option>
      <option value="win_rate" ${selectedType === 'win_rate' ? 'selected' : ''}>胜率异常监控</option>
      <option value="ip_change" ${selectedType === 'ip_change' ? 'selected' : ''}>IP变更监控</option>
      <option value="deposit" ${selectedType === 'deposit' ? 'selected' : ''}>存款异常监控</option>
      <option value="withdrawal" ${selectedType === 'withdrawal' ? 'selected' : ''}>提款异常监控</option>
    </optgroup>
    <option value="custom" ${selectedType === 'custom' ? 'selected' : ''}>自定义规则</option>
  `;
}

// 获取动态条件字段HTML
function getRiskRuleConditionFields(conditions = {}) {
  return `
    <!-- 金额阈值 - 单笔赢额/日赢额/日输额/大额投注/存款异常/提款异常 -->
    <div id="field-amount" class="hidden">
      <label class="block text-gray-400 text-sm mb-2">金额阈值 <span class="text-gray-500">(触发金额)</span></label>
      <input type="number" name="amount_min" value="${conditions.amount_min || conditions.win_amount || conditions.loss_amount || conditions.daily_win_limit || conditions.daily_loss_limit || ''}" 
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：10000">
    </div>
    <!-- 连续赢局数 - 连续赢 -->
    <div id="field-consecutive" class="hidden">
      <label class="block text-gray-400 text-sm mb-2">连续赢局数 <span class="text-gray-500">(达到多少局触发)</span></label>
      <input type="number" name="consecutive_wins" value="${conditions.consecutive_wins || ''}" 
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：5">
    </div>
    <!-- 同IP账号数 - IP多账号 -->
    <div id="field-ip-account" class="hidden">
      <label class="block text-gray-400 text-sm mb-2">同IP账号阈值 <span class="text-gray-500">(同一IP超过多少个账号)</span></label>
      <input type="number" name="ip_account_count" value="${conditions.ip_account_count || ''}" 
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：3">
    </div>
    <!-- 同设备账号数 - 设备多账号 -->
    <div id="field-device-account" class="hidden">
      <label class="block text-gray-400 text-sm mb-2">同设备账号阈值 <span class="text-gray-500">(同一设备超过多少个账号)</span></label>
      <input type="number" name="device_account_count" value="${conditions.device_account_count || ''}" 
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：2">
    </div>
    <!-- 对冲阈值 - 对冲嫌疑/套利检测 -->
    <div id="field-hedge" class="hidden">
      <label class="block text-gray-400 text-sm mb-2">对冲/套利阈值 (%) <span class="text-gray-500">(相关性百分比)</span></label>
      <input type="number" name="hedge_threshold" value="${conditions.hedge_threshold || ''}" 
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：80">
    </div>
    <!-- 频率阈值 - 高频投注 -->
    <div id="field-frequency" class="hidden">
      <label class="block text-gray-400 text-sm mb-2">频率阈值 <span class="text-gray-500">(次/小时)</span></label>
      <input type="number" name="frequency" value="${conditions.frequency || ''}" 
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：20">
    </div>
    <!-- 胜率阈值 - 胜率异常 -->
    <div id="field-win-rate" class="hidden">
      <label class="block text-gray-400 text-sm mb-2">胜率阈值 (%) <span class="text-gray-500">(异常胜率)</span></label>
      <input type="number" name="win_rate" value="${conditions.win_rate || ''}" 
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：80">
    </div>
    <!-- IP变更次数 - IP变更监控 -->
    <div id="field-ip-change" class="hidden">
      <label class="block text-gray-400 text-sm mb-2">IP变更次数阈值 <span class="text-gray-500">(短期内变更次数)</span></label>
      <input type="number" name="ip_change_count" value="${conditions.ip_change_count || ''}" 
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：3">
    </div>
    <!-- 时间窗口 - 多账号/对冲/IP变更 -->
    <div id="field-time-window" class="hidden">
      <label class="block text-gray-400 text-sm mb-2">时间窗口 <span class="text-gray-500">(分钟)</span></label>
      <input type="number" name="time_window" value="${conditions.time_window || ''}" 
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：60">
    </div>
  `;
}

// 根据规则类型收集条件数据
function collectRiskRuleConditions(form, ruleType) {
  const conditions = {};
  
  switch (ruleType) {
    case 'single_win':
      if (form.amount_min?.value) conditions.win_amount = parseFloat(form.amount_min.value);
      break;
    case 'daily_win':
      if (form.amount_min?.value) conditions.daily_win_limit = parseFloat(form.amount_min.value);
      break;
    case 'daily_loss':
      if (form.amount_min?.value) conditions.daily_loss_limit = parseFloat(form.amount_min.value);
      break;
    case 'consecutive_win':
      if (form.consecutive_wins?.value) conditions.consecutive_wins = parseInt(form.consecutive_wins.value);
      break;
    case 'ip_multi_account':
      if (form.ip_account_count?.value) conditions.ip_account_count = parseInt(form.ip_account_count.value);
      if (form.time_window?.value) conditions.time_window = parseInt(form.time_window.value);
      break;
    case 'device_multi_account':
      if (form.device_account_count?.value) conditions.device_account_count = parseInt(form.device_account_count.value);
      if (form.time_window?.value) conditions.time_window = parseInt(form.time_window.value);
      break;
    case 'hedge_suspect':
    case 'arb_detect':
      if (form.hedge_threshold?.value) conditions.hedge_threshold = parseFloat(form.hedge_threshold.value);
      if (form.time_window?.value) conditions.time_window = parseInt(form.time_window.value);
      break;
    case 'large_bet':
    case 'deposit':
    case 'withdrawal':
      if (form.amount_min?.value) conditions.amount_min = parseFloat(form.amount_min.value);
      break;
    case 'frequent_bet':
      if (form.frequency?.value) conditions.frequency = parseInt(form.frequency.value);
      break;
    case 'win_rate':
      if (form.win_rate?.value) conditions.win_rate = parseFloat(form.win_rate.value);
      break;
    case 'ip_change':
      if (form.ip_change_count?.value) conditions.ip_change_count = parseInt(form.ip_change_count.value);
      if (form.time_window?.value) conditions.time_window = parseInt(form.time_window.value);
      break;
    case 'custom':
      // 自定义规则收集所有可能的字段
      if (form.amount_min?.value) conditions.amount_min = parseFloat(form.amount_min.value);
      if (form.consecutive_wins?.value) conditions.consecutive_wins = parseInt(form.consecutive_wins.value);
      if (form.ip_account_count?.value) conditions.ip_account_count = parseInt(form.ip_account_count.value);
      if (form.device_account_count?.value) conditions.device_account_count = parseInt(form.device_account_count.value);
      if (form.hedge_threshold?.value) conditions.hedge_threshold = parseFloat(form.hedge_threshold.value);
      if (form.frequency?.value) conditions.frequency = parseInt(form.frequency.value);
      if (form.win_rate?.value) conditions.win_rate = parseFloat(form.win_rate.value);
      if (form.ip_change_count?.value) conditions.ip_change_count = parseInt(form.ip_change_count.value);
      if (form.time_window?.value) conditions.time_window = parseInt(form.time_window.value);
      break;
  }
  
  return conditions;
}

function showAddRiskRuleModal() {
  const modal = document.createElement('div');
  modal.id = 'risk-rule-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-plus-circle text-primary mr-2"></i>新增风控规则</h3>
        <button onclick="closeRiskRuleModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="risk-rule-form" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">规则名称 <span class="text-red-400">*</span></label>
            <input type="text" name="rule_name" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：大额投注预警">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">规则类型 <span class="text-red-400">*</span></label>
            <select name="rule_type" required onchange="toggleRuleTypeFields(this.value)" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              ${getRiskRuleTypeOptions('single_win')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">严重程度</label>
            <select name="severity" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="low">低危</option>
              <option value="medium" selected>中等</option>
              <option value="high">高危</option>
              <option value="critical">严重</option>
            </select>
          </div>
          <div></div>
        </div>
        
        <!-- 动态条件字段区域 -->
        <div class="bg-gray-750 rounded-lg p-4 border border-gray-600">
          <h4 class="text-sm font-semibold text-gray-300 mb-3"><i class="fas fa-sliders-h mr-2"></i>触发条件设置</h4>
          <div class="grid grid-cols-2 gap-4">
            ${getRiskRuleConditionFields({})}
          </div>
        </div>
        
        <div>
          <label class="block text-gray-400 text-sm mb-2">触发动作</label>
          <div class="flex flex-wrap gap-4">
            <label class="flex items-center"><input type="checkbox" name="action_alert" checked class="mr-2">生成预警</label>
            <label class="flex items-center"><input type="checkbox" name="action_notify" class="mr-2">通知管理员</label>
            <label class="flex items-center"><input type="checkbox" name="action_freeze" class="mr-2">冻结账户</label>
            <label class="flex items-center"><input type="checkbox" name="action_limit" class="mr-2">限制投注</label>
            <label class="flex items-center"><input type="checkbox" name="action_verify" class="mr-2">要求验证</label>
          </div>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">规则描述</label>
          <textarea name="description" rows="3" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="规则的详细说明..."></textarea>
        </div>
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeRiskRuleModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存规则</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  // 初始化显示默认规则类型的字段
  setTimeout(() => toggleRuleTypeFields('single_win'), 0);
  
  document.getElementById('risk-rule-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const ruleType = form.rule_type.value;
    
    const data = {
      rule_name: form.rule_name.value,
      rule_type: ruleType,
      severity: form.severity.value,
      conditions: collectRiskRuleConditions(form, ruleType),
      actions: {
        alert: form.action_alert.checked,
        notify: form.action_notify.checked,
        freeze: form.action_freeze.checked,
        limit_bet: form.action_limit.checked,
        require_verify: form.action_verify.checked
      },
      description: form.description.value,
      created_by: currentUser?.id
    };
    
    const result = await api('/api/risk/rules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('风控规则创建成功！');
      closeRiskRuleModal();
      loadRiskRules();
    } else {
      alert('创建失败: ' + result.error);
    }
  };
}

function closeRiskRuleModal() {
  const modal = document.getElementById('risk-rule-modal');
  if (modal) modal.remove();
}

async function editRiskRule(id) {
  // 获取规则详情并显示编辑表单
  const result = await api('/api/risk/rules');
  if (!result.success) return alert('获取规则失败');
  
  const rule = result.data.find(r => r.id === id);
  if (!rule) return alert('规则不存在');
  
  const conditions = JSON.parse(rule.conditions || '{}');
  const actions = JSON.parse(rule.actions || '{}');
  
  const modal = document.createElement('div');
  modal.id = 'risk-rule-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-edit text-primary mr-2"></i>编辑风控规则</h3>
        <button onclick="closeRiskRuleModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="risk-rule-form" class="space-y-4">
        <input type="hidden" name="id" value="${id}">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">规则名称 <span class="text-red-400">*</span></label>
            <input type="text" name="rule_name" required value="${escapeHtml(rule.rule_name)}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">规则类型 <span class="text-red-400">*</span></label>
            <select name="rule_type" required onchange="toggleRuleTypeFields(this.value)" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              ${getRiskRuleTypeOptions(rule.rule_type)}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">严重程度</label>
            <select name="severity" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="low" ${rule.severity === 'low' ? 'selected' : ''}>低危</option>
              <option value="medium" ${rule.severity === 'medium' ? 'selected' : ''}>中等</option>
              <option value="high" ${rule.severity === 'high' ? 'selected' : ''}>高危</option>
              <option value="critical" ${rule.severity === 'critical' ? 'selected' : ''}>严重</option>
            </select>
          </div>
          <div></div>
        </div>
        
        <!-- 动态条件字段区域 -->
        <div class="bg-gray-750 rounded-lg p-4 border border-gray-600">
          <h4 class="text-sm font-semibold text-gray-300 mb-3"><i class="fas fa-sliders-h mr-2"></i>触发条件设置</h4>
          <div class="grid grid-cols-2 gap-4">
            ${getRiskRuleConditionFields(conditions)}
          </div>
        </div>
        
        <div>
          <label class="block text-gray-400 text-sm mb-2">触发动作</label>
          <div class="flex flex-wrap gap-4">
            <label class="flex items-center"><input type="checkbox" name="action_alert" ${actions.alert ? 'checked' : ''} class="mr-2">生成预警</label>
            <label class="flex items-center"><input type="checkbox" name="action_notify" ${actions.notify ? 'checked' : ''} class="mr-2">通知管理员</label>
            <label class="flex items-center"><input type="checkbox" name="action_freeze" ${actions.freeze ? 'checked' : ''} class="mr-2">冻结账户</label>
            <label class="flex items-center"><input type="checkbox" name="action_limit" ${actions.limit_bet ? 'checked' : ''} class="mr-2">限制投注</label>
            <label class="flex items-center"><input type="checkbox" name="action_verify" ${actions.require_verify ? 'checked' : ''} class="mr-2">要求验证</label>
          </div>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">规则描述</label>
          <textarea name="description" rows="3" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">${escapeHtml(rule.description || '')}</textarea>
        </div>
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeRiskRuleModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存修改</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  // 初始化显示当前规则类型的字段
  setTimeout(() => toggleRuleTypeFields(rule.rule_type), 0);
  
  document.getElementById('risk-rule-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const ruleType = form.rule_type.value;
    
    const data = {
      rule_name: form.rule_name.value,
      rule_type: ruleType,
      severity: form.severity.value,
      conditions: collectRiskRuleConditions(form, ruleType),
      actions: {
        alert: form.action_alert.checked,
        notify: form.action_notify.checked,
        freeze: form.action_freeze.checked,
        limit_bet: form.action_limit.checked,
        require_verify: form.action_verify.checked
      },
      description: form.description.value,
      updated_by: currentUser?.id
    };
    
    const result = await api(`/api/risk/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('风控规则更新成功！');
      closeRiskRuleModal();
      loadRiskRules();
    } else {
      alert('更新失败: ' + result.error);
    }
  };
}

async function toggleRiskRule(id, newStatus) {
  const result = await api(`/api/risk/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ is_enabled: newStatus, updated_by: currentUser?.id })
  });
  
  if (result.success) {
    loadRiskRules();
  } else {
    alert('操作失败: ' + result.error);
  }
}

async function deleteRiskRule(id, name) {
  if (!confirm(`确定要删除规则「${name}」吗？此操作不可恢复。`)) return;
  
  const result = await api(`/api/risk/rules/${id}?deleted_by=${currentUser?.id}`, {
    method: 'DELETE'
  });
  
  if (result.success) {
    alert('规则已删除');
    loadRiskRules();
  } else {
    alert('删除失败: ' + result.error);
  }
}

// =====================
// 8. 报表中心
// =====================
async function renderReports(container) {
  // 获取代理列表用于筛选
  const agentsResult = await api('/api/agents?limit=100');
  const agents = agentsResult.data || [];
  
  container.innerHTML = `
    <!-- 页面标题 -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold"><i class="fas fa-chart-bar text-primary mr-2"></i>报表中心</h2>
        <p class="text-gray-400 text-sm mt-1">全面的运营数据分析与对账结算</p>
      </div>
    </div>
    
    <!-- Tabs -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button id="tab-bet-details" onclick="switchReportTab('bet-details')" class="px-4 py-2 bg-primary rounded-lg text-sm"><i class="fas fa-file-invoice mr-1"></i>1. 注单明细</button>
      <button id="tab-settle" onclick="switchReportTab('settle')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"><i class="fas fa-calculator mr-1"></i>2. 结算报表</button>
      <button id="tab-profit-share" onclick="switchReportTab('profit-share')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"><i class="fas fa-chart-pie mr-1"></i>3. 盈利分成</button>
      <button id="tab-ranking" onclick="switchReportTab('ranking')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"><i class="fas fa-trophy mr-1"></i>4. 盈亏排行</button>
      <button id="tab-game-report" onclick="switchReportTab('game-report')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"><i class="fas fa-gamepad mr-1"></i>5. 游戏报表</button>
      <button id="tab-daily-report" onclick="switchReportTab('daily-report')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"><i class="fas fa-calendar-day mr-1"></i>6. 盈亏日报</button>
      <button id="tab-agent-perf" onclick="switchReportTab('agent-perf')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"><i class="fas fa-users mr-1"></i>7. 代理业绩</button>
      <button id="tab-transfers" onclick="switchReportTab('transfers')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm"><i class="fas fa-exchange-alt mr-1"></i>8. 转账记录</button>
    </div>
    
    <!-- 1. 注单明细 -->
    <div id="report-bet-details" class="bg-gray-800 rounded-xl overflow-hidden">
      <!-- 查询栏 -->
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-4 py-4 border-b border-gray-700">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">开始日期</label>
            <input type="date" id="trans-start" value="${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">结束日期</label>
            <input type="date" id="trans-end" value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">注单号</label>
            <input type="text" id="bet-detail-no" placeholder="请输入注单号" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder-gray-500">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">玩家ID/用户名</label>
            <input type="text" id="bet-detail-player" placeholder="玩家ID或用户名" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder-gray-500">
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">游戏类型</label>
            <select id="bet-detail-game" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部游戏</option>
              <option value="baccarat">百家乐</option>
              <option value="roulette">轮盘</option>
              <option value="dragon_tiger">龙虎</option>
              <option value="sicbo">骰宝</option>
              <option value="blackjack">21点</option>
            </select>
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">注单状态</label>
            <select id="bet-detail-status" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部状态</option>
              <option value="0">未结算</option>
              <option value="1">已结算</option>
              <option value="3">已作废</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button onclick="loadBetDetails()" class="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-sm font-medium transition-all shadow-lg hover:shadow-xl">
              <i class="fas fa-search mr-1.5"></i>查询
            </button>
            <button onclick="exportBetDetails()" class="bg-green-600 hover:bg-green-700 px-5 py-2 rounded text-sm transition-all shadow-lg hover:shadow-xl">
              <i class="fas fa-download mr-1.5"></i>导出
            </button>
            <button onclick="document.getElementById('trans-start').value=dayjs().subtract(7,'day').format('YYYY-MM-DD');document.getElementById('trans-end').value=dayjs().format('YYYY-MM-DD');document.getElementById('bet-detail-no').value='';document.getElementById('bet-detail-player').value='';document.getElementById('bet-detail-game').value='';document.getElementById('bet-detail-status').value='';" class="bg-gray-600 hover:bg-gray-700 px-5 py-2 rounded text-sm transition-all">
              <i class="fas fa-redo mr-1.5"></i>重置
            </button>
          </div>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3">注单号</th>
              <th class="text-left p-3">玩家</th>
              <th class="text-left p-3">游戏</th>
              <th class="text-left p-3">期号</th>
              <th class="text-left p-3">类型</th>
              <th class="text-left p-3">投注点</th>
              <th class="text-right p-3">投注金额</th>
              <th class="text-right p-3">派彩</th>
              <th class="text-right p-3">输赢</th>
              <th class="text-center p-3">状态</th>
              <th class="text-left p-3">时间</th>
            </tr>
          </thead>
          <tbody id="bet-detail-tbody">
            <tr><td colspan="11" class="p-8 text-center text-gray-400">请点击查询按钮加载数据</td></tr>
          </tbody>
        </table>
      </div>
      <div id="bet-detail-pagination" class="p-4 border-t border-gray-700 flex justify-between items-center"></div>
    </div>

    <!-- 3. 盈利分成（原综合报表） -->
    <div id="report-profit-share" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-4 py-4 border-b border-gray-700">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">开始日期</label>
            <input type="date" id="comp-start" value="${dayjs().subtract(30, 'day').format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">结束日期</label>
            <input type="date" id="comp-end" value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">分组维度</label>
            <select id="comp-group" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="date">按日期</option>
              <option value="agent">按代理</option>
              <option value="game">按游戏</option>
            </select>
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">代理筛选</label>
            <select id="comp-agent" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部代理</option>
              ${agents.map(a => `<option value="${a.id}">${escapeHtml(a.agent_username)}</option>`).join('')}
            </select>
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">游戏类型</label>
            <select id="comp-game" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部游戏</option>
              <option value="baccarat">百家乐</option>
              <option value="roulette">轮盘</option>
              <option value="dragon_tiger">龙虎</option>
              <option value="sicbo">骰宝</option>
              <option value="blackjack">21点</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button onclick="loadComprehensive()" class="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-sm font-medium transition-all shadow-lg hover:shadow-xl">
              <i class="fas fa-search mr-1.5"></i>查询
            </button>
            <button onclick="exportComprehensive()" class="bg-green-600 hover:bg-green-700 px-5 py-2 rounded text-sm transition-all shadow-lg hover:shadow-xl">
              <i class="fas fa-download mr-1.5"></i>导出
            </button>
          </div>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3">维度</th>
              <th class="text-right p-3">总投注</th>
              <th class="text-right p-3">总输赢</th>
              <th class="text-right p-3">公司盈亏</th>
              <th class="text-right p-3">代理佣金</th>
              <th class="text-right p-3">净利润</th>
              <th class="text-right p-3">玩家数</th>
              <th class="text-right p-3">注单数</th>
            </tr>
          </thead>
          <tbody id="comp-tbody">
            <tr><td colspan="8" class="p-8 text-center text-gray-400">请选择条件并生成报表</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. 玩家排名 -->
    <div id="report-ranking" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-4 py-4 border-b border-gray-700">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">开始日期</label>
            <input type="date" id="rank-start" value="${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">结束日期</label>
            <input type="date" id="rank-end" value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">代理筛选</label>
            <select id="rank-agent" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部代理</option>
              ${agents.map(a => `<option value="${a.id}">${escapeHtml(a.agent_username)}</option>`).join('')}
            </select>
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">VIP等级</label>
            <select id="rank-vip" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部等级</option>
              <option value="0">VIP0</option>
              <option value="1">VIP1</option>
              <option value="2">VIP2</option>
              <option value="3">VIP3</option>
              <option value="4">VIP4</option>
              <option value="5">VIP5</option>
              <option value="6">VIP6</option>
            </select>
          </div>
          <div class="flex-1 min-w-[100px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">显示数量</label>
            <select id="rank-limit" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="10">TOP10</option>
              <option value="20">TOP20</option>
              <option value="50">TOP50</option>
              <option value="100">TOP100</option>
            </select>
          </div>
          <div>
            <button onclick="loadRanking()" class="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-sm font-medium transition-all shadow-lg hover:shadow-xl">
              <i class="fas fa-search mr-1.5"></i>查询
            </button>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
        <div>
          <h3 class="text-lg font-semibold mb-4 text-green-400"><i class="fas fa-arrow-up mr-2"></i>赢得最多</h3>
          <div id="rank-winners" class="space-y-2"></div>
        </div>
        <div>
          <h3 class="text-lg font-semibold mb-4 text-red-400"><i class="fas fa-arrow-down mr-2"></i>输得最多</h3>
          <div id="rank-losers" class="space-y-2"></div>
        </div>
      </div>
    </div>

    <!-- 6. 盈亏日报（原每日盈亏汇总） -->
    <div id="report-daily-report" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-4 py-4 border-b border-gray-700">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">开始日期</label>
            <input type="date" id="summary-start" value="${dayjs().subtract(30, 'day').format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">结束日期</label>
            <input type="date" id="summary-end" value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div>
            <button onclick="loadDailySummary()" class="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-sm font-medium transition-all shadow-lg hover:shadow-xl">
              <i class="fas fa-search mr-1.5"></i>查询
            </button>
          </div>
        </div>
      </div>
      <!-- 汇总卡片 -->
      <div id="summary-cards" class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-gray-700"></div>
      <div class="overflow-x-auto">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3">日期</th>
              <th class="text-right p-3">活跃玩家</th>
              <th class="text-right p-3">注单数</th>
              <th class="text-right p-3">总投注</th>
              <th class="text-right p-3">总派彩</th>
              <th class="text-right p-3">玩家输赢</th>
              <th class="text-right p-3">公司盈亏</th>
            </tr>
          </thead>
          <tbody id="summary-tbody">
            <tr><td colspan="7" class="p-8 text-center text-gray-400">请点击查询按钮加载数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 5. 游戏报表（原游戏营收报表） -->
    <div id="report-game-report" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <!-- 查询栏 -->
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-4 py-4 border-b border-gray-700">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">开始日期</label>
            <input type="date" id="game-start" value="${dayjs().subtract(30, 'day').format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">结束日期</label>
            <input type="date" id="game-end" value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">游戏类型</label>
            <select id="game-type-filter" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部游戏</option>
              <option value="baccarat">百家乐</option>
              <option value="roulette">轮盘</option>
              <option value="dragon_tiger">龙虎</option>
              <option value="dice">骰宝</option>
              <option value="blackjack">二十一点</option>
            </select>
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">最小营收</label>
            <input type="number" id="game-min-revenue" placeholder="0" min="0" step="10000" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">排序方式</label>
            <select id="game-sort" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="revenue_desc">营收↓</option>
              <option value="revenue_asc">营收↑</option>
              <option value="bet_desc">投注额↓</option>
              <option value="bet_asc">投注额↑</option>
              <option value="players_desc">玩家数↓</option>
              <option value="players_asc">玩家数↑</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button onclick="loadGameRevenue()" class="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-2 rounded-lg text-sm font-medium shadow-lg shadow-red-900/30 transition-all">
              <i class="fas fa-search mr-1.5"></i>查询
            </button>
            <button onclick="exportGameReport()" class="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-2 rounded-lg text-sm font-medium shadow-lg shadow-green-900/30 transition-all">
              <i class="fas fa-download mr-1.5"></i>导出
            </button>
            <button onclick="resetGameFilters()" class="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 px-5 py-2 rounded-lg text-sm font-medium shadow-lg transition-all">
              <i class="fas fa-redo mr-1.5"></i>重置
            </button>
          </div>
        </div>
      </div>
      
      <!-- 统计卡片 -->
      <div id="game-summary" class="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border-b border-gray-700 bg-gray-750">
        <div class="text-center">
          <p class="text-gray-400 text-xs">游戏种类</p>
          <p class="text-lg font-bold text-primary" id="game-total-types">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">总注单数</p>
          <p class="text-lg font-bold text-blue-400" id="game-total-bets">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">总投注额</p>
          <p class="text-lg font-bold text-cyan-400" id="game-total-amount">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">总派彩</p>
          <p class="text-lg font-bold text-purple-400" id="game-total-payout">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">总营收</p>
          <p class="text-lg font-bold" id="game-total-revenue">-</p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3">游戏类型</th>
              <th class="text-right p-3">注单数</th>
              <th class="text-right p-3">玩家数</th>
              <th class="text-right p-3">总投注</th>
              <th class="text-right p-3">总派彩</th>
              <th class="text-right p-3">游戏营收</th>
              <th class="text-right p-3">胜率%</th>
            </tr>
          </thead>
          <tbody id="game-tbody">
            <tr><td colspan="7" class="p-8 text-center text-gray-400">请点击查询按钮加载数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 6. 代理业绩统计 -->
    <div id="report-agent-perf" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <!-- 查询栏 -->
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-4 py-4 border-b border-gray-700">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">开始日期</label>
            <input type="date" id="agent-start" value="${dayjs().subtract(30, 'day').format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">结束日期</label>
            <input type="date" id="agent-end" value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[160px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">代理账号</label>
            <input type="text" id="agent-search" placeholder="代理账号/ID" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">代理级别</label>
            <select id="agent-level-filter" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部级别</option>
              <option value="1">一级代理</option>
              <option value="2">二级代理</option>
              <option value="3">三级代理</option>
              <option value="4">四级代理</option>
              <option value="5">五级代理</option>
            </select>
          </div>
          <div class="flex-1 min-w-[140px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">最小投注额</label>
            <input type="number" id="agent-min-bet" placeholder="0" min="0" step="1000" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          <div class="flex-1 min-w-[120px]">
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">排序方式</label>
            <select id="agent-sort" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="total_bet_desc">投注额↓</option>
              <option value="total_bet_asc">投注额↑</option>
              <option value="profit_desc">盈亏↓</option>
              <option value="profit_asc">盈亏↑</option>
              <option value="commission_desc">佣金↓</option>
              <option value="commission_asc">佣金↑</option>
              <option value="players_desc">玩家数↓</option>
              <option value="players_asc">玩家数↑</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button onclick="loadAgentPerformance()" class="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-2 rounded-lg text-sm font-medium shadow-lg shadow-red-900/30 transition-all">
              <i class="fas fa-search mr-1.5"></i>查询
            </button>
            <button onclick="exportAgentPerformance()" class="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-2 rounded-lg text-sm font-medium shadow-lg shadow-green-900/30 transition-all">
              <i class="fas fa-download mr-1.5"></i>导出
            </button>
            <button onclick="resetAgentFilters()" class="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 px-5 py-2 rounded-lg text-sm font-medium shadow-lg transition-all">
              <i class="fas fa-redo mr-1.5"></i>重置
            </button>
          </div>
        </div>
      </div>
      
      <!-- 统计卡片 -->
      <div id="agent-summary" class="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 border-b border-gray-700 bg-gray-750">
        <div class="text-center">
          <p class="text-gray-400 text-xs">代理总数</p>
          <p class="text-lg font-bold text-primary" id="agent-total-count">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">玩家总数</p>
          <p class="text-lg font-bold text-blue-400" id="agent-total-players">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">总投注额</p>
          <p class="text-lg font-bold text-cyan-400" id="agent-total-bet">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">公司盈亏</p>
          <p class="text-lg font-bold" id="agent-total-profit">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">代理佣金</p>
          <p class="text-lg font-bold text-yellow-400" id="agent-total-commission">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">净利润</p>
          <p class="text-lg font-bold text-green-400" id="agent-net-profit">-</p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3">代理账号</th>
              <th class="text-left p-3">级别</th>
              <th class="text-right p-3">下线数</th>
              <th class="text-right p-3">玩家数</th>
              <th class="text-right p-3">总投注</th>
              <th class="text-right p-3">公司盈亏</th>
              <th class="text-right p-3">代理佣金</th>
              <th class="text-right p-3">净利润</th>
            </tr>
          </thead>
          <tbody id="agent-tbody">
            <tr><td colspan="8" class="p-8 text-center text-gray-400">请点击查询按钮加载数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 日结算报表 -->
    <div id="report-daily" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <div class="p-4 border-b border-gray-700 flex flex-wrap gap-4 justify-between items-center">
        <div class="flex flex-wrap gap-4 items-center">
          <div>
            <label class="text-gray-400 text-xs block mb-1">开始日期</label>
            <input type="date" id="daily-start-date" value="${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
          </div>
          <div>
            <label class="text-gray-400 text-xs block mb-1">结束日期</label>
            <input type="date" id="daily-end-date" value="${dayjs().format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
          </div>
          <div class="flex items-end">
            <button onclick="loadDailyReport()" class="bg-primary hover:bg-blue-700 px-4 py-1.5 rounded text-sm"><i class="fas fa-search mr-1"></i>查询</button>
          </div>
        </div>
        <button onclick="exportReport('daily')" class="bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded text-sm"><i class="fas fa-download mr-2"></i>导出报表</button>
      </div>
      <!-- 汇总统计 -->
      <div id="daily-summary" class="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 border-b border-gray-700 bg-gray-750">
        <div class="text-center">
          <p class="text-gray-400 text-xs">总投注额</p>
          <p class="text-lg font-bold text-cyan-400" id="daily-total-bet">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">有效投注</p>
          <p class="text-lg font-bold text-blue-400" id="daily-valid-bet">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">总派彩</p>
          <p class="text-lg font-bold text-purple-400" id="daily-payout">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">公司盈亏</p>
          <p class="text-lg font-bold" id="daily-profit">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">平均杀数</p>
          <p class="text-lg font-bold" id="daily-kill-rate">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">总注单数</p>
          <p class="text-lg font-bold text-white" id="daily-bet-count">-</p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-3 text-xs">日期</th>
              <th class="text-right p-3 text-xs">注单数</th>
              <th class="text-right p-3 text-xs">投注人数</th>
              <th class="text-right p-3 text-xs">总投注</th>
              <th class="text-right p-3 text-xs">有效投注</th>
              <th class="text-right p-3 text-xs">总派彩</th>
              <th class="text-right p-3 text-xs">公司盈亏</th>
              <th class="text-right p-3 text-xs">杀数率</th>
            </tr>
          </thead>
          <tbody id="daily-tbody">
            <tr><td colspan="8" class="p-8 text-center text-gray-400">点击「查询」加载数据</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 盈亏分析（股东/代理/公司） -->
    <div id="report-profit" class="hidden">
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex flex-wrap gap-4 justify-between items-center">
          <div class="flex flex-wrap gap-4 items-center">
            <div>
              <label class="text-gray-400 text-xs block mb-1">开始日期</label>
              <input type="date" id="profit-start-date" value="${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1">结束日期</label>
              <input type="date" id="profit-end-date" value="${dayjs().format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1">代理筛选</label>
              <select id="profit-agent" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
                <option value="">全部代理</option>
                ${agents.map(a => `<option value="${a.id}">${escapeHtml(a.agent_username)}</option>`).join('')}
              </select>
            </div>
            <div class="flex items-end">
              <button onclick="loadProfitAnalysis()" class="bg-primary hover:bg-blue-700 px-4 py-1.5 rounded text-sm"><i class="fas fa-search mr-1"></i>查询</button>
            </div>
          </div>
        </div>
        
        <!-- 盈亏汇总卡片 -->
        <div id="profit-summary" class="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border-b border-gray-700">
          <div class="bg-gray-700 rounded-lg p-4 text-center">
            <p class="text-gray-400 text-xs mb-1">总投注额</p>
            <p class="text-2xl font-bold text-cyan-400" id="profit-total-bet">-</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-4 text-center">
            <p class="text-gray-400 text-xs mb-1">毛利润</p>
            <p class="text-2xl font-bold" id="profit-gross">-</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-4 text-center">
            <p class="text-gray-400 text-xs mb-1">佣金支出</p>
            <p class="text-2xl font-bold text-yellow-400" id="profit-commission">-</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-4 text-center">
            <p class="text-gray-400 text-xs mb-1">代理占成</p>
            <p class="text-2xl font-bold text-orange-400" id="profit-agent-share">-</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-4 text-center">
            <p class="text-gray-400 text-xs mb-1">公司净利润</p>
            <p class="text-2xl font-bold" id="profit-company-net">-</p>
          </div>
        </div>
        
        <!-- 代理明细表格 -->
        <div class="p-4">
          <h4 class="font-semibold mb-4"><i class="fas fa-users text-primary mr-2"></i>代理盈亏明细</h4>
          <div class="overflow-x-auto">
            <table class="w-full data-table min-w-[1000px]">
              <thead class="bg-gray-700">
                <tr>
                  <th class="text-left p-3 text-xs">代理账号</th>
                  <th class="text-left p-3 text-xs">代理名称</th>
                  <th class="text-center p-3 text-xs">级别</th>
                  <th class="text-right p-3 text-xs">占成比例</th>
                  <th class="text-right p-3 text-xs">下级会员</th>
                  <th class="text-right p-3 text-xs">总投注</th>
                  <th class="text-right p-3 text-xs">有效投注</th>
                  <th class="text-right p-3 text-xs">毛利润</th>
                  <th class="text-right p-3 text-xs">佣金</th>
                  <th class="text-right p-3 text-xs">代理应得</th>
                  <th class="text-right p-3 text-xs">公司留存</th>
                </tr>
              </thead>
              <tbody id="profit-agents-tbody">
                <tr><td colspan="11" class="p-8 text-center text-gray-400">点击「查询」加载数据</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 对账结算 -->
    <div id="report-settlement" class="hidden">
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex flex-wrap gap-4 justify-between items-center">
          <div class="flex flex-wrap gap-4 items-center">
            <div>
              <label class="text-gray-400 text-xs block mb-1">开始日期</label>
              <input type="date" id="settle-start-date" value="${dayjs().subtract(30, 'day').format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1">结束日期</label>
              <input type="date" id="settle-end-date" value="${dayjs().format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1">代理筛选</label>
              <select id="settle-agent" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
                <option value="">全部代理</option>
                ${agents.map(a => `<option value="${a.id}">${escapeHtml(a.agent_username)}</option>`).join('')}
              </select>
            </div>
            <div class="flex items-end">
              <button onclick="loadSettlementReport()" class="bg-primary hover:bg-blue-700 px-4 py-1.5 rounded text-sm"><i class="fas fa-search mr-1"></i>查询</button>
            </div>
          </div>
          <button onclick="exportReport('settlement')" class="bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded text-sm"><i class="fas fa-download mr-2"></i>导出对账单</button>
        </div>
        
        <!-- 结算汇总 -->
        <div id="settle-summary" class="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 border-b border-gray-700 bg-gray-750">
          <div class="text-center">
            <p class="text-gray-400 text-xs">总注单数</p>
            <p class="text-lg font-bold text-white" id="settle-bet-count">-</p>
          </div>
          <div class="text-center">
            <p class="text-gray-400 text-xs">总投注额</p>
            <p class="text-lg font-bold text-cyan-400" id="settle-total-bet">-</p>
          </div>
          <div class="text-center">
            <p class="text-gray-400 text-xs">有效投注</p>
            <p class="text-lg font-bold text-blue-400" id="settle-valid-bet">-</p>
          </div>
          <div class="text-center">
            <p class="text-gray-400 text-xs">毛利润</p>
            <p class="text-lg font-bold" id="settle-gross">-</p>
          </div>
          <div class="text-center">
            <p class="text-gray-400 text-xs">代理应得</p>
            <p class="text-lg font-bold text-orange-400" id="settle-agent-share">-</p>
          </div>
          <div class="text-center">
            <p class="text-gray-400 text-xs">公司留存</p>
            <p class="text-lg font-bold" id="settle-company-share">-</p>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full data-table min-w-[1200px]">
            <thead class="bg-gray-700">
              <tr>
                <th class="text-left p-3 text-xs">结算日期</th>
                <th class="text-left p-3 text-xs">代理账号</th>
                <th class="text-left p-3 text-xs">代理名称</th>
                <th class="text-right p-3 text-xs">会员数</th>
                <th class="text-right p-3 text-xs">注单数</th>
                <th class="text-right p-3 text-xs">总投注</th>
                <th class="text-right p-3 text-xs">有效投注</th>
                <th class="text-right p-3 text-xs">总派彩</th>
                <th class="text-right p-3 text-xs">毛利润</th>
                <th class="text-right p-3 text-xs">占成(%)</th>
                <th class="text-right p-3 text-xs">代理应得</th>
                <th class="text-right p-3 text-xs">公司留存</th>
              </tr>
            </thead>
            <tbody id="settle-tbody">
              <tr><td colspan="12" class="p-8 text-center text-gray-400">点击「查询」加载数据</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- 游戏报表 -->
    <div id="report-game" class="hidden">
      <div class="bg-gray-800 rounded-xl p-4 mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <div>
            <label class="text-gray-400 text-xs block mb-1">开始日期</label>
            <input type="date" id="game-start-date" value="${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
          </div>
          <div>
            <label class="text-gray-400 text-xs block mb-1">结束日期</label>
            <input type="date" id="game-end-date" value="${dayjs().format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
          </div>
          <button onclick="loadGameReport()" class="bg-primary hover:bg-blue-700 px-4 py-1.5 rounded text-sm mt-5"><i class="fas fa-search mr-1"></i>查询</button>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-gray-800 rounded-xl p-5">
          <h4 class="font-semibold mb-4">游戏类型营收占比</h4>
          <canvas id="gameChart" height="250"></canvas>
        </div>
        <div class="bg-gray-800 rounded-xl p-5">
          <h4 class="font-semibold mb-4">游戏数据明细</h4>
          <table class="w-full">
            <thead class="text-gray-400 text-sm">
              <tr>
                <th class="text-left pb-3">游戏</th>
                <th class="text-right pb-3">投注额</th>
                <th class="text-right pb-3">有效投注</th>
                <th class="text-right pb-3">盈亏</th>
                <th class="text-right pb-3">注单</th>
                <th class="text-right pb-3">占比</th>
              </tr>
            </thead>
            <tbody id="game-tbody">
              <tr><td colspan="6" class="py-8 text-center text-gray-400">点击「查询」加载数据</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- 盈亏排行 -->
    <div id="report-rank" class="hidden">
      <div class="bg-gray-800 rounded-xl p-4 mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <div>
            <label class="text-gray-400 text-xs block mb-1">统计天数</label>
            <select id="rank-days" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
              <option value="7">最近7天</option>
              <option value="30">最近30天</option>
              <option value="90">最近90天</option>
            </select>
          </div>
          <div>
            <label class="text-gray-400 text-xs block mb-1">显示数量</label>
            <select id="rank-limit" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
              <option value="10">TOP 10</option>
              <option value="20">TOP 20</option>
              <option value="50">TOP 50</option>
            </select>
          </div>
          <button onclick="loadLeaderboard()" class="bg-primary hover:bg-blue-700 px-4 py-1.5 rounded text-sm mt-5"><i class="fas fa-search mr-1"></i>查询</button>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-gray-800 rounded-xl p-5">
          <h4 class="font-semibold mb-4 text-green-400"><i class="fas fa-trophy mr-2"></i>盈利榜</h4>
          <table class="w-full">
            <thead class="text-gray-400 text-sm">
              <tr>
                <th class="text-left pb-3">#</th>
                <th class="text-left pb-3">会员</th>
                <th class="text-right pb-3">盈利</th>
                <th class="text-right pb-3">投注额</th>
                <th class="text-right pb-3">投注数</th>
              </tr>
            </thead>
            <tbody id="rank-profit-tbody">
              <tr><td colspan="5" class="py-8 text-center text-gray-400">点击「查询」加载数据</td></tr>
            </tbody>
          </table>
        </div>
        <div class="bg-gray-800 rounded-xl p-5">
          <h4 class="font-semibold mb-4 text-red-400"><i class="fas fa-skull mr-2"></i>亏损榜</h4>
          <table class="w-full">
            <thead class="text-gray-400 text-sm">
              <tr>
                <th class="text-left pb-3">#</th>
                <th class="text-left pb-3">会员</th>
                <th class="text-right pb-3">亏损</th>
                <th class="text-right pb-3">投注额</th>
                <th class="text-right pb-3">投注数</th>
              </tr>
            </thead>
            <tbody id="rank-loss-tbody">
              <tr><td colspan="5" class="py-8 text-center text-gray-400">点击「查询」加载数据</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- 2. 结算报表 -->
    <div id="report-settle" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <!-- 查询栏 -->
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-4 py-4 border-b border-gray-700">
        <!-- 第一行：快捷日期 -->
        <div class="mb-3">
          <label class="text-gray-300 text-xs block mb-1.5 font-medium">快捷日期</label>
          <div class="flex gap-2">
            <button onclick="setSettleDateRange('today')" class="px-4 py-2 bg-gray-600 hover:bg-primary rounded text-xs font-medium transition-all shadow-sm">今日</button>
            <button onclick="setSettleDateRange('yesterday')" class="px-4 py-2 bg-gray-600 hover:bg-primary rounded text-xs font-medium transition-all shadow-sm">昨日</button>
            <button onclick="setSettleDateRange('week')" class="px-4 py-2 bg-gray-600 hover:bg-primary rounded text-xs font-medium transition-all shadow-sm">本周</button>
            <button onclick="setSettleDateRange('month')" class="px-4 py-2 bg-gray-600 hover:bg-primary rounded text-xs font-medium transition-all shadow-sm">本月</button>
            <button onclick="setSettleDateRange('lastmonth')" class="px-4 py-2 bg-gray-600 hover:bg-primary rounded text-xs font-medium transition-all shadow-sm">上月</button>
          </div>
        </div>
        
        <!-- 第二行：日期范围和筛选条件 -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          <!-- 开始时间 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">开始时间</label>
            <input type="datetime-local" id="settle-start-date" value="${dayjs().startOf('month').format('YYYY-MM-DDTHH:mm')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          
          <!-- 结束时间 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">结束时间</label>
            <input type="datetime-local" id="settle-end-date" value="${dayjs().format('YYYY-MM-DDTHH:mm')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
          </div>
          
          <!-- 游戏类型 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">游戏类型</label>
            <select id="settle-game-type" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部游戏</option>
              <option value="live_video">真人视讯</option>
              <option value="baccarat">百家乐</option>
              <option value="roulette">轮盘</option>
              <option value="dragon_tiger">龙虎</option>
              <option value="dice">骰宝</option>
              <option value="blackjack">二十一点</option>
            </select>
          </div>
          
          <!-- 业务模式 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">业务模式</label>
            <select id="settle-business-mode" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="">全部</option>
              <option value="transfer">转账模式</option>
              <option value="single">单一钱包</option>
            </select>
          </div>
          
          <!-- 货币类型 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">货币类型</label>
            <select id="settle-currency" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="USD" selected>美元 USD</option>
            </select>
          </div>
          
          <!-- 用户类型 -->
          <div>
            <label class="text-gray-300 text-xs block mb-1.5 font-medium">用户类型</label>
            <select id="settle-user-type" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all">
              <option value="real" selected>正式用户</option>
              <option value="test">测试用户</option>
              <option value="all">全部用户</option>
            </select>
          </div>
        </div>
        
        <!-- 第三行：操作按钮 -->
        <div class="flex gap-2 justify-end">
          <button onclick="loadSettleReport()" class="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-6 py-2 rounded-lg text-sm font-medium shadow-lg shadow-red-900/30 transition-all">
            <i class="fas fa-search mr-1.5"></i>查询
          </button>
          <button onclick="exportReport('settle')" class="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 px-5 py-2 rounded-lg text-sm font-medium shadow-lg shadow-green-900/30 transition-all">
            <i class="fas fa-file-excel mr-1.5"></i>导出
          </button>
          <button onclick="resetSettleFilters()" class="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 px-5 py-2 rounded-lg text-sm font-medium shadow-lg transition-all">
            <i class="fas fa-redo mr-1.5"></i>重置
          </button>
        </div>
      </div>
      
      <!-- 统计卡片 -->
      <div id="settle-summary" class="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 border-b border-gray-700 bg-gray-750">
        <div class="text-center">
          <p class="text-gray-400 text-xs">总投注</p>
          <p class="text-lg font-bold text-cyan-400" id="settle-stat-total-bet">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">总派彩</p>
          <p class="text-lg font-bold text-purple-400" id="settle-stat-total-payout">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">公司盈亏</p>
          <p class="text-lg font-bold" id="settle-stat-company-profit">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">有效投注</p>
          <p class="text-lg font-bold text-yellow-400" id="settle-stat-valid-bet">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">总佣金</p>
          <p class="text-lg font-bold text-orange-400" id="settle-stat-commission">-</p>
        </div>
        <div class="text-center">
          <p class="text-gray-400 text-xs">结算记录</p>
          <p class="text-lg font-bold text-white" id="settle-stat-record-count">-</p>
        </div>
      </div>
      
      <!-- 结算报表表格 -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-700 text-gray-300">
              <th class="text-center p-3 font-medium w-16">序号</th>
              <th class="text-right p-3 font-medium">投注金额</th>
              <th class="text-right p-3 font-medium">会员输赢</th>
              <th class="text-right p-3 font-medium">有效投注</th>
              <th class="text-right p-3 font-medium border-l border-gray-600">佣金比</th>
              <th class="text-right p-3 font-medium">佣金</th>
              <th class="text-right p-3 font-medium border-l border-gray-600">占成比</th>
              <th class="text-right p-3 font-medium">占成收</th>
              <th class="text-right p-3 font-medium border-l border-gray-600">上级交收</th>
              <th class="text-right p-3 font-medium">实际盈亏</th>
              <th class="text-right p-3 font-medium border-l border-gray-600">结算:下级</th>
              <th class="text-right p-3 font-medium">本身盈利</th>
            </tr>
          </thead>
          <tbody id="settle-tbody" class="divide-y divide-gray-700">
            <tr><td colspan="12" class="p-8 text-center text-gray-500">暂无数据</td></tr>
          </tbody>
          <tfoot class="bg-gray-700 font-semibold border-t-2 border-gray-500">
            <tr id="settle-footer">
              <td class="p-3 text-center">合计</td>
              <td class="p-3 text-right text-yellow-400" id="settle-total-bet">-</td>
              <td class="p-3 text-right" id="settle-total-win">-</td>
              <td class="p-3 text-right" id="settle-total-valid">-</td>
              <td class="p-3 text-right border-l border-gray-600">-</td>
              <td class="p-3 text-right" id="settle-total-commission">-</td>
              <td class="p-3 text-right border-l border-gray-600">-</td>
              <td class="p-3 text-right" id="settle-total-share">-</td>
              <td class="p-3 text-right border-l border-gray-600" id="settle-total-upper">-</td>
              <td class="p-3 text-right" id="settle-total-profit">-</td>
              <td class="p-3 text-right border-l border-gray-600" id="settle-total-lower">-</td>
              <td class="p-3 text-right text-green-400" id="settle-total-self">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <!-- 分页 -->
      <div class="p-4 border-t border-gray-700 flex justify-between items-center">
        <div class="text-sm text-gray-400">
          共 <span id="settle-total-records">0</span> 条记录
        </div>
        <div class="flex items-center space-x-2">
          <select id="settle-page-size" onchange="loadSettleReport()" class="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
            <option value="50">50条/页</option>
            <option value="100">100条/页</option>
          </select>
          <span class="text-gray-400">跳至</span>
          <input type="number" id="settle-page" value="1" min="1" class="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm w-16 text-center">
          <span class="text-gray-400">页</span>
          <button onclick="loadSettleReport()" class="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm">跳转</button>
        </div>
      </div>
    </div>
    
    <!-- 8. 转账记录 -->
    <div id="report-transfers" class="hidden">
      <!-- 子标签页 -->
      <div class="flex space-x-4 mb-4">
        <button id="tab-transfer-list" onclick="switchTransferTab('list')" class="px-4 py-2 bg-primary rounded-lg text-sm">
          <i class="fas fa-list mr-1"></i>转账记录
        </button>
        <button id="tab-transfer-fee-sub" onclick="switchTransferTab('fee')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm">
          <i class="fas fa-percentage mr-1"></i>手续费设置
        </button>
      </div>
      
      <!-- 转账记录列表 -->
      <div id="transfer-list-panel" class="bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700">
          <div class="flex flex-wrap gap-4 items-center">
            <div>
              <label class="text-gray-400 text-xs block mb-1">日期范围</label>
              <div class="flex items-center space-x-2">
                <input type="date" id="transfer-start-date" value="${dayjs().subtract(30, 'day').format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
                <span class="text-gray-400">至</span>
                <input type="date" id="transfer-end-date" value="${dayjs().format('YYYY-MM-DD')}" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm">
              </div>
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1">转出会员</label>
              <input type="text" id="transfer-from" placeholder="用户名/昵称" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm w-32">
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1">转入会员</label>
              <input type="text" id="transfer-to" placeholder="用户名/昵称" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm w-32">
            </div>
            <div>
              <label class="text-gray-400 text-xs block mb-1">金额范围</label>
              <div class="flex items-center space-x-2">
                <input type="number" id="transfer-min" placeholder="最小" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm w-24">
                <span class="text-gray-400">-</span>
                <input type="number" id="transfer-max" placeholder="最大" class="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm w-24">
              </div>
            </div>
            <div class="flex items-end">
              <button onclick="loadTransferRecords()" class="bg-primary hover:bg-blue-700 px-4 py-1.5 rounded text-sm">
                <i class="fas fa-search mr-1"></i>查询
              </button>
            </div>
          </div>
        </div>
        
        <!-- 统计卡片 -->
        <div id="transfer-stats" class="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border-b border-gray-700">
          <div class="bg-gray-700 rounded-lg p-3 text-center">
            <p class="text-gray-400 text-xs">转账笔数</p>
            <p class="text-xl font-bold text-primary" id="stat-count">-</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3 text-center">
            <p class="text-gray-400 text-xs">转账总额</p>
            <p class="text-xl font-bold text-green-400" id="stat-amount">-</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3 text-center">
            <p class="text-gray-400 text-xs">手续费</p>
            <p class="text-xl font-bold text-yellow-400" id="stat-fee">-</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3 text-center">
            <p class="text-gray-400 text-xs">转出人数</p>
            <p class="text-xl font-bold text-blue-400" id="stat-senders">-</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3 text-center">
            <p class="text-gray-400 text-xs">转入人数</p>
            <p class="text-xl font-bold text-purple-400" id="stat-receivers">-</p>
          </div>
        </div>
        
        <!-- 转账记录表格 -->
        <div id="transfer-table-container">
          <table class="w-full data-table">
            <thead class="bg-gray-700">
              <tr>
                <th class="text-left p-4">时间</th>
                <th class="text-left p-4">订单号</th>
                <th class="text-left p-4">转出会员</th>
                <th class="text-center p-4"></th>
                <th class="text-left p-4">转入会员</th>
                <th class="text-right p-4">金额</th>
                <th class="text-right p-4">手续费</th>
                <th class="text-left p-4">备注</th>
              </tr>
            </thead>
            <tbody id="transfer-tbody">
              <tr><td colspan="8" class="p-8 text-center text-gray-400">点击「查询」加载转账记录</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 手续费设置面板 -->
      <div id="transfer-fee-panel" class="hidden bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h4 class="font-semibold"><i class="fas fa-percentage text-primary mr-2"></i>转账手续费设置</h4>
            <p class="text-sm text-gray-400 mt-1">配置会员间转账的手续费规则</p>
          </div>
          <button onclick="showAddTransferFeeModal()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
            <i class="fas fa-plus mr-1"></i>新增设置
          </button>
        </div>
        <div id="transfer-fee-list" class="p-4">
          <p class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</p>
        </div>
      </div>
    </div>
  `;
  
  // 初始化游戏图表
  setTimeout(() => {
    const ctx = document.getElementById('gameChart');
    if (ctx && gameData.length > 0) {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: gameData.map(g => getGameTypeName(g.game_type)),
          datasets: [{
            data: gameData.map(g => g.total_bet),
            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#9ca3af' } }
          }
        }
      });
    }
  }, 100);
}

// 加载全流水记录
async function loadTransactions(page = 1) {
  const startDate = document.getElementById('trans-start')?.value;
  const endDate = document.getElementById('trans-end')?.value;
  const type = document.getElementById('trans-type')?.value;
  const orderNo = document.getElementById('trans-order')?.value?.trim();
  const playerSearch = document.getElementById('trans-player')?.value?.trim();
  const tbody = document.getElementById('trans-tbody');
  
  tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  
  let url = `/api/reports/all-transactions?start_date=${startDate}&end_date=${endDate}&page=${page}`;
  if (type) url += `&type=${type}`;
  if (orderNo) url += `&order_no=${encodeURIComponent(orderNo)}`;
  if (playerSearch) url += `&player_search=${encodeURIComponent(playerSearch)}`;
  
  const result = await api(url);
  
  if (result.success && result.data.length > 0) {
    tbody.innerHTML = result.data.map(t => `
      <tr class="border-t border-gray-700 hover:bg-gray-750">
        <td class="p-3 font-mono text-xs">${escapeHtml(t.order_no)}</td>
        <td class="p-3"><span class="px-2 py-1 rounded text-xs ${
          t.transaction_type === 1 ? 'bg-green-600' :
          t.transaction_type === 2 ? 'bg-red-600' :
          t.transaction_type === 3 ? 'bg-orange-600' :
          t.transaction_type === 4 ? 'bg-blue-600' :
          t.transaction_type === 5 ? 'bg-purple-600' :
          t.transaction_type === 6 ? 'bg-cyan-600' :
          t.transaction_type === 9 ? 'bg-indigo-600' :
          t.transaction_type === 10 ? 'bg-teal-600' : 'bg-gray-600'
        }">${escapeHtml(t.type_name)}</span></td>
        <td class="p-3">${escapeHtml(t.player_name)} <span class="text-xs text-gray-400">(ID:${t.player_id})</span></td>
        <td class="p-3 text-right font-mono">${formatCurrency(t.balance_before)}</td>
        <td class="p-3 text-right font-mono font-bold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}">${t.amount >= 0 ? '+' : ''}${formatCurrency(t.amount)}</td>
        <td class="p-3 text-right font-mono">${formatCurrency(t.balance_after)}</td>
        <td class="p-3 font-mono text-xs">${escapeHtml(t.related_order_id || '-')}</td>
        <td class="p-3 text-sm text-gray-400">${formatDateTime(t.created_at)}</td>
      </tr>
    `).join('');
    
    // 显示分页信息
    const pagination = document.getElementById('trans-pagination');
    const total = result.total || 0;
    const limit = result.limit || 50;
    const totalPages = Math.ceil(total / limit);
    pagination.innerHTML = `
      <div class="text-sm text-gray-400">
        共 <span class="text-white font-medium">${total}</span> 条记录，第 ${page}/${totalPages} 页
      </div>
      <div class="flex gap-2">
        ${page > 1 ? `<button onclick="loadTransactions(${page - 1})" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">上一页</button>` : ''}
        ${page < totalPages ? `<button onclick="loadTransactions(${page + 1})" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">下一页</button>` : ''}
      </div>
    `;
  } else {
    tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
    document.getElementById('trans-pagination').innerHTML = '';
  }
}

// 加载综合报表
async function loadComprehensive() {
  const startDate = document.getElementById('comp-start')?.value;
  const endDate = document.getElementById('comp-end')?.value;
  const groupBy = document.getElementById('comp-group')?.value;
  const agentId = document.getElementById('comp-agent')?.value;
  const gameType = document.getElementById('comp-game')?.value;
  const tbody = document.getElementById('comp-tbody');
  
  tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>生成中...</td></tr>';
  
  let url = `/api/reports/comprehensive?start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}`;
  if (agentId) url += `&agent_id=${agentId}`;
  if (gameType) url += `&game_type=${gameType}`;
  
  const result = await api(url);
  
  if (result.success && result.data.length > 0) {
    tbody.innerHTML = result.data.map(d => `
      <tr class="border-t border-gray-700 hover:bg-gray-750">
        <td class="p-3 font-medium">${escapeHtml(d.dimension)}</td>
        <td class="p-3 text-right">${formatCurrency(d.total_bet)}</td>
        <td class="p-3 text-right ${d.total_win_loss >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(d.total_win_loss)}</td>
        <td class="p-3 text-right ${d.company_profit >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(d.company_profit)}</td>
        <td class="p-3 text-right text-yellow-400">${formatCurrency(d.agent_commission)}</td>
        <td class="p-3 text-right font-bold ${d.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(d.net_profit)}</td>
        <td class="p-3 text-right">${d.player_count || 0}</td>
        <td class="p-3 text-right">${d.bet_count || 0}</td>
      </tr>
    `).join('');
  } else {
    tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
  }
}

// 加载玩家排名
async function loadRanking() {
  const startDate = document.getElementById('rank-start')?.value;
  const endDate = document.getElementById('rank-end')?.value;
  const agentId = document.getElementById('rank-agent')?.value;
  const vipLevel = document.getElementById('rank-vip')?.value;
  const limit = document.getElementById('rank-limit')?.value || 10;
  
  let winnersUrl = `/api/reports/player-ranking?start_date=${startDate}&end_date=${endDate}&rank_type=winner&limit=${limit}`;
  let losersUrl = `/api/reports/player-ranking?start_date=${startDate}&end_date=${endDate}&rank_type=loser&limit=${limit}`;
  if (agentId) {
    winnersUrl += `&agent_id=${agentId}`;
    losersUrl += `&agent_id=${agentId}`;
  }
  if (vipLevel) {
    winnersUrl += `&vip_level=${vipLevel}`;
    losersUrl += `&vip_level=${vipLevel}`;
  }
  
  const [winners, losers] = await Promise.all([
    api(winnersUrl),
    api(losersUrl)
  ]);
  
  const winnersDiv = document.getElementById('rank-winners');
  const losersDiv = document.getElementById('rank-losers');
  
  if (winners.success && winners.data.length > 0) {
    winnersDiv.innerHTML = winners.data.map((p, idx) => `
      <div class="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-gray-600'} flex items-center justify-center font-bold">${idx + 1}</div>
          <div>
            <p class="font-medium">${playerLink(p.player_id, p.username, p.vip_level || 0)}</p>
            <p class="text-xs text-gray-400">代理: ${p.agent_id ? agentLink(p.agent_id, p.agent_username) : '直属'}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold text-green-400">${formatCurrency(p.win_loss)}</p>
          <p class="text-xs text-gray-400">投注: ${formatCurrency(p.total_bet)} | ${p.bet_count} 注单</p>
        </div>
      </div>
    `).join('');
  } else {
    winnersDiv.innerHTML = '<p class="text-center text-gray-400 py-4">暂无数据</p>';
  }
  
  if (losers.success && losers.data.length > 0) {
    losersDiv.innerHTML = losers.data.map((p, idx) => `
      <div class="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center font-bold">${idx + 1}</div>
          <div>
            <p class="font-medium">${playerLink(p.player_id, p.username, p.vip_level || 0)}</p>
            <p class="text-xs text-gray-400">代理: ${p.agent_id ? agentLink(p.agent_id, p.agent_username) : '直属'}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-lg font-bold text-red-400">${formatCurrency(p.win_loss)}</p>
          <p class="text-xs text-gray-400">投注: ${formatCurrency(p.total_bet)} | ${p.bet_count} 注单</p>
        </div>
      </div>
    `).join('');
  } else {
    losersDiv.innerHTML = '<p class="text-center text-gray-400 py-4">暂无数据</p>';
  }
}

// 加载每日汇总
async function loadDailySummary() {
  const startDate = document.getElementById('summary-start')?.value;
  const endDate = document.getElementById('summary-end')?.value;
  const tbody = document.getElementById('summary-tbody');
  
  tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  
  const result = await api(`/api/reports/daily-summary?start_date=${startDate}&end_date=${endDate}`);
  
  if (result.success) {
    // 显示汇总卡片
    const summary = result.summary || {};
    document.getElementById('summary-cards').innerHTML = `
      <div class="text-center p-4 bg-gray-700 rounded-lg">
        <p class="text-xs text-gray-400 mb-1">总投注</p>
        <p class="text-xl font-bold text-cyan-400">${formatCurrency(summary.total_bet)}</p>
      </div>
      <div class="text-center p-4 bg-gray-700 rounded-lg">
        <p class="text-xs text-gray-400 mb-1">总派彩</p>
        <p class="text-xl font-bold text-purple-400">${formatCurrency(summary.total_payout)}</p>
      </div>
      <div class="text-center p-4 bg-gray-700 rounded-lg">
        <p class="text-xs text-gray-400 mb-1">公司盈亏</p>
        <p class="text-xl font-bold ${summary.total_company_profit >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(summary.total_company_profit)}</p>
      </div>
      <div class="text-center p-4 bg-gray-700 rounded-lg">
        <p class="text-xs text-gray-400 mb-1">活跃玩家</p>
        <p class="text-xl font-bold text-white">${summary.total_players || 0}</p>
      </div>
    `;
    
    if (result.data.length > 0) {
      tbody.innerHTML = result.data.map(d => `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="p-3">${d.date}</td>
          <td class="p-3 text-right">${d.active_players || 0}</td>
          <td class="p-3 text-right">${d.bet_count || 0}</td>
          <td class="p-3 text-right">${formatCurrency(d.total_bet)}</td>
          <td class="p-3 text-right">${formatCurrency(d.total_payout)}</td>
          <td class="p-3 text-right ${d.player_win_loss >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(d.player_win_loss)}</td>
          <td class="p-3 text-right font-bold ${d.company_profit >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(d.company_profit)}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
    }
  }
}

// 加载游戏营收
async function loadGameRevenue() {
  const startDate = document.getElementById('game-start')?.value;
  const endDate = document.getElementById('game-end')?.value;
  const gameTypeFilter = document.getElementById('game-type-filter')?.value || '';
  const minRevenue = parseFloat(document.getElementById('game-min-revenue')?.value) || 0;
  const sortBy = document.getElementById('game-sort')?.value || 'revenue_desc';
  const tbody = document.getElementById('game-tbody');
  
  tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  
  try {
    const result = await api(`/api/reports/game-revenue?start_date=${startDate}&end_date=${endDate}`);
    
    if (result.success && result.data && result.data.length > 0) {
      let data = result.data;
      
      // 前端筛选：游戏类型
      if (gameTypeFilter) {
        data = data.filter(g => g.game_type === gameTypeFilter);
      }
      
      // 前端筛选：最小营收
      if (minRevenue > 0) {
        data = data.filter(g => (g.game_revenue || 0) >= minRevenue);
      }
      
      // 前端排序
      switch(sortBy) {
        case 'revenue_desc':
          data.sort((a, b) => (b.game_revenue || 0) - (a.game_revenue || 0));
          break;
        case 'revenue_asc':
          data.sort((a, b) => (a.game_revenue || 0) - (b.game_revenue || 0));
          break;
        case 'bet_desc':
          data.sort((a, b) => (b.total_bet || 0) - (a.total_bet || 0));
          break;
        case 'bet_asc':
          data.sort((a, b) => (a.total_bet || 0) - (b.total_bet || 0));
          break;
        case 'players_desc':
          data.sort((a, b) => (b.player_count || 0) - (a.player_count || 0));
          break;
        case 'players_asc':
          data.sort((a, b) => (a.player_count || 0) - (b.player_count || 0));
          break;
      }
      
      // 计算统计数据
      const stats = data.reduce((acc, g) => {
        acc.totalBets += g.bet_count || 0;
        acc.totalAmount += g.total_bet || 0;
        acc.totalPayout += g.total_payout || 0;
        acc.totalRevenue += g.game_revenue || 0;
        return acc;
      }, { totalBets: 0, totalAmount: 0, totalPayout: 0, totalRevenue: 0 });
      
      // 更新统计卡片
      document.getElementById('game-total-types').textContent = data.length;
      document.getElementById('game-total-bets').textContent = formatNumber(stats.totalBets);
      document.getElementById('game-total-amount').textContent = formatCurrency(stats.totalAmount);
      document.getElementById('game-total-payout').textContent = formatCurrency(stats.totalPayout);
      const revenueEl = document.getElementById('game-total-revenue');
      revenueEl.textContent = formatCurrency(stats.totalRevenue);
      revenueEl.className = stats.totalRevenue >= 0 ? 'text-lg font-bold text-green-400' : 'text-lg font-bold text-red-400';
      
      // 渲染表格
      if (data.length > 0) {
        tbody.innerHTML = data.map(g => `
          <tr class="border-t border-gray-700 hover:bg-gray-750">
            <td class="p-3 font-medium">${escapeHtml(g.game_name)}</td>
            <td class="p-3 text-right">${g.bet_count || 0}</td>
            <td class="p-3 text-right">${g.player_count || 0}</td>
            <td class="p-3 text-right">${formatCurrency(g.total_bet)}</td>
            <td class="p-3 text-right">${formatCurrency(g.total_payout)}</td>
            <td class="p-3 text-right font-bold ${g.game_revenue >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(g.game_revenue)}</td>
            <td class="p-3 text-right ${g.win_rate >= 0 ? 'text-green-400' : 'text-red-400'}">${g.win_rate}%</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">暂无符合条件的数据</td></tr>';
      }
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
      // 清空统计卡片
      document.getElementById('game-total-types').textContent = '0';
      document.getElementById('game-total-bets').textContent = '0';
      document.getElementById('game-total-amount').textContent = '$ 0.00';
      document.getElementById('game-total-payout').textContent = '$ 0.00';
      document.getElementById('game-total-revenue').textContent = '$ 0.00';
    }
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-red-400">加载失败，请稍后重试</td></tr>';
    console.error('加载游戏报表失败:', error);
  }
}

// 重置游戏报表查询条件
function resetGameFilters() {
  document.getElementById('game-start').value = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  document.getElementById('game-end').value = dayjs().format('YYYY-MM-DD');
  document.getElementById('game-type-filter').value = '';
  document.getElementById('game-min-revenue').value = '';
  document.getElementById('game-sort').value = 'revenue_desc';
  loadGameRevenue();
}

// 导出游戏报表
function exportGameReport() {
  const startDate = document.getElementById('game-start')?.value;
  const endDate = document.getElementById('game-end')?.value;
  const gameType = document.getElementById('game-type-filter')?.value || '';
  const minRevenue = document.getElementById('game-min-revenue')?.value || '';
  const sortBy = document.getElementById('game-sort')?.value || 'revenue_desc';
  
  let url = `/api/reports/game-revenue/export?start_date=${startDate}&end_date=${endDate}`;
  if (gameType) url += `&game_type=${gameType}`;
  if (minRevenue) url += `&min_revenue=${minRevenue}`;
  url += `&sort=${sortBy}`;
  
  window.open(url, '_blank');
}

// 加载注单明细
async function loadBetDetails(page = 1) {
  const startDate = document.getElementById('trans-start')?.value;
  const endDate = document.getElementById('trans-end')?.value;
  const betNo = document.getElementById('bet-detail-no')?.value?.trim();
  const playerSearch = document.getElementById('bet-detail-player')?.value?.trim();
  const gameType = document.getElementById('bet-detail-game')?.value;
  const status = document.getElementById('bet-detail-status')?.value;
  const tbody = document.getElementById('bet-detail-tbody');
  
  tbody.innerHTML = '<tr><td colspan="11" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  
  let url = `/api/reports/bet-details?start_date=${startDate}&end_date=${endDate}&page=${page}&limit=50`;
  if (betNo) url += `&bet_no=${encodeURIComponent(betNo)}`;
  if (playerSearch) url += `&player_search=${encodeURIComponent(playerSearch)}`;
  if (gameType) url += `&game_type=${gameType}`;
  if (status) url += `&bet_status=${status}`;
  
  const result = await api(url);
  
  if (result.success && result.data && result.data.length > 0) {
    tbody.innerHTML = result.data.map(b => {
      const winLoss = (b.payout || 0) - (b.bet_amount || 0);
      const statusClass = b.bet_status === 1 ? 'bg-green-600' : b.bet_status === 0 ? 'bg-yellow-600' : 'bg-gray-600';
      const statusText = b.bet_status === 1 ? '已结算' : b.bet_status === 0 ? '未结算' : '已作废';
      
      return `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="p-3 font-mono text-xs text-primary">${escapeHtml(b.bet_no || '-')}</td>
          <td class="p-3">
            <p class="font-medium text-sm">${b.player_id ? playerLink(b.player_id, b.username, b.vip_level || 0) : escapeHtml(b.username || '-')}</p>
          </td>
          <td class="p-3">${getGameTypeName(b.game_type)}</td>
          <td class="p-3 font-mono text-xs text-cyan-400">${escapeHtml(b.game_round || '-')}</td>
          <td class="p-3 text-xs">${escapeHtml(b.bet_type || '-')}</td>
          <td class="p-3">
            <span class="px-2 py-1 bg-blue-900 bg-opacity-30 rounded text-xs">${escapeHtml(b.bet_selection || '-')}</span>
          </td>
          <td class="p-3 text-right font-mono">${formatCurrency(b.bet_amount)}</td>
          <td class="p-3 text-right font-mono">${formatCurrency(b.payout)}</td>
          <td class="p-3 text-right font-mono ${winLoss >= 0 ? 'text-green-400' : 'text-red-400'}">${winLoss >= 0 ? '+' : ''}${formatCurrency(winLoss)}</td>
          <td class="p-3 text-center"><span class="px-2 py-1 rounded text-xs ${statusClass}">${statusText}</span></td>
          <td class="p-3 text-sm text-gray-400">${formatDateTime(b.created_at)}</td>
        </tr>
      `;
    }).join('');
    
    // 显示分页信息
    const pagination = document.getElementById('bet-detail-pagination');
    const total = result.pagination?.total || 0;
    const limit = result.pagination?.limit || 50;
    const totalPages = Math.ceil(total / limit);
    pagination.innerHTML = `
      <div class="text-sm text-gray-400">
        共 <span class="text-white font-medium">${total}</span> 条记录，第 ${page}/${totalPages} 页
      </div>
      <div class="flex gap-2">
        ${page > 1 ? `<button onclick="loadBetDetails(${page - 1})" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">上一页</button>` : ''}
        ${page < totalPages ? `<button onclick="loadBetDetails(${page + 1})" class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">下一页</button>` : ''}
      </div>
    `;
  } else {
    tbody.innerHTML = '<tr><td colspan="11" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
    document.getElementById('bet-detail-pagination').innerHTML = '';
  }
}

// 导出注单明细
async function exportBetDetails() {
  const startDate = document.getElementById('trans-start')?.value;
  const endDate = document.getElementById('trans-end')?.value;
  const betNo = document.getElementById('bet-detail-no')?.value?.trim();
  const playerSearch = document.getElementById('bet-detail-player')?.value?.trim();
  const gameType = document.getElementById('bet-detail-game')?.value;
  const status = document.getElementById('bet-detail-status')?.value;
  
  let url = `/api/reports/export?type=bet-details&start_date=${startDate}&end_date=${endDate}`;
  if (betNo) url += `&bet_no=${encodeURIComponent(betNo)}`;
  if (playerSearch) url += `&player_search=${encodeURIComponent(playerSearch)}`;
  if (gameType) url += `&game_type=${gameType}`;
  if (status) url += `&bet_status=${status}`;
  
  window.open(url, '_blank');
}

// 加载代理业绩
async function loadAgentPerformance() {
  const startDate = document.getElementById('agent-start')?.value;
  const endDate = document.getElementById('agent-end')?.value;
  const agentSearch = document.getElementById('agent-search')?.value || '';
  const agentLevel = document.getElementById('agent-level-filter')?.value || '';
  const minBet = document.getElementById('agent-min-bet')?.value || '';
  const sortBy = document.getElementById('agent-sort')?.value || 'total_bet_desc';
  const tbody = document.getElementById('agent-tbody');
  
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  
  try {
    // 构建查询参数
    let url = `/api/reports/agent-performance?start_date=${startDate}&end_date=${endDate}`;
    if (agentSearch) url += `&search=${encodeURIComponent(agentSearch)}`;
    if (agentLevel) url += `&level=${agentLevel}`;
    if (minBet) url += `&min_bet=${minBet}`;
    if (sortBy) url += `&sort=${sortBy}`;
    
    const result = await api(url);
    
    if (!result.success) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-400">加载失败: ${result.error || '未知错误'}</td></tr>`;
      return;
    }
    
    let data = result.data || [];
    
    // 客户端额外过滤（如果需要）
    if (minBet && parseFloat(minBet) > 0) {
      data = data.filter(a => (a.total_bet || 0) >= parseFloat(minBet));
    }
    
    // 客户端排序
    const [sortField, sortOrder] = sortBy.split('_');
    data.sort((a, b) => {
      let aVal = 0, bVal = 0;
      switch(sortField) {
        case 'total': aVal = a.total_bet || 0; bVal = b.total_bet || 0; break;
        case 'profit': aVal = a.company_profit || 0; bVal = b.company_profit || 0; break;
        case 'commission': aVal = a.agent_commission || 0; bVal = b.agent_commission || 0; break;
        case 'players': aVal = a.player_count || 0; bVal = b.player_count || 0; break;
        default: aVal = a.total_bet || 0; bVal = b.total_bet || 0;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    // 计算统计数据
    const stats = data.reduce((acc, a) => {
      acc.count++;
      acc.players += a.player_count || 0;
      acc.totalBet += a.total_bet || 0;
      acc.profit += a.company_profit || 0;
      acc.commission += a.agent_commission || 0;
      acc.netProfit += a.net_profit || 0;
      return acc;
    }, { count: 0, players: 0, totalBet: 0, profit: 0, commission: 0, netProfit: 0 });
    
    // 更新统计卡片
    const totalCount = document.getElementById('agent-total-count');
    const totalPlayers = document.getElementById('agent-total-players');
    const totalBet = document.getElementById('agent-total-bet');
    const totalProfit = document.getElementById('agent-total-profit');
    const totalCommission = document.getElementById('agent-total-commission');
    const netProfit = document.getElementById('agent-net-profit');
    
    if (totalCount) totalCount.textContent = formatNumber(stats.count);
    if (totalPlayers) totalPlayers.textContent = formatNumber(stats.players);
    if (totalBet) totalBet.textContent = formatCurrency(stats.totalBet);
    if (totalProfit) {
      totalProfit.textContent = (stats.profit >= 0 ? '+' : '') + formatCurrency(Math.abs(stats.profit));
      totalProfit.className = `text-lg font-bold ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`;
    }
    if (totalCommission) totalCommission.textContent = formatCurrency(stats.commission);
    if (netProfit) {
      netProfit.textContent = (stats.netProfit >= 0 ? '+' : '') + formatCurrency(Math.abs(stats.netProfit));
      netProfit.className = `text-lg font-bold ${stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`;
    }
    
    // 渲染表格
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(a => {
      const levelText = a.level === 'shareholder' ? '股东' : 
                        a.level === 'general_agent' ? '总代' : 
                        a.tier ? `${a.tier}级代理` : '代理';
      const levelClass = a.level === 'shareholder' ? 'bg-yellow-600' : 
                         a.level === 'general_agent' ? 'bg-blue-600' : 
                         'bg-gray-600';
      
      return `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="p-3">
            <p class="font-medium text-white">${agentLink(a.agent_id, a.agent_username)}</p>
            <p class="text-xs text-gray-400">ID: ${a.agent_id || '-'} ${a.nickname ? '| ' + escapeHtml(a.nickname) : ''}</p>
          </td>
          <td class="p-3">
            <span class="px-2 py-1 rounded text-xs ${levelClass}">${levelText}</span>
          </td>
          <td class="p-3 text-right font-mono">${formatNumber(a.downline_count || 0)}</td>
          <td class="p-3 text-right font-mono">${formatNumber(a.player_count || 0)}</td>
          <td class="p-3 text-right font-mono text-cyan-400">${formatCurrency(a.total_bet)}</td>
          <td class="p-3 text-right font-mono ${a.company_profit >= 0 ? 'text-green-400' : 'text-red-400'}">
            ${(a.company_profit >= 0 ? '+' : '')}${formatCurrency(Math.abs(a.company_profit))}
          </td>
          <td class="p-3 text-right font-mono text-yellow-400">${formatCurrency(a.agent_commission)}</td>
          <td class="p-3 text-right font-mono font-bold ${a.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}">
            ${(a.net_profit >= 0 ? '+' : '')}${formatCurrency(Math.abs(a.net_profit))}
          </td>
        </tr>
      `;
    }).join('');
    
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-400">加载失败: ${error.message}</td></tr>`;
    showToast('加载代理业绩失败', 'error');
  }
}

// 导出报表函数
async function exportTransactions() {
  const startDate = document.getElementById('trans-start')?.value;
  const endDate = document.getElementById('trans-end')?.value;
  const type = document.getElementById('trans-type')?.value;
  const orderNo = document.getElementById('trans-order')?.value?.trim();
  const playerSearch = document.getElementById('trans-player')?.value?.trim();
  
  let url = `/api/reports/export?type=transactions&start_date=${startDate}&end_date=${endDate}`;
  if (type) url += `&transaction_type=${type}`;
  if (orderNo) url += `&order_no=${encodeURIComponent(orderNo)}`;
  if (playerSearch) url += `&player_search=${encodeURIComponent(playerSearch)}`;
  
  window.open(url, '_blank');
}

async function exportComprehensive() {
  const startDate = document.getElementById('comp-start')?.value;
  const endDate = document.getElementById('comp-end')?.value;
  const groupBy = document.getElementById('comp-group')?.value;
  const agentId = document.getElementById('comp-agent')?.value;
  const gameType = document.getElementById('comp-game')?.value;
  
  let url = `/api/reports/export?type=comprehensive&start_date=${startDate}&end_date=${endDate}&group_by=${groupBy}`;
  if (agentId) url += `&agent_id=${agentId}`;
  if (gameType) url += `&game_type=${gameType}`;
  
  window.open(url, '_blank');
}

// 导出代理业绩
function exportAgentPerformance() {
  const startDate = document.getElementById('agent-start')?.value;
  const endDate = document.getElementById('agent-end')?.value;
  const agentSearch = document.getElementById('agent-search')?.value || '';
  const agentLevel = document.getElementById('agent-level-filter')?.value || '';
  const minBet = document.getElementById('agent-min-bet')?.value || '';
  const sortBy = document.getElementById('agent-sort')?.value || '';
  
  let url = `/api/reports/export?type=agent-performance&start_date=${startDate}&end_date=${endDate}`;
  if (agentSearch) url += `&search=${encodeURIComponent(agentSearch)}`;
  if (agentLevel) url += `&level=${agentLevel}`;
  if (minBet) url += `&min_bet=${minBet}`;
  if (sortBy) url += `&sort=${sortBy}`;
  
  window.open(url, '_blank');
  showToast('正在导出代理业绩报表...', 'info');
}

// 重置代理筛选器
function resetAgentFilters() {
  document.getElementById('agent-start').value = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
  document.getElementById('agent-end').value = dayjs().format('YYYY-MM-DD');
  document.getElementById('agent-search').value = '';
  document.getElementById('agent-level-filter').value = '';
  document.getElementById('agent-min-bet').value = '';
  document.getElementById('agent-sort').value = 'total_bet_desc';
  
  showToast('筛选条件已重置', 'success');
  loadAgentPerformance();
}

function switchReportTab(tab) {
  document.querySelectorAll('[id^="report-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('bg-primary');
    el.classList.add('bg-gray-700');
  });
  const reportEl = document.getElementById(`report-${tab}`);
  const tabEl = document.getElementById(`tab-${tab}`);
  if (reportEl) reportEl.classList.remove('hidden');
  if (tabEl) {
    tabEl.classList.remove('bg-gray-700');
    tabEl.classList.add('bg-primary');
  }
  
  // 根据标签自动加载数据
  switch(tab) {
    case 'bet-details': loadBetDetails(); break;
    case 'settle': loadSettleReport(); break;
    case 'profit-share': loadComprehensive(); break;
    case 'ranking': loadRanking(); break;
    case 'game-report': loadGameRevenue(); break;
    case 'daily-report': loadDailySummary(); break;
    case 'agent-perf': loadAgentPerformance(); break;
    case 'transfers': 
      // 默认显示转账记录列表
      switchTransferTab('list');
      break;
  }
}

// 切换转账记录子标签页
function switchTransferTab(tab) {
  const listPanel = document.getElementById('transfer-list-panel');
  const feePanel = document.getElementById('transfer-fee-panel');
  const tabList = document.getElementById('tab-transfer-list');
  const tabFee = document.getElementById('tab-transfer-fee-sub');
  
  if (tab === 'list') {
    listPanel?.classList.remove('hidden');
    feePanel?.classList.add('hidden');
    tabList?.classList.remove('bg-gray-700');
    tabList?.classList.add('bg-primary');
    tabFee?.classList.remove('bg-primary');
    tabFee?.classList.add('bg-gray-700');
    loadTransferRecords();
  } else if (tab === 'fee') {
    listPanel?.classList.add('hidden');
    feePanel?.classList.remove('hidden');
    tabFee?.classList.remove('bg-gray-700');
    tabFee?.classList.add('bg-primary');
    tabList?.classList.remove('bg-primary');
    tabList?.classList.add('bg-gray-700');
    loadTransferFeeSettings();
  }
}

// 加载日结算报表
async function loadDailyReport() {
  const startDate = document.getElementById('daily-start-date')?.value || dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = document.getElementById('daily-end-date')?.value || dayjs().format('YYYY-MM-DD');
  const tbody = document.getElementById('daily-tbody');
  
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  }
  
  try {
    const result = await api(`/api/reports/daily?start_date=${startDate}&end_date=${endDate}`);
    if (result.success) {
      const data = result.data || [];
      
      // 计算汇总
      const summary = data.reduce((acc, d) => {
        acc.total_bet += d.total_bet || 0;
        acc.total_valid_bet += d.total_valid_bet || 0;
        acc.total_payout += d.total_payout || 0;
        acc.company_profit += d.company_profit || 0;
        acc.bet_count += d.bet_count || 0;
        return acc;
      }, { total_bet: 0, total_valid_bet: 0, total_payout: 0, company_profit: 0, bet_count: 0 });
      
      const avgKillRate = summary.total_bet > 0 ? (summary.company_profit / summary.total_bet * 100).toFixed(2) : 0;
      
      // 更新汇总显示
      document.getElementById('daily-total-bet').textContent = formatCurrency(summary.total_bet);
      document.getElementById('daily-valid-bet').textContent = formatCurrency(summary.total_valid_bet);
      document.getElementById('daily-payout').textContent = formatCurrency(summary.total_payout);
      
      const profitEl = document.getElementById('daily-profit');
      profitEl.textContent = (summary.company_profit >= 0 ? '+' : '') + formatCurrency(summary.company_profit);
      profitEl.className = `text-lg font-bold ${summary.company_profit >= 0 ? 'text-green-400' : 'text-red-400'}`;
      
      const killRateEl = document.getElementById('daily-kill-rate');
      killRateEl.textContent = avgKillRate + '%';
      killRateEl.className = `text-lg font-bold ${avgKillRate >= 0 ? 'text-green-400' : 'text-red-400'}`;
      
      document.getElementById('daily-bet-count').textContent = formatNumber(summary.bet_count);
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
        return;
      }
      
      tbody.innerHTML = data.map(d => {
        const killRate = d.total_bet > 0 ? (d.company_profit / d.total_bet * 100).toFixed(2) : 0;
        return `
          <tr class="border-t border-gray-700 hover:bg-gray-750">
            <td class="p-3">${d.date}</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.bet_count)}</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.player_count || 0)}</td>
            <td class="p-3 text-right font-mono">${formatCurrency(d.total_bet)}</td>
            <td class="p-3 text-right font-mono text-gray-400">${formatCurrency(d.total_valid_bet)}</td>
            <td class="p-3 text-right font-mono">${formatCurrency(d.total_payout)}</td>
            <td class="p-3 text-right font-mono ${d.company_profit >= 0 ? 'text-green-400' : 'text-red-400'}">${d.company_profit >= 0 ? '+' : ''}${formatCurrency(d.company_profit)}</td>
            <td class="p-3 text-right ${killRate >= 0 ? 'text-green-400' : 'text-red-400'}">${killRate}%</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-400">加载失败: ${result.error}</td></tr>`;
    }
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-red-400">加载失败，请稍后重试</td></tr>';
  }
}

// 加载盈亏分析
async function loadProfitAnalysis() {
  const startDate = document.getElementById('profit-start-date')?.value || dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = document.getElementById('profit-end-date')?.value || dayjs().format('YYYY-MM-DD');
  const agentId = document.getElementById('profit-agent')?.value || '';
  const tbody = document.getElementById('profit-agents-tbody');
  
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="11" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  }
  
  try {
    let url = `/api/reports/profit-analysis?start_date=${startDate}&end_date=${endDate}`;
    if (agentId) url += `&agent_id=${agentId}`;
    
    const result = await api(url);
    if (result.success) {
      const { summary, agents } = result.data;
      
      // 更新汇总卡片
      document.getElementById('profit-total-bet').textContent = formatCurrency(summary.total_bet_amount || 0);
      
      const grossEl = document.getElementById('profit-gross');
      grossEl.textContent = (summary.gross_profit >= 0 ? '+' : '') + formatCurrency(summary.gross_profit || 0);
      grossEl.className = `text-2xl font-bold ${summary.gross_profit >= 0 ? 'text-green-400' : 'text-red-400'}`;
      
      document.getElementById('profit-commission').textContent = formatCurrency(summary.total_commission || 0);
      document.getElementById('profit-agent-share').textContent = formatCurrency(summary.total_agent_share || 0);
      
      const netEl = document.getElementById('profit-company-net');
      netEl.textContent = (summary.company_net_profit >= 0 ? '+' : '') + formatCurrency(summary.company_net_profit || 0);
      netEl.className = `text-2xl font-bold ${summary.company_net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`;
      
      if (!agents || agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="p-8 text-center text-gray-400">暂无代理数据</td></tr>';
        return;
      }
      
      tbody.innerHTML = agents.map(a => {
        const shareRatio = (a.share_ratio || 0) * 100;
        return `
          <tr class="border-t border-gray-700 hover:bg-gray-750">
            <td class="p-3 font-mono text-sm text-primary">${escapeHtml(a.agent_username || '-')}</td>
            <td class="p-3">${escapeHtml(a.agent_name || '-')}</td>
            <td class="p-3 text-center"><span class="px-2 py-1 rounded text-xs ${a.level === 'shareholder' ? 'bg-yellow-600' : 'bg-blue-600'}">${a.level === 'shareholder' ? '股东' : '代理'}</span></td>
            <td class="p-3 text-right text-yellow-400">${shareRatio.toFixed(1)}%</td>
            <td class="p-3 text-right">${formatNumber(a.player_count || 0)}</td>
            <td class="p-3 text-right font-mono">${formatCurrency(a.total_bet || 0)}</td>
            <td class="p-3 text-right font-mono text-gray-400">${formatCurrency(a.total_valid_bet || 0)}</td>
            <td class="p-3 text-right font-mono ${(a.gross_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">${(a.gross_profit || 0) >= 0 ? '+' : ''}${formatCurrency(a.gross_profit || 0)}</td>
            <td class="p-3 text-right font-mono text-yellow-400">${formatCurrency(a.total_commission || 0)}</td>
            <td class="p-3 text-right font-mono text-orange-400">${formatCurrency(a.agent_share || 0)}</td>
            <td class="p-3 text-right font-mono ${(a.company_share || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency(a.company_share || 0)}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="11" class="p-8 text-center text-red-400">加载失败: ${result.error}</td></tr>`;
    }
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="11" class="p-8 text-center text-red-400">加载失败，请稍后重试</td></tr>';
  }
}

// 加载对账结算报表
// 加载盈亏排行榜
async function loadLeaderboard() {
  const days = document.getElementById('rank-days')?.value || '7';
  const limit = document.getElementById('rank-limit')?.value || '10';
  
  const profitTbody = document.getElementById('rank-profit-tbody');
  const lossTbody = document.getElementById('rank-loss-tbody');
  
  try {
    const [profitResult, lossResult] = await Promise.all([
      api(`/api/reports/leaderboard?type=profit&days=${days}&limit=${limit}`),
      api(`/api/reports/leaderboard?type=loss&days=${days}&limit=${limit}`)
    ]);
    
    if (profitResult.success) {
      const winners = (profitResult.data || []).filter(p => p.total_profit > 0);
      if (winners.length === 0) {
        profitTbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gray-400">暂无盈利会员</td></tr>';
      } else {
        profitTbody.innerHTML = winners.map((p, i) => `
          <tr class="border-t border-gray-700">
            <td class="py-3 ${i < 3 ? 'text-yellow-400 font-bold' : ''}">${i + 1}</td>
            <td class="py-3">
              <span class="font-medium">${escapeHtml(p.username)}</span>
              <span class="text-xs text-purple-400 ml-1">VIP${p.vip_level}</span>
            </td>
            <td class="py-3 text-right font-mono text-green-400">+${formatCurrency(p.total_profit)}</td>
            <td class="py-3 text-right font-mono text-sm text-gray-400">${formatCurrency(p.total_bet)}</td>
            <td class="py-3 text-right text-sm text-gray-400">${formatNumber(p.bet_count)}注</td>
          </tr>
        `).join('');
      }
    }
    
    if (lossResult.success) {
      const losers = (lossResult.data || []).filter(p => p.total_profit < 0);
      if (losers.length === 0) {
        lossTbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gray-400">暂无亏损会员</td></tr>';
      } else {
        lossTbody.innerHTML = losers.map((p, i) => `
          <tr class="border-t border-gray-700">
            <td class="py-3">${i + 1}</td>
            <td class="py-3">
              <span class="font-medium">${escapeHtml(p.username)}</span>
              <span class="text-xs text-purple-400 ml-1">VIP${p.vip_level}</span>
            </td>
            <td class="py-3 text-right font-mono text-red-400">${formatCurrency(p.total_profit)}</td>
            <td class="py-3 text-right font-mono text-sm text-gray-400">${formatCurrency(p.total_bet)}</td>
            <td class="py-3 text-right text-sm text-gray-400">${formatNumber(p.bet_count)}注</td>
          </tr>
        `).join('');
      }
    }
  } catch (error) {
    profitTbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-red-400">加载失败</td></tr>';
    lossTbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-red-400">加载失败</td></tr>';
  }
}

// 导出报表
function exportReport(type) {
  let startDate, endDate;
  
  switch(type) {
    case 'daily':
      startDate = document.getElementById('daily-start-date')?.value;
      endDate = document.getElementById('daily-end-date')?.value;
      break;
    case 'settlement':
      startDate = document.getElementById('settle-start-date')?.value;
      endDate = document.getElementById('settle-end-date')?.value;
      break;
    default:
      startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      endDate = dayjs().format('YYYY-MM-DD');
  }
  
  const url = `/api/reports/export?type=${type}&start_date=${startDate}&end_date=${endDate}`;
  window.open(url, '_blank');
}

// 转账记录子标签切换
// 加载手续费设置列表
async function loadTransferFeeSettings() {
  const container = document.getElementById('transfer-fee-list');
  if (!container) return;
  
  try {
    container.innerHTML = '<p class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</p>';
    
    const result = await api('/api/transfer-fee-configs');
    
    if (!result.success) {
      container.innerHTML = `<p class="text-center text-red-400 py-8">加载失败: ${result.error || '未知错误'}</p>`;
      return;
    }
    
    const configs = result.configs || [];
    
    if (configs.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-400 py-8">暂无手续费配置，点击「新增设置」创建</p>';
      return;
    }
    
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${configs.map(c => {
          const isActive = c.is_active || c.is_enabled || false;
          const vipDisplay = c.vip_level === -1 ? '所有等级' : c.vip_level === null ? '所有等级' : `VIP${c.vip_level}`;
          
          return `
            <div class="bg-gray-700 rounded-lg p-4">
              <div class="flex justify-between items-start mb-3">
                <div class="flex items-center">
                  <span class="w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'} mr-3"></span>
                  <div>
                    <h5 class="font-semibold">${escapeHtml(c.name)}</h5>
                    <p class="text-sm text-gray-400">优先级: ${c.priority || 0}</p>
                  </div>
                </div>
                <div class="flex items-center space-x-2">
                  <button onclick="editTransferFeeConfig(${c.id})" class="text-blue-400 hover:text-blue-300 p-1" title="编辑"><i class="fas fa-edit"></i></button>
                  <button onclick="toggleTransferFeeConfig(${c.id}, ${isActive ? 0 : 1})" class="text-yellow-400 hover:text-yellow-300 p-1" title="${isActive ? '禁用' : '启用'}">
                    <i class="fas fa-${isActive ? 'pause' : 'play'}"></i>
                  </button>
                  <button onclick="deleteTransferFeeConfig(${c.id}, '${escapeHtml(c.name)}')" class="text-red-400 hover:text-red-300 p-1" title="删除"><i class="fas fa-trash"></i></button>
                </div>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span class="text-gray-400">VIP等级</span>
                  <span class="font-bold text-purple-400">${vipDisplay}</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span class="text-gray-400">费率类型</span>
                  <span class="font-bold text-primary">${c.fee_type === 'percentage' ? '百分比' : '固定金额'}</span>
                </div>
                <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span class="text-gray-400">${c.fee_type === 'percentage' ? '费率' : '金额'}</span>
                  <span class="font-bold text-yellow-400">${c.fee_type === 'percentage' ? c.fee_rate + '%' : '$' + formatCurrency(c.fee_amount || c.fee_value)}</span>
                </div>
                ${c.min_fee > 0 ? `
                <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span class="text-gray-400">最低手续费</span>
                  <span>$${formatCurrency(c.min_fee)}</span>
                </div>
                ` : ''}
                ${c.max_fee && c.max_fee > 0 ? `
                <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span class="text-gray-400">最高手续费</span>
                  <span>$${formatCurrency(c.max_fee)}</span>
                </div>
                ` : ''}
                <div class="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span class="text-gray-400">适用金额</span>
                  <span class="text-xs">$${formatCurrency(c.min_amount || 0)} - ${c.max_amount && c.max_amount > 0 ? '$' + formatCurrency(c.max_amount) : '无上限'}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (error) {
    showToast('加载手续费配置失败: ' + error.message, 'error');
    container.innerHTML = '<p class="text-center text-red-400 py-8">加载失败，请稍后重试</p>';
  }
}

// 显示新增手续费设置弹窗
function showAddTransferFeeModal() {
  const modal = document.createElement('div');
  modal.id = 'transfer-fee-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-lg">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-plus-circle text-primary mr-2"></i>新增手续费设置</h3>
        <button onclick="closeTransferFeeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="transfer-fee-form" class="space-y-4">
        <div>
          <label class="block text-gray-400 text-sm mb-2">设置名称 <span class="text-red-400">*</span></label>
          <input type="text" name="setting_name" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：默认手续费">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">费率类型</label>
            <select name="fee_type" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="percentage">百分比</option>
              <option value="fixed">固定金额</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">费率/金额 <span class="text-red-400">*</span></label>
            <input type="number" name="fee_value" required step="0.01" min="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：2（表示2%或2元）">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">最低手续费</label>
            <input type="number" name="min_fee" step="0.01" min="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">最高手续费</label>
            <input type="number" name="max_fee" step="0.01" min="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="不限">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">适用最低金额</label>
            <input type="number" name="min_amount" step="0.01" min="0" value="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">适用最高金额</label>
            <input type="number" name="max_amount" step="0.01" min="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="不限">
          </div>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">优先级（数字越大优先级越高）</label>
          <input type="number" name="priority" value="0" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">说明</label>
          <textarea name="description" rows="2" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="手续费规则说明..."></textarea>
        </div>
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeTransferFeeModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('transfer-fee-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.setting_name.value,
      vip_level: -1, // 默认所有等级
      fee_type: form.fee_type.value,
      fee_rate: parseFloat(form.fee_value.value),
      min_fee: form.min_fee.value ? parseFloat(form.min_fee.value) : 0,
      max_fee: form.max_fee.value ? parseFloat(form.max_fee.value) : null,
      min_amount: form.min_amount.value ? parseFloat(form.min_amount.value) : 0,
      max_amount: form.max_amount.value ? parseFloat(form.max_amount.value) : null,
      priority: parseInt(form.priority.value) || 0,
      is_enabled: 1
    };
    
    const result = await api('/api/transfer-fee-configs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      showToast('手续费配置创建成功', 'success');
      closeTransferFeeModal();
      loadTransferFeeSettings();
    } else {
      showToast('创建失败: ' + (result.error || '未知错误'), 'error');
    }
  };
}

// 关闭手续费设置弹窗
function closeTransferFeeModal() {
  const modal = document.getElementById('transfer-fee-modal');
  if (modal) modal.remove();
}

// 编辑手续费设置
async function editTransferFee(id) {
  const result = await api('/api/transfer-fee-settings');
  if (!result.success) return alert('获取设置失败');
  
  const s = result.data.find(item => item.id === id);
  if (!s) return alert('设置不存在');
  
  const modal = document.createElement('div');
  modal.id = 'transfer-fee-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-lg">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold"><i class="fas fa-edit text-primary mr-2"></i>编辑手续费设置</h3>
        <button onclick="closeTransferFeeModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times text-xl"></i></button>
      </div>
      <form id="transfer-fee-form" class="space-y-4">
        <input type="hidden" name="id" value="${id}">
        <div>
          <label class="block text-gray-400 text-sm mb-2">设置名称 <span class="text-red-400">*</span></label>
          <input type="text" name="setting_name" required value="${escapeHtml(s.setting_name)}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">费率类型</label>
            <select name="fee_type" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
              <option value="percentage" ${s.fee_type === 'percentage' ? 'selected' : ''}>百分比</option>
              <option value="fixed" ${s.fee_type === 'fixed' ? 'selected' : ''}>固定金额</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">费率/金额 <span class="text-red-400">*</span></label>
            <input type="number" name="fee_value" required step="0.01" min="0" value="${s.fee_value}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">最低手续费</label>
            <input type="number" name="min_fee" step="0.01" min="0" value="${s.min_fee || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">最高手续费</label>
            <input type="number" name="max_fee" step="0.01" min="0" value="${s.max_fee || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">适用最低金额</label>
            <input type="number" name="min_amount" step="0.01" min="0" value="${s.min_amount || 0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2">适用最高金额</label>
            <input type="number" name="max_amount" step="0.01" min="0" value="${s.max_amount || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">优先级</label>
          <input type="number" name="priority" value="${s.priority || 0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
        </div>
        <div>
          <label class="block text-gray-400 text-sm mb-2">说明</label>
          <textarea name="description" rows="2" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">${escapeHtml(s.description || '')}</textarea>
        </div>
        <div class="flex justify-end space-x-4 mt-6">
          <button type="button" onclick="closeTransferFeeModal()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
          <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('transfer-fee-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      setting_name: form.setting_name.value,
      fee_type: form.fee_type.value,
      fee_value: parseFloat(form.fee_value.value),
      min_fee: form.min_fee.value ? parseFloat(form.min_fee.value) : 0,
      max_fee: form.max_fee.value ? parseFloat(form.max_fee.value) : null,
      min_amount: form.min_amount.value ? parseFloat(form.min_amount.value) : 0,
      max_amount: form.max_amount.value ? parseFloat(form.max_amount.value) : null,
      priority: parseInt(form.priority.value) || 0,
      description: form.description.value
    };
    
    const result = await api(`/api/transfer-fee-settings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('手续费设置更新成功！');
      closeTransferFeeModal();
      loadTransferFeeSettings();
    } else {
      alert('更新失败: ' + result.error);
    }
  };
}

// 切换手续费设置启用状态
async function toggleTransferFee(id, newStatus) {
  const result = await api(`/api/transfer-fee-settings/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ is_enabled: newStatus })
  });
  
  if (result.success) {
    loadTransferFeeSettings();
  } else {
    alert('操作失败: ' + result.error);
  }
}

// 删除手续费设置
async function deleteTransferFee(id, name) {
  if (!confirm(`确定要删除「${name}」吗？此操作不可恢复。`)) return;
  
  const result = await api(`/api/transfer-fee-settings/${id}`, {
    method: 'DELETE'
  });
  
  if (result.success) {
    alert('设置已删除');
    loadTransferFeeSettings();
  } else {
    alert('删除失败: ' + result.error);
  }
}

// =====================
// 转账手续费配置管理（新API）
// =====================

// 编辑手续费配置
async function editTransferFeeConfig(id) {
  try {
    const result = await api('/api/transfer-fee-configs');
    if (!result.success || !result.configs) {
      showToast('获取配置失败', 'error');
      return;
    }
    
    const config = result.configs.find(c => c.id === id);
    if (!config) {
      showToast('配置不存在', 'error');
      return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'transfer-fee-config-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold"><i class="fas fa-edit text-primary mr-2"></i>编辑手续费配置</h3>
          <button onclick="document.getElementById('transfer-fee-config-modal').remove()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <form id="edit-transfer-fee-config-form" class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">配置名称 <span class="text-red-400">*</span></label>
            <input type="text" name="name" required value="${escapeHtml(config.name)}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">VIP等级</label>
              <select name="vip_level" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
                <option value="-1" ${config.vip_level === -1 || config.vip_level === null ? 'selected' : ''}>所有等级</option>
                ${Array.from({length: 11}, (_, i) => `<option value="${i}" ${config.vip_level === i ? 'selected' : ''}>VIP${i}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">优先级</label>
              <input type="number" name="priority" value="${config.priority || 0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">最小金额</label>
              <input type="number" name="min_amount" step="0.01" min="0" value="${config.min_amount || 0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">最大金额</label>
              <input type="number" name="max_amount" step="0.01" min="0" value="${config.max_amount || ''}" placeholder="不限" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">费率类型</label>
              <select name="fee_type" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary">
                <option value="percentage" ${config.fee_type === 'percentage' ? 'selected' : ''}>百分比</option>
                <option value="fixed" ${config.fee_type === 'fixed' ? 'selected' : ''}>固定金额</option>
              </select>
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">费率值 <span class="text-red-400">*</span></label>
              <input type="number" name="fee_rate" required step="0.01" min="0" value="${config.fee_rate || config.fee_value || 0}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：2（表示2%或2元）">
            </div>
            <div class="col-span-1"></div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">最低手续费</label>
              <input type="number" name="min_fee" step="0.01" min="0" value="${config.min_fee || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0">
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">最高手续费</label>
              <input type="number" name="max_fee" step="0.01" min="0" value="${config.max_fee || ''}" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="不限">
            </div>
          </div>
          
          <div class="flex justify-end space-x-4 mt-6">
            <button type="button" onclick="document.getElementById('transfer-fee-config-modal').remove()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">取消</button>
            <button type="submit" class="px-6 py-2 bg-primary hover:bg-blue-700 rounded-lg"><i class="fas fa-save mr-2"></i>保存</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('edit-transfer-fee-config-form').onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {
        id: id,
        name: form.name.value,
        vip_level: parseInt(form.vip_level.value),
        min_amount: parseFloat(form.min_amount.value) || 0,
        max_amount: form.max_amount.value ? parseFloat(form.max_amount.value) : null,
        fee_type: form.fee_type.value,
        fee_rate: parseFloat(form.fee_rate.value),
        min_fee: form.min_fee.value ? parseFloat(form.min_fee.value) : 0,
        max_fee: form.max_fee.value ? parseFloat(form.max_fee.value) : null,
        priority: parseInt(form.priority.value) || 0
      };
      
      const result = await api('/api/transfer-fee-configs', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      if (result.success) {
        showToast('配置更新成功', 'success');
        document.getElementById('transfer-fee-config-modal').remove();
        loadTransferFeeSettings();
      } else {
        showToast('更新失败: ' + (result.error || '未知错误'), 'error');
      }
    };
  } catch (error) {
    showToast('操作失败: ' + error.message, 'error');
  }
}

// 切换手续费配置启用状态
async function toggleTransferFeeConfig(id, enabled) {
  try {
    const result = await api('/api/transfer-fee-configs', {
      method: 'PUT',
      body: JSON.stringify({ id, is_enabled: enabled })
    });
    
    if (result.success) {
      showToast(enabled ? '已启用' : '已禁用', 'success');
      loadTransferFeeSettings();
    } else {
      showToast('操作失败: ' + (result.error || '未知错误'), 'error');
    }
  } catch (error) {
    showToast('操作失败: ' + error.message, 'error');
  }
}

// 删除手续费配置
async function deleteTransferFeeConfig(id, name) {
  if (!confirm(`确定要删除「${name}」配置吗？此操作不可恢复。`)) return;
  
  try {
    const result = await api('/api/transfer-fee-configs', {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
    
    if (result.success) {
      showToast('配置已删除', 'success');
      loadTransferFeeSettings();
    } else {
      showToast('删除失败: ' + (result.error || '未知错误'), 'error');
    }
  } catch (error) {
    showToast('删除失败: ' + error.message, 'error');
  }
}

// =====================
// 账户明细报表
// =====================
async function loadAccountDetails() {
  const startDate = document.getElementById('account-start-date')?.value || '';
  const endDate = document.getElementById('account-end-date')?.value || '';
  const userId = document.getElementById('account-user-id')?.value || '';
  const orderNo = document.getElementById('account-order-no')?.value || '';
  const type = document.getElementById('account-type')?.value || '';
  const page = parseInt(document.getElementById('account-page')?.value) || 1;
  const pageSize = parseInt(document.getElementById('account-page-size')?.value) || 50;
  
  const tbody = document.getElementById('account-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  }
  
  try {
    let url = `/api/reports/account-details?page=${page}&limit=${pageSize}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    if (userId) url += `&user_id=${encodeURIComponent(userId)}`;
    if (orderNo) url += `&order_no=${encodeURIComponent(orderNo)}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;
    
    const result = await api(url);
    
    if (result.success) {
      const data = result.data || [];
      const total = result.total || 0;
      
      document.getElementById('account-total').textContent = total;
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
        return;
      }
      
      tbody.innerHTML = data.map(d => {
        const changeClass = d.change_amount >= 0 ? 'text-green-400' : 'text-red-400';
        return `
          <tr class="border-t border-gray-700 hover:bg-gray-750">
            <td class="p-3">${getAccountTypeBadge(d.type)}</td>
            <td class="p-3 font-mono text-xs">${escapeHtml(d.order_no || '-')}</td>
            <td class="p-3">${escapeHtml(d.game_name || '-')}</td>
            <td class="p-3">${escapeHtml(d.round_id || '-')}</td>
            <td class="p-3">${escapeHtml(d.bet_type || '-')}</td>
            <td class="p-3">${escapeHtml(d.bet_spot || '-')}</td>
            <td class="p-3 text-right font-mono ${changeClass}">${d.change_amount >= 0 ? '+' : ''}${formatNumber(d.change_amount)}</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.balance_before)}</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.balance_after)}</td>
            <td class="p-3 text-gray-400 text-xs">${formatDateTime(d.created_at)}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="10" class="p-8 text-center text-red-400">加载失败: ${result.error}</td></tr>`;
    }
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-red-400">加载失败，请稍后重试</td></tr>';
  }
}

function getAccountTypeBadge(type) {
  const types = {
    bet: { class: 'bg-blue-600', text: '注' },
    win: { class: 'bg-green-600', text: '注' },
    deposit: { class: 'bg-yellow-600', text: '存' },
    withdraw: { class: 'bg-orange-600', text: '取' },
    bonus: { class: 'bg-purple-600', text: '利' },
    rebate: { class: 'bg-pink-600', text: '返' },
    transfer_in: { class: 'bg-cyan-600', text: '入' },
    transfer_out: { class: 'bg-red-600', text: '出' },
    adjustment: { class: 'bg-gray-600', text: '调' }
  };
  const t = types[type] || { class: 'bg-gray-600', text: type?.substring(0, 1) || '?' };
  return `<span class="inline-flex items-center justify-center w-6 h-6 rounded ${t.class} text-white text-xs font-bold">${t.text}</span>`;
}

function copyAccountData() {
  const table = document.querySelector('#report-account table');
  if (table) {
    const range = document.createRange();
    range.selectNode(table);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    alert('数据已复制到剪贴板');
  }
}

// =====================
// 结算报表
// =====================
function setSettleDateRange(range) {
  const startInput = document.getElementById('settle-start-date');
  const endInput = document.getElementById('settle-end-date');
  
  const now = dayjs();
  let start, end;
  
  switch(range) {
    case 'today':
      start = now.startOf('day');
      end = now;
      break;
    case 'yesterday':
      start = now.subtract(1, 'day').startOf('day');
      end = now.subtract(1, 'day').endOf('day');
      break;
    case 'week':
      start = now.startOf('week');
      end = now;
      break;
    case 'month':
      start = now.startOf('month');
      end = now;
      break;
    case 'lastmonth':
      start = now.subtract(1, 'month').startOf('month');
      end = now.subtract(1, 'month').endOf('month');
      break;
    default:
      return;
  }
  
  startInput.value = start.format('YYYY-MM-DDTHH:mm');
  endInput.value = end.format('YYYY-MM-DDTHH:mm');
  loadSettleReport();
}

async function loadSettleReport() {
  const startDate = document.getElementById('settle-start-date')?.value || '';
  const endDate = document.getElementById('settle-end-date')?.value || '';
  const gameType = document.getElementById('settle-game-type')?.value || '';
  const businessMode = document.getElementById('settle-business-mode')?.value || '';
  const currency = document.getElementById('settle-currency')?.value || '';
  const userType = document.getElementById('settle-user-type')?.value || 'real';
  const page = parseInt(document.getElementById('settle-page')?.value) || 1;
  const pageSize = parseInt(document.getElementById('settle-page-size')?.value) || 50;
  
  const tbody = document.getElementById('settle-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="12" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  }
  
  try {
    let url = `/api/reports/settlement?page=${page}&limit=${pageSize}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    if (gameType) url += `&game_type=${encodeURIComponent(gameType)}`;
    if (businessMode) url += `&business_mode=${encodeURIComponent(businessMode)}`;
    if (currency) url += `&currency=${encodeURIComponent(currency)}`;
    if (userType) url += `&user_type=${encodeURIComponent(userType)}`;
    
    const result = await api(url);
    
    if (result.success) {
      const data = result.data || [];
      const summary = result.summary || {};
      const total = result.total || 0;
      
      document.getElementById('settle-total-records').textContent = total;
      
      // 更新统计卡片
      document.getElementById('settle-stat-total-bet').textContent = formatCurrency(summary.total_bet || 0);
      document.getElementById('settle-stat-total-payout').textContent = formatCurrency(summary.total_win || 0);
      const companyProfit = (summary.total_bet || 0) - (summary.total_win || 0);
      const profitEl = document.getElementById('settle-stat-company-profit');
      profitEl.textContent = formatCurrency(companyProfit);
      profitEl.className = companyProfit >= 0 ? 'text-lg font-bold text-green-400' : 'text-lg font-bold text-red-400';
      document.getElementById('settle-stat-valid-bet').textContent = formatCurrency(summary.total_valid_bet || 0);
      document.getElementById('settle-stat-commission').textContent = formatCurrency(summary.total_commission || 0);
      document.getElementById('settle-stat-record-count').textContent = total;
      
      // 更新表格底部汇总
      document.getElementById('settle-total-bet').textContent = formatNumber(summary.total_bet || 0);
      document.getElementById('settle-total-win').textContent = formatNumber(summary.total_win || 0);
      document.getElementById('settle-total-valid').textContent = formatNumber(summary.total_valid_bet || 0);
      document.getElementById('settle-total-commission').textContent = formatNumber(summary.total_commission || 0);
      document.getElementById('settle-total-share').textContent = formatNumber(summary.total_share || 0);
      document.getElementById('settle-total-upper').textContent = formatNumber(summary.total_upper || 0);
      document.getElementById('settle-total-profit').textContent = formatNumber(summary.total_profit || 0);
      document.getElementById('settle-total-lower').textContent = formatNumber(summary.total_lower || 0);
      document.getElementById('settle-total-self').textContent = formatNumber(summary.total_self || 0);
      
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
        return;
      }
      
      tbody.innerHTML = data.map((d, i) => {
        const winClass = d.member_win >= 0 ? 'text-green-400' : 'text-red-400';
        const profitClass = d.actual_profit >= 0 ? 'text-green-400' : 'text-red-400';
        return `
          <tr class="border-t border-gray-700 hover:bg-gray-750">
            <td class="p-3">${(page - 1) * pageSize + i + 1}</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.total_bet || 0)}</td>
            <td class="p-3 text-right font-mono ${winClass}">${formatNumber(d.member_win || 0)}</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.valid_bet || 0)}</td>
            <td class="p-3 text-right">${(d.commission_rate || 0).toFixed(2)}%</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.commission || 0)}</td>
            <td class="p-3 text-right">${(d.share_rate || 0).toFixed(2)}%</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.share_income || 0)}</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.upper_settle || 0)}</td>
            <td class="p-3 text-right font-mono ${profitClass}">${formatNumber(d.actual_profit || 0)}</td>
            <td class="p-3 text-right font-mono">${formatNumber(d.lower_settle || 0)}</td>
            <td class="p-3 text-right font-mono ${profitClass}">${formatNumber(d.self_profit || 0)}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-red-400">加载失败: ${result.error}</td></tr>`;
    }
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="12" class="p-8 text-center text-red-400">加载失败，请稍后重试</td></tr>';
  }
}

function copySettleData() {
  const table = document.querySelector('#report-settle table');
  if (table) {
    const range = document.createRange();
    range.selectNode(table);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    alert('数据已复制到剪贴板');
  }
}

// 设置结算报表日期范围
function setSettleDateRange(range) {
  const startInput = document.getElementById('settle-start-date');
  const endInput = document.getElementById('settle-end-date');
  const now = dayjs();
  
  switch(range) {
    case 'today':
      startInput.value = now.startOf('day').format('YYYY-MM-DDTHH:mm');
      endInput.value = now.format('YYYY-MM-DDTHH:mm');
      break;
    case 'yesterday':
      startInput.value = now.subtract(1, 'day').startOf('day').format('YYYY-MM-DDTHH:mm');
      endInput.value = now.subtract(1, 'day').endOf('day').format('YYYY-MM-DDTHH:mm');
      break;
    case 'week':
      startInput.value = now.startOf('week').format('YYYY-MM-DDTHH:mm');
      endInput.value = now.format('YYYY-MM-DDTHH:mm');
      break;
    case 'month':
      startInput.value = now.startOf('month').format('YYYY-MM-DDTHH:mm');
      endInput.value = now.format('YYYY-MM-DDTHH:mm');
      break;
    case 'lastmonth':
      startInput.value = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm');
      endInput.value = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DDTHH:mm');
      break;
  }
}

// 重置结算报表查询条件
function resetSettleFilters() {
  document.getElementById('settle-start-date').value = dayjs().startOf('month').format('YYYY-MM-DDTHH:mm');
  document.getElementById('settle-end-date').value = dayjs().format('YYYY-MM-DDTHH:mm');
  document.getElementById('settle-game-type').value = '';
  document.getElementById('settle-business-mode').value = '';
  document.getElementById('settle-currency').value = 'USD';
  document.getElementById('settle-user-type').value = 'real';
  loadSettleReport();
}

// 加载转账记录
// ========================================
// 转账记录管理函数（报表中心 - 会员间转账）
// ========================================

// 加载转账记录列表
async function loadTransferRecords() {
  // 报表中心转账记录页面的DOM元素
  const startDate = document.getElementById('transfer-start-date')?.value || '';
  const endDate = document.getElementById('transfer-end-date')?.value || '';
  const fromPlayer = document.getElementById('transfer-from')?.value || '';
  const toPlayer = document.getElementById('transfer-to')?.value || '';
  const minAmount = document.getElementById('transfer-min')?.value || '';
  const maxAmount = document.getElementById('transfer-max')?.value || '';
  const tbody = document.getElementById('transfer-tbody');
  
  if (!tbody) return;

  try {
    tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
    
    // 构建查询参数
    const params = new URLSearchParams({
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
      ...(fromPlayer && { from_player: fromPlayer }),
      ...(toPlayer && { to_player: toPlayer }),
      limit: '100'
    });

    const result = await api(`/api/transfers?${params}`);

    if (!result.success) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-red-400">加载失败: ${result.error || '未知错误'}</td></tr>`;
      return;
    }

    const transfers = result.data || [];
    const stats = result.stats || { total_count: 0, total_amount: 0, total_fee: 0, total_actual_amount: 0 };
    
    // 更新统计卡片
    const statCount = document.getElementById('stat-count');
    const statAmount = document.getElementById('stat-amount');
    const statFee = document.getElementById('stat-fee');
    const statSenders = document.getElementById('stat-senders');
    const statReceivers = document.getElementById('stat-receivers');
    
    if (statCount) statCount.textContent = formatNumber(stats.total_count || 0);
    if (statAmount) statAmount.textContent = formatCurrency(stats.total_amount || 0);
    if (statFee) statFee.textContent = formatCurrency(stats.total_fee || 0);
    
    // 计算去重的转出和转入人数
    if (statSenders) {
      const uniqueSenders = new Set(transfers.map(t => t.from_player_id));
      statSenders.textContent = formatNumber(uniqueSenders.size);
    }
    if (statReceivers) {
      const uniqueReceivers = new Set(transfers.map(t => t.to_player_id));
      statReceivers.textContent = formatNumber(uniqueReceivers.size);
    }
    
    // 如果有金额筛选，进行客户端过滤
    let filteredTransfers = transfers;
    if (minAmount || maxAmount) {
      filteredTransfers = transfers.filter(t => {
        const amount = t.amount || 0;
        if (minAmount && amount < parseFloat(minAmount)) return false;
        if (maxAmount && amount > parseFloat(maxAmount)) return false;
        return true;
      });
    }

    // 渲染表格
    if (filteredTransfers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-gray-400">暂无数据</td></tr>';
      return;
    }

    const statusColors = {
      pending: 'yellow',
      completed: 'green',
      cancelled: 'gray',
      failed: 'red'
    };

    const statusTexts = {
      pending: '待审核',
      completed: '已完成',
      cancelled: '已取消',
      failed: '失败'
    };

    tbody.innerHTML = filteredTransfers.map(t => {
      const statusColor = statusColors[t.status] || 'gray';
      const statusText = statusTexts[t.status] || t.status;
      
      return `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="p-3 text-sm text-gray-400">${formatDateTime(t.created_at)}</td>
          <td class="p-3 text-sm">
            <span class="font-mono text-xs bg-gray-700 px-2 py-1 rounded">${escapeHtml(t.order_no)}</span>
          </td>
          <td class="p-3 text-sm">
            <div>
              <p class="font-medium text-white">${escapeHtml(t.from_player_name || '-')}</p>
              <p class="text-xs text-gray-400">ID: ${t.from_player_id} | VIP${t.from_vip_level || 0}</p>
            </div>
          </td>
          <td class="p-3 text-center">
            <i class="fas fa-long-arrow-alt-right text-xl text-primary"></i>
          </td>
          <td class="p-3 text-sm">
            <div>
              <p class="font-medium text-white">${escapeHtml(t.to_player_name || '-')}</p>
              <p class="text-xs text-gray-400">ID: ${t.to_player_id} | VIP${t.to_vip_level || 0}</p>
            </div>
          </td>
          <td class="p-3 text-right">
            <span class="font-mono font-bold text-blue-400">$${formatCurrency(t.amount)}</span>
          </td>
          <td class="p-3 text-right">
            <span class="font-mono text-orange-400">${t.fee > 0 ? '$' + formatCurrency(t.fee) : '-'}</span>
          </td>
          <td class="p-3 text-sm">
            <span class="px-2 py-1 rounded text-xs bg-${statusColor}-900 text-${statusColor}-300">
              ${statusText}
            </span>
            ${t.remark ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(t.remark)}</p>` : ''}
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    showToast('加载转账记录失败: ' + error.message, 'error');
    tbody.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-red-400">加载失败</td></tr>';
  }
}

// 显示转账详情
async function showTransferDetail(transferId) {
  try {
    const response = await fetch(`/api/transfers?transfer_id=${transferId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    if (!response.ok) throw new Error('Failed to fetch transfer detail');
    const data = await response.json();
    const transfer = data.transfers[0];

    if (!transfer) {
      showToast('未找到转账记录', 'error');
      return;
    }

    const statusTexts = {
      pending: '待处理',
      approved: '已批准',
      rejected: '已拒绝',
      completed: '已完成',
      cancelled: '已取消'
    };

    const modalHtml = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="this.remove()">
        <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-white">
              <i class="fas fa-exchange-alt mr-2 text-blue-400"></i>转账详情
            </h3>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <div class="space-y-3 text-gray-300">
            <div class="grid grid-cols-2 gap-4">
              <div><span class="font-semibold text-gray-400">转账订单号:</span> <span class="font-mono">${transfer.transfer_id}</span></div>
              <div><span class="font-semibold text-gray-400">状态:</span> <span class="text-blue-400 font-bold">${statusTexts[transfer.status]}</span></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div><span class="font-semibold text-gray-400">转出会员:</span> ${transfer.from_player_username} (ID: ${transfer.from_player_id})</div>
              <div><span class="font-semibold text-gray-400">转入会员:</span> ${transfer.to_player_username} (ID: ${transfer.to_player_id})</div>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div><span class="font-semibold text-gray-400">转账金额:</span> <span class="text-blue-400 font-bold">$${transfer.amount.toFixed(2)}</span></div>
              <div><span class="font-semibold text-gray-400">手续费:</span> <span class="text-orange-400">$${transfer.fee.toFixed(2)}</span></div>
              <div><span class="font-semibold text-gray-400">实际到账:</span> <span class="text-green-400 font-bold">$${transfer.actual_amount.toFixed(2)}</span></div>
            </div>
            ${transfer.remark ? `<div><span class="font-semibold text-gray-400">备注:</span> ${escapeHtml(transfer.remark)}</div>` : ''}
            <div class="grid grid-cols-2 gap-4">
              <div><span class="font-semibold text-gray-400">创建时间:</span> ${formatDateTime(transfer.created_at)}</div>
              ${transfer.reviewed_at ? `<div><span class="font-semibold text-gray-400">审核时间:</span> ${formatDateTime(transfer.reviewed_at)}</div>` : ''}
            </div>
            ${transfer.reviewed_by ? `<div><span class="font-semibold text-gray-400">审核人:</span> ${transfer.reviewed_by}</div>` : ''}
          </div>
          <div class="mt-6 text-right">
            <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              <i class="fas fa-times mr-1"></i>关闭
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

  } catch (error) {
    showToast('加载详情失败: ' + error.message, 'error');
  }
}

// 审核转账
async function reviewTransfer(transferId, action) {
  const remark = action === 'rejected' ? prompt('请输入拒绝原因:') : null;
  if (action === 'rejected' && !remark) return;

  try {
    const response = await fetch('/api/transfers', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        transfer_id: transferId,
        action: action,
        ...(remark && { remark: remark })
      })
    });

    if (!response.ok) throw new Error('Review failed');
    const result = await response.json();

    showToast(action === 'approved' ? '转账已通过审核' : '转账已拒绝', 'success');
    loadTransferRecords();

  } catch (error) {
    showToast('审核失败: ' + error.message, 'error');
  }
}

// =====================
// 9. 内容管理
// =====================
async function renderContent(container) {
  const result = await api('/api/contents');
  const contents = result.data || [];
  
  container.innerHTML = `
    <!-- Tabs -->
    <div class="flex space-x-4 mb-6">
      <button onclick="filterContent('')" class="px-4 py-2 bg-primary rounded-lg">全部</button>
      <button onclick="filterContent('banner')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">轮播图</button>
      <button onclick="filterContent('marquee')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">跑马灯</button>
      <button onclick="filterContent('popup')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">弹窗公告</button>
      <button onclick="filterContent('game_rule')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">游戏规则</button>
      <button class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg ml-auto"><i class="fas fa-plus mr-2"></i>新增内容</button>
    </div>
    
    <div class="bg-gray-800 rounded-xl overflow-hidden">
      <table class="w-full data-table">
        <thead class="bg-gray-700">
          <tr>
            <th class="text-left p-4">标题</th>
            <th class="text-left p-4">类型</th>
            <th class="text-left p-4">语言</th>
            <th class="text-left p-4">目标层级</th>
            <th class="text-left p-4">发布时间</th>
            <th class="text-left p-4">状态</th>
            <th class="text-left p-4">操作</th>
          </tr>
        </thead>
        <tbody>
          ${contents.map(c => `
            <tr class="border-t border-gray-700">
              <td class="p-4">
                <div class="flex items-center">
                  <i class="fas fa-${c.type === 'banner' ? 'image' : c.type === 'marquee' ? 'bullhorn' : c.type === 'popup' ? 'window-maximize' : 'book'} text-primary mr-3"></i>
                  <span class="font-medium">${c.title}</span>
                </div>
              </td>
              <td class="p-4">
                <span class="px-2 py-1 rounded text-xs bg-gray-600">
                  ${c.type === 'banner' ? '轮播图' : c.type === 'marquee' ? '跑马灯' : c.type === 'popup' ? '弹窗' : '规则'}
                </span>
              </td>
              <td class="p-4">${c.language}</td>
              <td class="p-4">${c.target_level === 'vip_only' ? '<span class="text-purple-400">VIP专属</span>' : '全部'}</td>
              <td class="p-4 text-sm text-gray-400">${formatDateTime(c.publish_at)}</td>
              <td class="p-4">${getStatusBadge(c.status)}</td>
              <td class="p-4">
                <button class="text-blue-400 hover:text-blue-300 mr-2" title="编辑"><i class="fas fa-edit"></i></button>
                <button class="text-${c.status === 'published' ? 'yellow' : 'green'}-400 hover:text-${c.status === 'published' ? 'yellow' : 'green'}-300 mr-2" title="${c.status === 'published' ? '下架' : '发布'}">
                  <i class="fas fa-${c.status === 'published' ? 'eye-slash' : 'paper-plane'}"></i>
                </button>
                <button class="text-red-400 hover:text-red-300" title="删除"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// =====================
// 10. 系统设置
// =====================
async function renderSystem(container) {
  const [adminsResult, logsResult] = await Promise.all([
    api('/api/admins'),
    api('/api/audit-logs?limit=20')
  ]);
  
  const admins = adminsResult.data || [];
  const logs = logsResult.data || [];
  
  container.innerHTML = `
    <!-- Tabs -->
    <div class="flex flex-wrap gap-2 mb-6">
      <button id="tab-profile" onclick="switchSystemTab('profile')" class="px-4 py-2 bg-primary rounded-lg">
        <i class="fas fa-user mr-1"></i>个人信息
      </button>
      <button id="tab-password" onclick="switchSystemTab('password')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
        <i class="fas fa-key mr-1"></i>修改密码
      </button>
      <button id="tab-2fa" onclick="switchSystemTab('2fa')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
        <i class="fas fa-shield-alt mr-1 ${currentUser?.two_fa_enabled ? 'text-green-400' : 'text-yellow-400'}"></i>2FA设置
      </button>
      <button id="tab-ipwhitelist" onclick="switchSystemTab('ipwhitelist')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">
        <i class="fas fa-network-wired mr-1"></i>IP白名单
      </button>
      <button id="tab-admins" onclick="switchSystemTab('admins')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">管理员账号</button>
      <button id="tab-roles" onclick="switchSystemTab('roles')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">角色权限</button>
      <button id="tab-logs" onclick="switchSystemTab('logs')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">操作日志</button>
      <button id="tab-loginlogs" onclick="switchSystemTab('loginlogs')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">登录日志</button>
    </div>
    
    <!-- 个人信息 -->
    <div id="system-profile" class="bg-gray-800 rounded-xl p-6">
      <div class="max-w-2xl">
        <h4 class="text-lg font-semibold mb-6">
          <i class="fas fa-user-circle text-primary mr-2"></i>个人信息设置
        </h4>
        
        <!-- 头像和基本信息 -->
        <div class="flex items-start mb-8">
          <div class="relative">
            <div class="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
              <i class="fas fa-user text-white text-3xl"></i>
            </div>
            <button class="absolute bottom-0 right-0 w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded-full flex items-center justify-center" title="更换头像">
              <i class="fas fa-camera text-sm"></i>
            </button>
          </div>
          <div class="ml-6">
            <h5 class="text-xl font-bold">${escapeHtml(currentUser?.nickname || currentUser?.username || 'Admin')}</h5>
            <p class="text-gray-400">@${escapeHtml(currentUser?.username || '')}</p>
            <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs ${currentUser?.role === 'super_admin' ? 'bg-red-600' : 'bg-blue-600'}">${getRoleName(currentUser?.role)}</span>
          </div>
        </div>
        
        <!-- 个人信息表单 -->
        <form onsubmit="updateProfile(event)" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-gray-400 text-sm mb-2">用户名</label>
              <input type="text" name="username" value="${escapeHtml(currentUser?.username || '')}" 
                     class="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-3 cursor-not-allowed" readonly>
              <p class="text-xs text-gray-500 mt-1">用户名不可修改</p>
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">昵称 <span class="text-red-400">*</span></label>
              <input type="text" name="nickname" value="${escapeHtml(currentUser?.nickname || '')}" required
                     class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                     placeholder="请输入昵称">
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-gray-400 text-sm mb-2">角色</label>
              <input type="text" value="${getRoleName(currentUser?.role)}" 
                     class="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-3 cursor-not-allowed" readonly>
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">账号状态</label>
              <input type="text" value="正常" 
                     class="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-3 cursor-not-allowed text-green-400" readonly>
            </div>
          </div>
          
          <div class="pt-4 border-t border-gray-700">
            <button type="submit" class="bg-primary hover:bg-blue-700 px-6 py-3 rounded-lg transition">
              <i class="fas fa-save mr-2"></i>保存修改
            </button>
          </div>
        </form>
        
        <!-- 账号信息 -->
        <div class="mt-8 pt-6 border-t border-gray-700">
          <h5 class="font-semibold mb-4 text-gray-300">账号信息</h5>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="bg-gray-700 rounded-lg p-4">
              <p class="text-gray-400">账号ID</p>
              <p class="font-mono text-lg">#${currentUser?.id || '-'}</p>
            </div>
            <div class="bg-gray-700 rounded-lg p-4">
              <p class="text-gray-400">2FA状态</p>
              <p class="${currentUser?.two_fa_enabled ? 'text-green-400' : 'text-yellow-400'}">
                <i class="fas fa-${currentUser?.two_fa_enabled ? 'check-circle' : 'exclamation-circle'} mr-1"></i>
                ${currentUser?.two_fa_enabled ? '已启用' : '未启用'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 修改密码 -->
    <div id="system-password" class="hidden">
      <div class="max-w-lg mx-auto">
        <div class="bg-gray-800 rounded-xl p-6">
          <h4 class="text-lg font-semibold mb-6">
            <i class="fas fa-lock text-primary mr-2"></i>修改登录密码
          </h4>
          
          <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
            <p class="text-sm text-yellow-300">
              <i class="fas fa-exclamation-triangle mr-2"></i>
              修改密码后需要重新登录，请确保记住新密码。
            </p>
          </div>
          
          <form onsubmit="changePassword(event)" class="space-y-5">
            <div>
              <label class="block text-gray-400 text-sm mb-2">当前密码 <span class="text-red-400">*</span></label>
              <div class="relative">
                <input type="password" name="current_password" required id="current-password"
                       class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-primary"
                       placeholder="请输入当前密码">
                <button type="button" onclick="togglePasswordVisibility('current-password')" 
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div>
              <label class="block text-gray-400 text-sm mb-2">新密码 <span class="text-red-400">*</span></label>
              <div class="relative">
                <input type="password" name="new_password" required id="new-password" minlength="6"
                       class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-primary"
                       placeholder="请输入新密码（至少6位）" oninput="checkPasswordStrength(this.value)">
                <button type="button" onclick="togglePasswordVisibility('new-password')" 
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
              <!-- 密码强度指示器 -->
              <div class="mt-2">
                <div class="flex space-x-1">
                  <div id="strength-1" class="h-1 flex-1 bg-gray-600 rounded"></div>
                  <div id="strength-2" class="h-1 flex-1 bg-gray-600 rounded"></div>
                  <div id="strength-3" class="h-1 flex-1 bg-gray-600 rounded"></div>
                  <div id="strength-4" class="h-1 flex-1 bg-gray-600 rounded"></div>
                </div>
                <p id="strength-text" class="text-xs text-gray-500 mt-1">密码强度</p>
              </div>
            </div>
            
            <div>
              <label class="block text-gray-400 text-sm mb-2">确认新密码 <span class="text-red-400">*</span></label>
              <div class="relative">
                <input type="password" name="confirm_password" required id="confirm-password"
                       class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-primary"
                       placeholder="请再次输入新密码">
                <button type="button" onclick="togglePasswordVisibility('confirm-password')" 
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
            
            <div class="pt-4">
              <button type="submit" class="w-full bg-primary hover:bg-blue-700 py-3 rounded-lg transition">
                <i class="fas fa-key mr-2"></i>确认修改密码
              </button>
            </div>
          </form>
        </div>
        
        <!-- 密码安全提示 -->
        <div class="mt-6 bg-gray-800 rounded-xl p-6">
          <h5 class="font-semibold mb-4">
            <i class="fas fa-info-circle text-blue-400 mr-2"></i>密码安全建议
          </h5>
          <ul class="space-y-2 text-sm text-gray-400">
            <li class="flex items-start">
              <i class="fas fa-check text-green-400 mr-2 mt-0.5"></i>
              <span>密码长度至少6位，建议8位以上</span>
            </li>
            <li class="flex items-start">
              <i class="fas fa-check text-green-400 mr-2 mt-0.5"></i>
              <span>包含大小写字母、数字和特殊字符</span>
            </li>
            <li class="flex items-start">
              <i class="fas fa-check text-green-400 mr-2 mt-0.5"></i>
              <span>避免使用生日、电话号码等易猜测信息</span>
            </li>
            <li class="flex items-start">
              <i class="fas fa-check text-green-400 mr-2 mt-0.5"></i>
              <span>定期更换密码，建议每3个月更换一次</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    
    <!-- 管理员列表 -->
    <div id="system-admins" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <div class="p-4 border-b border-gray-700 flex justify-between items-center">
        <span class="font-semibold"><i class="fas fa-users-cog text-primary mr-2"></i>管理员列表</span>
        <button onclick="showAddAdminModal()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
          <i class="fas fa-plus mr-2"></i>新增管理员
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-4">账号</th>
              <th class="text-left p-4">角色</th>
              <th class="text-left p-4">2FA状态</th>
              <th class="text-left p-4">IP白名单</th>
              <th class="text-left p-4">最后登录</th>
              <th class="text-left p-4">状态</th>
              <th class="text-left p-4">操作</th>
            </tr>
          </thead>
          <tbody>
            ${admins.map(a => {
              const ipList = a.ip_whitelist ? JSON.parse(a.ip_whitelist) : [];
              return `
              <tr class="border-t border-gray-700">
                <td class="p-4">
                  <p class="font-medium">${escapeHtml(a.username)}</p>
                  <p class="text-sm text-gray-400">${escapeHtml(a.nickname || '')}</p>
                </td>
                <td class="p-4">
                  <span class="px-2 py-1 rounded text-xs ${a.role === 'super_admin' ? 'bg-red-600' : 'bg-blue-600'}">${getRoleName(a.role)}</span>
                </td>
                <td class="p-4">
                  ${a.two_fa_enabled ? '<span class="text-green-400"><i class="fas fa-shield-alt mr-1"></i>已启用</span>' : '<span class="text-yellow-400"><i class="fas fa-exclamation-triangle mr-1"></i>未启用</span>'}
                </td>
                <td class="p-4">
                  ${ipList.length > 0 
                    ? '<span class="text-green-400"><i class="fas fa-check-circle mr-1"></i>' + ipList.length + '个IP</span>'
                    : '<span class="text-gray-400">未设置</span>'}
                </td>
                <td class="p-4">
                  <p class="text-sm">${formatDateTime(a.last_login_at)}</p>
                  <p class="text-xs text-gray-400">${escapeHtml(a.last_login_ip || '-')}</p>
                </td>
                <td class="p-4">${getStatusBadge(a.status)}</td>
                <td class="p-4">
                  <button onclick="showEditAdminModal(${a.id})" class="text-blue-400 hover:text-blue-300 mr-2" title="编辑">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button onclick="showResetPasswordModal(${a.id}, '${escapeJs(a.username)}')" class="text-yellow-400 hover:text-yellow-300 mr-2" title="重置密码">
                    <i class="fas fa-key"></i>
                  </button>
                  ${a.id !== 1 && a.id !== currentUser?.id ? `
                  <button onclick="toggleAdminStatus(${a.id}, '${escapeJs(a.username)}', ${a.status})" 
                          class="${a.status === 1 ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}" 
                          title="${a.status === 1 ? '禁用' : '启用'}">
                    <i class="fas fa-${a.status === 1 ? 'ban' : 'check-circle'}"></i>
                  </button>
                  ` : ''}
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 角色权限 -->
    <div id="system-roles" class="hidden">
      <div class="mb-4 flex justify-between items-center">
        <h4 class="font-semibold"><i class="fas fa-user-tag text-primary mr-2"></i>角色管理</h4>
        <button onclick="showAddRoleModal()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
          <i class="fas fa-plus mr-2"></i>新增角色
        </button>
      </div>
      <div id="roles-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="text-center text-gray-400 py-8">
          <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
          <p>加载中...</p>
        </div>
      </div>
    </div>
    
    <!-- 2FA设置 -->
    <div id="system-2fa" class="hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 我的2FA状态 -->
        <div class="bg-gray-800 rounded-xl p-6">
          <h4 class="text-lg font-semibold mb-4">
            <i class="fas fa-user-shield text-primary mr-2"></i>我的2FA设置
          </h4>
          <div class="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-4">
            <div class="flex items-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center ${currentUser?.two_fa_enabled ? 'bg-green-600' : 'bg-yellow-600'}">
                <i class="fas fa-${currentUser?.two_fa_enabled ? 'shield-alt' : 'exclamation-triangle'} text-white text-xl"></i>
              </div>
              <div class="ml-4">
                <p class="font-medium">双因素认证</p>
                <p class="text-sm ${currentUser?.two_fa_enabled ? 'text-green-400' : 'text-yellow-400'}">
                  ${currentUser?.two_fa_enabled ? '已启用 - 账户受保护' : '未启用 - 建议开启'}
                </p>
              </div>
            </div>
            <span class="px-3 py-1 rounded-full text-sm ${currentUser?.two_fa_enabled ? 'bg-green-600' : 'bg-yellow-600'}">
              ${currentUser?.two_fa_enabled ? '安全' : '风险'}
            </span>
          </div>
          
          ${currentUser?.two_fa_enabled ? `
          <div class="space-y-3">
            <div class="p-4 bg-green-900/30 border border-green-700 rounded-lg">
              <p class="text-sm text-green-300">
                <i class="fas fa-check-circle mr-2"></i>
                您的账户已启用双因素认证保护，每次登录需要输入验证码。
              </p>
            </div>
            <button onclick="show2FADisable()" class="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg transition">
              <i class="fas fa-unlink mr-2"></i>解绑 2FA
            </button>
          </div>
          ` : `
          <div class="space-y-3">
            <div class="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <p class="text-sm text-yellow-300">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                您的账户尚未启用双因素认证，存在安全风险。强烈建议立即开启！
              </p>
            </div>
            <button onclick="start2FASetup()" class="w-full bg-green-600 hover:bg-green-700 py-3 rounded-lg transition">
              <i class="fas fa-shield-alt mr-2"></i>立即绑定 2FA
            </button>
          </div>
          `}
        </div>
        
        <!-- 2FA说明 -->
        <div class="bg-gray-800 rounded-xl p-6">
          <h4 class="text-lg font-semibold mb-4">
            <i class="fas fa-info-circle text-blue-400 mr-2"></i>什么是2FA？
          </h4>
          <div class="space-y-4 text-sm text-gray-300">
            <p>
              双因素认证（2FA）是一种安全措施，在您登录时除了密码外，还需要输入一个动态验证码。
            </p>
            <div class="bg-gray-700 rounded-lg p-4">
              <p class="font-medium text-white mb-2">支持的验证器App：</p>
              <ul class="space-y-2">
                <li class="flex items-center">
                  <i class="fab fa-google text-red-400 mr-2"></i>Google Authenticator
                </li>
                <li class="flex items-center">
                  <i class="fab fa-microsoft text-blue-400 mr-2"></i>Microsoft Authenticator
                </li>
                <li class="flex items-center">
                  <i class="fas fa-mobile-alt text-green-400 mr-2"></i>Authy
                </li>
                <li class="flex items-center">
                  <i class="fas fa-key text-yellow-400 mr-2"></i>1Password
                </li>
              </ul>
            </div>
            <div class="bg-gray-700 rounded-lg p-4">
              <p class="font-medium text-white mb-2">绑定流程：</p>
              <ol class="space-y-1 list-decimal list-inside">
                <li>点击"绑定2FA"按钮</li>
                <li>使用验证器App扫描二维码</li>
                <li>输入App显示的6位验证码</li>
                <li>绑定成功！</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 管理员2FA状态列表（仅超级管理员可见） -->
      ${currentUser?.role === 'super_admin' ? `
      <div class="mt-6 bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700">
          <h4 class="font-semibold"><i class="fas fa-users-cog text-primary mr-2"></i>全部管理员2FA状态</h4>
        </div>
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-4">管理员</th>
              <th class="text-left p-4">角色</th>
              <th class="text-left p-4">2FA状态</th>
              <th class="text-left p-4">最后登录</th>
            </tr>
          </thead>
          <tbody>
            ${admins.map(a => `
              <tr class="border-t border-gray-700">
                <td class="p-4">
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                      <i class="fas fa-user text-gray-400"></i>
                    </div>
                    <div>
                      <p class="font-medium">${escapeHtml(a.username)}</p>
                      <p class="text-xs text-gray-400">${escapeHtml(a.nickname || '')}</p>
                    </div>
                  </div>
                </td>
                <td class="p-4">
                  <span class="px-2 py-1 rounded text-xs ${a.role === 'super_admin' ? 'bg-red-600' : 'bg-gray-600'}">${getRoleName(a.role)}</span>
                </td>
                <td class="p-4">
                  ${a.two_fa_enabled 
                    ? '<span class="inline-flex items-center text-green-400"><i class="fas fa-check-circle mr-1"></i>已启用</span>' 
                    : '<span class="inline-flex items-center text-yellow-400"><i class="fas fa-exclamation-circle mr-1"></i>未启用</span>'}
                </td>
                <td class="p-4 text-sm text-gray-400">${formatDateTime(a.last_login_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    </div>
    
    <!-- IP白名单设置 -->
    <div id="system-ipwhitelist" class="hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 我的IP白名单 -->
        <div class="bg-gray-800 rounded-xl p-6">
          <h4 class="text-lg font-semibold mb-4">
            <i class="fas fa-user-shield text-primary mr-2"></i>我的IP白名单
          </h4>
          <div id="my-ip-whitelist-status" class="flex items-center justify-between p-4 bg-gray-700 rounded-lg mb-4">
            <div class="flex items-center">
              <div class="w-12 h-12 rounded-full flex items-center justify-center bg-gray-600">
                <i class="fas fa-network-wired text-gray-300 text-xl"></i>
              </div>
              <div class="ml-4">
                <p class="font-medium">IP登录限制</p>
                <p class="text-sm text-gray-400" id="my-ip-status-text">加载中...</p>
              </div>
            </div>
            <span id="my-ip-status-badge" class="px-3 py-1 rounded-full text-sm bg-gray-600">检查中</span>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">当前登录IP</label>
              <div class="flex items-center bg-gray-700 rounded-lg px-4 py-3">
                <i class="fas fa-map-marker-alt text-green-400 mr-3"></i>
                <span class="font-mono">${escapeHtml(currentUser?.last_login_ip || '未知')}</span>
              </div>
            </div>
            
            <div>
              <label class="block text-gray-400 text-sm mb-2">
                IP白名单 <span class="text-xs text-gray-500">（每行一个IP，支持CIDR格式如 192.168.1.0/24）</span>
              </label>
              <textarea id="my-ip-whitelist-input" rows="5" 
                        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary font-mono text-sm"
                        placeholder="例如:&#10;192.168.1.100&#10;10.0.0.0/24&#10;* (允许所有IP)"></textarea>
            </div>
            
            <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
              <p class="text-sm text-yellow-300">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                设置IP白名单后，只有白名单中的IP才能登录此账号。请确保包含当前IP，否则可能导致无法登录。
              </p>
            </div>
            
            <button onclick="saveMyIpWhitelist()" class="w-full bg-primary hover:bg-blue-700 py-3 rounded-lg transition">
              <i class="fas fa-save mr-2"></i>保存IP白名单
            </button>
          </div>
        </div>
        
        <!-- IP白名单说明 -->
        <div class="bg-gray-800 rounded-xl p-6">
          <h4 class="text-lg font-semibold mb-4">
            <i class="fas fa-info-circle text-blue-400 mr-2"></i>IP白名单说明
          </h4>
          <div class="space-y-4 text-sm text-gray-300">
            <p>IP白名单是一种安全措施，只允许指定的IP地址登录您的账号。</p>
            
            <div class="bg-gray-700 rounded-lg p-4">
              <p class="font-medium text-white mb-2">支持的格式：</p>
              <ul class="space-y-2">
                <li class="flex items-center">
                  <i class="fas fa-check text-green-400 mr-2"></i>
                  <code class="bg-gray-800 px-2 py-1 rounded">192.168.1.100</code> - 单个IP
                </li>
                <li class="flex items-center">
                  <i class="fas fa-check text-green-400 mr-2"></i>
                  <code class="bg-gray-800 px-2 py-1 rounded">192.168.1.0/24</code> - IP段（CIDR）
                </li>
                <li class="flex items-center">
                  <i class="fas fa-check text-green-400 mr-2"></i>
                  <code class="bg-gray-800 px-2 py-1 rounded">*</code> - 允许所有IP（禁用白名单）
                </li>
              </ul>
            </div>
            
            <div class="bg-gray-700 rounded-lg p-4">
              <p class="font-medium text-white mb-2">常见CIDR说明：</p>
              <ul class="space-y-1 text-gray-400">
                <li><code>/8</code> - 匹配前1位，如 10.0.0.0/8 匹配 10.x.x.x</li>
                <li><code>/16</code> - 匹配前2位，如 192.168.0.0/16 匹配 192.168.x.x</li>
                <li><code>/24</code> - 匹配前3位，如 192.168.1.0/24 匹配 192.168.1.x</li>
              </ul>
            </div>
            
            <div class="bg-red-900/30 border border-red-700 rounded-lg p-4">
              <p class="text-sm text-red-300">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <strong>注意：</strong>如果设置了白名单但不包含当前IP，将无法登录！建议先添加 <code class="bg-gray-800 px-1">*</code> 测试，确认无误后再设置具体IP。
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 下级管理员IP白名单管理（仅超级管理员可见） -->
      ${currentUser?.role === 'super_admin' ? `
      <div class="mt-6 bg-gray-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex justify-between items-center">
          <h4 class="font-semibold"><i class="fas fa-users-cog text-primary mr-2"></i>管理员IP白名单管理</h4>
          <span class="text-sm text-gray-400">以下管理员的IP白名单由您管理</span>
        </div>
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-4">管理员</th>
              <th class="text-left p-4">角色</th>
              <th class="text-left p-4">IP白名单状态</th>
              <th class="text-left p-4">最后登录IP</th>
              <th class="text-left p-4">操作</th>
            </tr>
          </thead>
          <tbody>
            ${admins.filter(a => a.id !== currentUser?.id).map(a => {
              const ipList = a.ip_whitelist ? JSON.parse(a.ip_whitelist) : [];
              return `
              <tr class="border-t border-gray-700">
                <td class="p-4">
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                      <i class="fas fa-user text-gray-400"></i>
                    </div>
                    <div>
                      <p class="font-medium">${escapeHtml(a.username)}</p>
                      <p class="text-xs text-gray-400">${escapeHtml(a.nickname || '')}</p>
                    </div>
                  </div>
                </td>
                <td class="p-4">
                  <span class="px-2 py-1 rounded text-xs ${a.role === 'super_admin' ? 'bg-red-600' : 'bg-gray-600'}">${getRoleName(a.role)}</span>
                </td>
                <td class="p-4">
                  ${ipList.length > 0 
                    ? '<span class="text-green-400"><i class="fas fa-check-circle mr-1"></i>已启用 (' + ipList.length + '个IP)</span>'
                    : '<span class="text-gray-400"><i class="fas fa-minus-circle mr-1"></i>未设置</span>'}
                </td>
                <td class="p-4">
                  <span class="font-mono text-sm">${escapeHtml(a.last_login_ip || '-')}</span>
                </td>
                <td class="p-4">
                  <button onclick="showAdminIpWhitelistModal(${a.id}, '${escapeJs(a.username)}', '${escapeJs(a.ip_whitelist || '')}')" 
                          class="text-blue-400 hover:text-blue-300" title="设置IP白名单">
                    <i class="fas fa-edit mr-1"></i>设置
                  </button>
                </td>
              </tr>
            `;}).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    </div>
    
    <!-- 操作日志 -->
    <div id="system-logs" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <div class="p-4 border-b border-gray-700">
        <div class="flex space-x-4 items-center">
          <input type="text" placeholder="搜索操作员..." class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm w-40">
          <select class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm">
            <option value="">全部模块</option>
            <option value="player">玩家管理</option>
            <option value="finance">财务管理</option>
            <option value="commission">洗码管理</option>
            <option value="risk">风控管理</option>
          </select>
          <input type="date" class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm">
          <button class="bg-primary px-4 py-1 rounded text-sm">查询</button>
        </div>
      </div>
      <table class="w-full data-table">
        <thead class="bg-gray-700">
          <tr>
            <th class="text-left p-4">时间</th>
            <th class="text-left p-4">操作员</th>
            <th class="text-left p-4">模块</th>
            <th class="text-left p-4">操作</th>
            <th class="text-left p-4">目标</th>
            <th class="text-left p-4">IP</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => `
            <tr class="border-t border-gray-700">
              <td class="p-4 text-sm text-gray-400">${formatDateTime(l.created_at)}</td>
              <td class="p-4">${l.operator_name || '-'}</td>
              <td class="p-4"><span class="px-2 py-1 rounded text-xs bg-gray-600">${l.module}</span></td>
              <td class="p-4">${l.action}</td>
              <td class="p-4 text-sm">${l.target_type} #${l.target_id}</td>
              <td class="p-4 text-sm text-gray-400">${l.ip_address || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- 登录日志 -->
    <div id="system-loginlogs" class="hidden bg-gray-800 rounded-xl overflow-hidden">
      <div class="p-4 border-b border-gray-700">
        <div class="flex flex-wrap gap-4 items-center">
          <input type="text" id="loginlog-search" placeholder="搜索用户名..." class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm w-40">
          <select id="loginlog-status" class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
            <option value="">全部状态</option>
            <option value="success">登录成功</option>
            <option value="failed">登录失败</option>
            <option value="blocked">IP拦截</option>
          </select>
          <input type="date" id="loginlog-date" class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
          <button onclick="loadLoginLogs()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded text-sm">
            <i class="fas fa-search mr-1"></i>查询
          </button>
        </div>
      </div>
      <div id="loginlogs-table-container">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-4">时间</th>
              <th class="text-left p-4">用户名</th>
              <th class="text-left p-4">角色</th>
              <th class="text-left p-4">状态</th>
              <th class="text-left p-4">登录IP</th>
              <th class="text-left p-4">说明</th>
            </tr>
          </thead>
          <tbody id="loginlogs-tbody">
            <tr><td colspan="6" class="p-8 text-center text-gray-400">点击「查询」加载登录日志</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function getPermissionList(role) {
  const permissions = {
    super_admin: ['全部模块访问权限', '管理员账号管理', '角色权限管理', '审计日志查看'],
    finance: ['财务控端', '提款审核', '人工存取', '报表中心'],
    risk: ['风险控端', '玩家管理', '注单控端', '限红配置'],
    customer_service: ['玩家管理', '人工存取', '内容管理', '注单查询'],
    operator: ['仪表盘', '内容管理', '报表查看']
  };
  return permissions[role] || [];
}

function switchSystemTab(tab) {
  document.querySelectorAll('[id^="system-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('bg-primary');
    el.classList.add('bg-gray-700');
  });
  document.getElementById(`system-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.remove('bg-gray-700');
  document.getElementById(`tab-${tab}`).classList.add('bg-primary');
  
  // 切换标签时加载对应数据
  if (tab === 'ipwhitelist') {
    loadMyIpWhitelist();
  } else if (tab === 'roles') {
    loadRoles();
  } else if (tab === 'loginlogs') {
    loadLoginLogs();
  }
}

// =====================
// 登录日志功能 (V2.1新增)
// =====================

// 加载登录日志
async function loadLoginLogs() {
  const username = document.getElementById('loginlog-search')?.value || '';
  const status = document.getElementById('loginlog-status')?.value || '';
  const date = document.getElementById('loginlog-date')?.value || '';
  
  const tbody = document.getElementById('loginlogs-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</td></tr>';
  }
  
  try {
    let url = '/api/login-logs?limit=50';
    if (username) url += `&username=${encodeURIComponent(username)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (date) url += `&date=${encodeURIComponent(date)}`;
    
    const result = await api(url);
    
    if (result.success) {
      const logs = result.data || [];
      
      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400">暂无登录日志</td></tr>';
        return;
      }
      
      tbody.innerHTML = logs.map(log => {
        let statusBadge = '';
        let statusText = '';
        
        if (log.action === 'login_blocked') {
          statusBadge = 'bg-red-600';
          statusText = 'IP拦截';
        } else if (log.action === 'logout') {
          statusBadge = 'bg-gray-600';
          statusText = '登出';
        } else if (log.description?.includes('失败')) {
          statusBadge = 'bg-yellow-600';
          statusText = '失败';
        } else {
          statusBadge = 'bg-green-600';
          statusText = '成功';
        }
        
        return `
          <tr class="border-t border-gray-700 hover:bg-gray-750">
            <td class="p-4 text-sm">${formatDateTime(log.created_at)}</td>
            <td class="p-4">
              <span class="font-medium">${escapeHtml(log.operator_name || '-')}</span>
            </td>
            <td class="p-4">
              <span class="px-2 py-1 rounded text-xs bg-gray-600">${getRoleName(log.admin_role) || '-'}</span>
            </td>
            <td class="p-4">
              <span class="px-2 py-1 rounded text-xs ${statusBadge}">${statusText}</span>
            </td>
            <td class="p-4">
              <span class="font-mono text-sm">${escapeHtml(log.ip_address || '-')}</span>
            </td>
            <td class="p-4 text-sm text-gray-400">${escapeHtml(log.description || '-')}</td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-400">加载失败: ${result.error}</td></tr>`;
    }
  } catch (error) {
    console.error('Load login logs error:', error);
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-red-400">加载失败，请稍后重试</td></tr>';
  }
}

// 保存系统配置
async function saveConfig(configKey, button) {
  const input = button.previousElementSibling;
  const newValue = input?.value;
  
  if (newValue === undefined) {
    alert('无法获取配置值');
    return;
  }
  
  // 显示保存中状态
  const icon = button.querySelector('i');
  const originalClass = icon.className;
  icon.className = 'fas fa-spinner fa-spin';
  
  try {
    const result = await api(`/api/system/configs/${encodeURIComponent(configKey)}`, {
      method: 'PUT',
      body: JSON.stringify({
        value: newValue,
        updated_by: currentUser?.id
      })
    });
    
    if (result.success) {
      // 显示成功状态
      icon.className = 'fas fa-check text-green-400';
      setTimeout(() => {
        icon.className = originalClass;
      }, 2000);
    } else {
      alert(result.error || '保存失败');
      icon.className = originalClass;
    }
  } catch (error) {
    console.error('Save config error:', error);
    alert('保存失败，请稍后重试');
    icon.className = originalClass;
  }
}

// =====================
// 个人信息与修改密码功能 (V2.1新增)
// =====================

// 更新个人信息
async function updateProfile(event) {
  event.preventDefault();
  
  const form = event.target;
  const nickname = form.nickname.value.trim();
  
  if (!nickname) {
    alert('昵称不能为空');
    return;
  }
  
  if (!currentUser?.id) {
    alert('用户信息无效，请重新登录');
    return;
  }
  
  try {
    const result = await api('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        admin_id: currentUser.id,
        nickname: nickname
      })
    });
    
    if (result.success) {
      // 更新本地用户信息
      currentUser.nickname = nickname;
      sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      // 更新页面显示
      document.getElementById('admin-name').textContent = nickname;
      
      alert('个人信息更新成功！');
    } else {
      alert(result.error || '更新失败');
    }
  } catch (error) {
    console.error('Update profile error:', error);
    alert('更新失败，请稍后重试');
  }
}

// 修改密码
async function changePassword(event) {
  event.preventDefault();
  
  const form = event.target;
  const currentPassword = form.current_password.value;
  const newPassword = form.new_password.value;
  const confirmPassword = form.confirm_password.value;
  
  // 表单验证
  if (!currentPassword) {
    alert('请输入当前密码');
    return;
  }
  
  if (!newPassword) {
    alert('请输入新密码');
    return;
  }
  
  if (newPassword.length < 6) {
    alert('新密码长度至少为6位');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    alert('两次输入的新密码不一致');
    return;
  }
  
  if (currentPassword === newPassword) {
    alert('新密码不能与当前密码相同');
    return;
  }
  
  if (!currentUser?.id) {
    alert('用户信息无效，请重新登录');
    return;
  }
  
  try {
    const result = await api('/api/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({
        admin_id: currentUser.id,
        current_password: currentPassword,
        new_password: newPassword
      })
    });
    
    if (result.success) {
      alert('密码修改成功！请重新登录。');
      // 清除登录状态并跳转到登录页
      logout();
    } else {
      alert(result.error || '密码修改失败');
    }
  } catch (error) {
    console.error('Change password error:', error);
    alert('密码修改失败，请稍后重试');
  }
}

// 切换密码可见性
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const button = input.nextElementSibling;
  const icon = button.querySelector('i');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

// 检查密码强度
function checkPasswordStrength(password) {
  let strength = 0;
  const strengthBars = [
    document.getElementById('strength-1'),
    document.getElementById('strength-2'),
    document.getElementById('strength-3'),
    document.getElementById('strength-4')
  ];
  const strengthText = document.getElementById('strength-text');
  
  // 长度检查
  if (password.length >= 6) strength++;
  if (password.length >= 8) strength++;
  
  // 包含数字
  if (/\d/.test(password)) strength++;
  
  // 包含小写字母
  if (/[a-z]/.test(password)) strength++;
  
  // 包含大写字母
  if (/[A-Z]/.test(password)) strength++;
  
  // 包含特殊字符
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  
  // 计算最终强度等级 (1-4)
  let level = 0;
  if (strength >= 1) level = 1;
  if (strength >= 3) level = 2;
  if (strength >= 5) level = 3;
  if (strength >= 6) level = 4;
  
  // 更新UI
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const texts = ['弱', '一般', '中等', '强'];
  const textColors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400'];
  
  strengthBars.forEach((bar, index) => {
    if (bar) {
      // 清除所有颜色
      bar.classList.remove('bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-gray-600');
      
      if (index < level) {
        bar.classList.add(colors[level - 1]);
      } else {
        bar.classList.add('bg-gray-600');
      }
    }
  });
  
  if (strengthText) {
    strengthText.classList.remove('text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-gray-500');
    if (level > 0) {
      strengthText.textContent = `密码强度: ${texts[level - 1]}`;
      strengthText.classList.add(textColors[level - 1]);
    } else {
      strengthText.textContent = '密码强度';
      strengthText.classList.add('text-gray-500');
    }
  }
}

// =====================
// IP白名单管理功能 (V2.1新增)
// =====================

// 加载我的IP白名单
async function loadMyIpWhitelist() {
  if (!currentUser?.id) return;
  
  try {
    const result = await api(`/api/profile/ip-whitelist?admin_id=${currentUser.id}`);
    if (result.success) {
      const ipList = result.data.ip_whitelist || [];
      const input = document.getElementById('my-ip-whitelist-input');
      const statusText = document.getElementById('my-ip-status-text');
      const statusBadge = document.getElementById('my-ip-status-badge');
      const statusBox = document.getElementById('my-ip-whitelist-status');
      
      if (input) {
        input.value = ipList.join('\n');
      }
      
      if (statusText && statusBadge && statusBox) {
        if (ipList.length > 0) {
          statusText.textContent = `已设置 ${ipList.length} 个IP`;
          statusText.className = 'text-sm text-green-400';
          statusBadge.textContent = '已启用';
          statusBadge.className = 'px-3 py-1 rounded-full text-sm bg-green-600';
          statusBox.querySelector('.w-12').className = 'w-12 h-12 rounded-full flex items-center justify-center bg-green-600';
        } else {
          statusText.textContent = '未设置，允许所有IP登录';
          statusText.className = 'text-sm text-gray-400';
          statusBadge.textContent = '未启用';
          statusBadge.className = 'px-3 py-1 rounded-full text-sm bg-gray-600';
          statusBox.querySelector('.w-12').className = 'w-12 h-12 rounded-full flex items-center justify-center bg-gray-600';
        }
      }
    }
  } catch (error) {
    console.error('Load IP whitelist error:', error);
  }
}

// 保存我的IP白名单
async function saveMyIpWhitelist() {
  if (!currentUser?.id) {
    alert('用户信息无效，请重新登录');
    return;
  }
  
  const input = document.getElementById('my-ip-whitelist-input');
  const ipText = input?.value || '';
  
  // 解析IP列表
  const ipList = ipText.split('\n')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
  
  // 验证IP格式
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$|^\*$/;
  for (const ip of ipList) {
    if (!ipRegex.test(ip)) {
      alert(`IP格式无效: ${ip}\n\n支持的格式:\n- 单个IP: 192.168.1.100\n- IP段: 192.168.1.0/24\n- 允许所有: *`);
      return;
    }
  }
  
  // 检查是否包含当前IP（如果设置了白名单且不是*）
  if (ipList.length > 0 && !ipList.includes('*')) {
    const currentIp = currentUser?.last_login_ip;
    if (currentIp && !ipList.includes(currentIp)) {
      const confirm_result = confirm(`警告：当前IP (${currentIp}) 不在白名单中！\n\n保存后您将无法使用当前IP登录。\n\n是否继续？`);
      if (!confirm_result) return;
    }
  }
  
  try {
    const result = await api('/api/profile/ip-whitelist', {
      method: 'PUT',
      body: JSON.stringify({
        admin_id: currentUser.id,
        ip_whitelist: ipList
      })
    });
    
    if (result.success) {
      alert('IP白名单保存成功！');
      loadMyIpWhitelist();
    } else {
      alert(result.error || '保存失败');
    }
  } catch (error) {
    console.error('Save IP whitelist error:', error);
    alert('保存失败，请稍后重试');
  }
}

// 显示管理员IP白名单设置弹窗
function showAdminIpWhitelistModal(adminId, username, currentIpWhitelist) {
  let ipList = [];
  try {
    ipList = currentIpWhitelist ? JSON.parse(currentIpWhitelist) : [];
  } catch (e) {
    ipList = [];
  }
  
  const modalHtml = `
    <div id="admin-ip-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4">
        <div class="flex justify-between items-center mb-6">
          <h4 class="text-lg font-semibold">
            <i class="fas fa-network-wired text-primary mr-2"></i>设置IP白名单 - ${escapeHtml(username)}
          </h4>
          <button onclick="closeAdminIpModal()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">
              IP白名单 <span class="text-xs text-gray-500">（每行一个IP）</span>
            </label>
            <textarea id="admin-ip-input" rows="6" 
                      class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary font-mono text-sm"
                      placeholder="例如:&#10;192.168.1.100&#10;10.0.0.0/24&#10;* (允许所有IP)">${escapeHtml(ipList.join('\n'))}</textarea>
          </div>
          
          <div class="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <p class="text-sm text-blue-300">
              <i class="fas fa-info-circle mr-2"></i>
              为该管理员设置IP白名单后，该账号只能从白名单中的IP地址登录。
            </p>
          </div>
          
          <div class="flex space-x-3">
            <button onclick="closeAdminIpModal()" class="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg transition">
              取消
            </button>
            <button onclick="saveAdminIpWhitelist(${adminId}, '${escapeJs(username)}')" class="flex-1 bg-primary hover:bg-blue-700 py-3 rounded-lg transition">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 关闭管理员IP白名单弹窗
function closeAdminIpModal() {
  const modal = document.getElementById('admin-ip-modal');
  if (modal) {
    modal.remove();
  }
}

// 保存管理员IP白名单
async function saveAdminIpWhitelist(adminId, username) {
  const input = document.getElementById('admin-ip-input');
  const ipText = input?.value || '';
  
  // 解析IP列表
  const ipList = ipText.split('\n')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
  
  // 验证IP格式
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$|^\*$/;
  for (const ip of ipList) {
    if (!ipRegex.test(ip)) {
      alert(`IP格式无效: ${ip}`);
      return;
    }
  }
  
  try {
    const result = await api(`/api/admins/${adminId}/ip-whitelist`, {
      method: 'PUT',
      body: JSON.stringify({
        operator_id: currentUser.id,
        operator_role: currentUser.role,
        ip_whitelist: ipList
      })
    });
    
    if (result.success) {
      alert(`已为 ${username} 设置IP白名单`);
      closeAdminIpModal();
      // 刷新页面
      loadModule('system');
    } else {
      alert(result.error || '保存失败');
    }
  } catch (error) {
    console.error('Save admin IP whitelist error:', error);
    alert('保存失败，请稍后重试');
  }
}

// =====================
// 管理员管理功能 (V2.1新增)
// =====================

// 显示新增管理员弹窗
async function showAddAdminModal() {
  // 先获取角色列表
  const rolesResult = await api('/api/roles');
  const roles = rolesResult.data || [];
  
  const modalHtml = `
    <div id="admin-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h4 class="text-lg font-semibold">
            <i class="fas fa-user-plus text-primary mr-2"></i>新增管理员
          </h4>
          <button onclick="closeAdminModal()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form onsubmit="submitAddAdmin(event)" class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">用户名 <span class="text-red-400">*</span></label>
            <input type="text" name="username" required minlength="3" maxlength="20"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                   placeholder="3-20个字符，字母开头">
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">密码 <span class="text-red-400">*</span></label>
            <input type="password" name="password" required minlength="6"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                   placeholder="至少6位">
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">昵称</label>
            <input type="text" name="nickname"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                   placeholder="显示名称">
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">角色 <span class="text-red-400">*</span></label>
            <select name="role" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary">
              ${roles.map(r => `<option value="${escapeHtml(r.role_code)}">${escapeHtml(r.role_name)}</option>`).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">状态</label>
            <select name="status" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary">
              <option value="1">启用</option>
              <option value="0">禁用</option>
            </select>
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button type="button" onclick="closeAdminModal()" class="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg transition">
              取消
            </button>
            <button type="submit" class="flex-1 bg-primary hover:bg-blue-700 py-3 rounded-lg transition">
              <i class="fas fa-check mr-2"></i>创建
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 提交新增管理员
async function submitAddAdmin(event) {
  event.preventDefault();
  const form = event.target;
  
  const data = {
    username: form.username.value.trim(),
    password: form.password.value,
    nickname: form.nickname.value.trim() || form.username.value.trim(),
    role: form.role.value,
    status: parseInt(form.status.value),
    operator_id: currentUser?.id
  };
  
  try {
    const result = await api('/api/admins', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('管理员创建成功！');
      closeAdminModal();
      loadModule('system');
    } else {
      alert(result.error || '创建失败');
    }
  } catch (error) {
    console.error('Create admin error:', error);
    alert('创建失败，请稍后重试');
  }
}

// 显示编辑管理员弹窗
async function showEditAdminModal(adminId) {
  const [adminsResult, rolesResult] = await Promise.all([
    api('/api/admins'),
    api('/api/roles')
  ]);
  
  const admin = (adminsResult.data || []).find(a => a.id === adminId);
  if (!admin) {
    alert('管理员不存在');
    return;
  }
  
  const roles = rolesResult.data || [];
  
  const modalHtml = `
    <div id="admin-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h4 class="text-lg font-semibold">
            <i class="fas fa-user-edit text-primary mr-2"></i>编辑管理员
          </h4>
          <button onclick="closeAdminModal()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form onsubmit="submitEditAdmin(event, ${adminId})" class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">用户名</label>
            <input type="text" value="${escapeHtml(admin.username)}" disabled
                   class="w-full bg-gray-600 border border-gray-500 rounded-lg px-4 py-3 cursor-not-allowed">
            <p class="text-xs text-gray-500 mt-1">用户名不可修改</p>
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">昵称</label>
            <input type="text" name="nickname" value="${escapeHtml(admin.nickname || '')}"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                   placeholder="显示名称">
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">角色</label>
            <select name="role" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                    ${admin.id === 1 ? 'disabled' : ''}>
              ${roles.map(r => `<option value="${escapeHtml(r.role_code)}" ${admin.role === r.role_code ? 'selected' : ''}>${escapeHtml(r.role_name)}</option>`).join('')}
            </select>
            ${admin.id === 1 ? '<p class="text-xs text-gray-500 mt-1">超级管理员角色不可修改</p>' : ''}
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">状态</label>
            <select name="status" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                    ${admin.id === 1 ? 'disabled' : ''}>
              <option value="1" ${admin.status === 1 ? 'selected' : ''}>启用</option>
              <option value="0" ${admin.status === 0 ? 'selected' : ''}>禁用</option>
            </select>
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button type="button" onclick="closeAdminModal()" class="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg transition">
              取消
            </button>
            <button type="submit" class="flex-1 bg-primary hover:bg-blue-700 py-3 rounded-lg transition">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 提交编辑管理员
async function submitEditAdmin(event, adminId) {
  event.preventDefault();
  const form = event.target;
  
  const data = {
    nickname: form.nickname.value.trim(),
    role: form.role.value,
    status: parseInt(form.status.value)
  };
  
  try {
    const result = await api(`/api/admins/${adminId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('管理员更新成功！');
      closeAdminModal();
      loadModule('system');
    } else {
      alert(result.error || '更新失败');
    }
  } catch (error) {
    console.error('Update admin error:', error);
    alert('更新失败，请稍后重试');
  }
}

// 显示重置密码弹窗
function showResetPasswordModal(adminId, username) {
  const modalHtml = `
    <div id="admin-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div class="flex justify-between items-center mb-6">
          <h4 class="text-lg font-semibold">
            <i class="fas fa-key text-yellow-400 mr-2"></i>重置密码
          </h4>
          <button onclick="closeAdminModal()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <p class="text-gray-300 mb-4">为 <strong>${escapeHtml(username)}</strong> 设置新密码：</p>
        
        <form onsubmit="submitResetPassword(event, ${adminId})" class="space-y-4">
          <div>
            <label class="block text-gray-400 text-sm mb-2">新密码 <span class="text-red-400">*</span></label>
            <input type="password" name="new_password" required minlength="6"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                   placeholder="至少6位">
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button type="button" onclick="closeAdminModal()" class="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg transition">
              取消
            </button>
            <button type="submit" class="flex-1 bg-yellow-600 hover:bg-yellow-700 py-3 rounded-lg transition">
              <i class="fas fa-key mr-2"></i>重置
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 提交重置密码
async function submitResetPassword(event, adminId) {
  event.preventDefault();
  const form = event.target;
  
  try {
    const result = await api(`/api/admins/${adminId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({
        new_password: form.new_password.value,
        operator_id: currentUser?.id
      })
    });
    
    if (result.success) {
      alert('密码重置成功！');
      closeAdminModal();
    } else {
      alert(result.error || '重置失败');
    }
  } catch (error) {
    console.error('Reset password error:', error);
    alert('重置失败，请稍后重试');
  }
}

// 切换管理员状态
async function toggleAdminStatus(adminId, username, currentStatus) {
  const action = currentStatus === 1 ? '禁用' : '启用';
  if (!confirm(`确定要${action}管理员 ${username} 吗？`)) return;
  
  try {
    const result = await api(`/api/admins/${adminId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: currentStatus === 1 ? 0 : 1
      })
    });
    
    if (result.success) {
      alert(`管理员已${action}！`);
      loadModule('system');
    } else {
      alert(result.error || `${action}失败`);
    }
  } catch (error) {
    console.error('Toggle admin status error:', error);
    alert(`${action}失败，请稍后重试`);
  }
}

// 关闭管理员弹窗
function closeAdminModal() {
  const modal = document.getElementById('admin-modal');
  if (modal) modal.remove();
}

// =====================
// 角色管理功能 (V2.1新增)
// =====================

// 加载角色列表
async function loadRoles() {
  const [rolesResult, permsResult] = await Promise.all([
    api('/api/roles'),
    api('/api/permissions')
  ]);
  
  const roles = rolesResult.data || [];
  const permissions = permsResult.data || [];
  
  // 保存权限定义到全局
  window.systemPermissions = permissions;
  
  const container = document.getElementById('roles-container');
  if (!container) return;
  
  if (roles.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-400 py-8">暂无角色数据</div>';
    return;
  }
  
  container.innerHTML = roles.map(role => {
    const perms = role.permissions ? JSON.parse(role.permissions) : [];
    const isAllPerms = perms.includes('*');
    const permCount = isAllPerms ? '全部' : perms.length;
    
    return `
      <div class="bg-gray-800 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h4 class="font-semibold">${escapeHtml(role.role_name)}</h4>
            <p class="text-xs text-gray-400">${escapeHtml(role.role_code)}</p>
          </div>
          <div class="flex items-center space-x-2">
            ${role.is_system ? '<span class="text-xs bg-gray-600 px-2 py-1 rounded">系统</span>' : ''}
            <button onclick="showEditRoleModal(${role.id})" class="text-blue-400 hover:text-blue-300" title="编辑权限">
              <i class="fas fa-edit"></i>
            </button>
            ${!role.is_system ? `
            <button onclick="deleteRole(${role.id}, '${escapeJs(role.role_name)}')" class="text-red-400 hover:text-red-300" title="删除">
              <i class="fas fa-trash"></i>
            </button>
            ` : ''}
          </div>
        </div>
        <p class="text-sm text-gray-400 mb-3">${escapeHtml(role.description || '暂无描述')}</p>
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-400">权限数量</span>
          <span class="${isAllPerms ? 'text-green-400' : 'text-blue-400'}">${permCount}</span>
        </div>
      </div>
    `;
  }).join('');
}

// 显示新增角色弹窗
async function showAddRoleModal() {
  const permsResult = await api('/api/permissions');
  const permissions = permsResult.data || [];
  
  showRoleModal(null, permissions);
}

// 显示编辑角色弹窗
async function showEditRoleModal(roleId) {
  const [rolesResult, permsResult] = await Promise.all([
    api('/api/roles'),
    api('/api/permissions')
  ]);
  
  const role = (rolesResult.data || []).find(r => r.id === roleId);
  if (!role) {
    alert('角色不存在');
    return;
  }
  
  showRoleModal(role, permsResult.data || []);
}

// 显示角色弹窗（新增/编辑共用）
function showRoleModal(role, permissions) {
  const isEdit = !!role;
  const rolePerms = role?.permissions ? JSON.parse(role.permissions) : [];
  const isAllPerms = rolePerms.includes('*');
  
  const modalHtml = `
    <div id="role-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h4 class="text-lg font-semibold">
            <i class="fas fa-user-tag text-primary mr-2"></i>${isEdit ? '编辑角色' : '新增角色'}
          </h4>
          <button onclick="closeRoleModal()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form onsubmit="submitRole(event, ${role?.id || 'null'})" class="space-y-6">
          <!-- 基本信息 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">角色代码 <span class="text-red-400">*</span></label>
              <input type="text" name="role_code" value="${escapeHtml(role?.role_code || '')}" 
                     ${isEdit && role?.is_system ? 'disabled' : 'required'}
                     pattern="^[a-zA-Z][a-zA-Z0-9_]*$"
                     class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary ${isEdit && role?.is_system ? 'cursor-not-allowed bg-gray-600' : ''}"
                     placeholder="字母开头，如: finance_manager">
              ${isEdit && role?.is_system ? '<p class="text-xs text-gray-500 mt-1">系统角色代码不可修改</p>' : ''}
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">角色名称 <span class="text-red-400">*</span></label>
              <input type="text" name="role_name" value="${escapeHtml(role?.role_name || '')}" required
                     class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                     placeholder="如: 财务主管">
            </div>
          </div>
          
          <div>
            <label class="block text-gray-400 text-sm mb-2">角色描述</label>
            <input type="text" name="description" value="${escapeHtml(role?.description || '')}"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-primary"
                   placeholder="简要描述角色职责">
          </div>
          
          <!-- 权限分配 -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <label class="text-gray-400 text-sm font-semibold">权限分配</label>
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" id="all-perms-checkbox" ${isAllPerms ? 'checked' : ''} 
                       onchange="toggleAllPermissions(this.checked)" class="mr-2">
                <span class="text-sm ${isAllPerms ? 'text-green-400' : 'text-gray-400'}">全部权限（超级管理员）</span>
              </label>
            </div>
            
            <div id="permissions-container" class="${isAllPerms ? 'opacity-50 pointer-events-none' : ''}">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${permissions.map(module => `
                  <div class="bg-gray-700 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                      <label class="flex items-center cursor-pointer">
                        <input type="checkbox" class="module-checkbox mr-2" data-module="${module.module}"
                               onchange="toggleModulePermissions('${module.module}', this.checked)"
                               ${rolePerms.includes(module.module + ':*') || module.children.every(c => rolePerms.includes(c.code)) ? 'checked' : ''}>
                        <i class="fas ${module.icon} text-primary mr-2"></i>
                        <span class="font-medium">${module.name}</span>
                      </label>
                    </div>
                    <div class="space-y-2 pl-6">
                      ${module.children.map(perm => `
                        <label class="flex items-center cursor-pointer text-sm">
                          <input type="checkbox" class="perm-checkbox mr-2" data-module="${module.module}" 
                                 data-code="${perm.code}"
                                 ${rolePerms.includes(perm.code) || rolePerms.includes(module.module + ':*') ? 'checked' : ''}
                                 onchange="updateModuleCheckbox('${module.module}')">
                          <span class="text-gray-300">${perm.name}</span>
                        </label>
                      `).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div class="flex space-x-3 pt-4 border-t border-gray-700">
            <button type="button" onclick="closeRoleModal()" class="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg transition">
              取消
            </button>
            <button type="submit" class="flex-1 bg-primary hover:bg-blue-700 py-3 rounded-lg transition">
              <i class="fas fa-save mr-2"></i>${isEdit ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 切换全部权限
function toggleAllPermissions(checked) {
  const container = document.getElementById('permissions-container');
  if (container) {
    container.classList.toggle('opacity-50', checked);
    container.classList.toggle('pointer-events-none', checked);
  }
}

// 切换模块全部权限
function toggleModulePermissions(module, checked) {
  const checkboxes = document.querySelectorAll(`.perm-checkbox[data-module="${module}"]`);
  checkboxes.forEach(cb => cb.checked = checked);
}

// 更新模块复选框状态
function updateModuleCheckbox(module) {
  const checkboxes = document.querySelectorAll(`.perm-checkbox[data-module="${module}"]`);
  const moduleCheckbox = document.querySelector(`.module-checkbox[data-module="${module}"]`);
  
  if (moduleCheckbox) {
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const someChecked = Array.from(checkboxes).some(cb => cb.checked);
    moduleCheckbox.checked = allChecked;
    moduleCheckbox.indeterminate = someChecked && !allChecked;
  }
}

// 提交角色
async function submitRole(event, roleId) {
  event.preventDefault();
  const form = event.target;
  
  // 收集权限
  let permissions = [];
  const allPermsChecked = document.getElementById('all-perms-checkbox')?.checked;
  
  if (allPermsChecked) {
    permissions = ['*'];
  } else {
    const checkedPerms = document.querySelectorAll('.perm-checkbox:checked');
    permissions = Array.from(checkedPerms).map(cb => cb.dataset.code);
  }
  
  const data = {
    role_code: form.role_code.value.trim(),
    role_name: form.role_name.value.trim(),
    description: form.description.value.trim(),
    permissions: permissions,
    operator_id: currentUser?.id
  };
  
  try {
    const url = roleId ? `/api/roles/${roleId}` : '/api/roles';
    const method = roleId ? 'PUT' : 'POST';
    
    const result = await api(url, {
      method: method,
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert(roleId ? '角色更新成功！' : '角色创建成功！');
      closeRoleModal();
      loadRoles();
    } else {
      alert(result.error || '操作失败');
    }
  } catch (error) {
    console.error('Submit role error:', error);
    alert('操作失败，请稍后重试');
  }
}

// 删除角色
async function deleteRole(roleId, roleName) {
  if (!confirm(`确定要删除角色 "${roleName}" 吗？\n\n注意：如果有管理员正在使用此角色，将无法删除。`)) return;
  
  try {
    const result = await api(`/api/roles/${roleId}`, {
      method: 'DELETE',
      body: JSON.stringify({ operator_id: currentUser?.id })
    });
    
    if (result.success) {
      alert('角色删除成功！');
      loadRoles();
    } else {
      alert(result.error || '删除失败');
    }
  } catch (error) {
    console.error('Delete role error:', error);
    alert('删除失败，请稍后重试');
  }
}

// 关闭角色弹窗
function closeRoleModal() {
  const modal = document.getElementById('role-modal');
  if (modal) modal.remove();
}

// =====================
// 11. 现场运营控端 (V2.1新增)
// =====================
async function renderStudio(container) {
  const [dealersResult, tablesResult, shiftsResult] = await Promise.all([
    api('/api/dealers'),
    api('/api/tables'),
    api('/api/shifts?date=' + dayjs().format('YYYY-MM-DD'))
  ]);
  
  const dealers = dealersResult.data || [];
  const tables = tablesResult.data || [];
  const shifts = shiftsResult.data || [];
  
  // 构建甘特图数据
  const hours = Array.from({length: 13}, (_, i) => i + 8); // 8:00 - 20:00
  
  container.innerHTML = `
    <!-- V2.1新增提示 -->
    <div class="bg-gradient-to-r from-green-900 to-teal-900 rounded-xl p-4 mb-6 flex items-center justify-between">
      <div class="flex items-center">
        <i class="fas fa-video text-green-300 text-2xl mr-3"></i>
        <div>
          <h3 class="font-bold text-white">V2.1 现场运营控端</h3>
          <p class="text-sm text-green-100">荷官档案管理、桌台配置、智能排班系统</p>
        </div>
      </div>
      <span class="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">NEW</span>
    </div>
    
    <!-- Tabs -->
    <div class="flex space-x-4 mb-6">
      <button id="tab-schedule" onclick="switchStudioTab('schedule')" class="px-4 py-2 bg-primary rounded-lg">智能排班</button>
      <button id="tab-tables" onclick="switchStudioTab('tables')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">桌台管理</button>
      <button id="tab-dealers" onclick="switchStudioTab('dealers')" class="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600">荷官档案</button>
    </div>
    
    <!-- 智能排班甘特图 -->
    <div id="studio-schedule" class="bg-gray-800 rounded-xl p-5">
      <div class="flex justify-between items-center mb-4">
        <h4 class="font-semibold"><i class="fas fa-calendar-alt text-primary mr-2"></i>排班概览</h4>
        <div class="flex items-center space-x-3">
          <div class="flex space-x-1">
            <button onclick="changeScheduleDate(-1)" class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"><i class="fas fa-chevron-left"></i></button>
            <input type="date" id="schedule-date" value="${dayjs().format('YYYY-MM-DD')}" onchange="loadScheduleData()" class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm">
            <button onclick="changeScheduleDate(1)" class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"><i class="fas fa-chevron-right"></i></button>
            <button onclick="document.getElementById('schedule-date').value=dayjs().format('YYYY-MM-DD');loadScheduleData()" class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">今天</button>
          </div>
          <button onclick="showAddShiftModal()" class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg">
            <i class="fas fa-plus mr-2"></i>新增排班
          </button>
        </div>
      </div>
      
      <!-- 甘特图 -->
      <div class="overflow-x-auto">
        <div class="min-w-[1000px]">
          <!-- 时间轴 -->
          <div class="flex border-b border-gray-700 pb-2 mb-2">
            <div class="w-32 flex-shrink-0"></div>
            ${hours.map(h => `<div class="flex-1 text-center text-sm text-gray-400">${h}:00</div>`).join('')}
          </div>
          
          <!-- 桌台排班行 -->
          ${tables.filter(t => t.table_status === 1).map(table => {
            const tableShifts = shifts.filter(s => s.table_id === table.id);
            return `
              <div class="flex items-center py-2 border-b border-gray-700">
                <div class="w-32 flex-shrink-0">
                  <p class="font-medium">${escapeHtml(table.table_code)}</p>
                  <p class="text-xs text-gray-400">${getGameTypeName(table.game_type)}</p>
                </div>
                <div class="flex-1 relative h-8 bg-gray-700 rounded">
                  ${tableShifts.map(s => {
                    const startHour = parseInt((s.shift_start_time || '08:00').split(':')[0]);
                    const endHour = parseInt((s.shift_end_time || '17:00').split(':')[0]);
                    const left = Math.max(0, ((startHour - 8) / 12) * 100);
                    const width = Math.min(100 - left, ((endHour - startHour) / 12) * 100);
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                    const color = colors[(s.dealer_id || 0) % colors.length];
                    return `
                      <div class="gantt-bar ${color} absolute top-1" style="left: ${left}%; width: ${width}%;" title="${escapeHtml(s.dealer_name || '')} ${s.shift_start_time}-${s.shift_end_time}">
                        ${escapeHtml(s.dealer_name || 'TBD')}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('') || '<div class="text-center text-gray-500 py-8">暂无运营中的桌台</div>'}
        </div>
      </div>
      
      <!-- 当前时间指示线 -->
      <div class="mt-4 p-3 bg-gray-700 rounded-lg flex items-center justify-between">
        <div class="flex items-center">
          <i class="fas fa-clock text-primary mr-2"></i>
          <span>当前时间: ${dayjs().format('HH:mm')}</span>
        </div>
        <div class="flex items-center text-yellow-400">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          <span>检测到桌台 ROU-001 维护中，请及时安排</span>
        </div>
      </div>
    </div>
    
    <!-- 桌台管理 -->
    <div id="studio-tables" class="hidden">
      <div class="flex justify-between items-center mb-4">
        <div class="flex space-x-2">
          <select id="table-game-filter" onchange="filterTables()" class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
            <option value="">全部游戏</option>
            <option value="baccarat">百家乐</option>
            <option value="roulette">轮盘</option>
            <option value="dragon_tiger">龙虎</option>
            <option value="dice">骰宝</option>
            <option value="blackjack">21点</option>
          </select>
          <select id="table-status-filter" onchange="filterTables()" class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm">
            <option value="">全部状态</option>
            <option value="1">运营中</option>
            <option value="0">维护中</option>
          </select>
        </div>
        <button onclick="showAddTableModal()" class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg">
          <i class="fas fa-plus mr-2"></i>新增桌台
        </button>
      </div>
      <div class="bg-gray-800 rounded-xl overflow-hidden">
        <table class="w-full data-table">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left p-4">桌台代码</th>
              <th class="text-left p-4">游戏类型</th>
              <th class="text-left p-4">当前荷官</th>
              <th class="text-left p-4">限红组</th>
              <th class="text-left p-4">投注限额</th>
              <th class="text-left p-4">视频流</th>
              <th class="text-left p-4">状态</th>
              <th class="text-left p-4">操作</th>
            </tr>
          </thead>
          <tbody id="tables-tbody">
            ${tables.map(t => `
              <tr class="border-t border-gray-700 hover:bg-gray-750">
                <td class="p-4">
                  <p class="font-medium">${escapeHtml(t.table_code)}</p>
                  <p class="text-sm text-gray-400">${escapeHtml(t.table_name || '')}</p>
                </td>
                <td class="p-4">${getGameTypeName(t.game_type)}</td>
                <td class="p-4">
                  ${t.dealer_name ? `<span class="text-green-400"><i class="fas fa-user mr-1"></i>${escapeHtml(t.dealer_name)}</span>` : '<span class="text-gray-500">空缺</span>'}
                </td>
                <td class="p-4">${escapeHtml(t.limit_group_name || '-')}</td>
                <td class="p-4 text-sm">
                  <span class="text-yellow-400">${formatNumber(t.min_bet || 0)}</span> - 
                  <span class="text-green-400">${formatNumber(t.max_bet || 0)}</span>
                </td>
                <td class="p-4">
                  <span class="${t.primary_stream_url ? 'text-green-400' : 'text-red-400'}">
                    <i class="fas fa-${t.primary_stream_url ? 'check-circle' : 'times-circle'} mr-1"></i>
                    ${t.primary_stream_url ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td class="p-4">${getTableStatusBadge(t.table_status)}</td>
                <td class="p-4">
                  <button onclick="editTable(${t.id})" class="text-blue-400 hover:text-blue-300 mr-2" title="编辑"><i class="fas fa-edit"></i></button>
                  <button onclick="showTableShiftModal(${t.id}, '${escapeJs(t.table_code)}')" class="text-purple-400 hover:text-purple-300" title="排班"><i class="fas fa-calendar"></i></button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="8" class="p-8 text-center text-gray-500">暂无桌台数据</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 荷官档案 -->
    <div id="studio-dealers" class="hidden">
      <div class="flex justify-between items-center mb-4">
        <div class="flex space-x-2">
          <button onclick="filterDealers('')" class="dealer-filter-btn px-4 py-2 bg-primary rounded-lg" data-status="">全部</button>
          <button onclick="filterDealers(1)" class="dealer-filter-btn px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600" data-status="1">在职</button>
          <button onclick="filterDealers(2)" class="dealer-filter-btn px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600" data-status="2">休假</button>
          <button onclick="filterDealers(0)" class="dealer-filter-btn px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600" data-status="0">离职</button>
        </div>
        <div class="flex space-x-2">
          <input type="text" id="dealer-search" placeholder="搜索工号/艺名" class="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm w-40">
          <button onclick="searchDealers()" class="bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded"><i class="fas fa-search"></i></button>
          <button onclick="showAddDealerModal()" class="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg">
            <i class="fas fa-plus mr-2"></i>新增荷官
          </button>
        </div>
      </div>
      
      <div id="dealers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        ${dealers.map(d => `
          <div class="bg-gray-800 rounded-xl p-5 text-center hover:bg-gray-750 transition">
            <div class="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden">
              ${d.avatar_url ? `<img src="${escapeHtml(d.avatar_url)}" class="w-full h-full object-cover">` : '<i class="fas fa-user text-3xl text-white"></i>'}
            </div>
            <h4 class="font-semibold text-lg">${escapeHtml(d.stage_name_cn || d.staff_id)}</h4>
            <p class="text-sm text-gray-400">${escapeHtml(d.stage_name_en || '')}</p>
            <p class="text-xs text-gray-500 mt-1">工号: ${escapeHtml(d.staff_id)}</p>
            <div class="mt-2 flex justify-center space-x-1">
              ${(d.skills ? JSON.parse(d.skills) : []).map(s => `<span class="text-xs bg-gray-700 px-2 py-0.5 rounded">${escapeHtml(s)}</span>`).join('')}
            </div>
            <div class="mt-3">
              ${getDealerStatusBadge(d.dealer_status)}
            </div>
            <div class="mt-4 flex justify-center space-x-2">
              <button onclick="editDealer(${d.id})" class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"><i class="fas fa-edit mr-1"></i>编辑</button>
              <button onclick="viewDealerDetail(${d.id})" class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"><i class="fas fa-eye mr-1"></i>详情</button>
            </div>
          </div>
        `).join('') || '<div class="col-span-4 text-center text-gray-500 py-12">暂无荷官数据</div>'}
      </div>
    </div>
  `;
}

function switchStudioTab(tab) {
  document.querySelectorAll('[id^="studio-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('[id^="tab-"]').forEach(el => {
    el.classList.remove('bg-primary');
    el.classList.add('bg-gray-700');
  });
  document.getElementById(`studio-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.remove('bg-gray-700');
  document.getElementById(`tab-${tab}`).classList.add('bg-primary');
}

// 荷官状态徽章
function getDealerStatusBadge(status) {
  const map = {
    1: { class: 'bg-green-600', text: '在职' },
    2: { class: 'bg-yellow-600', text: '休假' },
    0: { class: 'bg-gray-600', text: '离职' }
  };
  const s = map[status] || { class: 'bg-gray-600', text: '未知' };
  return `<span class="px-2 py-1 ${s.class} rounded text-xs">${s.text}</span>`;
}

// 桌台状态徽章
function getTableStatusBadge(status) {
  const map = {
    1: { class: 'bg-green-600', text: '运营中' },
    0: { class: 'bg-red-600', text: '维护中' }
  };
  const s = map[status] || { class: 'bg-gray-600', text: '未知' };
  return `<span class="px-2 py-1 ${s.class} rounded text-xs">${s.text}</span>`;
}

// =====================
// 新增荷官弹窗
// =====================
function showAddDealerModal() {
  const modal = document.createElement('div');
  modal.id = 'dealer-modal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
        <h3 class="text-lg font-semibold"><i class="fas fa-user-plus text-green-400 mr-2"></i>新增荷官</h3>
        <button onclick="closeDealerModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form id="dealer-form" onsubmit="submitDealer(event)" class="p-4 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">工号 <span class="text-red-400">*</span></label>
            <input type="text" name="staff_id" required placeholder="如: DL001" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">状态</label>
            <select name="dealer_status" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
              <option value="1">在职</option>
              <option value="2">休假</option>
              <option value="0">离职</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">中文艺名 <span class="text-red-400">*</span></label>
            <input type="text" name="stage_name_cn" required placeholder="荷官艺名" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">英文艺名</label>
            <input type="text" name="stage_name_en" placeholder="English Name" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">真实姓名</label>
            <input type="text" name="real_name" placeholder="真实姓名" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">性别</label>
            <select name="gender" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
              <option value="0">女</option>
              <option value="1">男</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">联系电话</label>
            <input type="tel" name="phone" placeholder="手机号码" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">入职日期</label>
            <input type="date" name="hire_date" value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">邮箱</label>
          <input type="email" name="email" placeholder="email@example.com" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">技能专长</label>
          <div class="flex flex-wrap gap-2">
            <label class="flex items-center"><input type="checkbox" name="skills" value="百家乐" class="mr-1"> 百家乐</label>
            <label class="flex items-center"><input type="checkbox" name="skills" value="轮盘" class="mr-1"> 轮盘</label>
            <label class="flex items-center"><input type="checkbox" name="skills" value="龙虎" class="mr-1"> 龙虎</label>
            <label class="flex items-center"><input type="checkbox" name="skills" value="骰宝" class="mr-1"> 骰宝</label>
            <label class="flex items-center"><input type="checkbox" name="skills" value="21点" class="mr-1"> 21点</label>
          </div>
        </div>
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onclick="closeDealerModal()" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded">取消</button>
          <button type="submit" class="px-4 py-2 bg-green-600 hover:bg-green-500 rounded"><i class="fas fa-save mr-1"></i>保存</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeDealerModal() {
  document.getElementById('dealer-modal')?.remove();
}

async function submitDealer(e) {
  e.preventDefault();
  const form = e.target;
  const skills = Array.from(form.querySelectorAll('input[name="skills"]:checked')).map(cb => cb.value);
  
  const data = {
    staff_id: form.staff_id.value.trim(),
    stage_name_cn: form.stage_name_cn.value.trim(),
    stage_name_en: form.stage_name_en.value.trim(),
    real_name: form.real_name.value.trim(),
    gender: parseInt(form.gender.value),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    hire_date: form.hire_date.value,
    dealer_status: parseInt(form.dealer_status.value),
    skills: skills
  };
  
  try {
    const result = await api('/api/dealers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('荷官创建成功！');
      closeDealerModal();
      loadModule('studio');
    } else {
      alert('创建失败: ' + result.error);
    }
  } catch (error) {
    alert('创建失败: ' + error.message);
  }
}

// =====================
// 新增桌台弹窗
// =====================
function showAddTableModal() {
  const modal = document.createElement('div');
  modal.id = 'table-modal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
        <h3 class="text-lg font-semibold"><i class="fas fa-table text-blue-400 mr-2"></i>新增桌台</h3>
        <button onclick="closeTableModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form id="table-form" onsubmit="submitTable(event)" class="p-4 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">桌台代码 <span class="text-red-400">*</span></label>
            <input type="text" name="table_code" required placeholder="如: BAC-001" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">桌台名称</label>
            <input type="text" name="table_name" placeholder="百家乐1号桌" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">游戏类型 <span class="text-red-400">*</span></label>
            <select name="game_type" required class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
              <option value="baccarat">百家乐</option>
              <option value="roulette">轮盘</option>
              <option value="dragon_tiger">龙虎</option>
              <option value="dice">骰宝</option>
              <option value="blackjack">21点</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">状态</label>
            <select name="table_status" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
              <option value="1">运营中</option>
              <option value="0">维护中</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">最小投注</label>
            <input type="number" name="min_bet" placeholder="100" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">最大投注</label>
            <input type="number" name="max_bet" placeholder="100000" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">主视频流URL</label>
          <input type="url" name="primary_stream_url" placeholder="rtmp://..." class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">备用视频流URL</label>
          <input type="url" name="backup_stream_url" placeholder="rtmp://..." class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">排序权重</label>
          <input type="number" name="sort_order" value="0" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
        </div>
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onclick="closeTableModal()" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded">取消</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"><i class="fas fa-save mr-1"></i>保存</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeTableModal() {
  document.getElementById('table-modal')?.remove();
}

async function submitTable(e) {
  e.preventDefault();
  const form = e.target;
  
  const data = {
    table_code: form.table_code.value.trim(),
    table_name: form.table_name.value.trim(),
    game_type: form.game_type.value,
    table_status: parseInt(form.table_status.value),
    min_bet: parseFloat(form.min_bet.value) || 0,
    max_bet: parseFloat(form.max_bet.value) || 0,
    primary_stream_url: form.primary_stream_url.value.trim(),
    backup_stream_url: form.backup_stream_url.value.trim(),
    sort_order: parseInt(form.sort_order.value) || 0
  };
  
  try {
    const result = await api('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('桌台创建成功！');
      closeTableModal();
      loadModule('studio');
    } else {
      alert('创建失败: ' + result.error);
    }
  } catch (error) {
    alert('创建失败: ' + error.message);
  }
}

// =====================
// 新增排班弹窗
// =====================
async function showAddShiftModal() {
  // 先获取荷官和桌台列表
  const [dealersRes, tablesRes] = await Promise.all([
    api('/api/dealers?dealer_status=1'),
    api('/api/tables?table_status=1')
  ]);
  
  const dealers = dealersRes.data || [];
  const tables = tablesRes.data || [];
  
  const modal = document.createElement('div');
  modal.id = 'shift-modal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl w-full max-w-lg mx-4">
      <div class="p-4 border-b border-gray-700 flex justify-between items-center">
        <h3 class="text-lg font-semibold"><i class="fas fa-calendar-plus text-purple-400 mr-2"></i>新增排班</h3>
        <button onclick="closeShiftModal()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <form id="shift-form" onsubmit="submitShift(event)" class="p-4 space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">选择荷官 <span class="text-red-400">*</span></label>
          <select name="dealer_id" required class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
            <option value="">请选择荷官</option>
            ${dealers.map(d => `<option value="${d.id}">${escapeHtml(d.staff_id)} - ${escapeHtml(d.stage_name_cn || '')}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">选择桌台 <span class="text-red-400">*</span></label>
          <select name="table_id" required class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
            <option value="">请选择桌台</option>
            ${tables.map(t => `<option value="${t.id}">${escapeHtml(t.table_code)} - ${getGameTypeName(t.game_type)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">排班日期 <span class="text-red-400">*</span></label>
          <input type="date" name="shift_date" required value="${dayjs().format('YYYY-MM-DD')}" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">开始时间 <span class="text-red-400">*</span></label>
            <input type="time" name="shift_start_time" required value="09:00" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">结束时间 <span class="text-red-400">*</span></label>
            <input type="time" name="shift_end_time" required value="17:00" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2">
          </div>
        </div>
        <div class="bg-gray-700 rounded p-3 text-sm">
          <p class="text-gray-400"><i class="fas fa-info-circle mr-1"></i>提示: 系统会自动检测排班冲突</p>
        </div>
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onclick="closeShiftModal()" class="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded">取消</button>
          <button type="submit" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded"><i class="fas fa-save mr-1"></i>保存</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
}

function closeShiftModal() {
  document.getElementById('shift-modal')?.remove();
}

async function submitShift(e) {
  e.preventDefault();
  const form = e.target;
  
  const data = {
    dealer_id: parseInt(form.dealer_id.value),
    table_id: parseInt(form.table_id.value),
    shift_date: form.shift_date.value,
    shift_start_time: form.shift_start_time.value,
    shift_end_time: form.shift_end_time.value
  };
  
  try {
    const result = await api('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('排班创建成功！');
      closeShiftModal();
      loadModule('studio');
    } else {
      alert('创建失败: ' + result.error);
    }
  } catch (error) {
    alert('创建失败: ' + error.message);
  }
}

// 排班日期切换
function changeScheduleDate(delta) {
  const input = document.getElementById('schedule-date');
  const current = dayjs(input.value);
  input.value = current.add(delta, 'day').format('YYYY-MM-DD');
  loadScheduleData();
}

async function loadScheduleData() {
  const date = document.getElementById('schedule-date')?.value || dayjs().format('YYYY-MM-DD');
  // 重新加载整个模块以刷新数据
  loadModule('studio');
}

// 荷官筛选
async function filterDealers(status) {
  document.querySelectorAll('.dealer-filter-btn').forEach(btn => {
    btn.classList.remove('bg-primary');
    btn.classList.add('bg-gray-700');
  });
  event.target.classList.remove('bg-gray-700');
  event.target.classList.add('bg-primary');
  
  let url = '/api/dealers';
  if (status !== '') url += `?dealer_status=${status}`;
  
  const result = await api(url);
  if (result.success) {
    renderDealersGrid(result.data);
  }
}

async function searchDealers() {
  const search = document.getElementById('dealer-search').value.trim();
  let url = '/api/dealers';
  if (search) url += `?search=${encodeURIComponent(search)}`;
  
  const result = await api(url);
  if (result.success) {
    renderDealersGrid(result.data);
  }
}

function renderDealersGrid(dealers) {
  const grid = document.getElementById('dealers-grid');
  if (!grid) return;
  
  grid.innerHTML = dealers.map(d => `
    <div class="bg-gray-800 rounded-xl p-5 text-center hover:bg-gray-750 transition">
      <div class="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden">
        ${d.avatar_url ? `<img src="${escapeHtml(d.avatar_url)}" class="w-full h-full object-cover">` : '<i class="fas fa-user text-3xl text-white"></i>'}
      </div>
      <h4 class="font-semibold text-lg">${escapeHtml(d.stage_name_cn || d.staff_id)}</h4>
      <p class="text-sm text-gray-400">${escapeHtml(d.stage_name_en || '')}</p>
      <p class="text-xs text-gray-500 mt-1">工号: ${escapeHtml(d.staff_id)}</p>
      <div class="mt-2 flex justify-center space-x-1">
        ${(d.skills ? JSON.parse(d.skills) : []).map(s => `<span class="text-xs bg-gray-700 px-2 py-0.5 rounded">${escapeHtml(s)}</span>`).join('')}
      </div>
      <div class="mt-3">
        ${getDealerStatusBadge(d.dealer_status)}
      </div>
      <div class="mt-4 flex justify-center space-x-2">
        <button onclick="editDealer(${d.id})" class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"><i class="fas fa-edit mr-1"></i>编辑</button>
        <button onclick="viewDealerDetail(${d.id})" class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"><i class="fas fa-eye mr-1"></i>详情</button>
      </div>
    </div>
  `).join('') || '<div class="col-span-4 text-center text-gray-500 py-12">暂无荷官数据</div>';
}

// 编辑荷官
async function editDealer(id) {
  const result = await api(`/api/dealers/${id}`);
  if (!result.success) {
    alert('获取荷官信息失败');
    return;
  }
  const d = result.data;
  
  showAddDealerModal();
  setTimeout(() => {
    const form = document.getElementById('dealer-form');
    form.staff_id.value = d.staff_id;
    form.staff_id.disabled = true;
    form.stage_name_cn.value = d.stage_name_cn || '';
    form.stage_name_en.value = d.stage_name_en || '';
    form.real_name.value = d.real_name || '';
    form.gender.value = d.gender || 0;
    form.phone.value = d.phone || '';
    form.email.value = d.email || '';
    form.hire_date.value = d.hire_date || '';
    form.dealer_status.value = d.dealer_status || 1;
    
    const skills = d.skills ? JSON.parse(d.skills) : [];
    form.querySelectorAll('input[name="skills"]').forEach(cb => {
      cb.checked = skills.includes(cb.value);
    });
    
    // 修改标题和提交逻辑
    document.querySelector('#dealer-modal h3').innerHTML = '<i class="fas fa-user-edit text-blue-400 mr-2"></i>编辑荷官';
    form.onsubmit = (e) => updateDealer(e, id);
  }, 100);
}

async function updateDealer(e, id) {
  e.preventDefault();
  const form = e.target;
  const skills = Array.from(form.querySelectorAll('input[name="skills"]:checked')).map(cb => cb.value);
  
  const data = {
    stage_name_cn: form.stage_name_cn.value.trim(),
    stage_name_en: form.stage_name_en.value.trim(),
    real_name: form.real_name.value.trim(),
    gender: parseInt(form.gender.value),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    dealer_status: parseInt(form.dealer_status.value),
    skills: skills
  };
  
  try {
    const result = await api(`/api/dealers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('荷官信息更新成功！');
      closeDealerModal();
      loadModule('studio');
    } else {
      alert('更新失败: ' + result.error);
    }
  } catch (error) {
    alert('更新失败: ' + error.message);
  }
}

// 查看荷官详情
async function viewDealerDetail(id) {
  const result = await api(`/api/dealers/${id}`);
  if (!result.success) {
    alert('获取荷官信息失败');
    return;
  }
  const d = result.data;
  
  const modal = document.createElement('div');
  modal.id = 'dealer-detail-modal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <div class="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
        <h3 class="text-lg font-semibold"><i class="fas fa-user text-primary mr-2"></i>荷官详情</h3>
        <button onclick="document.getElementById('dealer-detail-modal').remove()" class="text-gray-400 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <div class="p-4">
        <div class="flex items-start space-x-6 mb-6">
          <div class="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
            ${d.avatar_url ? `<img src="${escapeHtml(d.avatar_url)}" class="w-full h-full object-cover rounded-full">` : '<i class="fas fa-user text-4xl text-white"></i>'}
          </div>
          <div>
            <h4 class="text-xl font-bold">${escapeHtml(d.stage_name_cn || d.staff_id)}</h4>
            <p class="text-gray-400">${escapeHtml(d.stage_name_en || '')}</p>
            <p class="text-sm text-gray-500 mt-1">工号: ${escapeHtml(d.staff_id)}</p>
            <div class="mt-2">${getDealerStatusBadge(d.dealer_status)}</div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">真实姓名</p>
            <p class="font-medium">${escapeHtml(d.real_name || '-')}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">联系电话</p>
            <p class="font-medium">${escapeHtml(d.phone || '-')}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">邮箱</p>
            <p class="font-medium">${escapeHtml(d.email || '-')}</p>
          </div>
          <div class="bg-gray-700 rounded-lg p-3">
            <p class="text-gray-400 text-xs">入职日期</p>
            <p class="font-medium">${d.hire_date || '-'}</p>
          </div>
        </div>
        
        <div class="mb-6">
          <h5 class="font-medium mb-2">技能专长</h5>
          <div class="flex flex-wrap gap-2">
            ${(d.skills ? JSON.parse(d.skills) : []).map(s => `<span class="bg-primary/20 text-primary px-3 py-1 rounded">${escapeHtml(s)}</span>`).join('') || '<span class="text-gray-500">暂无</span>'}
          </div>
        </div>
        
        <div>
          <h5 class="font-medium mb-2">近期排班</h5>
          <div class="bg-gray-700 rounded-lg overflow-hidden">
            ${d.upcomingShifts?.length ? d.upcomingShifts.map(s => `
              <div class="p-3 border-b border-gray-600 last:border-0 flex justify-between">
                <span>${s.shift_date} ${s.shift_start_time} - ${s.shift_end_time}</span>
                <span class="text-gray-400">${escapeHtml(s.table_name || '-')}</span>
              </div>
            `).join('') : '<p class="p-3 text-gray-500 text-center">暂无排班</p>'}
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// 编辑桌台
async function editTable(id) {
  const result = await api('/api/tables');
  const table = result.data?.find(t => t.id === id);
  if (!table) {
    alert('获取桌台信息失败');
    return;
  }
  
  showAddTableModal();
  setTimeout(() => {
    const form = document.getElementById('table-form');
    form.table_code.value = table.table_code;
    form.table_code.disabled = true;
    form.table_name.value = table.table_name || '';
    form.game_type.value = table.game_type;
    form.table_status.value = table.table_status;
    form.min_bet.value = table.min_bet || '';
    form.max_bet.value = table.max_bet || '';
    form.primary_stream_url.value = table.primary_stream_url || '';
    form.backup_stream_url.value = table.backup_stream_url || '';
    form.sort_order.value = table.sort_order || 0;
    
    document.querySelector('#table-modal h3').innerHTML = '<i class="fas fa-edit text-blue-400 mr-2"></i>编辑桌台';
    form.onsubmit = (e) => updateTable(e, id);
  }, 100);
}

async function updateTable(e, id) {
  e.preventDefault();
  const form = e.target;
  
  const data = {
    table_name: form.table_name.value.trim(),
    table_status: parseInt(form.table_status.value),
    min_bet: parseFloat(form.min_bet.value) || 0,
    max_bet: parseFloat(form.max_bet.value) || 0,
    primary_stream_url: form.primary_stream_url.value.trim(),
    backup_stream_url: form.backup_stream_url.value.trim(),
    sort_order: parseInt(form.sort_order.value) || 0
  };
  
  try {
    const result = await api(`/api/tables/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      alert('桌台信息更新成功！');
      closeTableModal();
      loadModule('studio');
    } else {
      alert('更新失败: ' + result.error);
    }
  } catch (error) {
    alert('更新失败: ' + error.message);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 检查登录状态
  const savedUser = sessionStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showMainApp();
    loadModule('dashboard');
    updatePendingBadges();
  }
});

// 显示主应用
function showMainApp() {
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('admin-name').textContent = currentUser?.nickname || currentUser?.username || 'Admin';
  document.getElementById('admin-role').textContent = getRoleName(currentUser?.role);
}

// 更新待处理徽章
async function updatePendingBadges() {
  try {
    const result = await api('/api/dashboard/pending');
    if (result.success && result.data) {
      const d = result.data;
      // 财务徽章
      const financeBadge = document.getElementById('finance-badge');
      const financeCount = (d.withdraws?.count || 0) + (d.deposits?.count || 0);
      if (financeCount > 0) {
        financeBadge.textContent = financeCount;
        financeBadge.classList.remove('hidden');
      }
      // 风控徽章
      const riskBadge = document.getElementById('risk-badge');
      if (d.alerts?.count > 0) {
        riskBadge.textContent = d.alerts.count;
        riskBadge.classList.remove('hidden');
      }
      
      // 顶部状态栏提示标识 - 始终显示数量徽章
      // 存款申请提示
      const depositCount = document.getElementById('notify-deposit-count');
      if (depositCount) {
        const dCount = d.deposits?.count || 0;
        depositCount.classList.remove('hidden');
        depositCount.textContent = dCount > 99 ? '99+' : dCount;
        // 有待处理时红色背景，无待处理时灰色背景
        if (dCount > 0) {
          depositCount.classList.remove('bg-gray-500');
          depositCount.classList.add('bg-red-500');
        } else {
          depositCount.classList.remove('bg-red-500');
          depositCount.classList.add('bg-gray-500');
        }
      }
      
      // 取款申请提示
      const withdrawCount = document.getElementById('notify-withdraw-count');
      if (withdrawCount) {
        const wCount = d.withdraws?.count || 0;
        withdrawCount.classList.remove('hidden');
        withdrawCount.textContent = wCount > 99 ? '99+' : wCount;
        if (wCount > 0) {
          withdrawCount.classList.remove('bg-gray-500');
          withdrawCount.classList.add('bg-red-500');
        } else {
          withdrawCount.classList.remove('bg-red-500');
          withdrawCount.classList.add('bg-gray-500');
        }
      }
      
      // 风险预警提示
      const riskCount = document.getElementById('notify-risk-count');
      if (riskCount) {
        const aCount = d.alerts?.count || 0;
        riskCount.classList.remove('hidden');
        riskCount.textContent = aCount > 99 ? '99+' : aCount;
        if (aCount > 0) {
          riskCount.classList.remove('bg-gray-500');
          riskCount.classList.add('bg-red-500');
        } else {
          riskCount.classList.remove('bg-red-500');
          riskCount.classList.add('bg-gray-500');
        }
      }
    }
  } catch (e) {
    console.error('Failed to update badges:', e);
  }
}

// 顶部提示标识跳转函数
function goToDeposits() {
  loadModule('finance');
  // 稍后切换到存款标签
  setTimeout(() => {
    const depositTab = document.getElementById('tab-deposits');
    if (depositTab) depositTab.click();
  }, 300);
}

function goToWithdrawals() {
  loadModule('finance');
  // 稍后切换到取款标签
  setTimeout(() => {
    const withdrawTab = document.getElementById('tab-withdraws');
    if (withdrawTab) withdrawTab.click();
  }, 300);
}

function goToRiskAlerts() {
  loadModule('risk');
  // 风控页面默认就是预警列表
}

// 过滤内容
function filterContent(type) {
  loadModule('content');
}

// ========================================
// 玩家详情弹窗功能
// ========================================

// 显示玩家详情
async function viewPlayer(playerId) {
  try {
    const result = await api(`/api/players/${playerId}`);
    if (!result.success) {
      alert('加载玩家信息失败: ' + result.error);
      return;
    }
    
    const player = result.data;
    showPlayerDetailModal(player);
  } catch (error) {
    console.error('Error loading player:', error);
    alert('加载玩家信息失败');
  }
}

// 显示玩家详情弹窗
function showPlayerDetailModal(player) {
  const modal = document.createElement('div');
  modal.id = 'player-detail-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
  modal.onclick = (e) => { if (e.target === modal) closePlayerDetailModal(); };
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <!-- 标题栏 -->
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between sticky top-0 z-10">
        <h3 class="text-xl font-bold">
          <i class="fas fa-user-circle text-primary mr-2"></i>玩家详情 - ${escapeHtml(player.username)}
        </h3>
        <button onclick="closePlayerDetailModal()" class="text-gray-400 hover:text-white transition-colors">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <!-- 快捷操作按钮区 -->
      <div class="px-6 py-4 border-b border-gray-700 bg-gray-750">
        <h4 class="text-sm font-semibold text-gray-300 mb-3"><i class="fas fa-bolt mr-2 text-yellow-400"></i>快捷操作</h4>
        <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
          <button onclick="handlePlayerDeposit(${player.id})" class="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-all shadow-lg">
            <i class="fas fa-plus-circle mr-1"></i>存款
          </button>
          <button onclick="handlePlayerWithdraw(${player.id})" class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-all shadow-lg">
            <i class="fas fa-minus-circle mr-1"></i>提款
          </button>
          <button onclick="handlePlayerBalance(${player.id})" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-wallet mr-1"></i>余额
          </button>
          <button onclick="handlePlayerTransfer(${player.id})" class="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition-all shadow-lg">
            <i class="fas fa-exchange-alt mr-1"></i>转账
          </button>
          <button onclick="viewPlayerTransactions(${player.id})" class="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-history mr-1"></i>交易记录
          </button>
          <button onclick="handleKickPlayer(${player.id}, '${escapeJs(player.username)}')" class="px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium transition-all shadow-lg">
            <i class="fas fa-user-slash mr-1"></i>踢线
          </button>
        </div>
      </div>
      
      <!-- 内容区域 -->
      <div class="p-6">
        <div class="grid grid-cols-2 gap-6">
          <!-- 左侧：基本信息 -->
          <div>
            <h4 class="text-lg font-semibold mb-4 text-primary"><i class="fas fa-id-card mr-2"></i>基本信息</h4>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-400">用户ID:</span>
                <span class="font-mono">${player.id}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">账号:</span>
                <span class="font-medium">${escapeHtml(player.username)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">昵称:</span>
                <span>${escapeHtml(player.nickname || '-')}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">玩家姓名:</span>
                <span>${escapeHtml(player.real_name || '-')}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">手机号:</span>
                <span class="font-mono">${escapeHtml(player.phone || '-')}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">VIP等级:</span>
                <span class="bg-purple-600 px-2 py-1 rounded text-xs font-medium">VIP ${player.vip_level || 0}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">代理:</span>
                ${player.agent_id ? `<a href="javascript:void(0)" onclick="viewAgent(${player.agent_id})" class="text-blue-400 hover:text-blue-300 underline">${escapeHtml(player.agent_name || 'ID:' + player.agent_id)}</a>` : '<span class="text-gray-500">直属</span>'}
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">状态:</span>
                ${getStatusBadge(player.status)}
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">KYC状态:</span>
                ${player.kyc_status === 'verified' ? '<span class="text-green-400"><i class="fas fa-check-circle mr-1"></i>已验证</span>' : '<span class="text-yellow-400"><i class="fas fa-exclamation-circle mr-1"></i>未验证</span>'}
              </div>
            </div>
          </div>
          
          <!-- 右侧：账户信息 -->
          <div>
            <h4 class="text-lg font-semibold mb-4 text-primary"><i class="fas fa-money-bill-wave mr-2"></i>账户信息</h4>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-400">余额:</span>
                <span class="font-mono text-green-400 font-bold text-lg">${formatCurrency(player.balance)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">累计存款:</span>
                <span class="font-mono">${formatCurrency(player.total_deposit || 0)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">累计提款:</span>
                <span class="font-mono">${formatCurrency(player.total_withdraw || 0)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">累计投注:</span>
                <span class="font-mono">${formatCurrency(player.total_bet || 0)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">累计派彩:</span>
                <span class="font-mono">${formatCurrency(player.total_payout || 0)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">盈亏:</span>
                <span class="font-mono ${(player.total_payout - player.total_bet) >= 0 ? 'text-red-400' : 'text-green-400'}">${formatCurrency((player.total_payout || 0) - (player.total_bet || 0))}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">风险等级:</span>
                ${getRiskBadge(player.risk_level || 0)}
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">注册时间:</span>
                <span class="text-sm">${player.created_at || '-'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">最后登录:</span>
                <span class="text-sm">${player.last_login || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 管理功能按钮 -->
        <div class="mt-6 pt-6 border-t border-gray-700">
          <h4 class="text-sm font-semibold text-gray-300 mb-3"><i class="fas fa-cogs mr-2 text-blue-400"></i>管理功能</h4>
          <div class="grid grid-cols-3 gap-2">
            <button onclick="editPlayer(${player.id})" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all">
              <i class="fas fa-edit mr-1"></i>编辑资料
            </button>
            <button onclick="setPlayerRiskLevel(${player.id})" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition-all">
              <i class="fas fa-exclamation-triangle mr-1"></i>风险等级
            </button>
            <button onclick="setPlayerVIPLevel(${player.id})" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-all">
              <i class="fas fa-crown mr-1"></i>VIP等级
            </button>
            <button onclick="togglePlayerStatus(${player.id}, ${player.status})" class="px-4 py-2 ${player.status === 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} rounded-lg text-sm font-medium transition-all">
              <i class="fas fa-${player.status === 0 ? 'lock' : 'unlock'} mr-1"></i>${player.status === 0 ? '冻结账户' : '解冻账户'}
            </button>
            <button onclick="viewPlayerLogs(${player.id})" class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-all">
              <i class="fas fa-clipboard-list mr-1"></i>操作日志
            </button>
            <button onclick="sendPlayerMessage(${player.id})" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-medium transition-all">
              <i class="fas fa-envelope mr-1"></i>站内信
            </button>
            <button onclick="blockPlayer(${player.id})" class="px-4 py-2 bg-black hover:bg-gray-900 rounded-lg text-sm font-medium transition-all">
              <i class="fas fa-ban mr-1"></i>拉黑名单
            </button>
            <button onclick="closePlayerDetailModal()" class="px-4 py-2 bg-gray-700 hover:bg-gray-800 rounded-lg text-sm font-medium transition-all">
              <i class="fas fa-times mr-1"></i>关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// 关闭玩家详情弹窗
function closePlayerDetailModal() {
  const modal = document.getElementById('player-detail-modal');
  if (modal) {
    modal.remove();
  }
}

// 处理存款
function handlePlayerDeposit(playerId) {
  closePlayerDetailModal();
  loadModule('finance');
  setTimeout(() => {
    const depositTab = document.getElementById('tab-deposits');
    if (depositTab) depositTab.click();
    // TODO: 自动填充玩家ID
  }, 300);
}

// 处理提款
function handlePlayerWithdraw(playerId) {
  closePlayerDetailModal();
  loadModule('finance');
  setTimeout(() => {
    const withdrawTab = document.getElementById('tab-withdraws');
    if (withdrawTab) withdrawTab.click();
    // TODO: 自动填充玩家ID
  }, 300);
}

// 处理玩家存款
async function handlePlayerDeposit(playerId) {
  const modal = document.createElement('div');
  modal.id = 'player-deposit-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl max-w-md w-full" onclick="event.stopPropagation()">
      <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <h3 class="text-xl font-bold">
          <i class="fas fa-plus-circle text-green-400 mr-2"></i>玩家存款
        </h3>
        <button onclick="this.closest('#player-deposit-modal').remove()" class="text-gray-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form id="player-deposit-form" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">存款金额</label>
          <input type="number" name="amount" required min="1" step="0.01" placeholder="请输入存款金额..." 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">支付方式</label>
          <select name="payment_method" required 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            <option value="bank">银行卡转账</option>
            <option value="alipay">支付宝</option>
            <option value="wechat">微信支付</option>
            <option value="usdt">USDT</option>
            <option value="manual">人工存款</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">备注说明</label>
          <textarea name="remark" rows="3" placeholder="选填..." 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
        </div>
        
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button type="button" onclick="this.closest('#player-deposit-modal').remove()" 
            class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
            <i class="fas fa-times mr-1.5"></i>取消
          </button>
          <button type="submit" 
            class="px-5 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
            <i class="fas fa-check mr-1.5"></i>确认存款
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('player-deposit-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      player_id: playerId,
      amount: parseFloat(formData.get('amount')),
      payment_method: formData.get('payment_method'),
      remark: formData.get('remark')
    };
    
    try {
      const result = await api('/api/players/deposit', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (result.success) {
        showToast('存款成功', 'success');
        modal.remove();
        closePlayerDetailModal();
        viewPlayer(playerId);
      } else {
        showToast(result.error || '存款失败', 'error');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      showToast('存款失败: ' + error.message, 'error');
    }
  };
}

// 处理玩家提款
async function handlePlayerWithdraw(playerId) {
  const modal = document.createElement('div');
  modal.id = 'player-withdraw-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl max-w-md w-full" onclick="event.stopPropagation()">
      <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <h3 class="text-xl font-bold">
          <i class="fas fa-minus-circle text-red-400 mr-2"></i>玩家提款
        </h3>
        <button onclick="this.closest('#player-withdraw-modal').remove()" class="text-gray-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form id="player-withdraw-form" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">提款金额</label>
          <input type="number" name="amount" required min="1" step="0.01" placeholder="请输入提款金额..." 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">提款方式</label>
          <select name="withdraw_method" required 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            <option value="bank">银行卡</option>
            <option value="alipay">支付宝</option>
            <option value="wechat">微信</option>
            <option value="usdt">USDT</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">备注说明</label>
          <textarea name="remark" rows="3" placeholder="选填..." 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
        </div>
        
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button type="button" onclick="this.closest('#player-withdraw-modal').remove()" 
            class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
            <i class="fas fa-times mr-1.5"></i>取消
          </button>
          <button type="submit" 
            class="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
            <i class="fas fa-check mr-1.5"></i>确认提款
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('player-withdraw-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      player_id: playerId,
      amount: parseFloat(formData.get('amount')),
      withdraw_method: formData.get('withdraw_method'),
      remark: formData.get('remark')
    };
    
    try {
      const result = await api('/api/players/withdraw', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (result.success) {
        showToast('提款成功', 'success');
        modal.remove();
        closePlayerDetailModal();
        viewPlayer(playerId);
      } else {
        showToast(result.error || '提款失败', 'error');
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      showToast('提款失败: ' + error.message, 'error');
    }
  };
}

// 查看余额详情
async function handlePlayerBalance(playerId) {
  try {
    const result = await api(`/api/players/${playerId}/balance`);
    if (result.success) {
      alert(`当前余额: ${formatCurrency(result.data.balance)}\n冻结金额: ${formatCurrency(result.data.frozen || 0)}\n可用余额: ${formatCurrency(result.data.available)}`);
    } else {
      alert('获取余额失败: ' + result.error);
    }
  } catch (error) {
    alert('获取余额失败');
  }
}

// 处理转账
function handlePlayerTransfer(playerId) {
  closePlayerDetailModal();
  loadModule('reports');
  setTimeout(() => {
    const transferTab = document.getElementById('tab-transfers');
    if (transferTab) transferTab.click();
    // TODO: 自动填充玩家ID
  }, 300);
}

// 显示更多操作
function showPlayerMoreActions(playerId) {
  const actions = [
    { icon: 'fa-user-shield', text: '设置风险等级', action: () => setPlayerRiskLevel(playerId) },
    { icon: 'fa-star', text: '调整VIP等级', action: () => setPlayerVIPLevel(playerId) },
    { icon: 'fa-lock', text: '冻结/解冻账户', action: () => togglePlayerStatus(playerId) },
    { icon: 'fa-history', text: '查看操作日志', action: () => viewPlayerLogs(playerId) },
    { icon: 'fa-comment', text: '发送站内信', action: () => sendPlayerMessage(playerId) },
    { icon: 'fa-ban', text: '拉入黑名单', action: () => blockPlayer(playerId) }
  ];
  
  const actionsHTML = actions.map(a => `
    <button onclick="(${a.action})()" class="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors flex items-center">
      <i class="fas ${a.icon} text-primary mr-3"></i>
      <span>${a.text}</span>
    </button>
  `).join('');
  
  const modal = document.createElement('div');
  modal.id = 'player-actions-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl max-w-md w-full mx-4" onclick="event.stopPropagation()">
      <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <h3 class="text-lg font-semibold">更多操作</h3>
        <button onclick="this.closest('#player-actions-modal').remove()" class="text-gray-400 hover:text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="divide-y divide-gray-700">
        ${actionsHTML}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// 查看代理详情
async function viewAgent(agentId) {
  try {
    const result = await api(`/api/agents/${agentId}`);
    if (!result.success) {
      alert('加载代理信息失败: ' + result.error);
      return;
    }
    
    const agent = result.data;
    // 显示代理详情弹窗 (类似玩家详情)
    showAgentDetailModal(agent);
  } catch (error) {
    console.error('Error loading agent:', error);
    alert('加载代理信息失败');
  }
}

// 显示代理详情弹窗
function showAgentDetailModal(agent) {
  const modal = document.createElement('div');
  modal.id = 'agent-detail-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between sticky top-0 z-10">
        <h3 class="text-xl font-bold">
          <i class="fas fa-user-tie text-primary mr-2"></i>代理详情 - ${escapeHtml(agent.username)}
        </h3>
        <button onclick="this.closest('#agent-detail-modal').remove()" class="text-gray-400 hover:text-white transition-colors">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="p-6">
        <div class="grid grid-cols-2 gap-6">
          <div>
            <h4 class="text-lg font-semibold mb-4 text-primary"><i class="fas fa-id-card mr-2"></i>基本信息</h4>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-400">代理ID:</span>
                <span class="font-mono">${agent.id}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">账号:</span>
                <span class="font-medium">${escapeHtml(agent.username)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">代理等级:</span>
                <span class="bg-blue-600 px-2 py-1 rounded text-xs">Level ${agent.level || 1}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">上级代理:</span>
                ${agent.parent_id ? `<a href="javascript:void(0)" onclick="viewAgent(${agent.parent_id})" class="text-blue-400 hover:text-blue-300 underline">${escapeHtml(agent.parent_name || 'ID:' + agent.parent_id)}</a>` : '<span class="text-gray-500">顶级代理</span>'}
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">下级人数:</span>
                <span class="font-bold text-green-400">${agent.sub_count || 0}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">玩家人数:</span>
                <span class="font-bold text-blue-400">${agent.player_count || 0}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">状态:</span>
                ${getStatusBadge(agent.status)}
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">注册时间:</span>
                <span class="text-sm">${agent.created_at || '-'}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 class="text-lg font-semibold mb-4 text-primary"><i class="fas fa-chart-line mr-2"></i>业绩信息</h4>
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-400">总投注:</span>
                <span class="font-mono">${formatCurrency(agent.total_bet || 0)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">总派彩:</span>
                <span class="font-mono">${formatCurrency(agent.total_payout || 0)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">公司盈亏:</span>
                <span class="font-mono ${((agent.total_bet || 0) - (agent.total_payout || 0)) >= 0 ? 'text-green-400' : 'text-red-400'}">${formatCurrency((agent.total_bet || 0) - (agent.total_payout || 0))}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">佣金比例:</span>
                <span class="font-bold text-yellow-400">${(agent.commission_rate || 0) * 100}%</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">累计佣金:</span>
                <span class="font-mono text-orange-400">${formatCurrency(agent.total_commission || 0)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">本月业绩:</span>
                <span class="font-mono">${formatCurrency(agent.month_performance || 0)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 pt-6 border-t border-gray-700 flex justify-end gap-3">
          <button onclick="editAgent(${agent.id})" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-edit mr-1.5"></i>编辑资料
          </button>
          <button onclick="viewAgentPerformance(${agent.id})" class="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-chart-bar mr-1.5"></i>查看业绩
          </button>
          <button onclick="this.closest('#agent-detail-modal').remove()" class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-times mr-1.5"></i>关闭
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// 新增玩家功能
function showAddPlayerModal() {
  const modal = document.createElement('div');
  modal.id = 'add-player-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="bg-gradient-to-r from-gray-750 to-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between sticky top-0 z-10">
        <h3 class="text-xl font-bold">
          <i class="fas fa-user-plus text-primary mr-2"></i>新增玩家
        </h3>
        <button onclick="this.closest('#add-player-modal').remove()" class="text-gray-400 hover:text-white transition-colors">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form id="add-player-form" class="p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-300 text-sm mb-2">用户名 <span class="text-red-400">*</span></label>
            <input type="text" name="username" required class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:outline-none" placeholder="6-20位字母数字">
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-2">密码 <span class="text-red-400">*</span></label>
            <input type="password" name="password" required class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:outline-none" placeholder="6-20位">
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-2">昵称</label>
            <input type="text" name="nickname" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:outline-none" placeholder="可选">
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-2">真实姓名</label>
            <input type="text" name="real_name" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:outline-none" placeholder="可选">
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-2">手机号</label>
            <input type="tel" name="phone" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:outline-none" placeholder="可选">
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-2">邮箱</label>
            <input type="email" name="email" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:outline-none" placeholder="可选">
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-2">所属代理</label>
            <select name="agent_id" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:outline-none">
              <option value="">直属</option>
              <!-- 代理列表将动态加载 -->
            </select>
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-2">VIP等级</label>
            <select name="vip_level" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:outline-none">
              <option value="0">VIP 0</option>
              <option value="1">VIP 1</option>
              <option value="2">VIP 2</option>
              <option value="3">VIP 3</option>
              <option value="4">VIP 4</option>
              <option value="5">VIP 5</option>
            </select>
          </div>
        </div>
        
        <div class="pt-4 border-t border-gray-700 flex justify-end gap-3">
          <button type="button" onclick="this.closest('#add-player-modal').remove()" class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-times mr-1.5"></i>取消
          </button>
          <button type="submit" class="px-5 py-2 bg-primary hover:bg-blue-700 rounded-lg text-sm font-medium transition-all">
            <i class="fas fa-check mr-1.5"></i>确认创建
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 绑定表单提交事件
  document.getElementById('add-player-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      const result = await api('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (result.success) {
        alert('创建玩家成功！');
        modal.remove();
        searchPlayers(); // 刷新玩家列表
      } else {
        alert('创建失败: ' + result.error);
      }
    } catch (error) {
      alert('创建失败，请稍后重试');
    }
  };
  
  // 加载代理列表
  loadAgentsForSelect();
}

// 加载代理列表到下拉框
async function loadAgentsForSelect() {
  try {
    // 只加载"代理"级别的账号（不包括总代理和股东）
    const result = await api('/api/agents?level=agent&status=1');
    if (result.success && result.data) {
      const select = document.querySelector('#add-player-form select[name="agent_id"]');
      if (select) {
        if (result.data.length === 0) {
          select.innerHTML = '<option value="">暂无可用代理</option>';
          showToast('系统中暂无可用代理，请先创建代理账号', 'warning');
        } else {
          const options = result.data.map(agent => 
            `<option value="${agent.id}">${escapeHtml(agent.agent_username || agent.username)} (ID:${agent.id})</option>`
          ).join('');
          select.innerHTML = '<option value="">直属</option>' + options;
        }
      }
    }
  } catch (error) {
    console.error('Error loading agents:', error);
    showToast('加载代理列表失败', 'error');
  }
}

// 玩家详情弹窗中的踢线功能
async function handleKickPlayer(playerId, username) {
  if (!confirm(`确定要将玩家「${username}」踢出登录吗？\n\n踢线后该玩家将被强制下线，需要重新登录才能继续游戏。`)) return;
  
  try {
    const result = await api(`/api/players/${playerId}/kick`, { method: 'POST' });
    if (result.success) {
      showToast(`玩家「${username}」已被踢出登录`, 'success');
      
      // 关闭玩家详情弹窗
      closePlayerDetailModal();
      
      // 刷新玩家列表
      if (typeof loadPlayers === 'function') {
        loadPlayers();
      }
    } else {
      showToast(result.error || '踢线失败', 'error');
    }
  } catch (error) {
    console.error('Kick player error:', error);
    showToast('踢线失败: ' + error.message, 'error');
  }
}

// 生成可点击的账号链接（通用函数）
// type: 'player' | 'agent' | 'shareholder'
// id: 账号ID
// name: 账号名称
// extraInfo: 额外信息（如VIP等级等）
function makeAccountClickable(type, id, name, extraInfo = '') {
  if (!id || !name) return escapeHtml(name || '-');
  
  const escapedName = escapeHtml(name);
  const escapedExtra = extraInfo ? ' ' + escapeHtml(extraInfo) : '';
  
  let onclickHandler = '';
  switch(type) {
    case 'player':
      onclickHandler = `viewPlayer(${id})`;
      break;
    case 'agent':
      onclickHandler = `viewAgent(${id})`;
      break;
    case 'shareholder':
      onclickHandler = `viewAgent(${id})`; // 股东也使用代理查看
      break;
    default:
      return escapedName + escapedExtra;
  }
  
  return `<a href="javascript:void(0)" onclick="${onclickHandler}" class="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors">${escapedName}</a>${escapedExtra}`;
}

// 快捷函数：生成玩家账号链接
function playerLink(playerId, playerName, vipLevel = null) {
  const extraInfo = vipLevel !== null ? `<span class="text-xs text-purple-400 ml-1">VIP${vipLevel}</span>` : '';
  return makeAccountClickable('player', playerId, playerName, extraInfo);
}

// 快捷函数：生成代理账号链接
function agentLink(agentId, agentName, level = null) {
  const extraInfo = level !== null ? `<span class="text-xs text-gray-400 ml-1">L${level}</span>` : '';
  return makeAccountClickable('agent', agentId, agentName, extraInfo);
}

// 快捷函数：生成股东账号链接
function shareholderLink(shareholderId, shareholderName) {
  return makeAccountClickable('shareholder', shareholderId, shareholderName);
}

// ==========================================
// VIP等级管理功能
// ==========================================

// 切换玩家标签页
function switchPlayerTab(tab) {
  // 隐藏所有标签内容
  document.querySelectorAll('[id^="player-"]').forEach(el => {
    if (el.id === 'player-search' || el.id === 'player-status' || el.id === 'player-vip' || el.id === 'player-risk' || el.id === 'player-online-status') {
      return; // 跳过搜索框等输入元素
    }
    el.classList.add('hidden');
  });
  
  // 移除所有标签按钮的active状态
  document.querySelectorAll('[id^="tab-player-"]').forEach(el => {
    el.classList.remove('bg-primary');
    el.classList.add('bg-gray-700');
  });
  
  // 显示选中的标签内容
  const contentId = tab === 'list' ? 'player-list' : 'player-vip-config';
  document.getElementById(contentId).classList.remove('hidden');
  
  // 激活选中的标签按钮
  const tabButtonId = tab === 'list' ? 'tab-player-list' : 'tab-vip-config';
  const tabButton = document.getElementById(tabButtonId);
  tabButton.classList.add('bg-primary');
  tabButton.classList.remove('bg-gray-700');
  
  // 如果切换到VIP配置，加载VIP等级列表
  if (tab === 'vip-config') {
    loadVipLevels();
  }
}

// 加载VIP等级列表
async function loadVipLevels() {
  const grid = document.getElementById('vip-levels-grid');
  if (!grid) return;
  
  grid.innerHTML = '<div class="text-center text-gray-400 py-8 col-span-full"><i class="fas fa-spinner fa-spin mr-2"></i>加载中...</div>';
  
  try {
    const result = await api('/api/vip-levels');
    if (!result.success) {
      grid.innerHTML = `<div class="text-center text-red-400 py-8 col-span-full">${result.error || '加载失败'}</div>`;
      return;
    }
    
    const levels = result.data || [];
    
    if (levels.length === 0) {
      grid.innerHTML = `
        <div class="text-center text-gray-400 py-12 col-span-full">
          <i class="fas fa-crown text-6xl mb-4 text-gray-600"></i>
          <p class="text-lg">暂无VIP等级配置</p>
          <p class="text-sm mt-2">点击右上角"新增VIP等级"按钮开始配置</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = levels.map(level => {
      const levelColors = [
        'from-gray-500 to-gray-600',     // VIP0
        'from-green-500 to-green-600',   // VIP1
        'from-blue-500 to-blue-600',     // VIP2
        'from-purple-500 to-purple-600', // VIP3
        'from-pink-500 to-pink-600',     // VIP4
        'from-red-500 to-red-600',       // VIP5
        'from-orange-500 to-orange-600', // VIP6
        'from-yellow-500 to-yellow-600', // VIP7
        'from-cyan-500 to-cyan-600',     // VIP8
        'from-indigo-500 to-indigo-600'  // VIP9
      ];
      
      const colorClass = levelColors[level.level] || 'from-gray-500 to-gray-600';
      
      return `
        <div class="bg-gray-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 ${level.is_active ? '' : 'opacity-60'}">
          <!-- VIP等级头部 -->
          <div class="bg-gradient-to-r ${colorClass} p-6 text-center relative">
            <div class="absolute top-3 right-3">
              ${level.is_active ? '<span class="bg-green-500 text-white text-xs px-2 py-1 rounded-full">启用</span>' : '<span class="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">禁用</span>'}
            </div>
            <i class="fas fa-crown text-white text-5xl mb-3"></i>
            <h3 class="text-white text-2xl font-bold">${escapeHtml(level.level_name || 'VIP' + level.level)}</h3>
            <p class="text-white text-opacity-90 text-sm mt-1">等级 ${level.level}</p>
          </div>
          
          <!-- VIP等级详情 -->
          <div class="p-5 space-y-3">
            <!-- 升级条件 -->
            <div class="bg-gray-700 rounded-lg p-3">
              <p class="text-gray-400 text-xs mb-2"><i class="fas fa-chart-line mr-1"></i>升级条件</p>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-300">累计充值:</span>
                  <span class="text-green-400 font-medium">${formatCurrency(level.min_deposit || 0)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-300">累计投注:</span>
                  <span class="text-cyan-400 font-medium">${formatCurrency(level.min_bet || 0)}</span>
                </div>
              </div>
            </div>
            
            <!-- 专属权益 -->
            <div class="bg-gray-700 rounded-lg p-3">
              <p class="text-gray-400 text-xs mb-2"><i class="fas fa-gift mr-1"></i>专属权益</p>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-300">升级红利:</span>
                  <span class="text-yellow-400 font-medium">${formatCurrency(level.upgrade_bonus || 0)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-300">每日红利:</span>
                  <span class="text-yellow-400 font-medium">${formatCurrency(level.daily_bonus || 0)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-300">返水比例:</span>
                  <span class="text-blue-400 font-medium">${((level.rebate_rate || 0) * 100).toFixed(2)}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-300">提款限额:</span>
                  <span class="text-purple-400 font-medium">${level.withdraw_limit ? formatCurrency(level.withdraw_limit) : '无限制'}</span>
                </div>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="flex gap-2 pt-2">
              <button onclick="editVipLevel(${level.id})" class="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-all">
                <i class="fas fa-edit mr-1"></i>编辑
              </button>
              <button onclick="toggleVipLevel(${level.id}, ${level.is_active})" class="flex-1 bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-lg text-sm font-medium transition-all">
                <i class="fas fa-${level.is_active ? 'pause' : 'play'} mr-1"></i>${level.is_active ? '禁用' : '启用'}
              </button>
              <button onclick="deleteVipLevel(${level.id}, '${escapeJs(level.level_name || 'VIP' + level.level)}')" class="bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm transition-all">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Load VIP levels error:', error);
    grid.innerHTML = `<div class="text-center text-red-400 py-8 col-span-full">加载失败: ${error.message}</div>`;
  }
}

// 显示新增VIP等级弹窗
function showAddVipLevelModal() {
  const modal = document.createElement('div');
  modal.id = 'vip-level-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
  modal.onclick = (e) => { if (e.target === modal) closeVipLevelModal(); };
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
      <!-- 标题栏 -->
      <div class="bg-gradient-to-r from-yellow-600 to-orange-600 px-6 py-4 border-b border-gray-700 flex items-center justify-between sticky top-0 z-10">
        <h3 class="text-xl font-bold text-white">
          <i class="fas fa-crown mr-2"></i>新增VIP等级
        </h3>
        <button onclick="closeVipLevelModal()" class="text-white hover:text-gray-200 transition-colors">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <!-- 表单内容 -->
      <form id="vip-level-form" class="p-6 space-y-6">
        <!-- 基本信息 -->
        <div>
          <h4 class="font-semibold text-lg mb-4 text-primary"><i class="fas fa-info-circle mr-2"></i>基本信息</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">VIP等级 <span class="text-red-400">*</span></label>
              <input type="number" name="level" required min="0" max="9" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0-9">
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">等级名称 <span class="text-red-400">*</span></label>
              <input type="text" name="level_name" required class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="如：青铜会员">
            </div>
          </div>
        </div>
        
        <!-- 升级条件 -->
        <div>
          <h4 class="font-semibold text-lg mb-4 text-green-400"><i class="fas fa-chart-line mr-2"></i>升级条件</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">最低累计充值 ($)</label>
              <input type="number" name="min_deposit" min="0" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0">
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">最低累计投注 ($)</label>
              <input type="number" name="min_bet" min="0" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0">
            </div>
          </div>
        </div>
        
        <!-- 专属权益 -->
        <div>
          <h4 class="font-semibold text-lg mb-4 text-yellow-400"><i class="fas fa-gift mr-2"></i>专属权益</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">升级红利 ($)</label>
              <input type="number" name="upgrade_bonus" min="0" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0">
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">每日签到红利 ($)</label>
              <input type="number" name="daily_bonus" min="0" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0">
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">返水比例 (%)</label>
              <input type="number" name="rebate_rate" min="0" max="100" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="0">
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">单次提款限额 ($)</label>
              <input type="number" name="withdraw_limit" min="0" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="留空表示无限制">
            </div>
          </div>
        </div>
        
        <!-- 其他设置 -->
        <div>
          <h4 class="font-semibold text-lg mb-4 text-purple-400"><i class="fas fa-cog mr-2"></i>其他设置</h4>
          <div class="space-y-3">
            <div class="flex items-center">
              <input type="checkbox" name="is_active" checked class="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary">
              <label class="ml-2 text-gray-300">启用该VIP等级</label>
            </div>
            <div>
              <label class="block text-gray-400 text-sm mb-2">备注说明</label>
              <textarea name="description" rows="3" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-primary" placeholder="VIP等级的详细描述..."></textarea>
            </div>
          </div>
        </div>
        
        <!-- 提交按钮 -->
        <div class="flex gap-3 pt-4 border-t border-gray-700">
          <button type="submit" class="flex-1 bg-primary hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-all">
            <i class="fas fa-save mr-2"></i>保存VIP等级
          </button>
          <button type="button" onclick="closeVipLevelModal()" class="flex-1 bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-all">
            <i class="fas fa-times mr-2"></i>取消
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 绑定表单提交事件
  document.getElementById('vip-level-form').onsubmit = async (e) => {
    e.preventDefault();
    await submitVipLevel();
  };
}

// 关闭VIP等级弹窗
function closeVipLevelModal() {
  const modal = document.getElementById('vip-level-modal');
  if (modal) modal.remove();
}

// 提交VIP等级
async function submitVipLevel(levelId = null) {
  const form = document.getElementById('vip-level-form');
  const formData = new FormData(form);
  
  const data = {
    level: parseInt(formData.get('level')),
    level_name: formData.get('level_name'),
    min_deposit: parseFloat(formData.get('min_deposit')) || 0,
    min_bet: parseFloat(formData.get('min_bet')) || 0,
    upgrade_bonus: parseFloat(formData.get('upgrade_bonus')) || 0,
    daily_bonus: parseFloat(formData.get('daily_bonus')) || 0,
    rebate_rate: parseFloat(formData.get('rebate_rate')) / 100 || 0,
    withdraw_limit: parseFloat(formData.get('withdraw_limit')) || null,
    is_active: formData.get('is_active') === 'on' ? 1 : 0,
    description: formData.get('description') || ''
  };
  
  try {
    const url = levelId ? `/api/vip-levels/${levelId}` : '/api/vip-levels';
    const method = levelId ? 'PUT' : 'POST';
    
    const result = await api(url, { method, body: JSON.stringify(data) });
    
    if (result.success) {
      showToast(levelId ? 'VIP等级更新成功' : 'VIP等级创建成功', 'success');
      closeVipLevelModal();
      loadVipLevels();
    } else {
      showToast(result.error || '操作失败', 'error');
    }
  } catch (error) {
    console.error('Submit VIP level error:', error);
    showToast('操作失败: ' + error.message, 'error');
  }
}

// 编辑VIP等级
async function editVipLevel(levelId) {
  try {
    const result = await api(`/api/vip-levels/${levelId}`);
    if (!result.success) {
      showToast('加载VIP等级信息失败', 'error');
      return;
    }
    
    const level = result.data;
    
    // 创建编辑弹窗（复用新增弹窗的HTML）
    showAddVipLevelModal();
    
    // 修改标题
    document.querySelector('#vip-level-modal h3').innerHTML = '<i class="fas fa-crown mr-2"></i>编辑VIP等级';
    
    // 填充表单数据
    const form = document.getElementById('vip-level-form');
    form.querySelector('[name="level"]').value = level.level;
    form.querySelector('[name="level_name"]').value = level.level_name;
    form.querySelector('[name="min_deposit"]').value = level.min_deposit || 0;
    form.querySelector('[name="min_bet"]').value = level.min_bet || 0;
    form.querySelector('[name="upgrade_bonus"]').value = level.upgrade_bonus || 0;
    form.querySelector('[name="daily_bonus"]').value = level.daily_bonus || 0;
    form.querySelector('[name="rebate_rate"]').value = (level.rebate_rate * 100) || 0;
    form.querySelector('[name="withdraw_limit"]').value = level.withdraw_limit || '';
    form.querySelector('[name="is_active"]').checked = level.is_active;
    form.querySelector('[name="description"]').value = level.description || '';
    
    // 修改提交事件
    form.onsubmit = async (e) => {
      e.preventDefault();
      await submitVipLevel(levelId);
    };
    
  } catch (error) {
    console.error('Edit VIP level error:', error);
    showToast('加载失败: ' + error.message, 'error');
  }
}

// 切换VIP等级状态
async function toggleVipLevel(levelId, currentStatus) {
  const action = currentStatus ? '禁用' : '启用';
  if (!confirm(`确定要${action}该VIP等级吗？`)) return;
  
  try {
    const result = await api(`/api/vip-levels/${levelId}/toggle`, { method: 'PUT' });
    if (result.success) {
      showToast(`${action}成功`, 'success');
      loadVipLevels();
    } else {
      showToast(result.error || `${action}失败`, 'error');
    }
  } catch (error) {
    console.error('Toggle VIP level error:', error);
    showToast(`${action}失败: ` + error.message, 'error');
  }
}

// 删除VIP等级
async function deleteVipLevel(levelId, levelName) {
  if (!confirm(`确定要删除VIP等级「${levelName}」吗？\n\n删除后无法恢复，已使用该等级的玩家将不受影响。`)) return;
  
  try {
    const result = await api(`/api/vip-levels/${levelId}`, { method: 'DELETE' });
    if (result.success) {
      showToast('删除成功', 'success');
      loadVipLevels();
    } else {
      showToast(result.error || '删除失败', 'error');
    }
  } catch (error) {
    console.error('Delete VIP level error:', error);
    showToast('删除失败: ' + error.message, 'error');
  }
}

// ==================== 玩家详情相关功能 ====================

// 编辑玩家资料
async function editPlayer(playerId) {
  try {
    const response = await api(`/api/players/${playerId}`);
    if (!response.success) {
      showToast('获取玩家信息失败', 'error');
      return;
    }
    
    const player = response.data;
    const modal = document.createElement('div');
    modal.id = 'edit-player-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
          <h3 class="text-xl font-bold">
            <i class="fas fa-user-edit text-blue-400 mr-2"></i>编辑玩家资料
          </h3>
          <button onclick="this.closest('#edit-player-modal').remove()" class="text-gray-400 hover:text-white transition-colors">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form id="edit-player-form" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">账号</label>
              <input type="text" value="${escapeHtml(player.username)}" disabled 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">昵称</label>
              <input type="text" name="nickname" value="${escapeHtml(player.nickname || '')}" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">真实姓名</label>
              <input type="text" name="real_name" value="${escapeHtml(player.real_name || '')}" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">手机号</label>
              <input type="tel" name="phone" value="${escapeHtml(player.phone || '')}" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">邮箱</label>
              <input type="email" name="email" value="${escapeHtml(player.email || '')}" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">QQ号</label>
              <input type="text" name="qq" value="${escapeHtml(player.qq || '')}" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">备注</label>
            <textarea name="remark" rows="3" 
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">${escapeHtml(player.remark || '')}</textarea>
          </div>
          
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button type="button" onclick="this.closest('#edit-player-modal').remove()" 
              class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
              <i class="fas fa-times mr-1.5"></i>取消
            </button>
            <button type="submit" 
              class="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <i class="fas fa-save mr-1.5"></i>保存
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 表单提交
    document.getElementById('edit-player-form').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      try {
        const result = await api(`/api/players/${playerId}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        
        if (result.success) {
          showToast('编辑成功', 'success');
          modal.remove();
          // 刷新玩家详情
          closePlayerDetailModal();
          viewPlayer(playerId);
        } else {
          showToast(result.error || '编辑失败', 'error');
        }
      } catch (error) {
        console.error('Edit player error:', error);
        showToast('编辑失败: ' + error.message, 'error');
      }
    };
  } catch (error) {
    console.error('Load player error:', error);
    showToast('加载玩家信息失败', 'error');
  }
}

// 查看玩家交易记录
async function viewPlayerTransactions(playerId) {
  try {
    const response = await api(`/api/players/${playerId}/transactions`);
    if (!response.success) {
      showToast('获取交易记录失败', 'error');
      return;
    }
    
    const transactions = response.data || [];
    const modal = document.createElement('div');
    modal.id = 'player-transactions-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 class="text-xl font-bold">
            <i class="fas fa-exchange-alt text-green-400 mr-2"></i>交易记录
          </h3>
          <button onclick="this.closest('#player-transactions-modal').remove()" class="text-gray-400 hover:text-white transition-colors">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto">
          <div class="bg-gray-750 rounded-lg overflow-hidden">
            <table class="w-full">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left text-sm font-medium">订单号</th>
                  <th class="px-4 py-3 text-left text-sm font-medium">类型</th>
                  <th class="px-4 py-3 text-right text-sm font-medium">金额</th>
                  <th class="px-4 py-3 text-right text-sm font-medium">余额前</th>
                  <th class="px-4 py-3 text-right text-sm font-medium">余额后</th>
                  <th class="px-4 py-3 text-left text-sm font-medium">状态</th>
                  <th class="px-4 py-3 text-left text-sm font-medium">时间</th>
                  <th class="px-4 py-3 text-left text-sm font-medium">备注</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                ${transactions.length === 0 ? `
                  <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                      <i class="fas fa-inbox text-4xl mb-2"></i>
                      <p>暂无交易记录</p>
                    </td>
                  </tr>
                ` : transactions.map(t => `
                  <tr class="hover:bg-gray-700 transition-colors">
                    <td class="px-4 py-3 font-mono text-sm">${t.order_no || '-'}</td>
                    <td class="px-4 py-3">
                      ${getTransactionTypeBadge(t.type)}
                    </td>
                    <td class="px-4 py-3 text-right font-mono ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}">
                      ${t.amount >= 0 ? '+' : ''}${formatCurrency(t.amount)}
                    </td>
                    <td class="px-4 py-3 text-right font-mono">${formatCurrency(t.balance_before || 0)}</td>
                    <td class="px-4 py-3 text-right font-mono">${formatCurrency(t.balance_after || 0)}</td>
                    <td class="px-4 py-3">${getStatusBadge(t.status)}</td>
                    <td class="px-4 py-3 text-sm text-gray-400">${formatDate(t.created_at)}</td>
                    <td class="px-4 py-3 text-sm text-gray-400">${escapeHtml(t.remark || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="mt-4 flex justify-end">
            <button onclick="this.closest('#player-transactions-modal').remove()" 
              class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
              <i class="fas fa-times mr-1.5"></i>关闭
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Load transactions error:', error);
    showToast('加载交易记录失败', 'error');
  }
}

// 交易类型徽章
function getTransactionTypeBadge(type) {
  const types = {
    'deposit': { text: '存款', color: 'bg-green-600' },
    'withdraw': { text: '提款', color: 'bg-red-600' },
    'bet': { text: '投注', color: 'bg-blue-600' },
    'payout': { text: '派彩', color: 'bg-yellow-600' },
    'transfer_in': { text: '转入', color: 'bg-purple-600' },
    'transfer_out': { text: '转出', color: 'bg-orange-600' },
    'bonus': { text: '红利', color: 'bg-pink-600' },
    'commission': { text: '佣金', color: 'bg-indigo-600' },
    'adjust': { text: '调整', color: 'bg-gray-600' }
  };
  const t = types[type] || { text: type, color: 'bg-gray-600' };
  return `<span class="${t.color} px-2 py-1 rounded text-xs">${t.text}</span>`;
}

// 设置玩家风险等级
async function setPlayerRiskLevel(playerId) {
  const modal = document.createElement('div');
  modal.id = 'set-risk-level-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl max-w-md w-full" onclick="event.stopPropagation()">
      <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <h3 class="text-xl font-bold">
          <i class="fas fa-user-shield text-yellow-400 mr-2"></i>设置风险等级
        </h3>
        <button onclick="this.closest('#set-risk-level-modal').remove()" class="text-gray-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form id="set-risk-level-form" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">风险等级</label>
          <select name="risk_level" required 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            <option value="low">低风险 - 正常玩家</option>
            <option value="medium">中风险 - 需要关注</option>
            <option value="high">高风险 - 重点监控</option>
            <option value="blacklist">黑名单 - 禁止操作</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">备注说明</label>
          <textarea name="remark" rows="3" placeholder="请说明设置原因..." 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
        </div>
        
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button type="button" onclick="this.closest('#set-risk-level-modal').remove()" 
            class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
            <i class="fas fa-times mr-1.5"></i>取消
          </button>
          <button type="submit" 
            class="px-5 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors">
            <i class="fas fa-save mr-1.5"></i>确定
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('set-risk-level-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      const result = await api(`/api/players/${playerId}/risk-level`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      if (result.success) {
        showToast('设置成功', 'success');
        modal.remove();
        closePlayerDetailModal();
        viewPlayer(playerId);
      } else {
        showToast(result.error || '设置失败', 'error');
      }
    } catch (error) {
      console.error('Set risk level error:', error);
      showToast('设置失败: ' + error.message, 'error');
    }
  };
}

// 调整玩家VIP等级
async function setPlayerVIPLevel(playerId) {
  try {
    // 加载VIP等级列表
    const vipResponse = await api('/api/vip-levels');
    const vipLevels = vipResponse.data || [];
    
    const modal = document.createElement('div');
    modal.id = 'set-vip-level-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl max-w-md w-full" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 class="text-xl font-bold">
            <i class="fas fa-star text-yellow-400 mr-2"></i>调整VIP等级
          </h3>
          <button onclick="this.closest('#set-vip-level-modal').remove()" class="text-gray-400 hover:text-white">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form id="set-vip-level-form" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">VIP等级</label>
            <select name="vip_level" required 
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
              ${vipLevels.map(v => `
                <option value="${v.level}">${v.level_name || 'VIP' + v.level} (升级奖励: ${formatCurrency(v.upgrade_bonus || 0)})</option>
              `).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">
              <input type="checkbox" name="send_bonus" value="1" checked class="mr-2">
              发放升级奖励
            </label>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">备注说明</label>
            <textarea name="remark" rows="3" placeholder="请说明调整原因..." 
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
          </div>
          
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button type="button" onclick="this.closest('#set-vip-level-modal').remove()" 
              class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
              <i class="fas fa-times mr-1.5"></i>取消
            </button>
            <button type="submit" 
              class="px-5 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors">
              <i class="fas fa-save mr-1.5"></i>确定
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('set-vip-level-form').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        vip_level: parseInt(formData.get('vip_level')),
        send_bonus: formData.get('send_bonus') === '1',
        remark: formData.get('remark')
      };
      
      try {
        const result = await api(`/api/players/${playerId}/vip-level`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        
        if (result.success) {
          showToast('调整成功', 'success');
          modal.remove();
          closePlayerDetailModal();
          viewPlayer(playerId);
        } else {
          showToast(result.error || '调整失败', 'error');
        }
      } catch (error) {
        console.error('Set VIP level error:', error);
        showToast('调整失败: ' + error.message, 'error');
      }
    };
  } catch (error) {
    console.error('Load VIP levels error:', error);
    showToast('加载VIP等级失败', 'error');
  }
}

// 查看玩家操作日志
async function viewPlayerLogs(playerId) {
  try {
    const response = await api(`/api/players/${playerId}/logs`);
    if (!response.success) {
      showToast('获取操作日志失败', 'error');
      return;
    }
    
    const logs = response.data || [];
    const modal = document.createElement('div');
    modal.id = 'player-logs-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h3 class="text-xl font-bold">
            <i class="fas fa-history text-blue-400 mr-2"></i>操作日志
          </h3>
          <button onclick="this.closest('#player-logs-modal').remove()" class="text-gray-400 hover:text-white transition-colors">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto">
          <div class="bg-gray-750 rounded-lg overflow-hidden">
            <table class="w-full">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left text-sm font-medium">时间</th>
                  <th class="px-4 py-3 text-left text-sm font-medium">操作类型</th>
                  <th class="px-4 py-3 text-left text-sm font-medium">操作人</th>
                  <th class="px-4 py-3 text-left text-sm font-medium">IP地址</th>
                  <th class="px-4 py-3 text-left text-sm font-medium">详细内容</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                ${logs.length === 0 ? `
                  <tr>
                    <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                      <i class="fas fa-inbox text-4xl mb-2"></i>
                      <p>暂无操作日志</p>
                    </td>
                  </tr>
                ` : logs.map(log => `
                  <tr class="hover:bg-gray-700 transition-colors">
                    <td class="px-4 py-3 text-sm text-gray-400">${formatDate(log.created_at)}</td>
                    <td class="px-4 py-3">
                      <span class="bg-blue-600 px-2 py-1 rounded text-xs">${escapeHtml(log.action_type)}</span>
                    </td>
                    <td class="px-4 py-3">${escapeHtml(log.operator_name || '-')}</td>
                    <td class="px-4 py-3 font-mono text-sm">${escapeHtml(log.ip_address || '-')}</td>
                    <td class="px-4 py-3 text-sm text-gray-400">${escapeHtml(log.description || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="mt-4 flex justify-end">
            <button onclick="this.closest('#player-logs-modal').remove()" 
              class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
              <i class="fas fa-times mr-1.5"></i>关闭
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Load player logs error:', error);
    showToast('加载操作日志失败', 'error');
  }
}

// 发送站内信给玩家
async function sendPlayerMessage(playerId) {
  const modal = document.createElement('div');
  modal.id = 'send-message-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-xl max-w-2xl w-full" onclick="event.stopPropagation()">
      <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
        <h3 class="text-xl font-bold">
          <i class="fas fa-comment text-blue-400 mr-2"></i>发送站内信
        </h3>
        <button onclick="this.closest('#send-message-modal').remove()" class="text-gray-400 hover:text-white">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form id="send-message-form" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">消息类型</label>
          <select name="type" required 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            <option value="notice">通知消息</option>
            <option value="warning">警告消息</option>
            <option value="promotion">优惠活动</option>
            <option value="system">系统消息</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">消息标题</label>
          <input type="text" name="title" required placeholder="请输入消息标题..." 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">消息内容</label>
          <textarea name="content" rows="6" required placeholder="请输入消息内容..." 
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"></textarea>
        </div>
        
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button type="button" onclick="this.closest('#send-message-modal').remove()" 
            class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
            <i class="fas fa-times mr-1.5"></i>取消
          </button>
          <button type="submit" 
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <i class="fas fa-paper-plane mr-1.5"></i>发送
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('send-message-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
      const result = await api(`/api/players/${playerId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (result.success) {
        showToast('发送成功', 'success');
        modal.remove();
      } else {
        showToast(result.error || '发送失败', 'error');
      }
    } catch (error) {
      console.error('Send message error:', error);
      showToast('发送失败: ' + error.message, 'error');
    }
  };
}

// 拉黑玩家
async function blockPlayer(playerId) {
  if (!confirm('确定要将该玩家拉入黑名单吗？\n\n拉黑后该玩家将无法登录和进行任何操作。')) return;
  
  const reason = prompt('请输入拉黑原因:');
  if (!reason) return;
  
  try {
    const result = await api(`/api/players/${playerId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
    
    if (result.success) {
      showToast('拉黑成功', 'success');
      closePlayerDetailModal();
      if (typeof searchPlayers === 'function') searchPlayers();
    } else {
      showToast(result.error || '拉黑失败', 'error');
    }
  } catch (error) {
    console.error('Block player error:', error);
    showToast('拉黑失败: ' + error.message, 'error');
  }
}

// ==================== 代理详情相关功能 ====================

// 编辑代理资料
async function editAgent(agentId) {
  try {
    const response = await api(`/api/agents/${agentId}`);
    if (!response.success) {
      showToast('获取代理信息失败', 'error');
      return;
    }
    
    const agent = response.data;
    const modal = document.createElement('div');
    modal.id = 'edit-agent-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
          <h3 class="text-xl font-bold">
            <i class="fas fa-user-edit text-blue-400 mr-2"></i>编辑代理资料
          </h3>
          <button onclick="this.closest('#edit-agent-modal').remove()" class="text-gray-400 hover:text-white transition-colors">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <form id="edit-agent-form" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">账号</label>
              <input type="text" value="${escapeHtml(agent.username)}" disabled 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">昵称</label>
              <input type="text" name="nickname" value="${escapeHtml(agent.nickname || '')}" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">真实姓名</label>
              <input type="text" name="real_name" value="${escapeHtml(agent.real_name || '')}" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">手机号</label>
              <input type="tel" name="phone" value="${escapeHtml(agent.phone || '')}" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">邮箱</label>
              <input type="email" name="email" value="${escapeHtml(agent.email || '')}" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
            <div>
              <label class="block text-sm font-medium mb-2">佣金比例 (%)</label>
              <input type="number" name="commission_rate" value="${(agent.commission_rate || 0) * 100}" 
                min="0" max="100" step="0.01" 
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">备注</label>
            <textarea name="remark" rows="3" 
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary">${escapeHtml(agent.remark || '')}</textarea>
          </div>
          
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button type="button" onclick="this.closest('#edit-agent-modal').remove()" 
              class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
              <i class="fas fa-times mr-1.5"></i>取消
            </button>
            <button type="submit" 
              class="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <i class="fas fa-save mr-1.5"></i>保存
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('edit-agent-form').onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      // 转换佣金比例为小数
      data.commission_rate = parseFloat(data.commission_rate) / 100;
      
      try {
        const result = await api(`/api/agents/${agentId}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        
        if (result.success) {
          showToast('编辑成功', 'success');
          modal.remove();
          // 刷新代理详情
          const agentModal = document.getElementById('agent-detail-modal');
          if (agentModal) agentModal.remove();
          viewAgentDetail(agentId);
        } else {
          showToast(result.error || '编辑失败', 'error');
        }
      } catch (error) {
        console.error('Edit agent error:', error);
        showToast('编辑失败: ' + error.message, 'error');
      }
    };
  } catch (error) {
    console.error('Load agent error:', error);
    showToast('加载代理信息失败', 'error');
  }
}

// 查看代理业绩
async function viewAgentPerformance(agentId) {
  try {
    const response = await api(`/api/agents/${agentId}/performance`);
    if (!response.success) {
      showToast('获取代理业绩失败', 'error');
      return;
    }
    
    const performance = response.data || {};
    const modal = document.createElement('div');
    modal.id = 'agent-performance-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
          <h3 class="text-xl font-bold">
            <i class="fas fa-chart-bar text-purple-400 mr-2"></i>代理业绩
          </h3>
          <button onclick="this.closest('#agent-performance-modal').remove()" class="text-gray-400 hover:text-white transition-colors">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="p-6 space-y-6">
          <!-- 统计卡片 -->
          <div class="grid grid-cols-4 gap-4">
            <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4">
              <div class="text-sm text-blue-200 mb-1">团队人数</div>
              <div class="text-2xl font-bold">${performance.total_members || 0}</div>
            </div>
            <div class="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4">
              <div class="text-sm text-green-200 mb-1">玩家人数</div>
              <div class="text-2xl font-bold">${performance.total_players || 0}</div>
            </div>
            <div class="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-4">
              <div class="text-sm text-purple-200 mb-1">总投注</div>
              <div class="text-xl font-bold">${formatCurrency(performance.total_bet || 0)}</div>
            </div>
            <div class="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-4">
              <div class="text-sm text-orange-200 mb-1">总佣金</div>
              <div class="text-xl font-bold">${formatCurrency(performance.total_commission || 0)}</div>
            </div>
          </div>
          
          <!-- 本月业绩 -->
          <div class="bg-gray-750 rounded-lg p-6">
            <h4 class="text-lg font-semibold mb-4 flex items-center">
              <i class="fas fa-calendar-alt text-primary mr-2"></i>本月业绩
            </h4>
            <div class="grid grid-cols-3 gap-6">
              <div>
                <div class="text-sm text-gray-400 mb-1">月度投注</div>
                <div class="text-xl font-mono">${formatCurrency(performance.month_bet || 0)}</div>
              </div>
              <div>
                <div class="text-sm text-gray-400 mb-1">公司盈亏</div>
                <div class="text-xl font-mono ${(performance.month_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
                  ${formatCurrency(performance.month_profit || 0)}
                </div>
              </div>
              <div>
                <div class="text-sm text-gray-400 mb-1">月度佣金</div>
                <div class="text-xl font-mono text-yellow-400">${formatCurrency(performance.month_commission || 0)}</div>
              </div>
            </div>
          </div>
          
          <!-- 下级代理列表 -->
          ${(performance.sub_agents || []).length > 0 ? `
            <div class="bg-gray-750 rounded-lg p-6">
              <h4 class="text-lg font-semibold mb-4 flex items-center">
                <i class="fas fa-users text-primary mr-2"></i>下级代理
              </h4>
              <div class="space-y-2">
                ${performance.sub_agents.map(sub => `
                  <div class="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-650 transition-colors">
                    <div class="flex items-center gap-3">
                      <span class="font-medium">${escapeHtml(sub.username)}</span>
                      <span class="text-xs text-gray-400">Level ${sub.level}</span>
                    </div>
                    <div class="flex items-center gap-6 text-sm">
                      <div>
                        <span class="text-gray-400">下级:</span>
                        <span class="font-mono ml-1">${sub.sub_count || 0}</span>
                      </div>
                      <div>
                        <span class="text-gray-400">玩家:</span>
                        <span class="font-mono ml-1">${sub.player_count || 0}</span>
                      </div>
                      <div>
                        <span class="text-gray-400">投注:</span>
                        <span class="font-mono ml-1">${formatCurrency(sub.total_bet || 0)}</span>
                      </div>
                      <button onclick="viewAgentDetail(${sub.id})" class="text-blue-400 hover:text-blue-300">
                        <i class="fas fa-eye"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="flex justify-end">
            <button onclick="this.closest('#agent-performance-modal').remove()" 
              class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
              <i class="fas fa-times mr-1.5"></i>关闭
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('Load agent performance error:', error);
    showToast('加载代理业绩失败', 'error');
  }
}

// ==========================================
// 代理层级关系管理
// ==========================================

// 更新上级代理选项（根据选择的级别）
async function updateParentAgentOptions() {
  const levelSelect = document.getElementById('agent-level-select');
  const parentSelect = document.getElementById('parent-agent-select');
  const parentHint = document.getElementById('parent-hint');
  const requiredMark = document.getElementById('parent-required-mark');
  
  if (!levelSelect || !parentSelect) return;
  
  const selectedLevel = levelSelect.value;
  
  // 清空当前选项
  parentSelect.innerHTML = '<option value="">加载中...</option>';
  
  // 根据角色设置提示和要求
  let hint = '';
  let isRequired = true;
  
  switch(selectedLevel) {
    case 'shareholder':
      hint = '(股东无需上级)';
      isRequired = false;
      break;
    case 'general_agent':
      hint = '(需要选择上级：股东)';
      isRequired = true;
      break;
    case 'agent':
      hint = '(需要选择上级：股东或总代理)';
      isRequired = true;
      break;
    default:
      parentSelect.innerHTML = '<option value="">请先选择角色</option>';
      parentHint.textContent = '';
      return;
  }
  
  parentHint.textContent = hint;
  
  if (isRequired) {
    requiredMark.style.display = 'inline';
    parentSelect.required = true;
  } else {
    requiredMark.style.display = 'none';
    parentSelect.required = false;
  }
  
  // 如果是股东，不需要上级
  if (selectedLevel === 'shareholder') {
    parentSelect.innerHTML = '<option value="">无需上级</option>';
    parentSelect.disabled = true;
    return;
  }
  
  // 加载可选的上级代理列表
  try {
    let queryParams = 'status=1';
    
    // 总代理只能选择股东作为上级
    if (selectedLevel === 'general_agent') {
      queryParams += '&level=shareholder';
    }
    // 代理可以选择股东或总代理作为上级
    else if (selectedLevel === 'agent') {
      queryParams += '&level=shareholder,general_agent';
    }
    
    const result = await api(`/api/agents?${queryParams}`);
    
    if (!result.success) {
      parentSelect.innerHTML = '<option value="">加载失败</option>';
      showToast('加载上级代理列表失败', 'error');
      return;
    }
    
    const agents = result.data || [];
    
    if (agents.length === 0) {
      parentSelect.innerHTML = '<option value="">暂无可用上级</option>';
      showToast('系统中暂无可用上级代理，请先创建股东或总代理账号', 'warning');
      return;
    }
    
    // 生成选项（按角色分组显示）
    const shareholders = agents.filter(a => a.level === 'shareholder');
    const generalAgents = agents.filter(a => a.level === 'general_agent');
    
    let optionsHTML = '<option value="">请选择上级代理</option>';
    
    if (shareholders.length > 0) {
      optionsHTML += '<optgroup label="股东">';
      optionsHTML += shareholders.map(agent => 
        `<option value="${agent.id}">${escapeHtml(agent.agent_username || agent.username)} (ID:${agent.id})</option>`
      ).join('');
      optionsHTML += '</optgroup>';
    }
    
    if (generalAgents.length > 0 && selectedLevel === 'agent') {
      optionsHTML += '<optgroup label="总代理">';
      optionsHTML += generalAgents.map(agent => 
        `<option value="${agent.id}">${escapeHtml(agent.agent_username || agent.username)} (ID:${agent.id})</option>`
      ).join('');
      optionsHTML += '</optgroup>';
    }
    
    parentSelect.innerHTML = optionsHTML;
    parentSelect.disabled = false;
    
  } catch (error) {
    console.error('Load parent agents error:', error);
    parentSelect.innerHTML = '<option value="">加载失败</option>';
    showToast('加载上级代理列表失败: ' + error.message, 'error');
  }
}

// 验证代理层级关系
function validateAgentHierarchy() {
  const levelSelect = document.getElementById('agent-level-select');
  const parentSelect = document.getElementById('parent-agent-select');
  
  if (!levelSelect || !parentSelect) return true;
  
  const level = levelSelect.value;
  const parentId = parentSelect.value;
  
  // 股东不需要上级
  if (level === 'shareholder') {
    return true;
  }
  
  // 总代理和代理必须有上级
  if ((level === 'agent' || level === 'general_agent') && !parentId) {
    const levelName = level === 'agent' ? '代理' : '总代理';
    showToast(`${levelName}必须选择上级代理`, 'error');
    return false;
  }
  
  return true;
}

// 修改后的创建代理函数（添加层级验证）
async function createAgent(modal) {
  // 验证层级关系
  if (!validateAgentHierarchy()) {
    return;
  }
  
  const form = document.getElementById('add-agent-form');
  const formData = new FormData(form);
  
  // 收集专属域名
  const domains = [];
  document.querySelectorAll('#new-domains-list input[name="domain"]').forEach(input => {
    if (input.value.trim()) domains.push(input.value.trim());
  });
  
  const data = {
    agent_username: formData.get('agent_username'),
    password: formData.get('password'),
    nickname: formData.get('nickname'),
    level: formData.get('level'),
    parent_id: formData.get('parent_id') || null,
    share_ratio: parseFloat(formData.get('share_ratio')) || 0,
    commission_ratio: parseFloat(formData.get('commission_ratio')) || 0,
    contact_phone: formData.get('contact_phone'),
    contact_email: formData.get('contact_email'),
    domains: domains
  };
  
  try {
    const result = await api('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      showToast('代理创建成功', 'success');
      modal.remove();
      loadModule('agents'); // 刷新代理列表
    } else {
      showToast(result.error || '创建失败', 'error');
    }
  } catch (error) {
    console.error('Create agent error:', error);
    showToast('创建失败: ' + error.message, 'error');
  }
}

// 更新编辑模式的上级代理选项
async function updateEditParentAgentOptions(agentId, currentParentId = null) {
  const levelSelect = document.getElementById('edit-agent-level-select');
  const parentSelect = document.getElementById('edit-parent-agent-select');
  const parentHint = document.getElementById('edit-parent-hint');
  const requiredMark = document.getElementById('edit-parent-required-mark');
  
  if (!levelSelect || !parentSelect) return;
  
  const selectedLevel = levelSelect.value;
  
  // 清空当前选项
  parentSelect.innerHTML = '<option value="">加载中...</option>';
  
  // 根据角色设置提示和要求
  let hint = '';
  let isRequired = true;
  
  switch(selectedLevel) {
    case 'shareholder':
      hint = '(股东无需上级)';
      isRequired = false;
      break;
    case 'general_agent':
      hint = '(需要选择上级：股东)';
      isRequired = true;
      break;
    case 'agent':
      hint = '(需要选择上级：股东或总代理)';
      isRequired = true;
      break;
    default:
      parentSelect.innerHTML = '<option value="">请先选择角色</option>';
      parentHint.textContent = '';
      return;
  }
  
  parentHint.textContent = hint;
  
  if (isRequired) {
    requiredMark.style.display = 'inline';
    parentSelect.required = true;
  } else {
    requiredMark.style.display = 'none';
    parentSelect.required = false;
  }
  
  // 如果是股东，不需要上级
  if (selectedLevel === 'shareholder') {
    parentSelect.innerHTML = '<option value="">无需上级</option>';
    parentSelect.disabled = true;
    return;
  }
  
  // 加载可选的上级代理列表
  try {
    let queryParams = 'status=1';
    
    // 总代理只能选择股东作为上级
    if (selectedLevel === 'general_agent') {
      queryParams += '&level=shareholder';
    }
    // 代理可以选择股东或总代理作为上级
    else if (selectedLevel === 'agent') {
      queryParams += '&level=shareholder,general_agent';
    }
    
    const result = await api(`/api/agents?${queryParams}`);
    
    if (!result.success) {
      parentSelect.innerHTML = '<option value="">加载失败</option>';
      showToast('加载上级代理列表失败', 'error');
      return;
    }
    
    const agents = result.data || [];
    
    // 过滤掉当前正在编辑的代理（避免循环引用）
    const filteredAgents = agents.filter(agent => agent.id !== agentId);
    
    if (filteredAgents.length === 0) {
      parentSelect.innerHTML = '<option value="">暂无可用上级</option>';
      showToast('系统中暂无可用上级代理', 'warning');
      return;
    }
    
    // 生成选项（按角色分组显示）
    const shareholders = filteredAgents.filter(a => a.level === 'shareholder');
    const generalAgents = filteredAgents.filter(a => a.level === 'general_agent');
    
    let optionsHTML = '<option value="">请选择上级代理</option>';
    
    if (shareholders.length > 0) {
      optionsHTML += '<optgroup label="股东">';
      optionsHTML += shareholders.map(agent => 
        `<option value="${agent.id}" ${agent.id === currentParentId ? 'selected' : ''}>${escapeHtml(agent.agent_username || agent.username)} (ID:${agent.id})</option>`
      ).join('');
      optionsHTML += '</optgroup>';
    }
    
    if (generalAgents.length > 0 && selectedLevel === 'agent') {
      optionsHTML += '<optgroup label="总代理">';
      optionsHTML += generalAgents.map(agent => 
        `<option value="${agent.id}" ${agent.id === currentParentId ? 'selected' : ''}>${escapeHtml(agent.agent_username || agent.username)} (ID:${agent.id})</option>`
      ).join('');
      optionsHTML += '</optgroup>';
    }
    
    parentSelect.innerHTML = optionsHTML;
    parentSelect.disabled = false;
    
  } catch (error) {
    console.error('Load parent agents error:', error);
    parentSelect.innerHTML = '<option value="">加载失败</option>';
    showToast('加载上级代理列表失败: ' + error.message, 'error');
  }
}

// 验证编辑模式的代理层级关系
function validateEditAgentHierarchy() {
  const levelSelect = document.getElementById('edit-agent-level-select');
  const parentSelect = document.getElementById('edit-parent-agent-select');
  
  if (!levelSelect || !parentSelect) return true;
  
  const level = levelSelect.value;
  const parentId = parentSelect.value;
  
  // 股东不需要上级
  if (level === 'shareholder') {
    return true;
  }
  
  // 总代理和代理必须有上级
  if ((level === 'agent' || level === 'general_agent') && !parentId) {
    const levelName = level === 'agent' ? '代理' : '总代理';
    showToast(`${levelName}必须选择上级代理`, 'error');
    return false;
  }
  
  return true;
}

// ==========================================
// 财务密码管理
// ==========================================

// 加载财务密码配置
async function loadFinancePasswordConfig() {
  try {
    const result = await api('/api/finance-password/config');
    if (result.success && result.data) {
      const config = result.data;
      
      // 更新密码状态
      for (let i = 1; i <= 3; i++) {
        const pwd = config.passwords?.find(p => p.slot === i);
        const statusEl = document.getElementById(`pwd${i}-status`);
        const nameEl = document.getElementById(`pwd${i}-name`);
        
        if (pwd && pwd.is_set) {
          statusEl.textContent = '已设置';
          statusEl.className = 'px-2 py-1 rounded text-xs bg-green-600';
          if (nameEl) nameEl.value = pwd.name || '';
        } else {
          statusEl.textContent = '未设置';
          statusEl.className = 'px-2 py-1 rounded text-xs bg-gray-600';
        }
      }
      
      // 更新验证规则
      if (config.required_count) {
        const radio = document.querySelector(`input[name="pwd-required-count"][value="${config.required_count}"]`);
        if (radio) radio.checked = true;
      }
    }
  } catch (error) {
    console.error('Load finance password config error:', error);
  }
}

// 保存财务密码
async function saveFinancePassword(slot) {
  const nameEl = document.getElementById(`pwd${slot}-name`);
  const valueEl = document.getElementById(`pwd${slot}-value`);
  
  const name = nameEl?.value?.trim();
  const password = valueEl?.value?.trim();
  
  if (!name) {
    showToast('请输入密码名称', 'warning');
    nameEl?.focus();
    return;
  }
  
  if (!password) {
    showToast('请输入密码值', 'warning');
    valueEl?.focus();
    return;
  }
  
  if (password.length < 6 || password.length > 20) {
    showToast('密码长度必须为 6-20 位', 'warning');
    valueEl?.focus();
    return;
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    showToast('密码只能包含数字和字母', 'warning');
    valueEl?.focus();
    return;
  }
  
  try {
    const result = await api('/api/finance-password/set', {
      method: 'POST',
      body: JSON.stringify({ slot, name, password })
    });
    
    if (result.success) {
      showToast(`财务密码 #${slot} 设置成功`, 'success');
      valueEl.value = ''; // 清空密码输入
      loadFinancePasswordConfig(); // 重新加载配置
    } else {
      showToast(result.error || '设置失败', 'error');
    }
  } catch (error) {
    console.error('Save finance password error:', error);
    showToast('设置失败: ' + error.message, 'error');
  }
}

// 切换密码可见性
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(`${inputId}-icon`);
  
  if (!input || !icon) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

// 重置财务密码（超级管理员功能）
async function resetFinancePassword(slot) {
  // 检查权限（可以在这里添加更严格的权限检查）
  if (!currentUser || currentUser.role !== 'super_admin') {
    showToast('只有超级管理员可以重置财务密码', 'error');
    return;
  }
  
  if (!confirm(`确认要重置财务密码 #${slot} 吗？\n重置后该密码将被清空，需要重新设置。`)) {
    return;
  }
  
  try {
    const result = await api(`/api/finance-password/reset/${slot}`, {
      method: 'POST'
    });
    
    if (result.success) {
      showToast(`财务密码 #${slot} 已重置`, 'success');
      
      // 清空输入框
      const nameEl = document.getElementById(`pwd${slot}-name`);
      const valueEl = document.getElementById(`pwd${slot}-value`);
      if (nameEl) nameEl.value = '';
      if (valueEl) valueEl.value = '';
      
      // 重新加载配置
      loadFinancePasswordConfig();
    } else {
      showToast(result.error || '重置失败', 'error');
    }
  } catch (error) {
    console.error('Reset finance password error:', error);
    showToast('重置失败: ' + error.message, 'error');
  }
}

// 保存密码验证规则
async function savePasswordRule() {
  const requiredCount = document.querySelector('input[name="pwd-required-count"]:checked')?.value;
  
  if (!requiredCount) {
    showToast('请选择所需密码数量', 'warning');
    return;
  }
  
  try {
    const result = await api('/api/finance-password/rule', {
      method: 'POST',
      body: JSON.stringify({ required_count: parseInt(requiredCount) })
    });
    
    if (result.success) {
      showToast('验证规则配置已保存', 'success');
      loadFinancePasswordConfig();
    } else {
      showToast(result.error || '保存失败', 'error');
    }
  } catch (error) {
    console.error('Save password rule error:', error);
    showToast('保存失败: ' + error.message, 'error');
  }
}

// 验证财务密码（用于资金操作）
async function verifyFinancePassword(operation, amount) {
  return new Promise((resolve, reject) => {
    // 创建密码验证弹窗
    const modal = document.createElement('div');
    modal.id = 'finance-password-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]';
    modal.onclick = (e) => { if (e.target === modal) reject(new Error('用户取消验证')); };
    
    // 获取需要的密码数量
    api('/api/finance-password/config').then(result => {
      const config = result.data || {};
      const requiredCount = config.required_count || 1;
      const passwords = config.passwords || [];
      const activePasswords = passwords.filter(p => p.is_set);
      
      if (activePasswords.length === 0) {
        showToast('请先设置财务密码', 'warning');
        reject(new Error('未设置财务密码'));
        return;
      }
      
      if (activePasswords.length < requiredCount) {
        showToast(`需要设置至少 ${requiredCount} 个财务密码`, 'warning');
        reject(new Error('财务密码数量不足'));
        return;
      }
      
      let passwordInputsHTML = '';
      for (let i = 1; i <= requiredCount; i++) {
        const pwd = passwords.find(p => p.slot === i) || { slot: i, name: `密码 #${i}` };
        passwordInputsHTML += `
          <div class="mb-4">
            <label class="block text-gray-300 text-sm mb-2">
              <i class="fas fa-key text-blue-400 mr-2"></i>${escapeHtml(pwd.name)}
            </label>
            <input type="password" id="pwd-input-${i}" placeholder="请输入${escapeHtml(pwd.name)}" 
              class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2.5 focus:border-primary focus:outline-none"
              required>
          </div>
        `;
      }
      
      modal.innerHTML = `
        <div class="bg-gray-800 rounded-xl max-w-md w-full mx-4 p-6" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold flex items-center">
              <i class="fas fa-shield-alt text-red-400 mr-2"></i>
              财务密码验证
            </h3>
            <button onclick="document.getElementById('finance-password-modal').remove()" class="text-gray-400 hover:text-white">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <div class="bg-gray-700 rounded-lg p-4 mb-6">
            <div class="flex items-start">
              <i class="fas fa-info-circle text-blue-400 mt-0.5 mr-3"></i>
              <div class="text-sm">
                <p class="text-gray-300 font-medium mb-1">操作类型：<span class="text-primary">${operation}</span></p>
                ${amount ? `<p class="text-gray-300 font-medium">操作金额：<span class="text-green-400">${formatCurrency(amount)}</span></p>` : ''}
                <p class="text-gray-400 mt-2">需要输入 <span class="text-red-400 font-bold">${requiredCount}</span> 个财务密码进行验证</p>
              </div>
            </div>
          </div>
          
          <form id="verify-password-form">
            ${passwordInputsHTML}
            
            <div class="flex gap-3 mt-6">
              <button type="button" onclick="document.getElementById('finance-password-modal').remove()" 
                class="flex-1 bg-gray-600 hover:bg-gray-500 py-2.5 rounded-lg font-medium">
                取消
              </button>
              <button type="submit" class="flex-1 bg-primary hover:bg-blue-700 py-2.5 rounded-lg font-medium">
                <i class="fas fa-check mr-2"></i>验证
              </button>
            </div>
          </form>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // 聚焦第一个密码输入框
      setTimeout(() => document.getElementById('pwd-input-1')?.focus(), 100);
      
      // 绑定表单提交
      document.getElementById('verify-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const passwords = [];
        for (let i = 1; i <= requiredCount; i++) {
          const input = document.getElementById(`pwd-input-${i}`);
          if (!input?.value) {
            showToast(`请输入${activePasswords[i-1]?.name || '密码 #' + i}`, 'warning');
            input?.focus();
            return;
          }
          passwords.push({ slot: i, password: input.value });
        }
        
        try {
          const result = await api('/api/finance-password/verify', {
            method: 'POST',
            body: JSON.stringify({ passwords, operation, amount })
          });
          
          if (result.success) {
            showToast('密码验证成功', 'success');
            modal.remove();
            resolve(result.data);
          } else {
            showToast(result.error || '密码验证失败', 'error');
          }
        } catch (error) {
          console.error('Verify password error:', error);
          showToast('验证失败: ' + error.message, 'error');
        }
      });
    }).catch(error => {
      console.error('Load password config error:', error);
      showToast('加载密码配置失败', 'error');
      reject(error);
    });
  });
}
