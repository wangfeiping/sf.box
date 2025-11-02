// 全局状态
let currentProject = null;
let currentFile = null;
let isPreviewMode = false;

// DOM 元素
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const filenameInput = document.getElementById('filename');
const commitMessageInput = document.getElementById('commitMessage');
const status = document.getElementById('status');
const charCount = document.getElementById('charCount');
const editorPane = document.getElementById('editorPane');
const previewPane = document.getElementById('previewPane');
const fileListPanel = document.getElementById('fileListPanel');
const gitInfoPanel = document.getElementById('gitInfoPanel');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadFileFromStorage();
  updateCharCount();

  // 编辑器事件
  editor.addEventListener('input', () => {
    updateCharCount();
    if (isPreviewMode) {
      updatePreview();
    }
  });

  // 按钮事件
  document.getElementById('newFileBtn').addEventListener('click', newFile);
  document.getElementById('saveBtn').addEventListener('click', saveFile);
  document.getElementById('loadBtn').addEventListener('click', showFileList);
  document.getElementById('togglePreviewBtn').addEventListener('click', togglePreview);

  // 打开完整编辑器按钮
  const openEditorBtn = document.getElementById('openEditorBtn');
  if (openEditorBtn) {
    openEditorBtn.addEventListener('click', openFullEditor);
  }

  document.getElementById('gitInitBtn').addEventListener('click', gitInit);
  document.getElementById('gitCommitBtn').addEventListener('click', gitCommit);
  document.getElementById('gitPushBtn').addEventListener('click', gitPush);
  document.getElementById('gitLogBtn').addEventListener('click', gitLog);
  document.getElementById('gitDiffBtn').addEventListener('click', gitDiff);

  document.getElementById('closeFileListBtn').addEventListener('click', () => {
    fileListPanel.classList.add('hidden');
  });

  document.getElementById('closeGitInfoBtn').addEventListener('click', () => {
    gitInfoPanel.classList.add('hidden');
  });
});

// 打开完整编辑器
function openFullEditor() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('editor.html')
  });
}

// 从 storage 加载文件（弹窗传递的）
async function loadFileFromStorage() {
  const result = await chrome.storage.local.get(['currentProject', 'currentFile', 'projects']);

  if (result.currentProject && result.currentFile && result.projects) {
    const project = result.projects[result.currentProject];
    if (project && project.files[result.currentFile]) {
      currentProject = result.currentProject;
      currentFile = result.currentFile;
      const file = project.files[result.currentFile];
      editor.value = file.content || '';
      filenameInput.value = result.currentFile;
      updateStatus(`已加载: ${result.currentFile}`);

      // 清除临时数据
      chrome.storage.local.remove(['currentProject', 'currentFile']);
      return;
    }
  }

  // 如果没有传递的文件，尝试加载最后编辑的文件
  loadLastFile();
}

// 文件操作
function newFile() {
  if (editor.value && !confirm('当前文件未保存，确定要新建文件吗？')) {
    return;
  }
  editor.value = '';
  filenameInput.value = '';
  currentFile = null;
  updateStatus('新建文件');
  updateCharCount();
}

