// Two independent choices: the APP style (pages, chips, buttons, fonts, pin colours) and the MAP style (base map).
// To add a style later: add its id here, create a file in themes/ (or an entry in mapStyles.ts), and register it.
export type AppStyleId = 'plain' | 'fantasy';
export type MapStyleId = 'plain' | 'fantasy';

export type Theme = {
  id: AppStyleId;
  label: string;
  defaultMap: MapStyleId;            // what "Auto" map style resolves to for this app style
  colors: {
    background: string;              // sheet and screens
    ink: string;                     // main text
    muted: string;                   // secondary text
    accent: string;                  // links, buttons, distance badge
    line: string;                    // dividers, placeholder bars
    chip: string; chipText: string;  // language chips
    chipOn: string; chipOnText: string;
    frame: string;                   // photo frame colour
    marker: string; markerSelected: string; markerStroke: string;
    cluster: string; clusterText: string;
    halo: string;                    // outline of map labels, keeps them readable on any map
  };
  fonts: { body?: string; heading?: string };   // undefined = system font
  shape: { sheetRadius: number; chipRadius: number; photoRadius: number; photoBorder: number; buttonRadius: number };
  text: { titleItalic: boolean; titleUppercase: boolean; titleSpacing: number };
  band?: { color: string; height: number };     // strip on top of the sheet
  ornament?: string;                            // divider between article sections
  strings: { readFull: string };
};
