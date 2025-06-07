import type { ParticipantGender } from '../types';

/**
 * Generates a beautiful emoji avatar based on participant name and gender
 */

// Emoji collections for different genders
const MALE_EMOJIS = [
  '👨', '🧑', '👦', '🧔', '👨‍💼', '👨‍🎓', '👨‍🏫', '👨‍⚕️', '👨‍🔬', '👨‍💻',
  '👨‍🎨', '👨‍🍳', '👨‍🌾', '👨‍🏭', '👨‍🔧', '👨‍⚖️', '👨‍✈️', '👨‍🚀', '👨‍🚒',
  '👮‍♂️', '🕵️‍♂️', '💂‍♂️', '👷‍♂️', '🤴', '👨‍🦳', '👨‍🦲', '🧙‍♂️', '🧚‍♂️', '🧛‍♂️'
];

const FEMALE_EMOJIS = [
  '👩', '👧', '👩‍💼', '👩‍🎓', '👩‍🏫', '👩‍⚕️', '👩‍🔬', '👩‍💻', '👩‍🎨', '👩‍🍳',
  '👩‍🌾', '👩‍🏭', '👩‍🔧', '👩‍⚖️', '👩‍✈️', '👩‍🚀', '👩‍🚒', '👮‍♀️', '🕵️‍♀️',
  '💂‍♀️', '👷‍♀️', '👸', '👩‍🦳', '👩‍🦲', '🧙‍♀️', '🧚‍♀️', '🧛‍♀️', '🤱', '👰'
];

// Fallback emojis for neutral/fun avatars
const NEUTRAL_EMOJIS = [
  '😊', '😎', '🤗', '😋', '🤓', '😇', '🥳', '🤩', '😍', '🥰',
  '😉', '😌', '😊', '🙂', '😄', '😁', '😆', '😂', '🤣', '😜'
];

// Background colors for emoji avatars
const BACKGROUND_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#FFB6C1', '#87CEEB', '#F0E68C', '#FA8072',
  '#9370DB', '#20B2AA', '#87CEFA', '#DEB887', '#F4A460'
];

/**
 * Generate a hash from string for consistent color selection
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate simple emoji avatar (just emoji without background)
 */
export function generateSimpleEmojiAvatar(name: string, gender: ParticipantGender): string {
  const hash = simpleHash(name);
  const emojis = gender === 'male' ? MALE_EMOJIS : FEMALE_EMOJIS;
  
  // Return just the emoji
  return emojis[hash % emojis.length];
}

/**
 * Get a random emoji for neutral avatars
 */
export function getRandomNeutralEmoji(name: string): string {
  const hash = simpleHash(name);
  return NEUTRAL_EMOJIS[hash % NEUTRAL_EMOJIS.length];
}

/**
 * Generate emoji avatar based on name and gender
 */
export function generateAvatar(name: string, gender: ParticipantGender): string {
  const hash = simpleHash(name);
  const emojis = gender === 'male' ? MALE_EMOJIS : FEMALE_EMOJIS;
  const backgroundColor = BACKGROUND_COLORS[hash % BACKGROUND_COLORS.length];
  
  // Select emoji based on name hash
  const selectedEmoji = emojis[hash % emojis.length];
  
  // Create SVG with emoji and colored background
  const svg = `
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="${backgroundColor}"/>
      <text 
        x="50" 
        y="55" 
        text-anchor="middle" 
        dominant-baseline="central" 
        font-size="45"
        font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
      >
        ${selectedEmoji}
      </text>
    </svg>
  `;

  return svg.trim();
}

/**
 * Convert SVG string to data URL for use in img src
 */
export function svgToDataUrl(svg: string): string {
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Generate avatar and return as data URL
 */
export function generateAvatarDataUrl(name: string, gender: ParticipantGender): string {
  const svg = generateAvatar(name, gender);
  return svgToDataUrl(svg);
}

/**
 * Generate avatars for all participants in a dialog
 */
export function generateParticipantAvatars(participants: Array<{name: string, gender: ParticipantGender}>): string[] {
  return participants.map(participant => generateAvatar(participant.name, participant.gender));
}
