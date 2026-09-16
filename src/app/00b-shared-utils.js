// ════════════════════════════════════════════════════════
//  V17.1: Shared Utility Functions
// ════════════════════════════════════════════════════════
// Extracted from 22-features-v7.js for better organization
// These functions are used across multiple modules via window scope

/**
 * Generate a unique ID using timestamp + random
 * @returns {string} Unique ID
 */
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
window.uid = uid;

/**
 * Shuffle an array in-place (Fisher-Yates)
 * @param {Array} arr - Array to shuffle
 * @returns {Array} Shuffled array (same reference)
 */
function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
window.shuffleArray = shuffleArray;

/**
 * Sanitize user input to prevent XSS in text content
 * @param {string} str - Input string
 * @returns {string} Safe string with HTML entities
 */
function _sanitize(str){
  if(!str)return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\//g,'&#47;');
}
window._sanitize = _sanitize;

/**
 * Sanitize user input for display (allows some formatting)
 * @param {string} str - Input string
 * @returns {string} Safe string
 */
function _sanitizeUser(str){
  if(!str)return '';
  return String(str).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
window._sanitizeUser = _sanitizeUser;

/**
 * Validate and return a safe CSS color value
 * @param {string} c - Color input
 * @returns {string} Safe CSS color or empty
 */
function _safeColor(c){
  if(!c||typeof c!=='string')return '';
  if(/^(#[0-9a-fA-F]{3,8}|rgba?\(|var\(--[a-z0-9-]+\)|transparent|inherit)$/.test(c))return c;
  return '';
}
window._safeColor = _safeColor;

/**
 * Return a safe media source URL (data: or blob:)
 * @param {string} src - Media source
 * @returns {string} Safe URL or empty
 */
function _safeMediaSrc(src){
  if(!src||typeof src!=='string')return '';
  if(src.startsWith('data:')||src.startsWith('blob:')||src.startsWith('https://')||src.startsWith('http://'))return src;
  return '';
}
window._safeMediaSrc = _safeMediaSrc;

/**
 * Sanitize icon string (emoji or SVG path)
 * @param {string} icon - Icon input
 * @returns {string} Safe icon or empty
 */
function _sanitizeIcon(icon){
  if(!icon)return '';
  // Allow emojis and simple text, strip HTML
  return String(icon).replace(/</g,'').replace(/>/g,'').substring(0,10);
}
window._sanitizeIcon = _sanitizeIcon;

console.info('[Utils] V17.1 shared utility functions loaded');
