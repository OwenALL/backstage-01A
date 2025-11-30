// 全局变量
let currentUser = null;
let currentRole = null; // 'shareholder' 或 'agent'

// API 请求封装
async function api(url, options = {}) {
  const token = localStorage.getItem('agent_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  
  if (!data.success && response.status === 401) {
    handleLogout();
  }
  
  return data;
}

// 工具函数 - 防止XSS攻击
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// 格式化金额
function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
}

// Toast 提示
function showToast(message, type = 'info') {
  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600'
  };
  
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 ${bgColors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 登录处理
async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const agent_username = form.username.value.trim();
  const password = form.password.value;

  try {
    const result = await api('/api/agent/login', {
      method: 'POST',
      body: JSON.stringify({ agent_username, password })
    });

    if (result.success) {
      currentUser = result.data.user;
      currentRole = result.data.user.role; // 'shareholder' 或 'agent'
      localStorage.setItem('agent_token', result.data.token);
      
      document.getElementById('login-page').classList.add('hidden');
      document.getElementById('main-page').classList.remove('hidden');
      
      initMainPage();
      showToast('登录成功！', 'success');
    } else {
      showToast(result.error || '登录失败', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('登录失败，请稍后重试', 'error');
  }
}

// 退出登录
function handleLogout() {
  localStorage.removeItem('agent_token');
  currentUser = null;
  currentRole = null;
  
  document.getElementById('main-page').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('login-form').reset();
}

// 初始化主页面
function initMainPage() {
  document.getElementById('current-username').textContent = currentUser.username;
  document.getElementById('current-role').textContent = currentRole === 'shareholder' ? '股东' : '代理';
  document.getElementById('nav-title').textContent = currentRole === 'shareholder' ? '股东后台' : '代理后台';
  
  renderSidebar();
  showModule('dashboard');
}

// 渲染侧边栏
function renderSidebar() {
  const shareholderMenu = [
    { id: 'dashboard', icon: 'fa-chart-line', name: '数据概览' },
    { id: 'team-manage', icon: 'fa-users', name: '团队管理' },
    { id: 'team-report', icon: 'fa-chart-bar', name: '团队报表' },
    { id: 'game-report', icon: 'fa-gamepad', name: '游戏报表' },
    { id: 'commission', icon: 'fa-percentage', name: '佣金明细' },
    { id: 'account', icon: 'fa-user-cog', name: '账户设置' }
  ];

  const agentMenu = [
    { id: 'dashboard', icon: 'fa-chart-line', name: '数据概览' },
    { id: 'team-manage', icon: 'fa-users', name: '团队管理' },
    { id: 'team-report', icon: 'fa-chart-bar', name: '团队报表' },
    { id: 'game-report', icon: 'fa-gamepad', name: '游戏报表' },
    { id: 'commission', icon: 'fa-percentage', name: '佣金明细' },
    { id: 'account', icon: 'fa-user-cog', name: '账户设置' }
  ];

  const menu = currentRole === 'shareholder' ? shareholderMenu : agentMenu;
  
  const sidebarHtml = menu.map(item => `
    <div class="sidebar-item px-4 py-3 rounded-lg cursor-pointer transition mb-2" 
         onclick="showModule('${item.id}')" data-module="${item.id}">
      <i class="fas ${item.icon} mr-3 text-primary"></i>
      <span>${item.name}</span>
    </div>
  `).join('');
  
  document.getElementById('sidebar-menu').innerHTML = sidebarHtml;
}

// 显示模块
function showModule(moduleId) {
  // 更新侧边栏激活状态
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-module="${moduleId}"]`)?.classList.add('active');
  
  // 渲染对应模块
  const content = document.getElementById('main-content');
  
  switch(moduleId) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'team-manage':
      renderTeamManage();
      break;
    case 'subordinates':
      renderSubordinates();
      break;
    case 'players':
      renderPlayers();
      break;
    case 'team-report':
      renderTeamReport();
      break;
    case 'game-report':
      renderGameReport();
      break;
    case 'commission':
      renderCommission();
      break;
    case 'account':
      renderAccount();
      break;
  }
}

// 渲染数据概览
async function renderDashboard() {
  const content = document.getElementById('main-content');
  
  content.innerHTML = `
    <div class="fade-in">
      <h2 class="text-2xl font-bold mb-6">
        <i class="fas fa-chart-line text-primary mr-3"></i>数据概览
      </h2>
      
      <!-- 统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm opacity-90">今日营收</div>
            <i class="fas fa-dollar-sign text-2xl opacity-75"></i>
          </div>
          <div class="text-3xl font-bold" id="stat-today-revenue">¥0.00</div>
          <div class="text-sm opacity-75 mt-2">较昨日 <span class="font-semibold" id="stat-revenue-change">+0%</span></div>
        </div>
        
        <div class="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm opacity-90">团队人数</div>
            <i class="fas fa-users text-2xl opacity-75"></i>
          </div>
          <div class="text-3xl font-bold" id="stat-team-count">0</div>
          <div class="text-sm opacity-75 mt-2">下级代理 <span class="font-semibold" id="stat-agent-count">0</span> 人</div>
        </div>
        
        <div class="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm opacity-90">本月佣金</div>
            <i class="fas fa-percentage text-2xl opacity-75"></i>
          </div>
          <div class="text-3xl font-bold" id="stat-month-commission">¥0.00</div>
          <div class="text-sm opacity-75 mt-2">已结算 <span class="font-semibold" id="stat-settled-commission">¥0.00</span></div>
        </div>
        
        <div class="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 text-white">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm opacity-90">活跃玩家</div>
            <i class="fas fa-user-friends text-2xl opacity-75"></i>
          </div>
          <div class="text-3xl font-bold" id="stat-active-players">0</div>
          <div class="text-sm opacity-75 mt-2">今日新增 <span class="font-semibold" id="stat-new-players">0</span> 人</div>
        </div>
      </div>
      
      <!-- 图表区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 class="text-lg font-semibold mb-4">
            <i class="fas fa-chart-area text-primary mr-2"></i>近7日营收趋势
          </h3>
          <div class="chart-container">
            <canvas id="revenue-chart"></canvas>
          </div>
        </div>
        
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 class="text-lg font-semibold mb-4">
            <i class="fas fa-chart-pie text-primary mr-2"></i>团队结构分布
          </h3>
          <div class="chart-container">
            <canvas id="team-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 加载统计数据
  loadDashboardStats();
}

// 加载仪表盘统计数据
async function loadDashboardStats() {
  try {
    const result = await api('/api/agent/dashboard/stats');
    
    if (result.success) {
      const stats = result.data;
      
      document.getElementById('stat-today-revenue').textContent = '¥' + formatMoney(stats.todayRevenue);
      document.getElementById('stat-revenue-change').textContent = (stats.revenueChange >= 0 ? '+' : '') + stats.revenueChange + '%';
      document.getElementById('stat-team-count').textContent = stats.teamCount;
      document.getElementById('stat-agent-count').textContent = stats.agentCount;
      document.getElementById('stat-month-commission').textContent = '¥' + formatMoney(stats.monthCommission);
      document.getElementById('stat-settled-commission').textContent = '¥' + formatMoney(stats.settledCommission);
      document.getElementById('stat-active-players').textContent = stats.activePlayers;
      document.getElementById('stat-new-players').textContent = stats.newPlayers;
      
      // 渲染图表
      renderRevenueChart(stats.revenueChart);
      renderTeamChart(stats.teamChart);
    }
  } catch (error) {
    console.error('Load dashboard stats error:', error);
  }
}

// 渲染营收趋势图表
function renderRevenueChart(data) {
  const ctx = document.getElementById('revenue-chart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data?.labels || ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      datasets: [{
        label: '营收',
        data: data?.values || [12000, 15000, 13000, 18000, 16000, 20000, 22000],
        borderColor: '#1e40af',
        backgroundColor: 'rgba(30, 64, 175, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: { color: '#9ca3af' },
          grid: { color: '#374151' }
        },
        x: { 
          ticks: { color: '#9ca3af' },
          grid: { color: '#374151' }
        }
      }
    }
  });
}

// 渲染团队结构图表
function renderTeamChart(data) {
  const ctx = document.getElementById('team-chart');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data?.labels || ['直属代理', '二级代理', '三级代理', '玩家'],
      datasets: [{
        data: data?.values || [10, 25, 40, 180],
        backgroundColor: ['#1e40af', '#7c3aed', '#059669', '#d97706']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#9ca3af', padding: 15 }
        }
      }
    }
  });
}

// ========================================
// 团队管理功能（合并代理和玩家）
// ========================================

// 渲染团队管理（主函数）
async function renderTeamManage() {
  const content = document.getElementById('main-content');
  
  content.innerHTML = `
    <div class="fade-in">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">
          <i class="fas fa-users text-primary mr-3"></i>团队管理
        </h2>
        <div class="flex items-center space-x-3">
          <button onclick="showAddAgentModal()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition">
            <i class="fas fa-user-plus mr-2"></i>新增代理
          </button>
          <button onclick="showAddPlayerModal()" class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition">
            <i class="fas fa-user-plus mr-2"></i>新增会员
          </button>
        </div>
      </div>
      
      <!-- 选项卡 -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 mb-6">
        <div class="flex border-b border-gray-700">
          <button onclick="switchTeamTab('agents')" data-team-tab="agents" class="team-tab-btn flex-1 px-6 py-4 text-center transition hover:bg-gray-750 border-b-2 border-primary">
            <i class="fas fa-sitemap mr-2"></i>下级代理
          </button>
          <button onclick="switchTeamTab('players')" data-team-tab="players" class="team-tab-btn flex-1 px-6 py-4 text-center transition hover:bg-gray-750 border-b-2 border-transparent">
            <i class="fas fa-user-friends mr-2"></i>玩家会员
          </button>
        </div>
      </div>
      
      <!-- 内容区域 -->
      <div id="team-tab-content">
        <!-- 动态渲染 -->
      </div>
    </div>
  `;
  
  switchTeamTab('agents');
}

