export const Constants = {
  Metadata: {
    Version: '0.0.1',
    ApplicationName: 'Discord Jellyfin Music Bot',
  },
  Links: {
    SourceCode: 'https://github.com/manuel-rw/jellyfin-discord-music-bot/',
    Issues: 'https://github.com/manuel-rw/jellyfin-discord-music-bot/issues/',
    ReportIssue:
      'https://github.com/manuel-rw/jellyfin-discord-music-bot/issues/new/choose',
    BugReport: (title) =>
      new URL(
        `https://github.com/manuel-rw/jellyfin-discord-music-bot/issues/new?assignees=&labels=&template=bug_report.md&title=${title}`,
      ),
  },
  Design: {
    InvisibleSpace: '\u1CBC',
    Icons: {
      JellyfinLogo:
        'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/jellyfin-icon-squared.png?raw=true',
      SuccessIcon:
        'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/circle-check.png?raw=true',
      ErrorIcon:
        'https://github.com/manuel-rw/jellyfin-discord-music-bot/blob/nestjs-migration/images/icons/alert-circle.png?raw=true',
    },
  },
};
