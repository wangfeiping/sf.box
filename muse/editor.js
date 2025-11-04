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
const projectPath = document.getElementById('projectPath');
const filePath = document.getElementById('filePath');
const branchSelect = document.getElementById('branchSelect');
const fileTreeContent = document.getElementById('fileTreeContent');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const loadingProgress = document.getElementById('loadingProgress');

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

  // 分支选择相关事件
  document.getElementById('refreshBranchBtn').addEventListener('click', refreshBranchList);
  branchSelect.addEventListener('change', handleBranchChange);

  // 加载分支列表
  await refreshBranchList();
});

// 打开完整编辑器
function openFullEditor() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('editor.html')
  });
}

// 从 storage 加载文件(弹窗传递的)
async function loadFileFromStorage() {
  const result = await chrome.storage.local.get(['currentProject', 'currentFile', 'projects']);

  if (result.currentProject && result.projects) {
    const project = result.projects[result.currentProject];
    if (project) {
      currentProject = result.currentProject;

      // 如果有指定文件，加载该文件
      if (result.currentFile && project.files[result.currentFile]) {
        currentFile = result.currentFile;
        const file = project.files[result.currentFile];
        editor.value = file.content || '';
        filenameInput.value = result.currentFile;
        updateStatus(`已加载: ${result.currentFile}`);
      } else {
        // 如果没有指定文件，只是打开了项目
        updateStatus(`已打开项目: ${project.name}`);
      }

      // 清除临时数据
      chrome.storage.local.remove(['currentProject', 'currentFile']);

      // 先加载分支列表，再更新项目信息（这样分支选择器已经有选项了）
      await refreshBranchList();

      // 重新读取项目数据（确保获取最新的分支信息）
      const updatedResult = await chrome.storage.local.get(['projects']);
      const updatedProject = updatedResult.projects[currentProject];

      // 更新项目信息显示
      updateProjectInfo(updatedProject || project, currentFile);

      // 刷新文件树
      await refreshFileTree();

      return;
    }
  }

  // 如果没有传递的文件,尝试加载最后编辑的文件
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

    // 刷新文件树
    await refreshFileTree();
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

    // 更新项目信息显示
    if (currentProject) {
      const result = await chrome.storage.local.get(['projects']);
      const projects = result.projects || {};
      const project = projects[currentProject];
      if (project) {
        updateProjectInfo(project, filename);
      }
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

  // 刷新文件树
  await refreshFileTree();
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

    // 如果选择了分支,记录到commit中
    const selectedBranch = branchSelect.value;
    if (selectedBranch) {
      commit.branch = selectedBranch;
    }

    gitData.commits.push(commit);

    // 保存到项目中
    if (currentProject) {
      const result = await chrome.storage.local.get(['projects']);
      const projects = result.projects || {};
      if (projects[currentProject]) {
        projects[currentProject].gitData = gitData;
        // 更新项目的分支信息
        if (selectedBranch) {
          projects[currentProject].githubBranch = selectedBranch;
        }
        await chrome.storage.local.set({ projects: projects });
      }
    } else {
      // 兼容旧的全局存储
      await chrome.storage.local.set({ gitData: gitData });
    }

    commitMessageInput.value = '';
    const branchInfo = selectedBranch ? ` (分支: ${selectedBranch})` : '';
    updateStatus(`已提交: ${message}${branchInfo}`);
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

    // 检查是否选择了分支
    const selectedBranch = branchSelect.value;
    if (!selectedBranch) {
      alert('请先选择要推送的分支');
      return;
    }

    // 获取 Git 数据
    const gitData = await getGitData();
    if (!gitData.initialized || gitData.commits.length === 0) {
      alert('没有可推送的提交');
      return;
    }

    updateStatus(`正在推送到 GitHub (${selectedBranch})...`);

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
        // 更新项目的分支信息
        projects[currentProject].githubBranch = selectedBranch;
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

// 显示加载提示框
function showLoading(message = '正在加载...', progress = '') {
  loadingMessage.textContent = message;
  loadingProgress.textContent = progress;
  loadingOverlay.classList.remove('hidden');

  // 禁用所有按钮和输入框
  document.querySelectorAll('button, input, textarea, select').forEach(element => {
    element.disabled = true;
  });
}

// 隐藏加载提示框
function hideLoading() {
  loadingOverlay.classList.add('hidden');

  // 恢复所有按钮和输入框
  document.querySelectorAll('button, input, textarea, select').forEach(element => {
    element.disabled = false;
  });
}

// 更新加载进度
function updateLoadingProgress(progress) {
  loadingProgress.textContent = progress;
}

// 更新项目信息显示
function updateProjectInfo(project, filename) {
  if (project) {
    // 只显示项目名称
    const projectName = project.name || currentProject;
    projectPath.textContent = projectName;

    // 设置点击事件，打开项目路径（包含当前分支）
    projectPath.onclick = () => {
      if (project.githubRepo) {
        // 获取当前选中的分支
        const selectedBranch = branchSelect.value;
        let url = `https://github.com/${project.githubRepo}`;

        // 如果有选中的分支，添加到URL中
        if (selectedBranch) {
          url += `/tree/${selectedBranch}`;
        }

        chrome.tabs.create({ url: url });
      }
    };

    // 设置悬停提示（与点击打开的路径一致）
    if (project.githubRepo) {
      const selectedBranch = branchSelect.value;
      let fullPath = `https://github.com/${project.githubRepo}`;
      if (selectedBranch) {
        fullPath += `/tree/${selectedBranch}`;
      }
      projectPath.title = fullPath;
    } else {
      projectPath.title = projectName;
    }
  } else {
    projectPath.textContent = '-';
    projectPath.title = '';
    projectPath.onclick = null;
  }

  //if (filename) {
  //  filePath.textContent = filename;
  //  filePath.title = `文件: ${filename}`;
  //} else {
  //filePath.textContent = '-';
  //filePath.title = '';
  //}

  // 更新分支选择器
  if (project && project.githubBranch) {
    // 如果下拉列表中已有该分支则选中,否则添加
    let optionExists = false;
    for (let i = 0; i < branchSelect.options.length; i++) {
      if (branchSelect.options[i].value === project.githubBranch) {
        branchSelect.selectedIndex = i;
        optionExists = true;
        break;
      }
    }
    if (!optionExists && project.githubBranch) {
      const option = document.createElement('option');
      option.value = project.githubBranch;
      option.textContent = project.githubBranch;
      option.selected = true;
      branchSelect.appendChild(option);
    }
  }
}

// 刷新分支列表
async function refreshBranchList() {
  if (!currentProject) {
    return;
  }

  try {
    const result = await chrome.storage.local.get(['projects', 'githubToken']);
    const projects = result.projects || {};
    const project = projects[currentProject];

    if (!project || !project.githubRepo) {
      return;
    }

    const token = result.githubToken;
    if (!token) {
      return;
    }

    updateStatus('正在加载分支列表...');
    const branches = await fetchRepoBranches(project.githubRepo, token);

    if (branches.length === 0) {
      updateStatus('获取分支列表失败');
      return;
    }

    // 保存当前选中的分支（如果有）
    const currentBranch = project.githubBranch || branches[0];

    // 清空现有选项
    branchSelect.innerHTML = '';

    // 添加所有分支
    branches.forEach(branch => {
      const option = document.createElement('option');
      option.value = branch;
      option.textContent = branch;
      // 选中项目的默认分支或当前分支
      if (branch === currentBranch) {
        option.selected = true;
      }
      branchSelect.appendChild(option);
    });

    updateStatus('分支列表已更新');
  } catch (error) {
    console.error('刷新分支列表失败:', error);
    updateStatus('刷新分支列表失败: ' + error.message);
  }
}

// 处理分支切换
async function handleBranchChange() {
  const selectedBranch = branchSelect.value;

  if (!currentProject || !selectedBranch) {
    return;
  }

  try {
    const result = await chrome.storage.local.get(['projects']);
    const projects = result.projects || {};
    const project = projects[currentProject];

    if (!project) {
      return;
    }

    // 获取之前的分支
    const previousBranch = project.githubBranch;

    // 如果分支没有变化，直接返回
    if (previousBranch === selectedBranch) {
      return;
    }

    // 1. 检查当前编辑器中的文件是否有未保存的修改
    const hasUnsavedChanges = await checkUnsavedChanges();
    if (hasUnsavedChanges) {
      const confirmUnsaved = confirm('当前文件有未保存的修改，切换分支将丢失这些修改。\n\n是否继续切换分支？');
      if (!confirmUnsaved) {
        // 用户取消，恢复之前的分支选择
        branchSelect.value = previousBranch || '';
        return;
      }
    }

    // 2. 检查是否有未推送的提交
    const hasUnpushedCommits = await checkUnpushedCommits();
    if (hasUnpushedCommits) {
      const confirmUnpushed = confirm('当前项目有未推送到 GitHub 的提交，切换分支可能导致这些提交丢失。\n\n建议先推送到 GitHub 再切换分支。\n\n是否仍要继续切换分支？');
      if (!confirmUnpushed) {
        // 用户取消，恢复之前的分支选择
        branchSelect.value = previousBranch || '';
        return;
      }
    }

    // 3. 用户确认切换，保存新分支并从 GitHub 加载该分支的文件
    project.githubBranch = selectedBranch;
    await chrome.storage.local.set({ projects: projects });
    updateStatus(`正在切换到分支: ${selectedBranch}...`);

    // 更新项目路径的悬停提示，使其包含新选择的分支
    if (project.githubRepo) {
      let fullPath = `https://github.com/${project.githubRepo}`;
      if (selectedBranch) {
        fullPath += `/tree/${selectedBranch}`;
      }
      projectPath.title = fullPath;
    }

    // 4. 从 GitHub 重新加载该分支的文件
    await reloadFilesFromGitHub(project, selectedBranch);

  } catch (error) {
    console.error('切换分支失败:', error);
    updateStatus('切换分支失败: ' + error.message);
  }
}

// 检查当前文件是否有未保存的修改
async function checkUnsavedChanges() {
  if (!currentFile) {
    return false;
  }

  const files = await getFiles();
  const savedFile = files[currentFile];

  if (!savedFile) {
    // 这是一个新文件，如果编辑器有内容则视为未保存
    return editor.value.trim().length > 0;
  }

  // 比较编辑器内容和已保存的内容
  return editor.value !== savedFile.content;
}

// 检查是否有未推送的提交
async function checkUnpushedCommits() {
  const gitData = await getGitData();

  if (!gitData.initialized || gitData.commits.length === 0) {
    return false;
  }

  // 检查是否有未标记为已推送的提交
  const hasUnpushed = gitData.commits.some(commit => !commit.pushed);
  return hasUnpushed;
}

// 从 GitHub 重新加载分支的文件
async function reloadFilesFromGitHub(project, branch) {
  if (!project.githubRepo) {
    updateStatus('项目没有关联的 GitHub 仓库，无法加载文件');
    return;
  }

  try {
    // 显示加载框
    showLoading('正在切换分支...', '连接到 GitHub...');

    const authResult = await chrome.storage.local.get(['githubToken']);
    if (!authResult.githubToken) {
      hideLoading();
      updateStatus('未找到 GitHub 令牌，请重新连接 GitHub');
      return;
    }

    const token = authResult.githubToken;
    const [owner, repo] = project.githubRepo.split('/');

    updateStatus(`正在从 GitHub 加载分支 ${branch} 的文件...`);
    updateLoadingProgress(`正在获取分支 ${branch} 的文件列表...`);

    // 获取仓库内容
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      hideLoading();
      throw new Error(`获取仓库内容失败: ${response.statusText}`);
    }

    const data = await response.json();

    // 过滤出 .md 文件
    const mdFiles = data.tree.filter(item =>
      item.type === 'blob' && item.path.endsWith('.md')
    );

    if (mdFiles.length === 0) {
      updateLoadingProgress(`分支 ${branch} 中没有找到 Markdown 文件`);

      // 清空当前项目的文件
      project.files = {};
      await chrome.storage.local.get(['projects']).then(async (result) => {
        const projects = result.projects || {};
        projects[currentProject] = project;
        await chrome.storage.local.set({ projects: projects });
      });

      // 清空编辑器和文件树
      editor.value = '';
      filenameInput.value = '';
      currentFile = null;
      await refreshFileTree();

      hideLoading();
      updateStatus(`分支 ${branch} 中没有找到 Markdown 文件`);
      return;
    }

    updateLoadingProgress(`找到 ${mdFiles.length} 个 Markdown 文件，开始下载...`);

    // 获取每个文件的内容
    const newFiles = {};
    let loadedCount = 0;

    for (const file of mdFiles) {
      try {
        updateLoadingProgress(`正在下载文件 ${loadedCount + 1}/${mdFiles.length}: ${file.path}`);

        const fileResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${branch}`,
          {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          const content = decodeURIComponent(escape(atob(fileData.content)));

          newFiles[file.path] = {
            filename: file.path,
            content: content,
            lastModified: new Date().toISOString()
          };

          loadedCount++;
          updateStatus(`正在加载文件... (${loadedCount}/${mdFiles.length})`);
        }
      } catch (error) {
        console.error(`加载文件 ${file.path} 失败:`, error);
      }
    }

    updateLoadingProgress('正在更新项目文件...');

    // 更新项目的文件
    project.files = newFiles;
    const result = await chrome.storage.local.get(['projects']);
    const projects = result.projects || {};
    projects[currentProject] = project;
    await chrome.storage.local.set({ projects: projects });

    updateLoadingProgress('正在刷新文件树...');

    // 保存当前打开的文件名
    const previousFile = currentFile;

    // 刷新文件树
    await refreshFileTree();

    // 检查之前打开的文件是否在新分支中存在
    if (previousFile && newFiles[previousFile]) {
      // 文件存在，重新加载该文件
      updateLoadingProgress('正在加载当前文件...');
      const fileData = newFiles[previousFile];
      editor.value = fileData.content || '';
      filenameInput.value = previousFile;
      currentFile = previousFile;

      // 更新项目信息显示
      updateProjectInfo(project, previousFile);

      // 更新文件树中的激活状态
      document.querySelectorAll('.tree-item.file').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.filepath === previousFile) {
          item.classList.add('active');
        }
      });

      // 如果正在预览模式，更新预览
      if (isPreviewMode) {
        updatePreview();
      }
    } else {
      // 文件不存在，清空编辑器
      editor.value = '';
      filenameInput.value = '';
      currentFile = null;

      // 更新项目信息显示（不显示文件名）
      updateProjectInfo(project, null);
    }

    updateLoadingProgress('完成！');

    // 延迟关闭加载框，让用户看到完成消息
    setTimeout(() => {
      hideLoading();
      if (previousFile && newFiles[previousFile]) {
        updateStatus(`✅ 已切换到分支 ${branch}，加载了 ${loadedCount} 个文件，已重新加载文件: ${previousFile}`);
      } else if (previousFile) {
        updateStatus(`✅ 已切换到分支 ${branch}，加载了 ${loadedCount} 个文件（之前的文件 ${previousFile} 在此分支不存在）`);
      } else {
        updateStatus(`✅ 已切换到分支 ${branch}，加载了 ${loadedCount} 个文件`);
      }
    }, 500);

  } catch (error) {
    hideLoading();
    console.error('从 GitHub 加载文件失败:', error);
    updateStatus('从 GitHub 加载文件失败: ' + error.message);
    alert('从 GitHub 加载文件失败: ' + error.message);
  }
}

// ========== 文件树功能 ==========

// 构建文件树结构
function buildFileTree(files) {
  const tree = {};

  Object.keys(files).forEach(filename => {
    const parts = filename.split('/');
    let current = tree;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // 这是文件
        if (!current._files) current._files = [];
        current._files.push({ name: part, fullPath: filename, data: files[filename] });
      } else {
        // 这是文件夹
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });

  return tree;
}

// 渲染文件树
function renderFileTree(tree, parentElement, level = 0) {
  // 先渲染文件夹
  Object.keys(tree).forEach(key => {
    if (key === '_files') return; // 跳过文件列表

    const folderDiv = document.createElement('div');
    folderDiv.className = 'tree-folder';

    const folderItem = document.createElement('div');
    folderItem.className = 'tree-item folder';
    folderItem.innerHTML = `
      <span class="chevron">▶</span>
      <span class="tree-icon">📁</span>
      <span class="tree-item-name">${key}</span>
    `;

    const childrenDiv = document.createElement('div');
    childrenDiv.className = 'tree-children';
    childrenDiv.style.display = 'none';

    // 文件夹点击事件
    folderItem.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = folderItem.classList.toggle('expanded');
      childrenDiv.style.display = isExpanded ? 'block' : 'none';
    });

    folderDiv.appendChild(folderItem);
    folderDiv.appendChild(childrenDiv);
    parentElement.appendChild(folderDiv);

    // 递归渲染子项
    renderFileTree(tree[key], childrenDiv, level + 1);
  });

  // 然后渲染文件
  if (tree._files) {
    tree._files.forEach(file => {
      const fileItem = document.createElement('div');
      fileItem.className = 'tree-item file';
      fileItem.dataset.filepath = file.fullPath;
      fileItem.innerHTML = `
        <span class="tree-icon">📄</span>
        <span class="tree-item-name">${file.name}</span>
      `;

      // 如果是当前打开的文件，标记为激活状态
      if (currentFile === file.fullPath) {
        fileItem.classList.add('active');
      }

      // 文件点击事件
      fileItem.addEventListener('click', async (e) => {
        e.stopPropagation();
        await loadFileFromTree(file.fullPath);

        // 更新激活状态
        document.querySelectorAll('.tree-item.file').forEach(item => {
          item.classList.remove('active');
        });
        fileItem.classList.add('active');
      });

      parentElement.appendChild(fileItem);
    });
  }
}

// 从文件树加载文件
async function loadFileFromTree(filepath) {
  const files = await getFiles();
  const fileData = files[filepath];

  if (fileData) {
    editor.value = fileData.content;
    filenameInput.value = filepath;
    currentFile = filepath;
    updateStatus(`已加载: ${filepath}`);
    updateCharCount();
    if (isPreviewMode) {
      updatePreview();
    }

    // 更新项目信息显示
    if (currentProject) {
      const result = await chrome.storage.local.get(['projects']);
      const projects = result.projects || {};
      const project = projects[currentProject];
      if (project) {
        updateProjectInfo(project, filepath);
      }
    }
  }
}

// 刷新文件树
async function refreshFileTree() {
  if (!currentProject) {
    fileTreeContent.innerHTML = '<div class="empty-tree-message">未加载项目</div>';
    return;
  }

  const files = await getFiles();
  const fileNames = Object.keys(files);

  if (fileNames.length === 0) {
    fileTreeContent.innerHTML = '<div class="empty-tree-message">项目中暂无文件</div>';
    return;
  }

  // 清空现有内容
  fileTreeContent.innerHTML = '';

  // 构建并渲染文件树
  const tree = buildFileTree(files);
  renderFileTree(tree, fileTreeContent);
}