// 切换团队管理选项卡
function switchTeamTab(tab) {
  // 更新选项卡样式
  document.querySelectorAll('.team-tab-btn').forEach(btn => {
    btn.classList.remove('border-primary');
    btn.classList.add('border-transparent');
  });
  document.querySelector(`[data-team-tab="${tab}"]`).classList.remove('border-transparent');
  document.querySelector(`[data-team-tab="${tab}"]`).classList.add('border-primary');
  
  const content = document.getElementById('team-tab-content');
  
  if (tab === 'agents') {
    renderAgentsTab();
  } else {
    renderPlayersTab();
  }
}

// 渲染代理选项卡
async function renderAgentsTab() {
  const content = document.getElementById('team-tab-content');
  
  content.innerHTML = `
    <!-- 搜索和筛选栏 -->
    <div class="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm text-gray-400 mb-2">搜索</label>
          <input type="text" id="search-agent" placeholder="账号/姓名/手机号"
                 class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
        </div>
        
        <div>
          <label class="block text-sm text-gray-400 mb-2">层级</label>
          <select id="filter-agent-level" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            <option value="">全部层级</option>
            <option value="1">一级代理</option>
            <option value="2">二级代理</option>
            <option value="3">三级代理</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm text-gray-400 mb-2">状态</label>
          <select id="filter-agent-status" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            <option value="">全部状态</option>
            <option value="1">正常</option>
            <option value="0">停用</option>
          </select>
        </div>
        
        <div class="flex items-end">
          <button onclick="searchAgents()" class="w-full bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition">
            <i class="fas fa-search mr-2"></i>查询
          </button>
        </div>
      </div>
    </div>
    
    <!-- 数据表格 -->
    <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-700">
          <tr>
            <th class="px-6 py-4 text-left text-sm font-semibold">账号</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">姓名</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">层级</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">下级人数</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">玩家人数</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">本月业绩</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">状态</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">操作</th>
          </tr>
        </thead>
        <tbody id="agents-table-body">
          <tr>
            <td colspan="8" class="px-6 py-12 text-center text-gray-400">
              <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
              <div>加载中...</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 分页 -->
    <div id="agents-pagination" class="mt-6 flex items-center justify-between">
      <!-- 动态渲染 -->
    </div>
  `;
  
  loadAgents();
}

// 渲染玩家选项卡
async function renderPlayersTab() {
  const content = document.getElementById('team-tab-content');
  
  content.innerHTML = `
    <!-- 搜索和筛选栏 -->
    <div class="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm text-gray-400 mb-2">搜索</label>
          <input type="text" id="search-player" placeholder="账号/姓名/手机号"
                 class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
        </div>
        
        <div>
          <label class="block text-sm text-gray-400 mb-2">VIP等级</label>
          <select id="filter-player-vip" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            <option value="">全部等级</option>
            <option value="1">VIP1</option>
            <option value="2">VIP2</option>
            <option value="3">VIP3</option>
            <option value="4">VIP4</option>
            <option value="5">VIP5</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm text-gray-400 mb-2">状态</label>
          <select id="filter-player-status" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            <option value="">全部状态</option>
            <option value="active">活跃</option>
            <option value="inactive">不活跃</option>
            <option value="frozen">冻结</option>
          </select>
        </div>
        
        <div class="flex items-end">
          <button onclick="searchPlayers()" class="w-full bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition">
            <i class="fas fa-search mr-2"></i>查询
          </button>
        </div>
      </div>
    </div>
    
    <!-- 数据表格 -->
    <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-700">
          <tr>
            <th class="px-6 py-4 text-left text-sm font-semibold">账号</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">姓名</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">VIP等级</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">余额</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">本月投注</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">有效投注</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">洗码费</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">本月输赢</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">状态</th>
            <th class="px-6 py-4 text-left text-sm font-semibold">操作</th>
          </tr>
        </thead>
        <tbody id="players-table-body">
          <tr>
            <td colspan="10" class="px-6 py-12 text-center text-gray-400">
              <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
              <div>加载中...</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 分页 -->
    <div id="players-pagination" class="mt-6 flex items-center justify-between">
      <!-- 动态渲染 -->
    </div>
  `;
  
  loadPlayers();
}

// 加载代理列表
async function loadAgents(page = 1) {
  try {
    const search = document.getElementById('search-agent')?.value || '';
    const level = document.getElementById('filter-agent-level')?.value || '';
    const status = document.getElementById('filter-agent-status')?.value || '';
    
    const result = await api(`/api/agent/subordinates?page=${page}&search=${search}&level=${level}&status=${status}`);
    
    if (result.success) {
      const tbody = document.getElementById('agents-table-body');
      const data = result.data;
      
      if (data.list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="px-6 py-12 text-center text-gray-400">
              <i class="fas fa-inbox text-4xl mb-2"></i>
              <div>暂无数据</div>
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = data.list.map(item => `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="px-6 py-4">
            <div class="font-medium">${makeAccountClickable(item.username, item.id, 'agent')}</div>
            <div class="text-sm text-gray-400">${escapeHtml(item.phone || '-')}</div>
          </td>
          <td class="px-6 py-4">${escapeHtml(item.real_name || '-')}</td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 bg-blue-900 text-blue-300 rounded text-sm">
              ${item.level}级代理
            </span>
          </td>
          <td class="px-6 py-4">
            <span class="text-blue-400 font-semibold">${item.subordinate_count}</span> 人
          </td>
          <td class="px-6 py-4">
            <span class="text-green-400 font-semibold">${item.player_count}</span> 人
          </td>
          <td class="px-6 py-4">
            <div class="font-semibold text-green-400">¥${formatMoney(item.month_performance)}</div>
          </td>
          <td class="px-6 py-4">
            ${item.status === 1 
              ? '<span class="px-2 py-1 bg-green-900 text-green-300 rounded text-sm">正常</span>'
              : '<span class="px-2 py-1 bg-red-900 text-red-300 rounded text-sm">停用</span>'}
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center space-x-2">
              <button onclick="viewAgentDetail(${item.id})" class="text-blue-400 hover:text-blue-300" title="查看详情">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick="editAgent(${item.id})" class="text-green-400 hover:text-green-300" title="编辑">
                <i class="fas fa-edit"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Load agents error:', error);
    showToast('加载代理列表失败', 'error');
  }
}

// 加载玩家列表
async function loadPlayers(page = 1) {
  try {
    const search = document.getElementById('search-player')?.value || '';
    const vip = document.getElementById('filter-player-vip')?.value || '';
    const status = document.getElementById('filter-player-status')?.value || '';
    
    const result = await api(`/api/agent/players?page=${page}&search=${search}&vip=${vip}&status=${status}`);
    
    if (result.success) {
      const tbody = document.getElementById('players-table-body');
      const data = result.data;
      
      if (data.list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" class="px-6 py-12 text-center text-gray-400">
              <i class="fas fa-inbox text-4xl mb-2"></i>
              <div>暂无数据</div>
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = data.list.map(item => `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="px-6 py-4">
            <div class="font-medium">${makeAccountClickable(item.username, item.id, 'player')}</div>
            <div class="text-sm text-gray-400">${escapeHtml(item.phone || '-')}</div>
          </td>
          <td class="px-6 py-4">${escapeHtml(item.real_name || '-')}</td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 bg-yellow-900 text-yellow-300 rounded text-sm">
              VIP${item.vip_level || 0}
            </span>
          </td>
          <td class="px-6 py-4">
            <div class="font-semibold text-blue-400">¥${formatMoney(item.balance)}</div>
          </td>
          <td class="px-6 py-4 text-gray-300">¥${formatMoney(item.month_bet)}</td>
          <td class="px-6 py-4 text-blue-400 font-semibold">¥${formatMoney(item.valid_bet || 0)}</td>
          <td class="px-6 py-4 text-purple-400 font-semibold">¥${formatMoney(item.wash_code_fee || 0)}</td>
          <td class="px-6 py-4">
            <span class="${item.month_profit >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">
              ¥${formatMoney(Math.abs(item.month_profit))}
            </span>
          </td>
          <td class="px-6 py-4">
            ${item.status === 'active' 
              ? '<span class="px-2 py-1 bg-green-900 text-green-300 rounded text-sm">活跃</span>'
              : item.status === 'frozen'
              ? '<span class="px-2 py-1 bg-red-900 text-red-300 rounded text-sm">冻结</span>'
              : '<span class="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm">不活跃</span>'}
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center space-x-2">
              <button onclick="viewPlayerDetail(${item.id})" class="text-blue-400 hover:text-blue-300" title="查看详情">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick="editPlayer(${item.id})" class="text-green-400 hover:text-green-300" title="编辑">
                <i class="fas fa-edit"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Load players error:', error);
    showToast('加载玩家列表失败', 'error');
  }
}

// 搜索代理
function searchAgents() {
  loadAgents(1);
}

// 搜索玩家
function searchPlayers() {
  loadPlayers(1);
}

// 查看代理详情
async function viewAgentDetail(id) {
  try {
    const response = await fetch(`/api/agent/subordinates/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('agent_token')}`
      }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      showToast(result.error || '获取代理详情失败', 'error');
      return;
    }
    
    const agent = result.data;
    
    // 创建详情模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-white">
            <i class="fas fa-user-tie text-primary mr-2"></i>代理详情
          </h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="space-y-6">
          <!-- 基本信息 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
              <i class="fas fa-info-circle text-primary mr-2"></i>基本信息
            </h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">代理账号</label>
                <div class="text-white font-medium">${agent.username}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">真实姓名</label>
                <div class="text-white font-medium">${agent.real_name || '-'}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">联系电话</label>
                <div class="text-white font-medium">${agent.phone || '-'}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">联系邮箱</label>
                <div class="text-white font-medium">${agent.email || '-'}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">代理级别</label>
                <div class="text-white font-medium">
                  ${agent.level === 'shareholder' ? '股东' : agent.level === 'general_agent' ? '总代理' : '代理'}
                </div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">账号状态</label>
                <div>
                  ${agent.status == 1 
                    ? '<span class="px-2 py-1 bg-green-600 text-white text-xs rounded">正常</span>'
                    : '<span class="px-2 py-1 bg-red-600 text-white text-xs rounded">禁用</span>'
                  }
                </div>
              </div>
            </div>
          </div>
          
          <!-- 比例设置 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
              <i class="fas fa-percentage text-primary mr-2"></i>比例设置
            </h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">占成比例</label>
                <div class="text-white font-medium">${agent.share_ratio || 0}%</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">佣金比例</label>
                <div class="text-white font-medium">${agent.commission_rate || 0}%</div>
              </div>
            </div>
          </div>
          
          <!-- 团队统计 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
              <i class="fas fa-chart-bar text-primary mr-2"></i>团队统计
            </h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">下级代理数</label>
                <div class="text-2xl font-bold text-primary">${agent.subordinate_count || 0}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">下级玩家数</label>
                <div class="text-2xl font-bold text-green-400">${agent.player_count || 0}</div>
              </div>
            </div>
          </div>
          
          <!-- 创建时间 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">创建时间</label>
                <div class="text-white font-medium">${agent.created_at || '-'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end space-x-3">
          <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
            关闭
          </button>
          <button onclick="this.closest('.fixed').remove(); editAgent(${id})" class="px-6 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition">
            <i class="fas fa-edit mr-2"></i>编辑
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('View agent detail error:', error);
    showToast('获取代理详情失败', 'error');
  }
}

// 编辑代理
async function editAgent(id) {
  try {
    // 先获取代理详情
    const response = await fetch(`/api/agent/subordinates/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('agent_token')}`
      }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      showToast(result.error || '获取代理信息失败', 'error');
      return;
    }
    
    const agent = result.data;
    
    // 创建编辑模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-white">
            <i class="fas fa-edit text-primary mr-2"></i>编辑代理
          </h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="editAgentForm" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-gray-300 text-sm mb-2">代理账号</label>
              <input type="text" value="${agent.username}" disabled 
                     class="w-full px-4 py-2 bg-gray-700 text-gray-400 border border-gray-600 rounded-lg cursor-not-allowed">
              <p class="text-xs text-gray-500 mt-1">账号不可修改</p>
            </div>
            
            <div>
              <label class="block text-gray-300 text-sm mb-2">真实姓名 <span class="text-red-500">*</span></label>
              <input type="text" name="real_name" value="${agent.real_name || ''}" required
                     class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none"
                     placeholder="请输入真实姓名">
            </div>
            
            <div>
              <label class="block text-gray-300 text-sm mb-2">联系电话</label>
              <input type="tel" name="contact_phone" value="${agent.phone || ''}"
                     class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none"
                     placeholder="选填" pattern="^1[3-9]\\d{9}$">
              <p class="text-xs text-gray-500 mt-1">格式：11位手机号</p>
            </div>
            
            <div class="col-span-2">
              <label class="block text-gray-300 text-sm mb-2">联系邮箱</label>
              <input type="email" name="contact_email" value="${agent.email || ''}"
                     class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none"
                     placeholder="选填">
            </div>
            
            <div>
              <label class="block text-gray-300 text-sm mb-2">占成比例 (%)</label>
              <input type="number" name="share_ratio" value="${agent.share_ratio || 0}" 
                     min="0" max="100" step="0.01"
                     class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none"
                     placeholder="0-100">
            </div>
            
            <div>
              <label class="block text-gray-300 text-sm mb-2">佣金比例 (%)</label>
              <input type="number" name="commission_ratio" value="${agent.commission_rate || 0}" 
                     min="0" max="100" step="0.01"
                     class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none"
                     placeholder="0-100">
            </div>
            
            <div class="col-span-2">
              <label class="block text-gray-300 text-sm mb-2">账号状态</label>
              <select name="status" class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none">
                <option value="1" ${agent.status == 1 ? 'selected' : ''}>正常</option>
                <option value="0" ${agent.status == 0 ? 'selected' : ''}>禁用</option>
              </select>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="this.closest('.fixed').remove()" 
                    class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
              取消
            </button>
            <button type="submit" 
                    class="px-6 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 表单提交
    document.getElementById('editAgentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = {
        real_name: formData.get('real_name'),
        contact_phone: formData.get('contact_phone'),
        contact_email: formData.get('contact_email'),
        share_ratio: parseFloat(formData.get('share_ratio')),
        commission_ratio: parseFloat(formData.get('commission_ratio')),
        status: parseInt(formData.get('status'))
      };
      
      try {
        const updateResponse = await fetch(`/api/agent/subordinates/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('agent_token')}`
          },
          body: JSON.stringify(data)
        });
        
        const updateResult = await updateResponse.json();
        
        if (updateResult.success) {
          showToast('更新成功', 'success');
          modal.remove();
          // 刷新列表
          if (typeof loadSubordinates === 'function') {
            loadSubordinates(1);
          }
        } else {
          showToast(updateResult.error || '更新失败', 'error');
        }
      } catch (error) {
        console.error('Update agent error:', error);
        showToast('更新失败', 'error');
      }
    });
  } catch (error) {
    console.error('Edit agent error:', error);
    showToast('获取代理信息失败', 'error');
  }
}

