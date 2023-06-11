//functionality of a route
const authenticate = require("../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const path = require('path');

const app = express();
const playlist_audio = require("express").Router();

playlist_audio.get('/download/playlist-audio', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;

  try {
    const playlist = await ytpl(youtubeUrl);

    const channelName = playlist.items[0].author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const channelDir = `./downloads/playlist-audio/${sanitizedChannelName}`;

    if (!fs.existsSync(channelDir)) {
      fs.mkdirSync(channelDir, { recursive: true });
    }

    const downloadPromises = playlist.items.map(async (item) => {
      const videoId = ytdl.getVideoID(item.url);
      const fileName = `${videoId}.mp3`;
      const filePath = `${channelDir}/${fileName}`;

      if (fs.existsSync(filePath)) {
        console.log(`O áudio "${videoId}" já foi baixado.`);
        return filePath;
      }

      const info = await ytdl.getInfo(item.url);
      const format = ytdl.filterFormats(info.formats, 'audioonly').find(format => format.audioBitrate === 128);

      if (!format) {
        throw new Error(`Não foi possível encontrar um formato de áudio com 128kbps para a música "${info.videoDetails.title}".`);
      }

      const writeStream = fs.createWriteStream(filePath);
      const videoStream = ytdl(item.url, { format });

      videoStream.on('error', (error) => {
        console.error(`Ocorreu um erro ao baixar o áudio "${videoId}":`, error);
      });

      const startTime = Date.now(); // Captura o tempo de início do download

      videoStream.pipe(writeStream);

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          const endTime = Date.now(); // Captura o tempo de término do download
          const timer = (endTime - startTime) / 1000; // Calcula o tempo do download em segundos

          console.log(`Áudio "${videoId}" baixado com sucesso!`);
          resolve(filePath, timer);
        });

        writeStream.on('error', (error) => {
          console.error(`Ocorreu um erro ao salvar o áudio "${videoId}":`, error);
          reject(error);
        });
      });
    });

    const downloadedFilesWithTimers = await Promise.all(downloadPromises);
    const existingFiles = downloadedFilesWithTimers.filter(([filePath, timer]) => filePath);
    const links = existingFiles.map(([filePath, timer]) => {
      const fileName = filePath.split('/').pop();
      return `${req.protocol}://${req.get('host')}/download/playlist/${sanitizedChannelName}/${fileName}`;
    });

    const timers = existingFiles.map(([filePath, timer]) => ({
      filePath: filePath,
      timer: timer
    }));

    const totalTimer = timers.reduce((total, { timer }) => total + timer, 0);

    res.status(200).json({
      message: `Áudios da playlist "${playlist.title}" baixados com sucesso!`,
      channelDir: channelDir,
      links: links,
      timers: timers,
      totalTimer: totalTimer
    });
  } catch (error) {
    console.error('Ocorreu um erro ao processar a playlist:', error);
    res.status(500).json({
      error: 'Ocorreu um erro ao processar a playlist.'
    });
  }
});

module.exports = playlist_audio;
