// Content script for LocalGPT Studio
// Injects a floating action button for quick access

let fabButton = null

function createFAB() {
  if (document.getElementById('localgpt-fab')) return

  fabButton = document.createElement('div')
  fabButton.id = 'localgpt-fab'
  fabButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  `
  Object.assign(fabButton.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: '2147483647',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: 'none',
  })
  fabButton.addEventListener('mouseenter', () => {
    fabButton.style.transform = 'scale(1.1)'
    fabButton.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)'
  })
  fabButton.addEventListener('mouseleave', () => {
    fabButton.style.transform = 'scale(1)'
    fabButton.style.boxShadow = '0 4px 12px rgba(99,102,241,0.4)'
  })
  fabButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'getPageContent' })
    chrome.action.openPopup()
  })
  document.body.appendChild(fabButton)
}

// Only inject on non-blank pages
if (document.body && document.body.innerText?.length > 50) {
  createFAB()
}
