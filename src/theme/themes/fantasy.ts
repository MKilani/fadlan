import { Platform } from 'react-native';
import type { Theme } from '../types';

// Generic storybook-countryside fantasy look: parchment, moss green, wood brown, serif type.
// Original design: no names, symbols or lettering taken from any existing fantasy work.
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export const fantasy: Theme = {
  id: 'fantasy',
  label: 'Storybook',
  defaultMap: 'fantasy',
  colors: {
    background: '#F1E7C8', ink: '#2F4A35', muted: '#7A6A4A', accent: '#5F7F4A', line: 'rgba(47,74,53,0.22)',
    chip: 'transparent', chipText: '#6B4A2B', chipOn: '#6B4A2B', chipOnText: '#F1E7C8', frame: '#6B4A2B',
    marker: '#6B4A2B', markerSelected: '#E5B04B', markerStroke: '#F1E7C8',
    cluster: '#6B4A2B', clusterText: '#F1E7C8', halo: '#F1E7C8',
  },
  fonts: { body: serif, heading: serif },
  shape: { sheetRadius: 18, chipRadius: 4, photoRadius: 12, photoBorder: 3, buttonRadius: 8 },
  text: { titleItalic: true, titleUppercase: false, titleSpacing: 0 },
  band: { color: '#5F7F4A', height: 6 },
  ornament: '\u2766',
  strings: { readFull: 'Read the full tale \u2192' },
};
