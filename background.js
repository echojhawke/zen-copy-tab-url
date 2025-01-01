// background.js

// 1) Inline the SVG data
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="24px" height="24px" viewBox="0 -960 960 960">
  <path fill="CURRENT_COLOR"
        d="M436.41-271.87H280q-86.37 0-147.25-60.87-60.88-60.87-60.88-147.24t60.88-147.26q60.88-60.89 147.25-60.89h156.41v91H280.1q-48.84 0-83.04 34.16-34.19 34.17-34.19 82.97t34.19 82.97q34.2 34.16 83.04 34.16h156.31v91ZM314.5-438.09v-83.82h331v83.82h-331Zm209.09 166.22v-91H679.9q48.84 0 83.04-34.16 34.19-34.17 34.19-82.97t-34.19-82.97q-34.2-34.16-83.04-34.16H523.59v-91H680q86.37 0 147.25 60.87 60.88 60.87 60.88 147.24t-60.88 147.26Q766.37-271.87 680-271.87H523.59Z"/>
</svg>
`;

const BASE2_SVG = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="24px" height="24px" viewBox="0 -960 960 960" fill="#e8eaed">
  <path fill="CURRENT_COLOR"
        d="M320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-320H520v-160H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/>
</svg>
`;

// 2) Context menu / Browser action
browser.contextMenus.create({
  id: "copy-url",
  title: "Copy Tab URL",
  contexts: ["tab"]
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copy-url") {
    handleCopyUrl(tab);
  }
});

browser.browserAction.onClicked.addListener((tab) => {
  handleCopyUrl(tab);
});

// 3) Keyboard shortcut via manifest "commands"
browser.commands.onCommand.addListener(async (command) => {
  if (command === "copy-url-command") {
    await handleCopyUrl();
    showNotification("URL Copied!", "Your active tab's URL was copied to the clipboard.");
  }
});

/**
 * Copies the URL of the given (or current) active tab,
 * respecting the user's defaultAction preference.
 */
async function handleCopyUrl(tab) {
  try {
    // If no tab was passed, find the currently active tab
    if (!tab) {
      const [activeTab] = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true
      });
      tab = activeTab;
    }

    const { defaultAction } = await browser.storage.local.get({ defaultAction: 'full-url' });
    const url = tab?.url || tab?.pendingUrl;
    if (!url) {
      console.warn("No URL found for the current tab.");
      return;
    }

    let textToCopy = url;
    if (defaultAction === 'base-url') {
      textToCopy = new URL(url).origin;
    }

    await copyToClipboard(textToCopy);
  } catch (error) {
    console.error('Error handling copy:', error);
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy text:', error);
    fallbackCopyTextToClipboard(text);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand('copy');
    console.log('Fallback copy successful.');
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  document.body.removeChild(textarea);
}

// Show a small ephemeral notification
function showNotification(title, message) {
  browser.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png", // or any icon you have
    title,
    message
  });
}

// Page Action logic
//    Show/hide the icon in the URL bar if "showUrlbarIcon" is enabled,
//    and color it similarly to the main toolbar icon.

browser.pageAction.onClicked.addListener((tab) => {
  // When user clicks the page action icon in the URL bar
  handleCopyUrl(tab);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // For each tab that updates, decide if we show/hide the page action.
  maybeShowOrHidePageAction(tabId);
});

// We'll also check all existing tabs once on startup
browser.tabs.query({}).then((tabs) => {
  tabs.forEach((tab) => maybeShowOrHidePageAction(tab.id));
});

// This function decides if we show/hide & set the icon color for the URL bar.
async function maybeShowOrHidePageAction(tabId) {
  const { showUrlbarIcon = false } = await browser.storage.local.get('showUrlbarIcon');
  if (showUrlbarIcon) {
    // Show the URL bar icon for this tab
    browser.pageAction.show(tabId);

    // Also set the icon color (similar to updateExtensionIcons but per-tab)
    const { iconColor = '#ffffff' } = await browser.storage.local.get('iconColor');
    const replacedIconSvg = ICON_SVG.replace(/CURRENT_COLOR/g, iconColor);
    const iconBase64 = svgToBase64(replacedIconSvg);

    // In Firefox, you must pass {tabId, path: {...}}
    browser.pageAction.setIcon({
      tabId: tabId,
      path: {
        "16": iconBase64,
        "32": iconBase64,
        "64": iconBase64,
        "128": iconBase64
      }
    });
  } else {
    // If user disabled it, hide the page action for this tab
    browser.pageAction.hide(tabId);
  }
}

// 5) Dynamic icon color for the toolbar (browser action)
browser.runtime.onInstalled.addListener(() => {
  updateExtensionIcons();
});

browser.runtime.onStartup.addListener(() => {
  updateExtensionIcons();
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.iconColor) {
      updateExtensionIcons();
      // Also update the page action icons for all tabs
      browser.tabs.query({}).then((tabs) => {
        tabs.forEach((tab) => maybeShowOrHidePageAction(tab.id));
      });
    }
    if (changes.showUrlbarIcon) {
      // If user toggles the checkbox, show/hide the page action for all tabs
      browser.tabs.query({}).then((tabs) => {
        tabs.forEach((tab) => maybeShowOrHidePageAction(tab.id));
      });
    }
  }
});

async function updateExtensionIcons() {
  try {
    const { iconColor = '#ffffff' } = await browser.storage.local.get('iconColor');

    const replacedIconSvg = ICON_SVG.replace(/CURRENT_COLOR/g, iconColor);
    const iconBase64 = svgToBase64(replacedIconSvg);

    // Update the main toolbar icon (browser action)
    await browser.browserAction.setIcon({
      path: {
        "16": iconBase64,
        "32": iconBase64,
        "64": iconBase64,
        "128": iconBase64
      }
    });

    console.log('Toolbar icon updated to color:', iconColor);
  } catch (err) {
    console.error('Error updating extension icons:', err);
  }
}

function svgToBase64(svgText) {
  const svgClean = svgText.replace(/\r?\n|\r/g, '').trim();
  return `data:image/svg+xml;base64,${btoa(svgClean)}`;
}
