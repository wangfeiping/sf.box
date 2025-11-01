// 项目浏览器 JavaScript

// 全局状态
let projects = {};
let searchQuery = '';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadProjects();
  renderProjects();
  updateStats();
  initEventListeners();
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
      <div class="project-header" onclick="toggleProject('${id}')">
        <span class="project-toggle">▶</span>
        <span class="project-icon">📁</span>
        <div class="project-info">
          <div class="project-name">${escapeHtml(project.name)}</div>
          ${project.description ? `<div class="project-desc">${escapeHtml(project.description)}</div>` : ''}
        </div>
        <div class="project-actions" onclick="event.stopPropagation()">
          <button onclick="renameProject('${id}')" title="重命名">✏️</button>
          <button onclick="deleteProject('${id}')" class="delete-btn" title="删除">🗑️</button>
        </div>
      </div>
      <div class="file-list">
        ${filteredFiles.length > 0 ? filteredFiles.map(fileName => {
          const file = files[fileName];
          const updateTime = file.lastModified ? new Date(file.lastModified).toLocaleDateString('zh-CN') : '';
          return `
            <div class="file-item" onclick="openFile('${id}', '${escapeHtml(fileName)}')">
              <span class="file-icon">📄</span>
              <span class="file-name">${escapeHtml(fileName)}</span>
              ${updateTime ? `<span class="file-meta">${updateTime}</span>` : ''}
              <div class="file-actions" onclick="event.stopPropagation()">
                <button onclick="renameFile('${id}', '${escapeHtml(fileName)}')" title="重命名">✏️</button>
                <button onclick="deleteFile('${id}', '${escapeHtml(fileName)}')" class="delete-btn" title="删除">🗑️</button>
              </div>
            </div>
          `;
        }).join('') : '<div class="file-item"><span style="color: #999;">此项目暂无文件</span></div>'}
      </div>
    </div>
  `;
}

function bindProjectEvents() {
  // 项目卡片展开/收起通过 onclick 属性已绑定
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

// 使函数全局可访问
window.toggleProject = toggleProject;
window.openFile = openFile;
window.renameProject = renameProject;
window.deleteProject = deleteProject;
window.renameFile = renameFile;
window.deleteFile = deleteFile;
