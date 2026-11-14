import type { Theme } from '../types';

export const plain: Theme = {
  id: 'plain',
  label: 'Plain',
  defaultMap: 'plain',
  colors: {
    background: '#FFFFFF', ink: '#17323A', muted: '#5B6B70', accent: '#1D5C63', line: '#E3E8E9',
    chip: '#EEF3F3', chipText: '#17323A', chipOn: '#1D5C63', chipOnText: '#FFFFFF', frame: 'transparent',
    marker: '#1D5C63', markerSelected: '#E0A100', markerStroke: '#FFFFFF',
    cluster: '#17323A', clusterText: '#FFFFFF', halo: '#FFFFFF',
  },
  fonts: {},
  shape: { sheetRadius: 20, chipRadius: 14, photoRadius: 10, photoBorder: 0, buttonRadius: 10 },
  text: { titleItalic: false, titleUppercase: false, titleSpacing: 0 },
  strings: { readFull: 'Read the full article' },
};
