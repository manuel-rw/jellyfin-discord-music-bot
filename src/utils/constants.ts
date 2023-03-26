export const Constants = {
  Metadata: {
    Version: {
      Major: 0,
      Minor: 0,
      Patch: 6,
      All: () =>
        `${Constants.Metadata.Version.Major}.${Constants.Metadata.Version.Minor}.${Constants.Metadata.Version.Patch}`,
    },
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
    ReleasesPage:
      'https://github.com/manuel-rw/jellyfin-discord-music-bot/releases',
    Wiki: {
      DisableNotifications:
        'https://github.com/manuel-rw/jellyfin-discord-music-bot/wiki/%F0%9F%93%A2-Update-Notifications',
    },
    Api: {
      GetLatestRelease:
        'https://api.github.com/repos/manuel-rw/jellyfin-discord-music-bot/releases/latest',
    },
  },
  Design: {
    InvisibleSpace: '\u1CBC',
    Icons: {
      JellyfinLogo:
        'https://raw.githubusercontent.com/manuel-rw/jellyfin-discord-music-bot/master/images/icons/jellyfin-icon-squared.png',
      SuccessIcon:
        'https://raw.githubusercontent.com/manuel-rw/jellyfin-discord-music-bot/master/images/icons/circle-check.png',
      ErrorIcon:
        'https://raw.githubusercontent.com/manuel-rw/jellyfin-discord-music-bot/master/images/icons/alert-circle.png',
    },
  },
};
