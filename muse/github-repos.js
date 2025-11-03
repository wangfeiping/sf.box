// GitHub 项目页面 JavaScript

// 全局状态
let githubToken = null;
let githubUser = null;
let allGithubRepos = []; // 存储所有 GitHub 项目
let githubSearchQuery = ''; // GitHub 搜索关键词
let displayedReposCount = 10; // 当前显示的项目数量

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadGithubAuth();
  initEventListeners();
  loadGithubRepos();
});

// 事件监听器
function initEventListeners() {
  // 返回按钮
  document.getElementById('closeGithubPage').addEventListener('click', () => {
    window.location.href = 'popup.html';
  });

  // 刷新按钮
  document.getElementById('refreshGithubRepos').addEventListener('click', loadGithubRepos);

  // 登出按钮
  document.getElementById('githubLogout').addEventListener('click', disconnectGithub);

  // GitHub 搜索
  document.getElementById('githubSearchInput').addEventListener('input', (e) => {
    githubSearchQuery = e.target.value.toLowerCase();
    displayedReposCount = 10; // 重置显示数量
    renderGithubRepos();
  });

  // 加载更多按钮
  document.getElementById('loadMoreRepos').addEventListener('click', loadMoreRepos);
}

// 加载 GitHub 认证信息
async function loadGithubAuth() {
  const result = await chrome.storage.local.get(['githubToken', 'githubUser']);
  githubToken = result.githubToken || null;
  githubUser = result.githubUser || null;

  if (!githubToken) {
    alert('未登录 GitHub，请先在主页面登录');
    window.location.href = 'popup.html';
  }
}

// 断开 GitHub 连接
async function disconnectGithub() {
  if (confirm('确定要断开 GitHub 连接吗?')) {
    githubToken = null;
    githubUser = null;
    await chrome.storage.local.remove(['githubToken', 'githubUser']);
    window.location.href = 'popup.html';
  }
}

// 加载 GitHub 项目列表
async function loadGithubRepos() {
  if (!githubToken) {
    return;
  }

  const loading = document.getElementById('githubReposLoading');
  const reposList = document.getElementById('githubReposList');

  loading.classList.remove('hidden');
  reposList.innerHTML = '';

  try {
    // 获取用户的仓库列表 (包括私有仓库)
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('获取项目列表失败');
    }

    allGithubRepos = await response.json();

    loading.classList.add('hidden');

    if (allGithubRepos.length === 0) {
      reposList.innerHTML = '<div class="empty-state"><p>没有找到项目</p></div>';
      document.getElementById('loadMoreContainer').classList.add('hidden');
      return;
    }

    // 渲染项目列表
    renderGithubRepos();

    // 绑定项目卡片点击事件
    bindGithubRepoClickEvents();

  } catch (error) {
    console.error('加载项目失败:', error);
    loading.classList.add('hidden');
    reposList.innerHTML = `<div class="empty-state"><p style="color: #e74c3c;">加载失败: ${error.message}</p></div>`;
    document.getElementById('loadMoreContainer').classList.add('hidden');
  }
}

// 渲染 GitHub 项目列表（支持搜索和分页）
function renderGithubRepos() {
  const reposList = document.getElementById('githubReposList');
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  const loading = document.getElementById('githubReposLoading');

  // 确保隐藏加载状态
  loading.classList.add('hidden');

  // 过滤项目
  let filteredRepos = allGithubRepos;
  if (githubSearchQuery) {
    filteredRepos = allGithubRepos.filter(repo => {
      return repo.name.toLowerCase().includes(githubSearchQuery) ||
             (repo.description && repo.description.toLowerCase().includes(githubSearchQuery)) ||
             (repo.language && repo.language.toLowerCase().includes(githubSearchQuery));
    });
  }

  if (filteredRepos.length === 0) {
    reposList.innerHTML = '<div class="empty-state"><p>没有找到匹配的项目</p></div>';
    loadMoreContainer.classList.add('hidden');
    return;
  }

  // 只显示前 N 个项目
  const reposToDisplay = filteredRepos.slice(0, displayedReposCount);

  reposList.innerHTML = reposToDisplay.map(repo => renderGithubRepo(repo)).join('');

  // 显示或隐藏"加载更多"按钮
  if (filteredRepos.length > displayedReposCount) {
    loadMoreContainer.classList.remove('hidden');
    const remaining = filteredRepos.length - displayedReposCount;
    document.getElementById('loadMoreRepos').textContent = `加载更多 (还有 ${remaining} 个)`;
  } else {
    loadMoreContainer.classList.add('hidden');
  }
}

