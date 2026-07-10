chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ask-localgpt',
    title: 'Ask LocalGPT about this selection',
    contexts: ['selection'],
  })
  chrome.contextMenus.create({
    id: 'summarize-localgpt',
    title: 'Summarize this page with LocalGPT',
    contexts: ['page'],
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ask-localgpt' && info.selectionText) {
    const { serverUrl = 'http://localhost:8000' } = await chrome.storage.local.get('serverUrl')
    chrome.storage.local.set({
      pendingQuery: {
        type: 'ask',
        text: info.selectionText,
        pageTitle: tab?.title || '',
        pageUrl: tab?.url || '',
      },
    })
    chrome.action.openPopup()
  }

  if (info.menuItemId === 'summarize-localgpt') {
    const { serverUrl = 'http://localhost:8000' } = await chrome.storage.local.get('serverUrl')
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const article = document.querySelector('article') || document.querySelector('main') || document.body
          return {
            title: document.title,
            content: article?.innerText?.slice(0, 8000) || '',
            url: window.location.href,
          }
        },
      })
      if (result?.[0]?.result) {
        chrome.storage.local.set({
          pendingQuery: {
            type: 'summarize',
            pageContent: result[0].result,
          },
        })
        chrome.action.openPopup()
      }
    } catch {}
  }
})

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'getPageContent') {
    sendResponse({ ready: true })
  }
})
