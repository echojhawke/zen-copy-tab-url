document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save-button').addEventListener('click', saveOptions);
document.getElementById('theme-color').addEventListener('input', updateBackgroundColor);
document.getElementById('icon-color')?.addEventListener('input', updateIconPreview);


// -------------------
// MAIN HANDLERS
// -------------------

function updateBackgroundColor() {
  const themeColorInput = document.getElementById('theme-color').value;
  const themeColor = themeColorInput || '#4b5a87'; // Default to blue if empty
  document.body.style.backgroundColor = themeColor;

  // Update text color based on luminance
  const textColor = isColorLight(themeColor) ? '#000000' : '#FFFFFF';
  document.body.style.color = textColor;

  // Update save button color
  const buttonColor = shadeColor(themeColor, -20); // Darken by 20%
  const saveButton = document.getElementById('save-button');
  saveButton.style.backgroundColor = buttonColor;

  // Update save button text color based on luminance
  const buttonTextColor = isColorLight(buttonColor) ? '#000000' : '#FFFFFF';
  saveButton.style.color = buttonTextColor;
}

function updateIconPreview() {
  const iconColorInput = document.getElementById('icon-color').value.trim() || '#ffffff';
  const previewImg = document.getElementById('icon-preview');

  // Basic validation: must start with # and be 4-7 chars total (#abc or #abcdef).
  const isValid = /^#[0-9A-Fa-f]{3,6}$/.test(iconColorInput);

  if (!isValid) {
    // If invalid, set a fallback color or hide the icon preview
    previewImg.src = '';
    return;
  }

  // Add real icon preview
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="24" height="24" viewBox="0 -960 960 960">
      <path fill="${iconColorInput}"
            d="M436.41-271.87H280q-86.37 0-147.25-60.87-60.88-60.87-60.88-147.24t60.88-147.26q60.88-60.89 147.25-60.89h156.41v91H280.1q-48.84 0-83.04 34.16-34.19 34.17-34.19 82.97t34.19 82.97q34.2 34.16 83.04 34.16h156.31v91ZM314.5-438.09v-83.82h331v83.82h-331Zm209.09 166.22v-91H679.9q48.84 0 83.04-34.16 34.19-34.17 34.19-82.97t-34.19-82.97q-34.2-34.16-83.04-34.16H523.59v-91H680q86.37 0 147.25 60.87 60.88 60.87 60.88 147.24t-60.88 147.26Q766.37-271.87 680-271.87H523.59Z"/>
    </svg>
  `.trim();

  // Encode to base64
  const svgBase64 = btoa(svgString);
  previewImg.src = `data:image/svg+xml;base64,${svgBase64}`;
}

async function saveOptions() {
  const themeColorInput = document.getElementById('theme-color').value || '#4b5a87';
  const popupTimeoutValue = document.getElementById('popup-timeout').value;
  const popupTimeout = parseInt(popupTimeoutValue);
  const defaultAction = document.querySelector('input[name="default-action"]:checked').value;
  const iconColorInput = document.getElementById('icon-color').value.trim() || '#ffffff';
  const showUrlbarCheckbox = document.getElementById('show-urlbar-icon');
  const showUrlbarIcon = showUrlbarCheckbox.checked;

  // Validate popupTimeout
  if (isNaN(popupTimeout) || popupTimeout < 0) {
    alert('Please enter a valid number for Popup Timeout (0 or higher).');
    return;
  }

  // Save everything to local storage
  await browser.storage.local.set({
    themeColor: themeColorInput,
    popupTimeout,
    defaultAction,
    iconColor: iconColorInput,
    showUrlbarIcon
  });

  // Show "Changes Saved" message
  const saveMessage = document.getElementById('save-message');
  saveMessage.textContent = 'Changes Saved';

  // Hide the message after 1 second
  setTimeout(() => {
    saveMessage.textContent = '';
  }, 1000);


}

async function restoreOptions() {
  const storage = await browser.storage.local.get([
    'themeColor', // Sets the popup theme color
    'popupTimeout', // Sets the popup timeout
    'defaultAction', // Sets the default action of copy full URL or base URL
    'iconColor', // Sets the icon color for the extension icon and the icon in the URL bar (if enabled)
    'showUrlbarIcon' // Sets whether to show the icon *inside* the URL bar
  ]);

  const themeColor = storage.themeColor || '#4b5a87';
  document.getElementById('theme-color').value = themeColor;
  document.body.style.backgroundColor = themeColor;

  // Update text color based on luminance
  const textColor = isColorLight(themeColor) ? '#000000' : '#FFFFFF';
  document.body.style.color = textColor;

  // Update save button color
  const buttonColor = shadeColor(themeColor, -20);
  const saveButton = document.getElementById('save-button');
  saveButton.style.backgroundColor = buttonColor;

  // Update save button text color based on luminance
  const buttonTextColor = isColorLight(buttonColor) ? '#000000' : '#FFFFFF';
  saveButton.style.color = buttonTextColor;

  // Popup Timeout
  document.getElementById('popup-timeout').value =
    storage.popupTimeout !== undefined ? storage.popupTimeout : 2500;

  // Full or Base URL Toggle
  const defaultAction = storage.defaultAction || 'full-url';
  document.querySelector(`input[name="default-action"][value="${defaultAction}"]`).checked = true;

  // Icon Color
  const iconColor = storage.iconColor || '#ffffff';
  document.getElementById('icon-color').value = iconColor;
  updateIconPreview(); // show it immediately

  // Show/Hide icon inside URL bar toggle
  const showUrlbarCheckbox = document.getElementById('show-urlbar-icon');
  showUrlbarCheckbox.checked = !!storage.showUrlbarIcon;
}

// -------------------
// HELPER FUNCTIONS
// -------------------

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
    return false; // Unsupported format
  }

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}