// 加载更多项目
function loadMoreRepos() {
  displayedReposCount += 10;
  renderGithubRepos();
  bindGithubRepoClickEvents();
}

// 渲染 GitHub 项目卡片
function renderGithubRepo(repo) {
  const updatedAt = new Date(repo.updated_at).toLocaleDateString('zh-CN');
  const language = repo.language || 'Unknown';
  const description = repo.description || '无描述';

  return `
    <div class="github-repo-card"
         data-repo-fullname="${escapeHtml(repo.full_name)}"
         data-repo-name="${escapeHtml(repo.name)}"
         data-repo-branch="${escapeHtml(repo.default_branch)}">
      <div class="repo-header">
        <div class="repo-info">
          <div class="repo-name">
            ${repo.private ? '🔒' : '📖'} ${escapeHtml(repo.name)}
          </div>
          <div class="repo-desc">${escapeHtml(description)}</div>
        </div>
      </div>
      <div class="repo-meta">
        <span>⭐ ${repo.stargazers_count}</span>
        <span>🔀 ${repo.forks_count}</span>
        <span>💻 ${language}</span>
        <span>📅 ${updatedAt}</span>
      </div>
    </div>
  `;
}

// 绑定 GitHub 项目卡片点击事件
function bindGithubRepoClickEvents() {
  const reposList = document.getElementById('githubReposList');

  // 移除旧的事件监听器 (如果存在)
  const oldListener = reposList._clickListener;
  if (oldListener) {
    reposList.removeEventListener('click', oldListener);
  }

  // 使用事件委托处理所有项目卡片点击
  const newListener = async (e) => {
    const card = e.target.closest('.github-repo-card');
    if (!card) return;

    const fullName = card.dataset.repoFullname;
    const repoName = card.dataset.repoName;
    const defaultBranch = card.dataset.repoBranch;

    // 获取所有分支
    const branches = await fetchRepoBranches(fullName);

    // 创建项目并导入
    await importRepoAndOpenEditor(fullName, repoName, defaultBranch, branches);
  };

  reposList.addEventListener('click', newListener);
  reposList._clickListener = newListener;
}

// 获取仓库的所有分支
async function fetchRepoBranches(fullName) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${fullName}/branches`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`获取分支失败: ${response.statusText}`);
    }

    const branches = await response.json();
    return branches.map(b => b.name);
  } catch (error) {
    console.error('获取分支失败:', error);
    return [];
  }
}

// 导入仓库并打开编辑器
async function importRepoAndOpenEditor(fullName, repoName, defaultBranch, branches) {
  if (!githubToken) return;

  try {
    // 从 storage 加载现有项目
    const result = await chrome.storage.local.get(['projects']);
    const projects = result.projects || {};

    // 检查是否已经导入过该项目
    let existingProjectId = null;
    for (const [projectId, project] of Object.entries(projects)) {
      if (project.githubRepo === fullName) {
        existingProjectId = projectId;
        break;
      }
    }

    let projectId;
    if (existingProjectId) {
      // 如果已存在，使用现有项目并确保分支信息是最新的
      projectId = existingProjectId;
      const existingProject = projects[existingProjectId];

      // 更新分支信息为默认分支（如果还没有设置或需要更新）
      if (!existingProject.githubBranch || existingProject.githubBranch !== defaultBranch) {
        existingProject.githubBranch = defaultBranch;
        existingProject.updatedAt = new Date().toISOString();
        await chrome.storage.local.set({ projects });
      }
    } else {
      // 创建新项目
      projectId = 'github_' + Date.now();
      const project = {
        id: projectId,
        name: repoName,
        description: `从 GitHub 导入: ${fullName}`,
        files: {},
        githubRepo: fullName,
        githubBranch: defaultBranch,
        // 自动初始化 Git 仓库
        gitData: {
          initialized: true,
          commits: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      projects[projectId] = project;
      await chrome.storage.local.set({ projects });

      // 开始异步下载文件
      downloadRepoFiles(projectId, fullName, defaultBranch, repoName);
    }

    // 设置当前项目到 storage，让编辑器加载
    await chrome.storage.local.set({
      currentProject: projectId,
      currentFile: null
    });

    // 打开编辑器页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('editor.html')
    });

  } catch (error) {
    alert('打开编辑器失败: ' + error.message);
  }
}

// 显示分支选择对话框
async function showBranchSelectionDialog(fullName, repoName, defaultBranch) {
  // 获取所有分支
  const branches = await fetchRepoBranches(fullName);

  if (branches.length === 0) {
    // 如果获取失败,使用默认分支
    return defaultBranch;
  }

  // 创建分支选择HTML
  const branchOptions = branches.map(branch =>
    `<option value="${escapeHtml(branch)}" ${branch === defaultBranch ? 'selected' : ''}>${escapeHtml(branch)}</option>`
  ).join('');

  // 创建对话框覆盖层
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  overlay.innerHTML = `
    <div style="
      background: #ffffff;
      border-radius: 8px;
      width: 90%;
      max-width: 350px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #e0e0e0;
      ">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">选择导入分支</h3>
      </div>
      <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
        <p style="margin: 0; color: #666; font-size: 14px;">仓库: ${escapeHtml(repoName)}</p>
        <select id="branchSelect" style="
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        ">
          ${branchOptions}
        </select>
      </div>
      <div style="
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px;
        border-top: 1px solid #e0e0e0;
      ">
        <button id="cancelBranchSelect" style="
          padding: 8px 16px;
          border: 1px solid #d0d0d0;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          background: #ffffff;
          color: #333;
        ">取消</button>
        <button id="confirmBranchSelect" style="
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: 600;
        ">导入</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 返回Promise等待用户选择
  return new Promise((resolve) => {
    const confirmBtn = overlay.querySelector('#confirmBranchSelect');
    const cancelBtn = overlay.querySelector('#cancelBranchSelect');
    const branchSelect = overlay.querySelector('#branchSelect');

    confirmBtn.addEventListener('click', () => {
      const selectedBranch = branchSelect.value;
      document.body.removeChild(overlay);
      resolve(selectedBranch);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(null);
    });
  });
}