async function saveFile() {
  const filename = filenameInput.value.trim();
  if (!filename) {
    alert('请输入文件名');
    return;
  }

  if (!filename.endsWith('.md')) {
    filenameInput.value = filename + '.md';
  }

  const content = editor.value;
  const fileData = {
    filename: filenameInput.value,
    content: content,
    lastModified: new Date().toISOString()
  };

  try {
    // 获取项目数据
    const result = await chrome.storage.local.get(['projects']);
    let projects = result.projects || {};

    // 如果当前有项目，保存到该项目
    if (currentProject && projects[currentProject]) {
      projects[currentProject].files[fileData.filename] = fileData;
      projects[currentProject].updatedAt = new Date().toISOString();
    } else {
      // 否则保存到默认项目
      if (!projects['default']) {
        projects['default'] = {
          id: 'default',
          name: '默认项目',
          description: '自动创建的默认项目',
          files: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      projects['default'].files[fileData.filename] = fileData;
      projects['default'].updatedAt = new Date().toISOString();
      currentProject = 'default';
    }

    await chrome.storage.local.set({ projects: projects });

    currentFile = fileData.filename;
    updateStatus(`已保存: ${fileData.filename}`);
  } catch (error) {
    updateStatus('保存失败: ' + error.message);
  }
}

async function showFileList() {
  const files = await getFiles();
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';

  const fileNames = Object.keys(files);
  if (fileNames.length === 0) {
    fileList.innerHTML = '<div class="empty-message">暂无文件</div>';
  } else {
    fileNames.forEach(filename => {
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <span class="file-name">${filename}</span>
        <div class="file-actions">
          <button class="file-load-btn" data-filename="${filename}">打开</button>
          <button class="file-delete-btn" data-filename="${filename}">删除</button>
        </div>
      `;
      fileList.appendChild(fileItem);
    });

    // 绑定事件
    fileList.querySelectorAll('.file-load-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        loadFile(e.target.dataset.filename);
        fileListPanel.classList.add('hidden');
      });
    });

    fileList.querySelectorAll('.file-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        deleteFile(e.target.dataset.filename);
      });
    });
  }

  fileListPanel.classList.remove('hidden');
}

async function loadFile(filename) {
  const files = await getFiles();
  const fileData = files[filename];

  if (fileData) {
    editor.value = fileData.content;
    filenameInput.value = fileData.filename;
    currentFile = fileData.filename;
    updateStatus(`已加载: ${filename}`);
    updateCharCount();
    if (isPreviewMode) {
      updatePreview();
    }
  }
}

async function deleteFile(filename) {
  if (!confirm(`确定要删除 ${filename} 吗？`)) {
    return;
  }

  if (currentProject) {
    // 从项目中删除文件
    const result = await chrome.storage.local.get(['projects']);
    const projects = result.projects || {};
    if (projects[currentProject] && projects[currentProject].files) {
      delete projects[currentProject].files[filename];
      projects[currentProject].updatedAt = new Date().toISOString();
      await chrome.storage.local.set({ projects: projects });
    }
  } else {
    // 兼容旧的存储结构
    const files = await getFiles();
    delete files[filename];
    await chrome.storage.local.set({ files: files });
  }

  updateStatus(`已删除: ${filename}`);
  showFileList();
}

async function loadLastFile() {
  const result = await chrome.storage.local.get(['lastFile']);
  if (result.lastFile) {
    loadFile(result.lastFile);
  }
}

// Git 操作
async function gitInit() {
  try {
    const gitData = await getGitData();
    gitData.initialized = true;
    gitData.commits = [];

    // 保存到项目中
    if (currentProject) {
      const result = await chrome.storage.local.get(['projects']);
      const projects = result.projects || {};
      if (projects[currentProject]) {
        projects[currentProject].gitData = gitData;
        await chrome.storage.local.set({ projects: projects });
      }
    } else {
      // 兼容旧的全局存储
      await chrome.storage.local.set({ gitData: gitData });
    }

    updateStatus('Git 仓库已初始化');
  } catch (error) {
    updateStatus('初始化失败: ' + error.message);
  }
}

async function gitCommit() {
  const message = commitMessageInput.value.trim();
  if (!message) {
    alert('请输入提交信息');
    return;
  }

  if (!currentFile) {
    alert('请先保存文件');
    return;
  }

  try {
    const gitData = await getGitData();
    if (!gitData.initialized) {
      alert('请先初始化 Git 仓库');
      return;
    }

    const files = await getFiles();
    const commit = {
      id: generateCommitId(),
      message: message,
      timestamp: new Date().toISOString(),
      files: JSON.parse(JSON.stringify(files)) // 深拷贝
    };

    gitData.commits.push(commit);

    // 保存到项目中
    if (currentProject) {
      const result = await chrome.storage.local.get(['projects']);
      const projects = result.projects || {};
      if (projects[currentProject]) {
        projects[currentProject].gitData = gitData;
        await chrome.storage.local.set({ projects: projects });
      }
    } else {
      // 兼容旧的全局存储
      await chrome.storage.local.set({ gitData: gitData });
    }

    commitMessageInput.value = '';
    updateStatus(`已提交: ${message}`);
  } catch (error) {
    updateStatus('提交失败: ' + error.message);
  }
}

// 获取仓库的所有分支
async function fetchRepoBranches(fullName, token) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${fullName}/branches`,
      {
        headers: {
          'Authorization': `token ${token}`,
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

// 显示 Push 分支选择对话框
async function showPushBranchDialog(fullName, currentBranch, token) {
  // 获取所有分支
  const branches = await fetchRepoBranches(fullName, token);

  if (branches.length === 0) {
    // 如果获取失败,使用当前分支
    return currentBranch || 'main';
  }

  // 创建分支选择HTML
  const branchOptions = branches.map(branch =>
    `<option value="${escapeHtml(branch)}" ${branch === currentBranch ? 'selected' : ''}>${escapeHtml(branch)}</option>`
  ).join('');

  // 创建对话框
  const dialogContainer = document.createElement('div');
  dialogContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  dialogContainer.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 8px; min-width: 400px; max-width: 500px;">
      <h3 style="margin: 0 0 15px 0;">选择推送分支</h3>
      <div style="margin-bottom: 15px;">
        <p style="margin-bottom: 10px; color: #666;">仓库: ${escapeHtml(fullName)}</p>
        <select id="pushBranchSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
          ${branchOptions}
        </select>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button id="cancelPushBranchSelect" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">取消</button>
        <button id="confirmPushBranchSelect" style="padding: 8px 16px; border: none; background: #0366d6; color: white; border-radius: 4px; cursor: pointer;">推送</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialogContainer);

  // 返回Promise等待用户选择
  return new Promise((resolve) => {
    const confirmBtn = dialogContainer.querySelector('#confirmPushBranchSelect');
    const cancelBtn = dialogContainer.querySelector('#cancelPushBranchSelect');
    const branchSelect = dialogContainer.querySelector('#pushBranchSelect');

    confirmBtn.addEventListener('click', () => {
      const selectedBranch = branchSelect.value;
      document.body.removeChild(dialogContainer);
      resolve(selectedBranch);
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialogContainer);
      resolve(null);
    });
  });
}

// HTML 转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function gitPush() {
  try {
    // 获取 GitHub 认证信息
    const authResult = await chrome.storage.local.get(['githubToken', 'githubUser']);
    if (!authResult.githubToken || !authResult.githubUser) {
      alert('请先在主界面连接 GitHub 账户');
      return;
    }

    // 获取当前项目信息
    const result = await chrome.storage.local.get(['projects']);
    const projects = result.projects || {};

    if (!currentProject || !projects[currentProject]) {
      alert('未找到当前项目信息');
      return;
    }

    const project = projects[currentProject];

    // 检查项目是否有 GitHub 仓库信息
    if (!project.githubRepo) {
      alert('当前项目没有关联的 GitHub 仓库。\n提示：从 GitHub 导入的项目会自动关联仓库信息。');
      return;
    }

    // 获取 Git 数据
    const gitData = await getGitData();
    if (!gitData.initialized || gitData.commits.length === 0) {
      alert('没有可推送的提交');
      return;
    }

    // 显示分支选择对话框
    const selectedBranch = await showPushBranchDialog(project.githubRepo, project.githubBranch, authResult.githubToken);

    if (!selectedBranch) {
      // 用户取消了
      return;
    }

    // 更新项目的分支信息
    if (selectedBranch !== project.githubBranch) {
      project.githubBranch = selectedBranch;
      await chrome.storage.local.set({ projects: projects });
    }

    updateStatus('正在推送到 GitHub...');

    // 获取最新的提交
    const latestCommit = gitData.commits[gitData.commits.length - 1];

    // 获取仓库信息
    const [owner, repo] = project.githubRepo.split('/');
    const branch = selectedBranch;

    // 为每个文件创建或更新内容
    const token = authResult.githubToken;
    let pushedFiles = 0;
    const files = latestCommit.files;

    for (const [filename, fileData] of Object.entries(files)) {
      try {
        // 获取文件当前的 SHA (如果存在)
        let sha = null;
        try {
          const getResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filename}?ref=${branch}`,
            {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );
          if (getResponse.ok) {
            const fileInfo = await getResponse.json();
            sha = fileInfo.sha;
          }
        } catch (e) {
          // 文件不存在，sha 保持为 null
        }

        // 创建或更新文件
        const content = btoa(unescape(encodeURIComponent(fileData.content)));
        const updateData = {
          message: latestCommit.message,
          content: content,
          branch: branch
        };

        if (sha) {
          updateData.sha = sha;
        }

        const updateResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          }
        );

        if (!updateResponse.ok) {
          const error = await updateResponse.json();
          throw new Error(`推送文件 ${filename} 失败: ${error.message}`);
        }

        pushedFiles++;
        updateStatus(`正在推送... (${pushedFiles}/${Object.keys(files).length})`);
      } catch (error) {
        console.error(`推送文件 ${filename} 时出错:`, error);
        alert(`推送文件 ${filename} 失败: ${error.message}`);
        return;
      }
    }

    // 标记提交为已推送
    latestCommit.pushed = true;
    latestCommit.pushedAt = new Date().toISOString();
    latestCommit.pushedBranch = branch;

    // 保存到项目中
    if (currentProject) {
      const result = await chrome.storage.local.get(['projects']);
      const projects = result.projects || {};
      if (projects[currentProject]) {
        projects[currentProject].gitData = gitData;
        await chrome.storage.local.set({ projects: projects });
      }
    } else {
      // 兼容旧的全局存储
      await chrome.storage.local.set({ gitData: gitData });
    }

    updateStatus(`✅ 成功推送 ${pushedFiles} 个文件到 GitHub`);
    alert(`成功推送到 GitHub!\n仓库: ${project.githubRepo}\n分支: ${branch}\n文件数: ${pushedFiles}`);
  } catch (error) {
    console.error('Push 错误:', error);
    updateStatus('推送失败: ' + error.message);
    alert('推送到 GitHub 失败: ' + error.message);
  }
}

async function gitLog() {
  try {
    const gitData = await getGitData();
    if (!gitData.initialized || gitData.commits.length === 0) {
      showGitInfo('提交历史', '暂无提交记录');
      return;
    }

    let logText = '';
    gitData.commits.reverse().forEach(commit => {
      const date = new Date(commit.timestamp).toLocaleString('zh-CN');
      logText += `提交 ID: ${commit.id}\n`;
      logText += `日期: ${date}\n`;
      logText += `信息: ${commit.message}\n`;
      logText += `文件数: ${Object.keys(commit.files).length}\n`;
      logText += '\n' + '-'.repeat(50) + '\n\n';
    });

    showGitInfo('提交历史', logText);
  } catch (error) {
    updateStatus('查看历史失败: ' + error.message);
  }
}

async function gitDiff() {
  try {
    if (!currentFile) {
      alert('请先选择一个文件');
      return;
    }

    const gitData = await getGitData();
    if (!gitData.initialized || gitData.commits.length === 0) {
      showGitInfo('文件差异', '暂无提交记录，无法比较差异');
      return;
    }

    const lastCommit = gitData.commits[gitData.commits.length - 1];
    const lastVersion = lastCommit.files[currentFile];

    if (!lastVersion) {
      showGitInfo('文件差异', '这是一个新文件');
      return;
    }

    const currentContent = editor.value;
    const lastContent = lastVersion.content;

    if (currentContent === lastContent) {
      showGitInfo('文件差异', '文件没有变化');
    } else {
      const diffText = simpleDiff(lastContent, currentContent);
      showGitInfo('文件差异', diffText);
    }
  } catch (error) {
    updateStatus('查看差异失败: ' + error.message);
  }
}

// 预览功能
function togglePreview() {
  isPreviewMode = !isPreviewMode;

  if (isPreviewMode) {
    previewPane.classList.remove('hidden');
    editorPane.classList.add('split');
    updatePreview();
  } else {
    previewPane.classList.add('hidden');
    editorPane.classList.remove('split');
  }
}

function updatePreview() {
  if (typeof marked !== 'undefined') {
    preview.innerHTML = marked.parse(editor.value);
  } else {
    preview.innerHTML = '<p>Markdown 解析库加载失败</p>';
  }
}

// 辅助函数
async function getFiles() {
  // 如果有当前项目，从项目中获取文件
  if (currentProject) {
    const result = await chrome.storage.local.get(['projects']);
    const projects = result.projects || {};
    if (projects[currentProject] && projects[currentProject].files) {
      return projects[currentProject].files;
    }
  }

  // 兼容旧的存储结构
  const result = await chrome.storage.local.get(['files']);
  return result.files || {};
}

async function getGitData() {
  if (currentProject) {
    // 从项目中获取 Git 数据
    const result = await chrome.storage.local.get(['projects']);
    const projects = result.projects || {};
    if (projects[currentProject]) {
      return projects[currentProject].gitData || { initialized: false, commits: [] };
    }
  }

  // 兼容旧的全局 Git 数据
  const result = await chrome.storage.local.get(['gitData']);
  return result.gitData || { initialized: false, commits: [] };
}

function updateStatus(message) {
  status.textContent = message;
  setTimeout(() => {
    status.textContent = '就绪';
  }, 3000);
}

function updateCharCount() {
  const count = editor.value.length;
  charCount.textContent = `字符: ${count}`;
}

function generateCommitId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showGitInfo(title, content) {
  document.getElementById('gitInfoTitle').textContent = title;
  document.getElementById('gitInfoContent').textContent = content;
  gitInfoPanel.classList.remove('hidden');
}

function simpleDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  let diff = '';
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';

    if (oldLine !== newLine) {
      if (oldLine) {
        diff += `- ${oldLine}\n`;
      }
      if (newLine) {
        diff += `+ ${newLine}\n`;
      }
    } else {
      diff += `  ${oldLine}\n`;
    }
  }

  return diff || '没有差异';
}
