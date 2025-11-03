// 项目浏览器 JavaScript

// 全局状态
let projects = {};
let searchQuery = '';
let githubToken = null;
let githubUser = null;
let allGithubRepos = []; // 存储所有 GitHub 项目
let githubSearchQuery = ''; // GitHub 搜索关键词
let displayedReposCount = 10; // 当前显示的项目数量

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadProjects();
  await loadGithubAuth();
  renderProjects();
  updateStats();
  initEventListeners();
  updateGithubUI();
});

// 事件监听器
function initEventListeners() {
  // 搜索
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderProjects();
  });

  // 新建项目按钮
  document.getElementById('newProjectBtn').addEventListener('click', showNewProjectDialog);

  // 新建文件按钮
  document.getElementById('newFileBtn').addEventListener('click', showNewFileDialog);

  // 打开编辑器按钮
  document.getElementById('openEditorBtn').addEventListener('click', openFullEditor);

  // 新建项目对话框
  document.getElementById('closeNewProjectDialog').addEventListener('click', hideNewProjectDialog);
  document.getElementById('cancelNewProject').addEventListener('click', hideNewProjectDialog);
  document.getElementById('confirmNewProject').addEventListener('click', createProject);

  // 新建文件对话框
  document.getElementById('closeNewFileDialog').addEventListener('click', hideNewFileDialog);
  document.getElementById('cancelNewFile').addEventListener('click', hideNewFileDialog);
  document.getElementById('confirmNewFile').addEventListener('click', createFile);

  // 回车键确认
  document.getElementById('projectNameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createProject();
  });

  document.getElementById('fileNameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createFile();
  });

  // GitHub 按钮
  document.getElementById('githubBtn').addEventListener('click', handleGithubClick);

  // GitHub 登录对话框
  document.getElementById('closeGithubLoginDialog').addEventListener('click', hideGithubLoginDialog);
  document.getElementById('cancelGithubLogin').addEventListener('click', hideGithubLoginDialog);
  document.getElementById('confirmGithubLogin').addEventListener('click', connectGithub);
  document.getElementById('githubTokenInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') connectGithub();
  });

  // GitHub 项目列表对话框
  document.getElementById('closeGithubReposDialog').addEventListener('click', hideGithubReposDialog);
  document.getElementById('refreshGithubRepos').addEventListener('click', loadGithubRepos);
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

// 打开完整编辑器
function openFullEditor() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('editor.html')
  });
}

// 数据操作
async function loadProjects() {
  const result = await chrome.storage.local.get(['projects']);
  projects = result.projects || {};

  // 如果是旧数据格式（files），自动迁移
  const oldFiles = await chrome.storage.local.get(['files']);
  if (oldFiles.files && Object.keys(projects).length === 0) {
    await migrateOldData(oldFiles.files);
  }
}