// 查看玩家详情
async function viewPlayerDetail(id) {
  try {
    const response = await fetch(`/api/agent/players/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('agent_token')}`
      }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      showToast(result.error || '获取玩家详情失败', 'error');
      return;
    }
    
    const player = result.data;
    
    // 创建详情模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-white">
            <i class="fas fa-user text-primary mr-2"></i>玩家详情
          </h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="space-y-6">
          <!-- 基本信息 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
              <i class="fas fa-info-circle text-primary mr-2"></i>基本信息
            </h4>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">玩家账号</label>
                <div class="text-white font-medium">${player.username}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">真实姓名</label>
                <div class="text-white font-medium">${player.real_name || '-'}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">联系电话</label>
                <div class="text-white font-medium">${player.phone || '-'}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">联系邮箱</label>
                <div class="text-white font-medium">${player.email || '-'}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">VIP等级</label>
                <div class="text-white font-medium">VIP ${player.vip_level || 0}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">账号状态</label>
                <div>
                  ${player.status === 'active' 
                    ? '<span class="px-2 py-1 bg-green-600 text-white text-xs rounded">活跃</span>'
                    : player.status === 'locked'
                    ? '<span class="px-2 py-1 bg-red-600 text-white text-xs rounded">锁定</span>'
                    : '<span class="px-2 py-1 bg-gray-600 text-white text-xs rounded">未知</span>'
                  }
                </div>
              </div>
            </div>
          </div>
          
          <!-- 账户信息 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
              <i class="fas fa-wallet text-primary mr-2"></i>账户信息
            </h4>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">当前余额</label>
                <div class="text-2xl font-bold text-green-400">¥${(player.balance || 0).toLocaleString()}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">累计充值</label>
                <div class="text-xl font-semibold text-blue-400">¥${(player.total_deposit || 0).toLocaleString()}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">累计提现</label>
                <div class="text-xl font-semibold text-orange-400">¥${(player.total_withdraw || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          <!-- 游戏统计 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
              <i class="fas fa-chart-line text-primary mr-2"></i>游戏统计
            </h4>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">累计投注</label>
                <div class="text-xl font-semibold text-purple-400">¥${(player.total_bet || 0).toLocaleString()}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">累计盈利</label>
                <div class="text-xl font-semibold ${(player.total_win || 0) >= 0 ? 'text-green-400' : 'text-red-400'}">
                  ¥${(player.total_win || 0).toLocaleString()}
                </div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">洗码率</label>
                <div class="text-xl font-semibold text-yellow-400">${player.wash_rate || 0}%</div>
              </div>
            </div>
          </div>
          
          <!-- 其他信息 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">注册时间</label>
                <div class="text-white font-medium">${player.created_at || '-'}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">所属代理ID</label>
                <div class="text-white font-medium">${player.agent_id || '-'}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end space-x-3">
          <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
            关闭
          </button>
          <button onclick="this.closest('.fixed').remove(); editPlayer(${id})" class="px-6 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition">
            <i class="fas fa-edit mr-2"></i>编辑
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('View player detail error:', error);
    showToast('获取玩家详情失败', 'error');
  }
}

// 编辑玩家
async function editPlayer(id) {
  try {
    // 先获取玩家详情
    const response = await fetch(`/api/agent/players/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('agent_token')}`
      }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      showToast(result.error || '获取玩家信息失败', 'error');
      return;
    }
    
    const player = result.data;
    
    // 创建编辑模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-white">
            <i class="fas fa-edit text-primary mr-2"></i>编辑玩家
          </h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <form id="editPlayerForm" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-gray-300 text-sm mb-2">玩家账号</label>
              <input type="text" value="${player.username}" disabled 
                     class="w-full px-4 py-2 bg-gray-700 text-gray-400 border border-gray-600 rounded-lg cursor-not-allowed">
              <p class="text-xs text-gray-500 mt-1">账号不可修改</p>
            </div>
            
            <div>
              <label class="block text-gray-300 text-sm mb-2">真实姓名 <span class="text-red-500">*</span></label>
              <input type="text" name="real_name" value="${player.real_name || ''}" required
                     class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none"
                     placeholder="请输入真实姓名">
            </div>
            
            <div>
              <label class="block text-gray-300 text-sm mb-2">联系电话</label>
              <input type="tel" name="phone" value="${player.phone || ''}"
                     class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none"
                     placeholder="选填" pattern="^1[3-9]\\d{9}$">
              <p class="text-xs text-gray-500 mt-1">格式：11位手机号</p>
            </div>
            
            <div class="col-span-2">
              <label class="block text-gray-300 text-sm mb-2">联系邮箱</label>
              <input type="email" name="email" value="${player.email || ''}"
                     class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none"
                     placeholder="选填">
            </div>
            
            <div>
              <label class="block text-gray-300 text-sm mb-2">洗码率 (%)</label>
              <input type="number" name="wash_rate" value="${player.wash_rate || 0}" 
                     min="0" max="100" step="0.01"
                     class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none"
                     placeholder="0-100">
            </div>
            
            <div>
              <label class="block text-gray-300 text-sm mb-2">账号状态</label>
              <select name="status" class="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:border-primary focus:outline-none">
                <option value="active" ${player.status === 'active' ? 'selected' : ''}>活跃</option>
                <option value="locked" ${player.status === 'locked' ? 'selected' : ''}>锁定</option>
              </select>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="this.closest('.fixed').remove()" 
                    class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
              取消
            </button>
            <button type="submit" 
                    class="px-6 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition">
              <i class="fas fa-save mr-2"></i>保存
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 表单提交
    document.getElementById('editPlayerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target);
      const data = {
        real_name: formData.get('real_name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        wash_rate: parseFloat(formData.get('wash_rate')),
        status: formData.get('status')
      };
      
      try {
        const updateResponse = await fetch(`/api/agent/players/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('agent_token')}`
          },
          body: JSON.stringify(data)
        });
        
        const updateResult = await updateResponse.json();
        
        if (updateResult.success) {
          showToast('更新成功', 'success');
          modal.remove();
          // 刷新列表
          if (typeof loadPlayers === 'function') {
            loadPlayers(1);
          }
        } else {
          showToast(updateResult.error || '更新失败', 'error');
        }
      } catch (error) {
        console.error('Update player error:', error);
        showToast('更新失败', 'error');
      }
    });
  } catch (error) {
    console.error('Edit player error:', error);
    showToast('获取玩家信息失败', 'error');
  }
}