// 导入 GitHub 项目
async function importGithubRepo(fullName, repoName, defaultBranch) {
  if (!githubToken) return;

  // 显示分支选择对话框
  const selectedBranch = await showBranchSelectionDialog(fullName, repoName, defaultBranch);

  if (!selectedBranch) {
    // 用户取消了
    return;
  }

  // 显示确认对话框
  if (!confirm(`确定要导入整个仓库 "${repoName}" 的 "${selectedBranch}" 分支吗?\n\n这将下载所有文件内容到本地存储。`)) {
    return;
  }

  try {
    // 从 storage 加载现有项目
    const result = await chrome.storage.local.get(['projects']);
    const projects = result.projects || {};

    // 创建项目
    const projectId = 'github_' + Date.now();
    const project = {
      id: projectId,
      name: repoName,
      description: `从 GitHub 导入: ${fullName} (${selectedBranch})`,
      files: {},
      githubRepo: fullName,
      githubBranch: selectedBranch,
      // 自动初始化 Git 仓库
      gitData: {
        initialized: true,
        commits: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    projects[projectId] = project;
    await chrome.storage.local.set({ projects });

    alert(`项目 "${repoName}" 已创建，正在后台下载文件...`);

    // 开始异步下载文件
    downloadRepoFiles(projectId, fullName, selectedBranch, repoName);

  } catch (error) {
    alert('导入失败: ' + error.message);
  }
}

// 下载仓库的所有文件
async function downloadRepoFiles(projectId, fullName, defaultBranch, repoName) {
  try {
    // 获取仓库的文件树
    const treeResponse = await fetch(
      `https://api.github.com/repos/${fullName}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!treeResponse.ok) {
      throw new Error('获取文件树失败');
    }

    const treeData = await treeResponse.json();
    const files = treeData.tree.filter(item =>
      item.type === 'blob' &&
      (item.path.endsWith('.md') ||
       item.path.endsWith('.txt') ||
       item.path === 'README' ||
       item.path === 'LICENSE')
    );

    let downloadedCount = 0;
    const totalFiles = files.length;

    // 分批下载文件，避免 API 限制
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(batch.map(async (file) => {
        try {
          const contentResponse = await fetch(file.url, {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const content = atob(contentData.content);

            // 更新项目文件
            const result = await chrome.storage.local.get(['projects']);
            const projects = result.projects || {};

            if (projects[projectId]) {
              const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
              projects[projectId].files[fileId] = {
                id: fileId,
                name: file.path,
                content: content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              projects[projectId].updatedAt = new Date().toISOString();

              await chrome.storage.local.set({ projects });
              downloadedCount++;
            }
          }
        } catch (error) {
          console.error(`下载文件失败: ${file.path}`, error);
        }
      }));
    }

    console.log(`项目 "${repoName}" 导入完成: ${downloadedCount}/${totalFiles} 个文件`);
  } catch (error) {
    console.error('下载文件失败:', error);
  }
}

// HTML 转义工具函数
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
