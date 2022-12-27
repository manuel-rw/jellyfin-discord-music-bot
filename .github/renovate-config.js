module.exports = {
  branchPrefix: 'renovate/',
  username: 'renovate-release',
  gitAuthor: 'Renovate Bot <bot@renovateapp.com>',
  onboarding: true,
  platform: 'github',
  includeForks: false,
  baseBranches: ['dev'],
  ignoreDeps: ['jest', 'ts-jest', 'node'],
  repositories: [
    'manuel-rw/jellyfin-discord-music-bot',
  ],
  packageRules: [
    {
      description: 'lockFileMaintenance',
      matchUpdateTypes: [
        'pin',
        'digest',
        'patch',
        'minor',
        'major',
        'lockFileMaintenance',
      ],
      dependencyDashboardApproval: false,
      stabilityDays: 0,
    },
  ],
};