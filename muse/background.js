// Service Worker for Chrome Extension
// 这里可以处理后台任务和事件

chrome.runtime.onInstalled.addListener(() => {
  console.log('Muse 已安装');
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value: ${JSON.stringify(oldValue)}`,
      `New value: ${JSON.stringify(newValue)}`
    );
  }
});