// 渲染下级代理管理
async function renderSubordinates() {
  const content = document.getElementById('main-content');
  
  content.innerHTML = `
    <div class="fade-in">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">
          <i class="fas fa-users text-primary mr-3"></i>下级代理管理
        </h2>
        <button onclick="showAddSubordinateModal()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition">
          <i class="fas fa-plus mr-2"></i>新增下级
        </button>
      </div>
      
      <!-- 搜索和筛选栏 -->
      <div class="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2">搜索</label>
            <input type="text" id="search-subordinate" placeholder="账号/姓名/手机号"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">层级</label>
            <select id="filter-level" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
              <option value="">全部层级</option>
              <option value="1">一级代理</option>
              <option value="2">二级代理</option>
              <option value="3">三级代理</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">状态</label>
            <select id="filter-status" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
              <option value="">全部状态</option>
              <option value="1">正常</option>
              <option value="0">停用</option>
            </select>
          </div>
          
          <div class="flex items-end">
            <button onclick="loadSubordinates()" class="w-full bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition">
              <i class="fas fa-search mr-2"></i>查询
            </button>
          </div>
        </div>
      </div>
      
      <!-- 数据表格 -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold">账号</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">姓名</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">层级</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">下级人数</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">玩家人数</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">本月业绩</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">状态</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody id="subordinates-table-body">
            <tr>
              <td colspan="8" class="px-6 py-12 text-center text-gray-400">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <div>加载中...</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 分页 -->
      <div id="subordinates-pagination" class="mt-6 flex items-center justify-between">
        <!-- 动态渲染 -->
      </div>
    </div>
  `;
  
  loadSubordinates();
}

