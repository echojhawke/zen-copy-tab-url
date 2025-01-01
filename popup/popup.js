/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * I don't know why you would want to cause this code is absolute 
 * AI dogwater and I'm not a real programer, but hey, you should have
 * every right to copy this shit code :) (I'm just not responsible for
 * how garbage it is. I mean even this license text is probably improper) 
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Copy Tab URL Extension for Zen
 * Copyright (C) 2024 echojhawke
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Set the correct path to the icon
    const baseUrlButtonImg = document.getElementById('base-url-button').querySelector('img');
    baseUrlButtonImg.src = browser.runtime.getURL('icons/base2.svg');

    // Get user settings
    const { themeColor, popupTimeout, defaultAction } = await browser.storage.local.get({
      themeColor: '#4b5a87',
      popupTimeout: 2500,
      defaultAction: 'full-url'
    });

    // Apply theme color
    applyThemeColors(themeColor);

    // Copy the URL based on user preference
    const url = await getCurrentTabUrl();
    if (defaultAction === 'full-url') {
      await copyTextToClipboard(url);
      document.getElementById('message').textContent = 'Link Copied';
    } else {
      const baseUrl = new URL(url).origin;
      await copyTextToClipboard(baseUrl);
      document.getElementById('message').textContent = 'Base URL Copied';
    }

    // Start the auto-close timer based on user preference
    startAutoCloseTimer(popupTimeout);

    // Handle button click to copy the opposite URL type
    document.getElementById('base-url-button').addEventListener('click', async () => {
      try {
        const url = await getCurrentTabUrl();
        if (defaultAction === 'full-url') {
          const baseUrl = new URL(url).origin;
          await copyTextToClipboard(baseUrl);
          document.getElementById('message').textContent = 'Base URL Copied';
        } else {
          await copyTextToClipboard(url);
          document.getElementById('message').textContent = 'Link Copied';
        }
        startAutoCloseTimer(popupTimeout);
      } catch (error) {
        console.error('Error copying URL:', error);
      }
    });
  } catch (error) {
    console.error('Error in initialization:', error);
  }
});

/**
 * Retrieves the URL of the current active tab.
 * @returns {string} The URL of the active tab.
 */
async function getCurrentTabUrl() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      return tabs[0].url;
    }
    throw new Error('No active tab found');
  } catch (error) {
    console.error('Error getting current tab URL:', error);
    throw error;
  }
}

/**
 * Copies the given text to the clipboard.
 * @param {string} text - The text to copy to the clipboard.
 */
async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy text:', err);
    // Fallback method
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err2) {
      console.error('Fallback copy failed:', err2);
    }
    document.body.removeChild(textArea);
  }
}

function shadeColor(color, percent) {
  // Convert hex color to RGB
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  // Adjust color brightness
  R = parseInt((R * (100 + percent)) / 100);
  G = parseInt((G * (100 + percent)) / 100);
  B = parseInt((B * (100 + percent)) / 100);

  // Ensure values are within 0-255
  R = R < 255 ? R : 255;
  G = G < 255 ? G : 255;
  B = B < 255 ? B : 255;

  // Convert back to hex
  const RR = R.toString(16).padStart(2, '0');
  const GG = G.toString(16).padStart(2, '0');
  const BB = B.toString(16).padStart(2, '0');

  return `#${RR}${GG}${BB}`;
}

/**
 * Applies theme colors to the popup UI.
 * @param {string} themeColor - The selected theme color.
 */
function applyThemeColors(themeColor) {
  const root = document.documentElement;
  const img = document.querySelector('#base-url-button img');

  // Default colors
  const defaultBackground = '#4b5a87';

  // Set CSS variables for colors
  const popupBackground = themeColor || defaultBackground;
  const textColor = isColorLight(popupBackground) ? '#000000' : '#FFFFFF';

  root.style.setProperty('--popup-background', popupBackground);
  root.style.setProperty('--popup-text', textColor);

  // Calculate border color (darken by 20%)
  const borderColor = shadeColor(popupBackground, -20);
  root.style.setProperty('--popup-border', borderColor);

  // Adjust icon color to match text color
  if (textColor === '#000000') {
    img.style.filter = 'invert(1)';
  } else {
    img.style.filter = 'invert(0)';
  }
}

/**
 * Determines if a color is light based on its luminance.
 * @param {string} color - The color in hex format.
 * @returns {boolean} True if the color is light, false otherwise.
 */
function isColorLight(color) {
  // Convert hex color to RGB
  let r, g, b;
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    if (hex.length === 3) {
      r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      return false; // Invalid format
    }
  } else {
    return false; // Unsupported color format
  }

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

let autoCloseTimer;

/**
 * Starts or restarts the auto-close timer for the popup.
 * @param {number} timeout - The time in milliseconds before the popup closes.
 */
function startAutoCloseTimer(timeout) {
  // Clear any existing timer
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
  }
  if (timeout >= 0) {
    // If timeout is zero, close immediately
    autoCloseTimer = setTimeout(() => {
      if (timeout === 0) {
        window.close();
      } else {
        // Start slide-out animation
        document.querySelector('html').classList.add('slide-out');
        // Close after animation ends
        setTimeout(() => {
          window.close();
        }, 300); // Duration of slide-out animation
      }
    }, timeout);
  }
}
