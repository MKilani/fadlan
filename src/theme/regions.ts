// Regions used to choose a style automatically. Seed table: extend as styles are added.
export type Region =
  | 'mediterranean-near-east' | 'nw-central-europe' | 'east-asia' | 'south-se-asia'
  | 'sub-saharan-africa' | 'americas' | 'oceania' | 'other';

const COUNTRY_REGION: Record<string, Region> = {
  IT: 'mediterranean-near-east', GR: 'mediterranean-near-east', ES: 'mediterranean-near-east', PT: 'mediterranean-near-east',
  TR: 'mediterranean-near-east', EG: 'mediterranean-near-east', IL: 'mediterranean-near-east', JO: 'mediterranean-near-east',
  LB: 'mediterranean-near-east', SY: 'mediterranean-near-east', MA: 'mediterranean-near-east', TN: 'mediterranean-near-east',
  CH: 'nw-central-europe', DE: 'nw-central-europe', AT: 'nw-central-europe', FR: 'nw-central-europe', GB: 'nw-central-europe',
  IE: 'nw-central-europe', NL: 'nw-central-europe', BE: 'nw-central-europe', DK: 'nw-central-europe', SE: 'nw-central-europe',
  NO: 'nw-central-europe', FI: 'nw-central-europe', PL: 'nw-central-europe', CZ: 'nw-central-europe',
  CN: 'east-asia', JP: 'east-asia', KR: 'east-asia', TW: 'east-asia',
  IN: 'south-se-asia', TH: 'south-se-asia', KH: 'south-se-asia', VN: 'south-se-asia', ID: 'south-se-asia',
  ET: 'sub-saharan-africa', KE: 'sub-saharan-africa', NG: 'sub-saharan-africa', ZA: 'sub-saharan-africa', GH: 'sub-saharan-africa',
  US: 'americas', CA: 'americas', MX: 'americas', PE: 'americas', BR: 'americas', AR: 'americas',
  AU: 'oceania', NZ: 'oceania', FJ: 'oceania',
};

export const regionOf = (countryCode: string | null): Region => (countryCode && COUNTRY_REGION[countryCode]) || 'other';