// 加载下级代理列表
async function loadSubordinates(page = 1) {
  try {
    const search = document.getElementById('search-subordinate')?.value || '';
    const level = document.getElementById('filter-level')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    
    const result = await api(`/api/agent/subordinates?page=${page}&search=${search}&level=${level}&status=${status}`);
    
    if (result.success) {
      const tbody = document.getElementById('subordinates-table-body');
      const data = result.data;
      
      if (data.list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="px-6 py-12 text-center text-gray-400">
              <i class="fas fa-inbox text-4xl mb-2"></i>
              <div>暂无数据</div>
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = data.list.map(item => `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="px-6 py-4">
            <div class="font-medium">${escapeHtml(item.username)}</div>
            <div class="text-sm text-gray-400">${escapeHtml(item.phone || '-')}</div>
          </td>
          <td class="px-6 py-4">${escapeHtml(item.real_name || '-')}</td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 bg-blue-900 text-blue-300 rounded text-sm">
              ${item.level}级代理
            </span>
          </td>
          <td class="px-6 py-4">
            <span class="text-blue-400 font-semibold">${item.subordinate_count}</span> 人
          </td>
          <td class="px-6 py-4">
            <span class="text-green-400 font-semibold">${item.player_count}</span> 人
          </td>
          <td class="px-6 py-4">
            <div class="font-semibold text-green-400">¥${formatMoney(item.month_performance)}</div>
          </td>
          <td class="px-6 py-4">
            ${item.status === 1 
              ? '<span class="px-2 py-1 bg-green-900 text-green-300 rounded text-sm">正常</span>'
              : '<span class="px-2 py-1 bg-red-900 text-red-300 rounded text-sm">停用</span>'}
          </td>
          <td class="px-6 py-4">
            <div class="flex items-center space-x-2">
              <button onclick="viewSubordinateDetail(${item.id})" class="text-blue-400 hover:text-blue-300" title="查看详情">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick="editSubordinate(${item.id})" class="text-green-400 hover:text-green-300" title="编辑">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="viewSubordinateTree(${item.id})" class="text-purple-400 hover:text-purple-300" title="查看团队">
                <i class="fas fa-sitemap"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
      
      renderPagination('subordinates', data.pagination);
    }
  } catch (error) {
    console.error('Load subordinates error:', error);
    showToast('加载数据失败', 'error');
  }
}

// 渲染分页
function renderPagination(prefix, pagination) {
  const container = document.getElementById(`${prefix}-pagination`);
  if (!container || !pagination) return;
  
  const { current, total, pageSize } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <div class="text-sm text-gray-400">
      共 ${total} 条记录，第 ${current}/${totalPages} 页
    </div>
    <div class="flex items-center space-x-2">
      <button onclick="loadSubordinates(${current - 1})" 
              ${current === 1 ? 'disabled' : ''}
              class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
        <i class="fas fa-chevron-left"></i>
      </button>
      ${Array.from({length: Math.min(5, totalPages)}, (_, i) => {
        const page = i + 1;
        return `
          <button onclick="loadSubordinates(${page})" 
                  class="px-3 py-1 rounded ${current === page ? 'bg-primary text-white' : 'bg-gray-700 hover:bg-gray-600'}">
            ${page}
          </button>
        `;
      }).join('')}
      <button onclick="loadSubordinates(${current + 1})" 
              ${current === totalPages ? 'disabled' : ''}
              class="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

// 显示新增下级弹窗
function showAddSubordinateModal() {
  const modalHtml = `
    <div id="subordinate-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <h3 class="text-xl font-bold mb-6">
          <i class="fas fa-user-plus text-primary mr-2"></i>新增下级代理
        </h3>
        
        <form onsubmit="submitSubordinate(event)">
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">账号 *</label>
              <input type="text" name="username" required
                     class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                     placeholder="字母开头，6-20位">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">密码 *</label>
              <input type="password" name="password" required
                     class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                     placeholder="6-20位">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">姓名 *</label>
              <input type="text" name="real_name" required
                     class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">手机号 *</label>
              <input type="tel" name="phone" required
                     class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                     placeholder="11位手机号">
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">佣金比例 (%)</label>
              <input type="number" name="commission_rate" min="0" max="100" step="0.01"
                     class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                     placeholder="0-100">
            </div>
          </div>
          
          <div class="flex space-x-3 mt-6">
            <button type="button" onclick="closeModal('subordinate-modal')" 
                    class="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition">
              取消
            </button>
            <button type="submit" class="flex-1 bg-primary hover:bg-blue-700 py-2 rounded-lg transition">
              <i class="fas fa-check mr-2"></i>确定
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 提交新增下级
async function submitSubordinate(event) {
  event.preventDefault();
  const form = event.target;
  
  const data = {
    username: form.username.value.trim(),
    password: form.password.value,
    real_name: form.real_name.value.trim(),
    phone: form.phone.value.trim(),
    commission_rate: form.commission_rate.value || 0
  };
  
  try {
    const result = await api('/api/agent/subordinates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (result.success) {
      showToast('新增成功！', 'success');
      closeModal('subordinate-modal');
      loadSubordinates();
    } else {
      showToast(result.error || '新增失败', 'error');
    }
  } catch (error) {
    console.error('Submit subordinate error:', error);
    showToast('操作失败，请稍后重试', 'error');
  }
}

// 关闭弹窗
function closeModal(modalId) {
  document.getElementById(modalId)?.remove();
}

// 查看下级详情
async function viewSubordinateDetail(id) {
  showToast('查看详情功能开发中...', 'info');
}

// 编辑下级
async function editSubordinate(id) {
  showToast('编辑功能开发中...', 'info');
}

// 查看下级团队树
async function viewSubordinateTree(id) {
  showToast('团队树功能开发中...', 'info');
}

// 渲染玩家管理（仅代理可见）
function renderPlayers() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="fade-in">
      <h2 class="text-2xl font-bold mb-6">
        <i class="fas fa-user-friends text-primary mr-3"></i>玩家管理
      </h2>
      <div class="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
        <i class="fas fa-user-friends text-6xl text-gray-600 mb-4"></i>
        <p class="text-gray-400 text-lg">功能开发中...</p>
      </div>
    </div>
  `;
}

// 渲染团队报表
// 渲染团队报表
function renderTeamReport() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="fade-in">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">
          <i class="fas fa-chart-bar text-primary mr-3"></i>团队报表
        </h2>
        <button onclick="exportTeamReport()" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">
          <i class="fas fa-download mr-2"></i>导出报表
        </button>
      </div>
      
      <!-- 搜索查询栏 -->
      <div class="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2">日期范围</label>
            <input type="date" id="report-start-date" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">&nbsp;</label>
            <input type="date" id="report-end-date" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">账号搜索</label>
            <input type="text" id="report-search" placeholder="账号/姓名/手机号" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">类型筛选</label>
            <select id="report-type" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
              <option value="">全部</option>
              <option value="agent">下级代理</option>
              <option value="player">会员玩家</option>
            </select>
          </div>
          <div class="flex items-end">
            <button onclick="searchTeamReport()" class="w-full bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition">
              <i class="fas fa-search mr-2"></i>查询
            </button>
          </div>
        </div>
      </div>
      
      <!-- 统计概览 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-400 text-sm">团队总人数</span>
            <i class="fas fa-users text-blue-400"></i>
          </div>
          <div class="text-2xl font-bold" id="team-total-members">0</div>
        </div>
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-400 text-sm">团队总业绩</span>
            <i class="fas fa-chart-line text-green-400"></i>
          </div>
          <div class="text-2xl font-bold text-green-400" id="team-total-performance">¥0.00</div>
        </div>
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-400 text-sm">团队总输赢</span>
            <i class="fas fa-coins text-yellow-400"></i>
          </div>
          <div class="text-2xl font-bold" id="team-total-profit">¥0.00</div>
        </div>
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-400 text-sm">我的佣金</span>
            <i class="fas fa-percentage text-purple-400"></i>
          </div>
          <div class="text-2xl font-bold text-purple-400" id="team-my-commission">¥0.00</div>
        </div>
      </div>
      
      <!-- 数据表格 -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold">账号</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">姓名</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">类型</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">投注额</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">有效投注</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">输赢</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">占成比例</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">我的分成</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody id="team-report-table-body">
            <tr>
              <td colspan="9" class="px-6 py-12 text-center text-gray-400">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <div>加载中...</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 分页 -->
      <div id="team-report-pagination" class="mt-6 flex items-center justify-between">
        <!-- 动态渲染 -->
      </div>
    </div>
  `;
  
  // 设置默认日期（本月）
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById('report-start-date').value = firstDay.toISOString().split('T')[0];
  document.getElementById('report-end-date').value = today.toISOString().split('T')[0];
  
  loadTeamReport();
}

// ========================================
// 游戏报表相关函数
// ========================================

// 渲染游戏报表
function renderGameReport() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="fade-in">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">
          <i class="fas fa-gamepad text-primary mr-3"></i>游戏报表
        </h2>
        <button onclick="exportGameReport()" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">
          <i class="fas fa-download mr-2"></i>导出报表
        </button>
      </div>
      
      <!-- 搜索查询栏 -->
      <div class="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2">日期范围</label>
            <input type="date" id="game-report-start-date" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">&nbsp;</label>
            <input type="date" id="game-report-end-date" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">账号搜索</label>
            <input type="text" id="game-report-search" placeholder="玩家账号/姓名" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">游戏类型</label>
            <select id="game-report-type" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
              <option value="">全部游戏</option>
              <option value="baccarat">百家乐</option>
              <option value="roulette">轮盘</option>
              <option value="sicbo">骰宝</option>
              <option value="dragontiger">龙虎</option>
            </select>
          </div>
          <div class="flex items-end">
            <button onclick="searchGameReport()" class="w-full bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition">
              <i class="fas fa-search mr-2"></i>查询
            </button>
          </div>
        </div>
      </div>
      
      <!-- 统计概览 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-400 text-sm">总投注额</span>
            <i class="fas fa-coins text-blue-400"></i>
          </div>
          <div class="text-2xl font-bold text-blue-400" id="game-total-bet">¥0.00</div>
        </div>
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-400 text-sm">有效投注</span>
            <i class="fas fa-check-circle text-green-400"></i>
          </div>
          <div class="text-2xl font-bold text-green-400" id="game-valid-bet">¥0.00</div>
        </div>
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-400 text-sm">玩家输赢</span>
            <i class="fas fa-chart-line text-yellow-400"></i>
          </div>
          <div class="text-2xl font-bold" id="game-total-winloss">¥0.00</div>
        </div>
        <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-2">
            <span class="text-gray-400 text-sm">投注笔数</span>
            <i class="fas fa-list text-purple-400"></i>
          </div>
          <div class="text-2xl font-bold text-purple-400" id="game-total-count">0</div>
        </div>
      </div>
      
      <!-- 数据表格 -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold">玩家账号</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">游戏类型</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">投注额</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">有效投注</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">输赢金额</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">洗码费</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">投注时间</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody id="game-report-table-body">
            <tr>
              <td colspan="8" class="px-6 py-12 text-center text-gray-400">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <div>加载中...</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 分页 -->
      <div id="game-report-pagination" class="mt-6 flex items-center justify-between">
        <!-- 动态渲染 -->
      </div>
    </div>
  `;
  
  loadGameReport();
}

// 加载游戏报表数据
async function loadGameReport(page = 1) {
  try {
    const startDate = document.getElementById('game-report-start-date')?.value || '';
    const endDate = document.getElementById('game-report-end-date')?.value || '';
    const search = document.getElementById('game-report-search')?.value || '';
    const gameType = document.getElementById('game-report-type')?.value || '';
    
    const result = await api(`/api/agent/game-report?page=${page}&start_date=${startDate}&end_date=${endDate}&search=${search}&game_type=${gameType}`);
    
    if (result.success) {
      const tbody = document.getElementById('game-report-table-body');
      const data = result.data;
      
      // 更新统计数据
      document.getElementById('game-total-bet').textContent = '¥' + formatMoney(data.summary.totalBet);
      document.getElementById('game-valid-bet').textContent = '¥' + formatMoney(data.summary.validBet);
      document.getElementById('game-total-winloss').textContent = '¥' + formatMoney(data.summary.totalWinLoss);
      document.getElementById('game-total-count').textContent = data.summary.totalCount;
      
      // 渲染表格
      if (data.list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="px-6 py-12 text-center text-gray-400">
              <i class="fas fa-inbox text-4xl mb-2"></i>
              <div>暂无数据</div>
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = data.list.map(item => `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="px-6 py-4">
            <div class="font-medium">${makeAccountClickable(item.player_username, item.player_id, 'player')}</div>
            <div class="text-sm text-gray-400">${escapeHtml(item.player_name || '-')}</div>
          </td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 bg-blue-900 text-blue-300 rounded text-sm">
              ${item.game_type_display}
            </span>
          </td>
          <td class="px-6 py-4 text-gray-300">¥${formatMoney(item.bet_amount)}</td>
          <td class="px-6 py-4 text-blue-400 font-semibold">¥${formatMoney(item.valid_bet)}</td>
          <td class="px-6 py-4">
            <span class="${item.win_loss >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">
              ${item.win_loss >= 0 ? '+' : ''}¥${formatMoney(item.win_loss)}
            </span>
          </td>
          <td class="px-6 py-4 text-purple-400">¥${formatMoney(item.wash_code_fee || 0)}</td>
          <td class="px-6 py-4 text-sm text-gray-400">${item.bet_time}</td>
          <td class="px-6 py-4">
            <button onclick="viewGameDetail('${item.game_id}')" class="text-blue-400 hover:text-blue-300" title="查看详情">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `).join('');
      
      // 渲染分页
      renderPagination('game-report-pagination', data.currentPage, data.totalPages, loadGameReport);
    }
  } catch (error) {
    console.error('Load game report error:', error);
    showToast('加载游戏报表失败', 'error');
  }
}

// 搜索游戏报表
function searchGameReport() {
  loadGameReport(1);
}

// 导出游戏报表
function exportGameReport() {
  showToast('游戏报表导出功能开发中...', 'info');
}

// 查看游戏详情
function viewGameDetail(gameId) {
  showToast(`查看游戏 ${gameId} 详情功能开发中...`, 'info');
}

// 渲染佣金明细
function renderCommission() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="fade-in">
      <h2 class="text-2xl font-bold mb-6">
        <i class="fas fa-percentage text-primary mr-3"></i>佣金明细
      </h2>
      
      <!-- 搜索查询栏 -->
      <div class="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-2">开始日期</label>
            <input type="date" id="commission-start-date" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">结束日期</label>
            <input type="date" id="commission-end-date" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">账号搜索</label>
            <input type="text" id="commission-search" placeholder="账号/姓名" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-2">对象类型</label>
            <select id="commission-role" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
              <option value="">全部</option>
              <option value="agent">下级代理</option>
              <option value="player">下级会员</option>
            </select>
          </div>
          <div class="flex items-end space-x-2">
            <button onclick="searchCommission()" class="flex-1 bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition">
              <i class="fas fa-search mr-2"></i>查询
            </button>
            <button onclick="exportCommission()" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition" title="导出">
              <i class="fas fa-download"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 佣金汇总统计 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm opacity-90">累计佣金</span>
            <i class="fas fa-coins text-2xl opacity-75"></i>
          </div>
          <div class="text-2xl font-bold" id="commission-total">¥0.00</div>
          <div class="text-sm opacity-75 mt-2">所有佣金总额</div>
        </div>
        <div class="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-white">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm opacity-90">本月佣金</span>
            <i class="fas fa-calendar-alt text-2xl opacity-75"></i>
          </div>
          <div class="text-2xl font-bold" id="commission-month">¥0.00</div>
          <div class="text-sm opacity-75 mt-2">当月累计佣金收入</div>
        </div>
        <div class="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 text-white">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm opacity-90">今日佣金</span>
            <i class="fas fa-clock text-2xl opacity-75"></i>
          </div>
          <div class="text-2xl font-bold" id="commission-today">¥0.00</div>
          <div class="text-sm opacity-75 mt-2">今日新增佣金</div>
        </div>
      </div>
      
      <!-- 数据表格 -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold">日期</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">对象账号</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">对象类型</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">有效投注</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">输赢金额</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">洗码率%</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">洗码费</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">占成比例</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">佣金金额</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody id="commission-table-body">
            <tr>
              <td colspan="10" class="px-6 py-12 text-center text-gray-400">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <div>加载中...</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 分页 -->
      <div id="commission-pagination" class="mt-6 flex items-center justify-between">
        <!-- 动态渲染 -->
      </div>
    </div>
  `;
  
  // 设置默认日期（本月）
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  document.getElementById('commission-start-date').value = firstDay.toISOString().split('T')[0];
  document.getElementById('commission-end-date').value = today.toISOString().split('T')[0];
  
  loadCommission();
}

// 渲染账户设置
function renderAccount() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="fade-in">
      <h2 class="text-2xl font-bold mb-6">
        <i class="fas fa-user-cog text-primary mr-3"></i>账户设置
      </h2>
      
      <!-- 选项卡 -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 mb-6">
        <div class="flex border-b border-gray-700">
          <button onclick="showAccountTab('profile')" data-tab="profile" class="account-tab-btn flex-1 px-6 py-4 text-center transition hover:bg-gray-750 border-b-2 border-primary">
            <i class="fas fa-user mr-2"></i>个人信息
          </button>
          <button onclick="showAccountTab('password')" data-tab="password" class="account-tab-btn flex-1 px-6 py-4 text-center transition hover:bg-gray-750 border-b-2 border-transparent">
            <i class="fas fa-key mr-2"></i>修改密码
          </button>
          <button onclick="showAccountTab('invite')" data-tab="invite" class="account-tab-btn flex-1 px-6 py-4 text-center transition hover:bg-gray-750 border-b-2 border-transparent">
            <i class="fas fa-share-alt mr-2"></i>分享邀请
          </button>
          <button onclick="showAccountTab('logs')" data-tab="logs" class="account-tab-btn flex-1 px-6 py-4 text-center transition hover:bg-gray-750 border-b-2 border-transparent">
            <i class="fas fa-history mr-2"></i>登录日志
          </button>
        </div>
      </div>
      
      <!-- 内容区域 -->
      <div id="account-tab-content">
        <!-- 动态渲染 -->
      </div>
    </div>
  `;
  
  showAccountTab('profile');
}

// ========================================
// 团队报表相关函数
// ========================================

// 加载团队报表
async function loadTeamReport(page = 1) {
  try {
    const startDate = document.getElementById('report-start-date')?.value || '';
    const endDate = document.getElementById('report-end-date')?.value || '';
    const search = document.getElementById('report-search')?.value || '';
    const type = document.getElementById('report-type')?.value || '';
    
    const result = await api(`/api/agent/team-report?page=${page}&start_date=${startDate}&end_date=${endDate}&search=${search}&type=${type}`);
    
    if (result.success) {
      const data = result.data;
      
      // 更新统计数据
      document.getElementById('team-total-members').textContent = data.summary.totalMembers;
      document.getElementById('team-total-performance').textContent = '¥' + formatMoney(data.summary.totalPerformance);
      document.getElementById('team-total-profit').textContent = '¥' + formatMoney(data.summary.totalProfit);
      document.getElementById('team-my-commission').textContent = '¥' + formatMoney(data.summary.myCommission);
      
      // 渲染表格
      const tbody = document.getElementById('team-report-table-body');
      if (data.list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="px-6 py-12 text-center text-gray-400">
              <i class="fas fa-inbox text-4xl mb-2"></i>
              <div>暂无数据</div>
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = data.list.map(item => `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="px-6 py-4">
            <div class="font-medium">${makeAccountClickable(item.username, item.id, item.type)}</div>
          </td>
          <td class="px-6 py-4">${escapeHtml(item.real_name || '-')}</td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 ${item.type === 'agent' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'} rounded text-sm">
              ${item.type === 'agent' ? '代理' : '会员'}
            </span>
          </td>
          <td class="px-6 py-4 text-gray-300">¥${formatMoney(item.total_bet)}</td>
          <td class="px-6 py-4 text-blue-400 font-semibold">¥${formatMoney(item.valid_bet)}</td>
          <td class="px-6 py-4">
            <span class="${item.profit >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold">
              ¥${formatMoney(Math.abs(item.profit))}
            </span>
          </td>
          <td class="px-6 py-4 text-purple-400">${item.share_ratio}%</td>
          <td class="px-6 py-4 text-green-400 font-bold">¥${formatMoney(item.my_commission)}</td>
          <td class="px-6 py-4">
            <button onclick="viewReportDetail(${item.id}, '${item.type}')" class="text-blue-400 hover:text-blue-300">
              <i class="fas fa-eye mr-1"></i>详情
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Load team report error:', error);
    showToast('加载团队报表失败', 'error');
  }
}

// 搜索团队报表
function searchTeamReport() {
  loadTeamReport(1);
}

// 导出团队报表
function exportTeamReport() {
  showToast('导出功能开发中...', 'info');
}

// 查看报表详情
function viewReportDetail(id, type) {
  if (type === 'agent') {
    viewAgentDetail(id);
  } else {
    viewPlayerDetail(id);
  }
}

// 使账号可点击 - 全站通用函数
function makeAccountClickable(username, id, type) {
  const escapedUsername = escapeHtml(username);
  const clickAction = type === 'agent' ? `viewAgentDetail(${id})` : `viewPlayerDetail(${id})`;
  return `<span class="text-blue-400 hover:text-blue-300 cursor-pointer hover:underline" onclick="${clickAction}">${escapedUsername}</span>`;
}

// 显示新增代理弹窗
function showAddAgentModal() {
  showToast('新增代理功能开发中...', 'info');
}

// 显示新增会员弹窗
function showAddPlayerModal() {
  showToast('新增会员功能开发中...', 'info');
}

// ========================================
// 佣金明细相关函数
// ========================================

// 加载佣金明细
async function loadCommission(page = 1) {
  try {
    const startDate = document.getElementById('commission-start-date')?.value || '';
    const endDate = document.getElementById('commission-end-date')?.value || '';
    const search = document.getElementById('commission-search')?.value || '';
    const role = document.getElementById('commission-role')?.value || '';
    
    const result = await api(`/api/agent/commission?page=${page}&start_date=${startDate}&end_date=${endDate}&search=${search}&role=${role}`);
    
    if (result.success) {
      const data = result.data;
      
      // 更新统计数据
      document.getElementById('commission-total').textContent = '¥' + formatMoney(data.summary.total);
      document.getElementById('commission-month').textContent = '¥' + formatMoney(data.summary.month);
      document.getElementById('commission-today').textContent = '¥' + formatMoney(data.summary.today);
      
      // 渲染表格
      const tbody = document.getElementById('commission-table-body');
      if (data.list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" class="px-6 py-12 text-center text-gray-400">
              <i class="fas fa-inbox text-4xl mb-2"></i>
              <div>暂无数据</div>
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = data.list.map(item => `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="px-6 py-4 text-gray-300">${formatDate(item.date)}</td>
          <td class="px-6 py-4">
            <div class="font-medium">${makeAccountClickable(item.target_username, item.target_id, item.target_type)}</div>
            <div class="text-sm text-gray-400">${escapeHtml(item.target_name || '-')}</div>
          </td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 ${item.target_type === 'agent' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'} rounded text-sm">
              ${item.target_type === 'agent' ? '下级代理' : '下级会员'}
            </span>
          </td>
          <td class="px-6 py-4 text-blue-400">¥${formatMoney(item.valid_bet)}</td>
          <td class="px-6 py-4">
            <span class="${item.profit >= 0 ? 'text-green-400' : 'text-red-400'}">
              ${item.profit >= 0 ? '+' : '-'}¥${formatMoney(Math.abs(item.profit))}
            </span>
          </td>
          <td class="px-6 py-4 text-orange-400">${item.wash_code_rate}%</td>
          <td class="px-6 py-4 text-orange-400">¥${formatMoney(item.wash_code_fee)}</td>
          <td class="px-6 py-4 text-purple-400">${item.share_ratio}%</td>
          <td class="px-6 py-4 text-green-400 font-bold">¥${formatMoney(item.commission_amount)}</td>
          <td class="px-6 py-4">
            <button onclick="viewCommissionDetail(${item.id})" class="text-blue-400 hover:text-blue-300">
              <i class="fas fa-eye mr-1"></i>详情
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Load commission error:', error);
    showToast('加载佣金明细失败', 'error');
  }
}

// 搜索佣金明细
function searchCommission() {
  loadCommission(1);
}

// 导出佣金明细
function exportCommission() {
  showToast('导出功能开发中...', 'info');
}

// 查看佣金详情
async function viewCommissionDetail(id) {
  try {
    const response = await fetch(`/api/agent/commission/${id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('agent_token')}`
      }
    });
    
    const result = await response.json();
    
    if (!result.success) {
      showToast(result.error || '获取佣金详情失败', 'error');
      return;
    }
    
    const commission = result.data;
    
    // 创建详情模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 fade-in';
    modal.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-white">
            <i class="fas fa-file-invoice-dollar text-primary mr-2"></i>佣金详情
          </h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="space-y-6">
          <!-- 基本信息 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
              <i class="fas fa-info-circle text-primary mr-2"></i>基本信息
            </h4>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">结算周期</label>
                <div class="text-white font-medium">${commission.period}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">代理账号</label>
                <div class="text-white font-medium">${commission.agent_username}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">佣金比例</label>
                <div class="text-white font-medium">${(commission.commission_rate * 100).toFixed(2)}%</div>
              </div>
            </div>
          </div>
          
          <!-- 统计数据 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
              <i class="fas fa-chart-bar text-primary mr-2"></i>统计数据
            </h4>
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center">
                <label class="block text-gray-400 text-sm mb-2">总投注额</label>
                <div class="text-3xl font-bold text-blue-400">¥${commission.total_bet.toLocaleString()}</div>
              </div>
              <div class="text-center">
                <label class="block text-gray-400 text-sm mb-2">总盈利</label>
                <div class="text-3xl font-bold text-green-400">¥${commission.total_profit.toLocaleString()}</div>
              </div>
              <div class="text-center">
                <label class="block text-gray-400 text-sm mb-2">佣金金额</label>
                <div class="text-3xl font-bold text-yellow-400">¥${commission.commission_amount.toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          <!-- 时间信息 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-400 text-sm mb-1">创建时间</label>
                <div class="text-white font-medium">${commission.created_at}</div>
              </div>
              <div>
                <label class="block text-gray-400 text-sm mb-1">结算时间</label>
                <div class="text-white font-medium">${commission.settled_at || '-'}</div>
              </div>
            </div>
          </div>
          
          <!-- 每日明细 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-white mb-4 flex items-center">
              <i class="fas fa-list text-primary mr-2"></i>每日明细
            </h4>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-gray-600">
                    <th class="text-left text-gray-300 py-2 px-4">日期</th>
                    <th class="text-right text-gray-300 py-2 px-4">投注额</th>
                    <th class="text-right text-gray-300 py-2 px-4">盈利</th>
                    <th class="text-right text-gray-300 py-2 px-4">佣金</th>
                  </tr>
                </thead>
                <tbody>
                  ${commission.details.map(detail => `
                    <tr class="border-b border-gray-600 hover:bg-gray-600">
                      <td class="text-left text-white py-2 px-4">${detail.date}</td>
                      <td class="text-right text-white py-2 px-4">¥${detail.bet.toLocaleString()}</td>
                      <td class="text-right text-green-400 py-2 px-4">¥${detail.profit.toLocaleString()}</td>
                      <td class="text-right text-yellow-400 py-2 px-4 font-semibold">¥${detail.commission.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-gray-500">
                    <td class="text-left text-white py-3 px-4 font-bold">合计</td>
                    <td class="text-right text-white py-3 px-4 font-bold">
                      ¥${commission.details.reduce((sum, d) => sum + d.bet, 0).toLocaleString()}
                    </td>
                    <td class="text-right text-green-400 py-3 px-4 font-bold">
                      ¥${commission.details.reduce((sum, d) => sum + d.profit, 0).toLocaleString()}
                    </td>
                    <td class="text-right text-yellow-400 py-3 px-4 font-bold">
                      ¥${commission.details.reduce((sum, d) => sum + d.commission, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end">
          <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition">
            关闭
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    console.error('View commission detail error:', error);
    showToast('获取佣金详情失败', 'error');
  }
}

// ========================================
// 账户设置相关函数
// ========================================

// 显示账户设置选项卡
function showAccountTab(tab) {
  // 更新选项卡样式
  document.querySelectorAll('.account-tab-btn').forEach(btn => {
    btn.classList.remove('border-primary');
    btn.classList.add('border-transparent');
  });
  document.querySelector(`[data-tab="${tab}"]`).classList.remove('border-transparent');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('border-primary');
  
  // 渲染对应内容
  const content = document.getElementById('account-tab-content');
  
  switch(tab) {
    case 'profile':
      renderProfileTab();
      break;
    case 'password':
      renderPasswordTab();
      break;
    case 'invite':
      renderInviteTab();
      break;
    case 'logs':
      renderLogsTab();
      break;
  }
}

// 渲染个人信息选项卡
function renderProfileTab() {
  const content = document.getElementById('account-tab-content');
  content.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-8 border border-gray-700">
      <h3 class="text-xl font-semibold mb-6">
        <i class="fas fa-user-circle text-primary mr-2"></i>个人信息
      </h3>
      
      <form id="profile-form" onsubmit="updateProfile(event)" class="max-w-2xl">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm text-gray-400 mb-2">账号</label>
            <input type="text" value="${escapeHtml(currentUser.username)}" disabled
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-gray-400">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">角色</label>
            <input type="text" value="${currentRole === 'shareholder' ? '股东' : '代理'}" disabled
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-gray-400">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">真实姓名 <span class="text-red-400">*</span></label>
            <input type="text" name="real_name" value="${escapeHtml(currentUser.real_name || '')}" required
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">联系电话 <span class="text-red-400">*</span></label>
            <input type="tel" name="phone" value="${escapeHtml(currentUser.phone || '')}" required
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary">
          </div>
          
          <div class="md:col-span-2">
            <label class="block text-sm text-gray-400 mb-2">邮箱</label>
            <input type="email" name="email" value="${escapeHtml(currentUser.email || '')}"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary">
          </div>
        </div>
        
        <div class="mt-8 flex items-center space-x-4">
          <button type="submit" class="bg-primary hover:bg-blue-700 px-8 py-3 rounded-lg transition font-semibold">
            <i class="fas fa-save mr-2"></i>保存修改
          </button>
          <button type="button" onclick="renderProfileTab()" class="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg transition">
            <i class="fas fa-undo mr-2"></i>重置
          </button>
        </div>
      </form>
    </div>
  `;
}

// 渲染修改密码选项卡
function renderPasswordTab() {
  const content = document.getElementById('account-tab-content');
  content.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-8 border border-gray-700">
      <h3 class="text-xl font-semibold mb-6">
        <i class="fas fa-key text-primary mr-2"></i>修改密码
      </h3>
      
      <form id="password-form" onsubmit="updatePassword(event)" class="max-w-xl">
        <div class="space-y-6">
          <div>
            <label class="block text-sm text-gray-400 mb-2">当前密码 <span class="text-red-400">*</span></label>
            <input type="password" name="old_password" required
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                   placeholder="请输入当前密码">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">新密码 <span class="text-red-400">*</span></label>
            <input type="password" name="new_password" required minlength="6"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                   placeholder="请输入新密码（至少6位）">
            <div class="text-sm text-gray-400 mt-2">
              <i class="fas fa-info-circle mr-1"></i>密码长度至少6位，建议包含字母、数字和特殊字符
            </div>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">确认新密码 <span class="text-red-400">*</span></label>
            <input type="password" name="confirm_password" required minlength="6"
                   class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
                   placeholder="请再次输入新密码">
          </div>
        </div>
        
        <div class="mt-8 flex items-center space-x-4">
          <button type="submit" class="bg-primary hover:bg-blue-700 px-8 py-3 rounded-lg transition font-semibold">
            <i class="fas fa-check mr-2"></i>确认修改
          </button>
          <button type="reset" class="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg transition">
            <i class="fas fa-undo mr-2"></i>重置
          </button>
        </div>
      </form>
    </div>
  `;
}

// 渲染分享邀请选项卡
function renderInviteTab() {
  const content = document.getElementById('account-tab-content');
  
  // 生成邀请链接（基于当前用户ID）
  const baseUrl = window.location.origin;
  const inviteCode = `${currentUser.id}_${btoa(currentUser.username).substring(0, 8)}`;
  const inviteLink = `${baseUrl}/register.html?invite=${inviteCode}`;
  
  content.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-8 border border-gray-700">
      <h3 class="text-xl font-semibold mb-6">
        <i class="fas fa-share-alt text-primary mr-2"></i>分享邀请链接
      </h3>
      
      <div class="max-w-3xl">
        <!-- 邀请说明 -->
        <div class="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 mb-6">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <i class="fas fa-info-circle text-blue-400 text-2xl"></i>
            </div>
            <div>
              <h4 class="text-lg font-semibold text-blue-300 mb-2">邀请说明</h4>
              <ul class="text-gray-300 space-y-2 text-sm">
                <li><i class="fas fa-check-circle text-green-400 mr-2"></i>分享您的专属邀请链接给新用户</li>
                <li><i class="fas fa-check-circle text-green-400 mr-2"></i>新用户通过链接注册后自动绑定为您的下级</li>
                <li><i class="fas fa-check-circle text-green-400 mr-2"></i>您可以从下级的业绩中获得佣金分成</li>
                <li><i class="fas fa-check-circle text-green-400 mr-2"></i>链接永久有效，可重复使用</li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- 邀请码 -->
        <div class="mb-6">
          <label class="block text-sm text-gray-400 mb-3">
            <i class="fas fa-tag mr-2"></i>您的邀请码
          </label>
          <div class="flex items-center space-x-3">
            <input type="text" id="invite-code" value="${inviteCode}" readonly
                   class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 font-mono text-lg">
            <button onclick="copyInviteCode()" class="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition">
              <i class="fas fa-copy mr-2"></i>复制
            </button>
          </div>
        </div>
        
        <!-- 邀请链接 -->
        <div class="mb-6">
          <label class="block text-sm text-gray-400 mb-3">
            <i class="fas fa-link mr-2"></i>您的专属邀请链接
          </label>
          <div class="flex items-center space-x-3">
            <input type="text" id="invite-link" value="${inviteLink}" readonly
                   class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-sm break-all">
            <button onclick="copyInviteLink()" class="px-6 py-3 bg-primary hover:bg-blue-700 rounded-lg transition">
              <i class="fas fa-copy mr-2"></i>复制链接
            </button>
          </div>
        </div>
        
        <!-- 二维码区域 -->
        <div class="bg-gray-750 rounded-xl p-6 border border-gray-700">
          <h4 class="text-lg font-semibold mb-4">
            <i class="fas fa-qrcode text-primary mr-2"></i>邀请二维码
          </h4>
          <div class="flex items-center justify-center space-x-8">
            <div class="text-center">
              <div id="invite-qrcode" class="bg-white p-4 rounded-lg inline-block mb-3">
                <!-- 二维码将在这里生成 -->
                <div class="w-48 h-48 flex items-center justify-center text-gray-400">
                  <i class="fas fa-qrcode text-6xl"></i>
                </div>
              </div>
              <p class="text-sm text-gray-400">扫码注册并绑定关系</p>
            </div>
            <div class="flex flex-col space-y-3">
              <button onclick="downloadQRCode()" class="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
                <i class="fas fa-download mr-2"></i>下载二维码
              </button>
              <button onclick="printQRCode()" class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition">
                <i class="fas fa-print mr-2"></i>打印二维码
              </button>
            </div>
          </div>
        </div>
        
        <!-- 邀请统计 -->
        <div class="mt-6 grid grid-cols-3 gap-4">
          <div class="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-xl p-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-400">累计邀请</span>
              <i class="fas fa-users text-blue-400"></i>
            </div>
            <div class="text-3xl font-bold text-blue-300" id="total-invites">0</div>
            <div class="text-xs text-gray-500 mt-1">总下级人数</div>
          </div>
          
          <div class="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-xl p-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-400">本月新增</span>
              <i class="fas fa-user-plus text-green-400"></i>
            </div>
            <div class="text-3xl font-bold text-green-300" id="month-invites">0</div>
            <div class="text-xs text-gray-500 mt-1">本月新增下级</div>
          </div>
          
          <div class="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 rounded-xl p-6">
            <div class="flex items-center justify-between mb-2">
              <span class="text-gray-400">今日新增</span>
              <i class="fas fa-star text-purple-400"></i>
            </div>
            <div class="text-3xl font-bold text-purple-300" id="today-invites">0</div>
            <div class="text-xs text-gray-500 mt-1">今日新增下级</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 加载邀请统计数据
  loadInviteStats();
}

// 复制邀请码
function copyInviteCode() {
  const input = document.getElementById('invite-code');
  input.select();
  document.execCommand('copy');
  showToast('邀请码已复制到剪贴板', 'success');
}

// 复制邀请链接
function copyInviteLink() {
  const input = document.getElementById('invite-link');
  input.select();
  document.execCommand('copy');
  showToast('邀请链接已复制到剪贴板', 'success');
}

// 下载二维码
function downloadQRCode() {
  showToast('二维码下载功能开发中', 'info');
  // TODO: 实现二维码下载功能
}

// 打印二维码
function printQRCode() {
  showToast('二维码打印功能开发中', 'info');
  // TODO: 实现二维码打印功能
}

// 加载邀请统计数据
async function loadInviteStats() {
  try {
    const result = await api('/api/agent/invite-stats');
    if (result.success && result.data) {
      document.getElementById('total-invites').textContent = result.data.total || 0;
      document.getElementById('month-invites').textContent = result.data.month || 0;
      document.getElementById('today-invites').textContent = result.data.today || 0;
    }
  } catch (error) {
    console.error('Load invite stats error:', error);
  }
}

// 渲染登录日志选项卡
function renderLogsTab() {
  const content = document.getElementById('account-tab-content');
  content.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl font-semibold">
          <i class="fas fa-history text-primary mr-2"></i>登录日志
        </h3>
        <div class="flex items-center space-x-4">
          <input type="date" id="log-start-date" class="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          <input type="date" id="log-end-date" class="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary">
          <button onclick="searchLogs()" class="bg-primary hover:bg-blue-700 px-4 py-2 rounded-lg transition">
            <i class="fas fa-search mr-2"></i>查询
          </button>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold">登录时间</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">IP地址</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">设备信息</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">登录方式</th>
              <th class="px-6 py-4 text-left text-sm font-semibold">状态</th>
            </tr>
          </thead>
          <tbody id="login-logs-table-body">
            <tr>
              <td colspan="5" class="px-6 py-12 text-center text-gray-400">
                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                <div>加载中...</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div id="logs-pagination" class="mt-6 flex items-center justify-between">
        <!-- 动态渲染 -->
      </div>
    </div>
  `;
  
  // 设置默认日期（最近30天）
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  document.getElementById('log-start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
  document.getElementById('log-end-date').value = today.toISOString().split('T')[0];
  
  loadLoginLogs();
}

// 更新个人信息
async function updateProfile(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  try {
    const result = await api('/api/agent/profile', {
      method: 'PUT',
      body: JSON.stringify({
        real_name: formData.get('real_name'),
        phone: formData.get('phone'),
        email: formData.get('email')
      })
    });
    
    if (result.success) {
      showToast('个人信息更新成功', 'success');
      currentUser.real_name = formData.get('real_name');
      currentUser.phone = formData.get('phone');
      currentUser.email = formData.get('email');
    } else {
      showToast(result.error || '更新失败', 'error');
    }
  } catch (error) {
    console.error('Update profile error:', error);
    showToast('更新失败，请稍后重试', 'error');
  }
}

// 修改密码
async function updatePassword(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  const newPassword = formData.get('new_password');
  const confirmPassword = formData.get('confirm_password');
  
  if (newPassword !== confirmPassword) {
    showToast('两次输入的新密码不一致', 'error');
    return;
  }
  
  try {
    const result = await api('/api/agent/password', {
      method: 'PUT',
      body: JSON.stringify({
        old_password: formData.get('old_password'),
        new_password: newPassword
      })
    });
    
    if (result.success) {
      showToast('密码修改成功，请重新登录', 'success');
      setTimeout(() => {
        handleLogout();
      }, 2000);
    } else {
      showToast(result.error || '修改失败', 'error');
    }
  } catch (error) {
    console.error('Update password error:', error);
    showToast('修改失败，请稍后重试', 'error');
  }
}

// 加载登录日志
async function loadLoginLogs(page = 1) {
  try {
    const startDate = document.getElementById('log-start-date')?.value || '';
    const endDate = document.getElementById('log-end-date')?.value || '';
    
    const result = await api(`/api/agent/login-logs?page=${page}&start_date=${startDate}&end_date=${endDate}`);
    
    if (result.success) {
      const tbody = document.getElementById('login-logs-table-body');
      const data = result.data;
      
      if (data.list.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="px-6 py-12 text-center text-gray-400">
              <i class="fas fa-inbox text-4xl mb-2"></i>
              <div>暂无登录记录</div>
            </td>
          </tr>
        `;
        return;
      }
      
      tbody.innerHTML = data.list.map(item => `
        <tr class="border-t border-gray-700 hover:bg-gray-750">
          <td class="px-6 py-4 text-gray-300">${formatDate(item.login_time)}</td>
          <td class="px-6 py-4 font-mono text-blue-400">${escapeHtml(item.ip_address)}</td>
          <td class="px-6 py-4 text-sm text-gray-400">${escapeHtml(item.user_agent || '-')}</td>
          <td class="px-6 py-4">
            <span class="px-2 py-1 bg-blue-900 text-blue-300 rounded text-sm">
              ${item.login_type || '密码登录'}
            </span>
          </td>
          <td class="px-6 py-4">
            ${item.status === 'success' 
              ? '<span class="px-2 py-1 bg-green-900 text-green-300 rounded text-sm"><i class="fas fa-check mr-1"></i>成功</span>'
              : '<span class="px-2 py-1 bg-red-900 text-red-300 rounded text-sm"><i class="fas fa-times mr-1"></i>失败</span>'}
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Load login logs error:', error);
    showToast('加载登录日志失败', 'error');
  }
}

// 搜索登录日志
function searchLogs() {
  loadLoginLogs(1);
}

// ==========================================
// 新增代理功能（与管理员后台布局一致）
// ==========================================
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
            <input type="text" name="agent_username" required class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2" placeholder="6-20位字母数字">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">初始密码 <span class="text-red-500">*</span></label>
            <div class="relative">
              <input type="password" name="password" id="agent-password" required class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 pr-10" placeholder="6-20位">
              <button type="button" onclick="togglePasswordVisibility('agent-password')" class="absolute right-2 top-2 text-gray-400 hover:text-white">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">真实姓名 <span class="text-red-500">*</span></label>
            <input type="text" name="real_name" required class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">昵称</label>
            <input type="text" name="nickname" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">联系电话</label>
            <input type="text" name="contact_phone" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2" placeholder="11位手机号（可选）">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">联系邮箱</label>
            <input type="email" name="contact_email" class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">占成比 (%) <span class="text-red-500">*</span></label>
            <input type="number" name="share_ratio" value="0" min="0" max="100" step="0.1" required class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">洗码率 (%) <span class="text-red-500">*</span></label>
            <input type="number" name="commission_ratio" value="0" min="0" max="100" step="0.01" required class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2">
          </div>
        </div>
        
        <div class="flex gap-4 justify-end pt-4 border-t border-gray-700">
          <button type="button" onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">
            <i class="fas fa-times mr-2"></i>取消
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

// 创建代理
async function createAgent(modal) {
  const form = document.getElementById('add-agent-form');
  const formData = new FormData(form);
  const data = {
    agent_username: formData.get('agent_username'),
    password: formData.get('password'),
    real_name: formData.get('real_name'),
    nickname: formData.get('nickname') || '',
    contact_phone: formData.get('contact_phone'),
    contact_email: formData.get('contact_email') || '',
    share_ratio: parseFloat(formData.get('share_ratio')),
    commission_ratio: parseFloat(formData.get('commission_ratio')),
    level: 'agent',
    parent_agent_id: currentUser.id
  };

  // 表单验证
  if (!/^[a-zA-Z0-9]{6,20}$/.test(data.agent_username)) {
    showToast('账号格式错误，请输入6-20位字母数字', 'error');
    return;
  }

  if (!/^.{6,20}$/.test(data.password)) {
    showToast('密码长度必须为6-20位', 'error');
    return;
  }

  // 手机号非必填，但如果填写了需要验证格式
  if (data.contact_phone && !/^1[3-9]\d{9}$/.test(data.contact_phone)) {
    showToast('请输入正确的手机号', 'error');
    return;
  }

  try {
    const result = await api('/api/agent/subordinates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (result.success) {
      showToast('创建代理成功', 'success');
      modal.remove();
      // 刷新代理列表
      loadAgents(1);
    } else {
      showToast(result.error || '创建失败', 'error');
    }
  } catch (error) {
    console.error('Create agent error:', error);
    showToast('创建失败，请稍后重试', 'error');
  }
}

// ==========================================
// 新增会员功能（与管理员后台布局一致）
// ==========================================
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
            <div class="relative">
              <input type="password" name="password" id="player-password" required class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pr-10 focus:border-primary focus:outline-none" placeholder="6-20位">
              <button type="button" onclick="togglePasswordVisibility('player-password')" class="absolute right-2 top-2 text-gray-400 hover:text-white">
                <i class="fas fa-eye"></i>
              </button>
            </div>
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
            <label class="block text-gray-300 text-sm mb-2">洗码率 (%)</label>
            <input type="number" name="rebate_ratio" value="0" min="0" max="100" step="0.01" class="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:border-primary focus:outline-none" placeholder="0-100">
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
    
    // 表单验证
    if (!/^[a-zA-Z0-9]{6,20}$/.test(data.username)) {
      showToast('用户名格式错误，请输入6-20位字母数字', 'error');
      return;
    }

    if (!/^.{6,20}$/.test(data.password)) {
      showToast('密码长度必须为6-20位', 'error');
      return;
    }

    // 添加所属代理ID（当前登录的代理/股东）
    data.agent_id = currentUser.id;
    
    try {
      const result = await api('/api/agent/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (result.success) {
        showToast('创建玩家成功！', 'success');
        modal.remove();
        // 刷新玩家列表
        loadPlayers(1);
      } else {
        showToast('创建失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Create player error:', error);
      showToast('创建失败，请稍后重试', 'error');
    }
  };
}

// 切换密码可见性
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.nextElementSibling.querySelector('i');
  
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

// 页面加载完成
document.addEventListener('DOMContentLoaded', () => {
  // 检查是否已登录
  const token = localStorage.getItem('agent_token');
  if (token) {
    // 验证token有效性
    api('/api/agent/verify').then(result => {
      if (result.success) {
        currentUser = result.data.user;
        currentRole = result.data.user.role;
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('main-page').classList.remove('hidden');
        initMainPage();
      }
    });
  }
});
