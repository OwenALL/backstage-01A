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
    { id: 'subordinates', icon: 'fa-users', name: '下级代理管理' },
    { id: 'team-report', icon: 'fa-chart-bar', name: '团队报表' },
    { id: 'commission', icon: 'fa-percentage', name: '佣金明细' },
    { id: 'account', icon: 'fa-user-cog', name: '账户设置' }
  ];

  const agentMenu = [
    { id: 'dashboard', icon: 'fa-chart-line', name: '数据概览' },
    { id: 'subordinates', icon: 'fa-users', name: '下级代理' },
    { id: 'players', icon: 'fa-user-friends', name: '玩家管理' },
    { id: 'team-report', icon: 'fa-chart-bar', name: '团队报表' },
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
    case 'subordinates':
      renderSubordinates();
      break;
    case 'players':
      renderPlayers();
      break;
    case 'team-report':
      renderTeamReport();
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
function renderTeamReport() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="fade-in">
      <h2 class="text-2xl font-bold mb-6">
        <i class="fas fa-chart-bar text-primary mr-3"></i>团队报表
      </h2>
      <div class="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
        <i class="fas fa-chart-bar text-6xl text-gray-600 mb-4"></i>
        <p class="text-gray-400 text-lg">功能开发中...</p>
      </div>
    </div>
  `;
}

// 渲染佣金明细
function renderCommission() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="fade-in">
      <h2 class="text-2xl font-bold mb-6">
        <i class="fas fa-percentage text-primary mr-3"></i>佣金明细
      </h2>
      <div class="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
        <i class="fas fa-percentage text-6xl text-gray-600 mb-4"></i>
        <p class="text-gray-400 text-lg">功能开发中...</p>
      </div>
    </div>
  `;
}

// 渲染账户设置
function renderAccount() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="fade-in">
      <h2 class="text-2xl font-bold mb-6">
        <i class="fas fa-user-cog text-primary mr-3"></i>账户设置
      </h2>
      <div class="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
        <i class="fas fa-user-cog text-6xl text-gray-600 mb-4"></i>
        <p class="text-gray-400 text-lg">功能开发中...</p>
      </div>
    </div>
  `;
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
