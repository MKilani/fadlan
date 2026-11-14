// Adds the GitHub Pages sub-path (https://USER.github.io/fadlan/) only for the online build.
// Set GITHUB_PAGES=1 when building for GitHub; local development stays at the root.
module.exports = ({ config }) => ({
  ...config,
  experiments: process.env.GITHUB_PAGES ? { baseUrl: '/fadlan' } : {},
});
