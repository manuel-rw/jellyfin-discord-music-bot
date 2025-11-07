<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://github.com/walkxcode/dashboard-icons/blob/main/png/jellyfin.png?raw=true" width="200" alt="Nest Logo" /></a>
</p>

  <br/>
  <h1 align="center">Jellyfin Discord Bot</h1>

  <p align="center">A simple <a href="https://discord.com" target="_blank">Discord</a> bot that enables you to broadcast<br/>your <a href="https://jellyfin.org/" target="_blank">Jellyfin Media Server</a> music collection to voice channels.<br/>It's Open Source and can easily be hosted by yourself!</p>

<p align="center">
  <small>Thank you <a href="https://github.com/KGT1/jellyfin-discord-music-bot/">KGT1</a> for starting this project!<br/>This is a fork of their original repository and re-uses some of their code.</small>
</p>

<p align="center">
  <a href="https://github.com/manuel-rw/jellyfin-discord-music-bot/wiki/%F0%9F%9A%80-Installation"><img src="https://img.shields.io/badge/-Installation%20Guide-7289da?style=for-the-badge&logo=markdown" alt="badge" /></a>
  <a href="https://discord.gg/hRHZ3q3VDX"><img src="https://img.shields.io/badge/-Community%20Discord-7289da?style=for-the-badge&logo=discord" alt="badge" /></a>
  <a href='https://ko-fi.com/A0A42YZ7W' target='_blank'><img src="https://img.shields.io/badge/-Buy%20me%20a%20coffee-f1f1f1?style=for-the-badge&logo=kofi" alt="badge" /></a>
  <br/>
  <br/>
  <img src="https://github.com/manuel-rw/jellyfin-discord-music-bot/actions/workflows/docker.yml/badge.svg?branch=master" />
  <img src="https://deepsource.io/gh/manuel-rw/jellyfin-discord-music-bot.svg/?label=active+issues&show_trend=true&token=vhfm8cbHaoCyXTf7Gfs9FweR)](https://deepsource.io/gh/manuel-rw/jellyfin-discord-music-bot/?ref=repository-badge" />
</p>

<br/>
<hr/>
<br/>


## ✨ Features

- Lightweight and extendable using the [Nest](https://github.com/nestjs/nest) framework
- Easy usage with Discord command system (e.g. ``/play``, ``/pause``, ...)
- Fast and validated configuration using environment variables
- Typesafe code for quicker development and less bugs
- Supports ``Music``, ``Playlists`` and ``Albums`` from your Jellyfin instance

## 📌 About this project
This project was originally started by [KGT1 on GitHub](https://github.com/KGT1/jellyfin-discord-music-bot/) in 2020. I came across this project in late 2021, when wanted to enjoy my music on Discord. I never got it to run as I wanted it to. Since the original project was created under the MIT license, I decided to make a fork in 2022 with my own version. Although this project re-uses some code of the original project, it has been completely rewritten in other parts using NestJs and features now a module-based approach.

## ⛔ Limitations

- Bot does not support shards. This means, you cannot use it in multiple servers concurrently.
- Album covers are not visible, unless they are remote (e.g. provided by external metadata provider)
- Streaming any video content in voice channels (See [this issue](https://github.com/discordjs/discord.js/issues/4116))

## 🚀 Installation

Please check out the Wiki section in the repository for installation instructions:

https://github.com/manuel-rw/jellyfin-discord-music-bot/wiki


## 💻 Development

I'm open to any contributions to this project. You can start contributing using the following commands, after executing the installation commands:

## 👤 Credits

- https://tabler-icons.io/
- https://docs.nestjs.com/
- https://discord.js.org/
- https://github.com/fjodor-rybakov/discord-nestjs
- https://github.com/jellyfin/jellyfin-sdk-typescript
- https://jellyfin.org/
- https://github.com/KGT1/jellyfin-discord-music-bot
- https://gitmoji.dev/