async function migrateOldData(oldFiles) {
  const defaultProject = {
    id: 'default',
    name: '默认项目',
    description: '从旧版本迁移的文件',
    files: oldFiles,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  projects['default'] = defaultProject;
  await saveProjects();
}

async function saveProjects() {
  await chrome.storage.local.set({ projects: projects });
  updateStats();
}

// 渲染项目列表
function renderProjects() {
  const projectList = document.getElementById('projectList');
  const emptyState = document.getElementById('emptyState');

  const projectIds = Object.keys(projects);

  if (projectIds.length === 0) {
    projectList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  // 过滤项目和文件
  const filteredProjects = projectIds.filter(id => {
    const project = projects[id];
    if (!searchQuery) return true;

    // 搜索项目名称
    if (project.name.toLowerCase().includes(searchQuery)) return true;

    // 搜索文件名
    const fileNames = Object.keys(project.files || {});
    return fileNames.some(name => name.toLowerCase().includes(searchQuery));
  });

  if (filteredProjects.length === 0 && searchQuery) {
    projectList.innerHTML = '<div class="empty-state"><p>未找到匹配的项目或文件</p></div>';
    return;
  }

  projectList.innerHTML = filteredProjects.map(id => {
    const project = projects[id];
    return renderProjectCard(id, project);
  }).join('');

  // 绑定事件
  bindProjectEvents();
}

function renderProjectCard(id, project) {
  const files = project.files || {};
  const fileList = Object.keys(files);
  const fileCount = fileList.length;

  // 过滤文件
  const filteredFiles = searchQuery
    ? fileList.filter(name => name.toLowerCase().includes(searchQuery))
    : fileList;

  return `
    <div class="project-card" data-project-id="${id}">
      <div class="project-header" data-action="toggle-project" data-project-id="${id}">
        <span class="project-toggle">▶</span>
        <span class="project-icon">📁</span>
        <div class="project-info">
          <div class="project-name">${escapeHtml(project.name)}</div>
          ${project.description ? `<div class="project-desc">${escapeHtml(project.description)}</div>` : ''}
        </div>
        <div class="project-actions" data-action="stop-propagation">
          <button data-action="rename-project" data-project-id="${id}" title="重命名">✏️</button>
          <button data-action="delete-project" data-project-id="${id}" class="delete-btn" title="删除">🗑️</button>
        </div>
      </div>
      <div class="file-list">
        ${filteredFiles.length > 0 ? filteredFiles.map(fileName => {
          const file = files[fileName];
          const updateTime = file.lastModified ? new Date(file.lastModified).toLocaleDateString('zh-CN') : '';
          return `
            <div class="file-item" data-action="open-file" data-project-id="${id}" data-file-name="${escapeHtml(fileName)}">
              <span class="file-icon">📄</span>
              <span class="file-name">${escapeHtml(fileName)}</span>
              ${updateTime ? `<span class="file-meta">${updateTime}</span>` : ''}
              <div class="file-actions" data-action="stop-propagation">
                <button data-action="rename-file" data-project-id="${id}" data-file-name="${escapeHtml(fileName)}" title="重命名">✏️</button>
                <button data-action="delete-file" data-project-id="${id}" data-file-name="${escapeHtml(fileName)}" class="delete-btn" title="删除">🗑️</button>
              </div>
            </div>
          `;
        }).join('') : '<div class="file-item"><span style="color: #999;">此项目暂无文件</span></div>'}
      </div>
    </div>
  `;
}

function bindProjectEvents() {
  // 使用事件委托处理所有项目相关的点击事件
  const projectList = document.getElementById('projectList');

  // 移除旧的监听器
  if (projectList._clickListener) {
    projectList.removeEventListener('click', projectList._clickListener);
  }

  const clickListener = (e) => {
    const target = e.target;
    const actionEl = target.closest('[data-action]');

    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const projectId = actionEl.dataset.projectId;
    const fileName = actionEl.dataset.fileName;

    // 阻止事件冒泡的元素
    if (action === 'stop-propagation') {
      e.stopPropagation();
      return;
    }

    switch (action) {
      case 'toggle-project':
        toggleProject(projectId);
        break;
      case 'rename-project':
        e.stopPropagation();
        renameProject(projectId);
        break;
      case 'delete-project':
        e.stopPropagation();
        deleteProject(projectId);
        break;
      case 'open-file':
        openFile(projectId, fileName);
        break;
      case 'rename-file':
        e.stopPropagation();
        renameFile(projectId, fileName);
        break;
      case 'delete-file':
        e.stopPropagation();
        deleteFile(projectId, fileName);
        break;
    }
  };

  projectList.addEventListener('click', clickListener);
  projectList._clickListener = clickListener;
}

// 切换项目展开/收起
function toggleProject(projectId) {
  const card = document.querySelector(`[data-project-id="${projectId}"]`);
  if (card) {
    card.classList.toggle('expanded');
  }
}

// 打开文件（在编辑器标签页中）
function openFile(projectId, fileName) {
  const project = projects[projectId];
  if (!project || !project.files[fileName]) return;

  // 保存当前文件信息到 storage，让编辑器页面读取
  chrome.storage.local.set({
    currentProject: projectId,
    currentFile: fileName
  }).then(() => {
    openFullEditor();
  });
}

// 对话框操作
function showNewProjectDialog() {
  document.getElementById('newProjectDialog').classList.remove('hidden');
  document.getElementById('projectNameInput').focus();
}

function hideNewProjectDialog() {
  document.getElementById('newProjectDialog').classList.add('hidden');
  document.getElementById('projectNameInput').value = '';
  document.getElementById('projectDescInput').value = '';
}

function showNewFileDialog() {
  // 填充项目选择列表
  const select = document.getElementById('selectProjectForFile');
  const projectIds = Object.keys(projects);

  if (projectIds.length === 0) {
    alert('请先创建一个项目');
    return;
  }

  select.innerHTML = '<option value="">选择项目...</option>' +
    projectIds.map(id => {
      const project = projects[id];
      return `<option value="${id}">${escapeHtml(project.name)}</option>`;
    }).join('');

  document.getElementById('newFileDialog').classList.remove('hidden');
  select.focus();
}

function hideNewFileDialog() {
  document.getElementById('newFileDialog').classList.add('hidden');
  document.getElementById('selectProjectForFile').value = '';
  document.getElementById('fileNameInput').value = '';
}

// 创建项目
async function createProject() {
  const nameInput = document.getElementById('projectNameInput');
  const descInput = document.getElementById('projectDescInput');

  const name = nameInput.value.trim();
  if (!name) {
    alert('请输入项目名称');
    return;
  }

  const id = 'project_' + Date.now();
  const project = {
    id: id,
    name: name,
    description: descInput.value.trim(),
    files: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  projects[id] = project;
  await saveProjects();

  hideNewProjectDialog();
  renderProjects();
}

// 创建文件
async function createFile() {
  const projectId = document.getElementById('selectProjectForFile').value;
  const fileName = document.getElementById('fileNameInput').value.trim();

  if (!projectId) {
    alert('请选择项目');
    return;
  }

  if (!fileName) {
    alert('请输入文件名');
    return;
  }

  const finalFileName = fileName.endsWith('.md') ? fileName : fileName + '.md';

  const project = projects[projectId];
  if (project.files[finalFileName]) {
    alert('文件已存在');
    return;
  }

  project.files[finalFileName] = {
    filename: finalFileName,
    content: '',
    lastModified: new Date().toISOString()
  };

  project.updatedAt = new Date().toISOString();
  await saveProjects();

  hideNewFileDialog();
  renderProjects();

  // 展开项目
  setTimeout(() => {
    const card = document.querySelector(`[data-project-id="${projectId}"]`);
    if (card) card.classList.add('expanded');
  }, 100);

  // 打开文件
  openFile(projectId, finalFileName);
}

// 重命名项目
async function renameProject(projectId) {
  const project = projects[projectId];
  const newName = prompt('重命名项目：', project.name);

  if (newName && newName.trim() && newName !== project.name) {
    project.name = newName.trim();
    project.updatedAt = new Date().toISOString();
    await saveProjects();
    renderProjects();
  }
}

// 删除项目
async function deleteProject(projectId) {
  const project = projects[projectId];
  const fileCount = Object.keys(project.files || {}).length;

  const message = fileCount > 0
    ? `确定要删除项目"${project.name}"及其包含的 ${fileCount} 个文件吗？`
    : `确定要删除项目"${project.name}"吗？`;

  if (confirm(message)) {
    delete projects[projectId];
    await saveProjects();
    renderProjects();
  }
}

// 重命名文件
async function renameFile(projectId, oldFileName) {
  const project = projects[projectId];
  const newName = prompt('重命名文件：', oldFileName);

  if (newName && newName.trim() && newName !== oldFileName) {
    const finalName = newName.endsWith('.md') ? newName : newName + '.md';

    if (project.files[finalName]) {
      alert('文件名已存在');
      return;
    }

    project.files[finalName] = project.files[oldFileName];
    project.files[finalName].filename = finalName;
    delete project.files[oldFileName];

    project.updatedAt = new Date().toISOString();
    await saveProjects();
    renderProjects();
  }
}

// 删除文件
async function deleteFile(projectId, fileName) {
  if (confirm(`确定要删除文件"${fileName}"吗？`)) {
    const project = projects[projectId];
    delete project.files[fileName];

    project.updatedAt = new Date().toISOString();
    await saveProjects();
    renderProjects();
  }
}

// 更新统计信息
function updateStats() {
  const projectCount = Object.keys(projects).length;
  let fileCount = 0;

  Object.values(projects).forEach(project => {
    fileCount += Object.keys(project.files || {}).length;
  });

  document.getElementById('projectCount').textContent = `${projectCount} 个项目`;
  document.getElementById('fileCount').textContent = `${fileCount} 个文件`;
}

// 工具函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============ GitHub 功能 ============

// 加载 GitHub 认证信息
async function loadGithubAuth() {
  const result = await chrome.storage.local.get(['githubToken', 'githubUser']);
  githubToken = result.githubToken || null;
  githubUser = result.githubUser || null;
}

// 保存 GitHub 认证信息
async function saveGithubAuth() {
  await chrome.storage.local.set({
    githubToken: githubToken,
    githubUser: githubUser
  });
}

// 更新 GitHub UI 状态
function updateGithubUI() {
  const userInfo = document.getElementById('userInfo');
  const githubBtnIcon = document.getElementById('githubBtnIcon');
  const githubBtnText = document.getElementById('githubBtnText');

  if (githubUser) {
    userInfo.style.display = 'flex';
    document.getElementById('userAvatar').src = githubUser.avatar_url;
    document.getElementById('userName').textContent = githubUser.login;
    githubBtnIcon.textContent = '✓';
    githubBtnText.textContent = 'GitHub';
  } else {
    userInfo.style.display = 'none';
    githubBtnIcon.textContent = '🔗';
    githubBtnText.textContent = 'GitHub';
  }
}

// 处理 GitHub 按钮点击
function handleGithubClick() {
  console.log('handleGithubClick 被调用, githubToken:', githubToken ? '已设置' : '未设置');
  if (githubToken) {
    // 在当前弹出框中切换到 GitHub 项目页面
    window.location.href = 'github-repos.html';
  } else {
    showGithubLoginDialog();
  }
}

// 显示/隐藏 GitHub 登录对话框
function showGithubLoginDialog() {
  document.getElementById('githubLoginDialog').classList.remove('hidden');
  document.getElementById('githubTokenInput').focus();
}

function hideGithubLoginDialog() {
  document.getElementById('githubLoginDialog').classList.add('hidden');
  document.getElementById('githubTokenInput').value = '';
}

// 连接 GitHub
async function connectGithub() {
  const tokenInput = document.getElementById('githubTokenInput');
  const token = tokenInput.value.trim();

  if (!token) {
    alert('请输入 GitHub Token');
    return;
  }

  try {
    // 验证 token 并获取用户信息
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Token 无效或已过期');
    }

    const user = await response.json();
    githubToken = token;
    githubUser = user;

    await saveGithubAuth();
    hideGithubLoginDialog();
    updateGithubUI();
    showGithubReposDialog();
  } catch (error) {
    alert('连接失败: ' + error.message);
  }
}

// 断开 GitHub 连接
async function disconnectGithub() {
  if (confirm('确定要断开 GitHub 连接吗?')) {
    githubToken = null;
    githubUser = null;
    await chrome.storage.local.remove(['githubToken', 'githubUser']);
    updateGithubUI();
    hideGithubReposDialog();
  }
}

// 显示/隐藏 GitHub 项目列表对话框
function showGithubReposDialog() {
  console.log('showGithubReposDialog 被调用');
  document.getElementById('githubReposDialog').classList.remove('hidden');
  // 重置搜索和显示状态
  document.getElementById('githubSearchInput').value = '';
  githubSearchQuery = '';
  displayedReposCount = 10;
  console.log('准备调用 loadGithubRepos');
  loadGithubRepos();
}

function hideGithubReposDialog() {
  document.getElementById('githubReposDialog').classList.add('hidden');
}

// 加载 GitHub 项目列表
async function loadGithubRepos() {
  console.log('loadGithubRepos 被调用, githubToken:', githubToken ? '已设置' : '未设置');

  if (!githubToken) {
    console.log('没有 githubToken，直接返回');
    return;
  }

  const loading = document.getElementById('githubReposLoading');
  const reposList = document.getElementById('githubReposList');

  console.log('开始加载项目列表...');
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

    console.log('API 响应状态:', response.status);

    if (!response.ok) {
      throw new Error('获取项目列表失败');
    }

    allGithubRepos = await response.json();
    console.log('获取到的项目数量:', allGithubRepos.length);

    loading.classList.add('hidden');

    if (allGithubRepos.length === 0) {
      reposList.innerHTML = '<div class="empty-state"><p>没有找到项目</p></div>';
      document.getElementById('loadMoreContainer').classList.add('hidden');
      return;
    }

    // 渲染项目列表
    console.log('准备渲染项目列表');
    renderGithubRepos();

    // 绑定导入按钮事件 (使用事件委托)
    bindGithubRepoImportEvents();
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

  console.log('renderGithubRepos 被调用');
  console.log('allGithubRepos:', allGithubRepos);

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

  console.log('filteredRepos 数量:', filteredRepos.length);

  if (filteredRepos.length === 0) {
    reposList.innerHTML = '<div class="empty-state"><p>没有找到匹配的项目</p></div>';
    loadMoreContainer.classList.add('hidden');
    return;
  }

  // 只显示前 N 个项目
  const reposToDisplay = filteredRepos.slice(0, displayedReposCount);
  console.log('将显示的项目数量:', reposToDisplay.length);

  reposList.innerHTML = reposToDisplay.map(repo => renderGithubRepo(repo)).join('');

  console.log('reposList.innerHTML 长度:', reposList.innerHTML.length);

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
  bindGithubRepoImportEvents();
}

// 渲染 GitHub 项目卡片
function renderGithubRepo(repo) {
  const updatedAt = new Date(repo.updated_at).toLocaleDateString('zh-CN');
  const language = repo.language || 'Unknown';
  const description = repo.description || '无描述';

  return `
    <div class="github-repo-card">
      <div class="repo-header">
        <div class="repo-info">
          <div class="repo-name">
            ${repo.private ? '🔒' : '📖'} ${escapeHtml(repo.name)}
          </div>
          <div class="repo-desc">${escapeHtml(description)}</div>
        </div>
        <button class="btn-primary btn-import-repo"
                data-repo-fullname="${escapeHtml(repo.full_name)}"
                data-repo-name="${escapeHtml(repo.name)}"
                data-repo-branch="${escapeHtml(repo.default_branch)}">
          导入
        </button>
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

// 绑定 GitHub 仓库导入按钮事件
function bindGithubRepoImportEvents() {
  const reposList = document.getElementById('githubReposList');

  // 移除旧的事件监听器 (如果存在)
  const oldListener = reposList._importListener;
  if (oldListener) {
    reposList.removeEventListener('click', oldListener);
  }

  // 使用事件委托处理所有导入按钮点击
  const newListener = (e) => {
    const btn = e.target.closest('.btn-import-repo');
    if (!btn) return;

    const fullName = btn.dataset.repoFullname;
    const repoName = btn.dataset.repoName;
    const branch = btn.dataset.repoBranch;

    importGithubRepo(fullName, repoName, branch);
  };

  reposList.addEventListener('click', newListener);
  reposList._importListener = newListener;
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

  // 创建对话框
  const dialog = document.createElement('div');
  dialog.className = 'dialog';
  dialog.innerHTML = `
    <div class="dialog-content">
      <div class="dialog-header">
        <h3>选择导入分支</h3>
      </div>
      <div class="dialog-body">
        <p style="margin-bottom: 15px;">仓库: ${escapeHtml(repoName)}</p>
        <select id="branchSelect" class="dialog-select">
          ${branchOptions}
        </select>
      </div>
      <div class="dialog-footer">
        <button id="cancelBranchSelect" class="btn-secondary">取消</button>
        <button id="confirmBranchSelect" class="btn-primary">导入</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // 返回Promise等待用户选择
  return new Promise((resolve) => {
    const confirmBtn = dialog.querySelector('#confirmBranchSelect');
    const cancelBtn = dialog.querySelector('#cancelBranchSelect');
    const branchSelect = dialog.querySelector('#branchSelect');

    confirmBtn.addEventListener('click', () => {
      const selectedBranch = branchSelect.value;
      document.body.removeChild(dialog);
      resolve(selectedBranch);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
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
    await saveProjects();

    hideGithubReposDialog();
    renderProjects();

    // 展开项目
    setTimeout(() => {
      const card = document.querySelector(`[data-project-id="${projectId}"]`);
      if (card) card.classList.add('expanded');
    }, 100);

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
//       item.path.endsWith('.json') ||
//       item.path.endsWith('.js') ||
//       item.path.endsWith('.css') ||
//       item.path.endsWith('.html') ||
//       item.path.endsWith('.yml') ||
//       item.path.endsWith('.yaml') ||
//       item.path.endsWith('.xml') ||
       item.path === 'README' ||
       item.path === 'LICENSE')
    );

    let downloadedCount = 0;
    const totalFiles = files.length;

    // 限制文件数量,避免下载过多
    const maxFiles = 100;
    const filesToDownload = files.slice(0, maxFiles);

    console.log(`开始下载 ${filesToDownload.length} 个文件...`);

    // 批量下载文件(每次5个并发)
    const batchSize = 5;
    for (let i = 0; i < filesToDownload.length; i += batchSize) {
      const batch = filesToDownload.slice(i, i + batchSize);

      await Promise.all(batch.map(async (file) => {
        try {
          const blobResponse = await fetch(file.url, {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });

          if (blobResponse.ok) {
            const blobData = await blobResponse.json();
            const content = decodeBase64Unicode(blobData.content);

            // 添加文件到项目
            projects[projectId].files[file.path] = {
              filename: file.path,
              content: content,
              lastModified: new Date().toISOString(),
              size: file.size
            };

            downloadedCount++;
            console.log(`已下载: ${downloadedCount}/${filesToDownload.length} - ${file.path}`);
          }
        } catch (error) {
          console.error(`下载文件失败: ${file.path}`, error);
        }
      }));

      // 每批次后保存一次
      await saveProjects();
      renderProjects();
    }

    projects[projectId].updatedAt = new Date().toISOString();

    // 创建初始 commit，记录从 GitHub clone 的状态
    const initialCommit = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      message: `Initial commit from GitHub: ${fullName}`,
      timestamp: new Date().toISOString(),
      files: JSON.parse(JSON.stringify(projects[projectId].files)), // 深拷贝所有文件
      fromGithub: true
    };

    projects[projectId].gitData.commits.push(initialCommit);

    await saveProjects();
    renderProjects();

    const message = totalFiles > maxFiles
      ? `项目 "${repoName}" 导入完成!\n已下载 ${downloadedCount} 个文本文件(共 ${totalFiles} 个,已限制最多 ${maxFiles} 个)\n\nGit 仓库已自动初始化，并创建了初始提交。`
      : `项目 "${repoName}" 导入完成!\n已下载 ${downloadedCount} 个文件\n\nGit 仓库已自动初始化，并创建了初始提交。`;

    alert(message);

  } catch (error) {
    alert(`下载文件失败: ${error.message}`);
    console.error('Download error:', error);
  }
}

// Base64 解码 (支持 Unicode)
function decodeBase64Unicode(base64) {
  // 移除所有换行符
  base64 = base64.replace(/\s/g, '');
  // 解码 base64
  const binary = atob(base64);
  // 转换为 UTF-8
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}
