// functionality of a route
const authenticate = require("../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const app = express();
const channel_audio = require("express").Router();

channel_audio.get('/download/channel-audio', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;

  try {
    const channel = await ytpl(youtubeUrl);

    const channelName = channel.author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const channelDir = `./downloads/channel-audio/${sanitizedChannelName}`;

    if (!fs.existsSync(channelDir)) {
      fs.mkdirSync(channelDir, { recursive: true });
    }

    const videoUrls = channel.items.map(item => item.shortUrl);
    const timers = [];
    let totalTimer = 0;

    const downloadPromises = videoUrls.map(async (videoUrl) => {
      const videoId = ytdl.getVideoID(videoUrl);
      const fileName = `${videoId}.mp3`;
      const filePath = `${channelDir}/${fileName}`;

      if (fs.existsSync(filePath)) {
        console.log(`O áudio "${videoId}" já foi baixado.`);
        return filePath;
      }

      const info = await ytdl.getInfo(videoUrl);
      const format = ytdl.filterFormats(info.formats, 'audioonly').find(format => format.audioBitrate === 128);

      if (!format) {
        throw new Error(`Não foi possível encontrar um formato de áudio com 128kbps para o vídeo "${info.videoDetails.title}".`);
      }

      const writeStream = fs.createWriteStream(filePath);
      const videoStream = ytdl(videoUrl, { format });

      videoStream.on('error', (error) => {
        console.error(`Ocorreu um erro ao baixar o áudio "${videoId}":`, error);
      });

      const startTime = Date.now(); // Captura o tempo de início do download

      videoStream.pipe(writeStream);

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          const endTime = Date.now(); // Captura o tempo de término do download
          const timer = (endTime - startTime) / 1000; // Calcula o tempo do download em segundos

          timers.push({
            videoId,
            timer
          });

          totalTimer += timer;

          console.log(`Áudio "${videoId}" baixado com sucesso!`);
          resolve(filePath);
        });

        writeStream.on('error', (error) => {
          console.error(`Ocorreu um erro ao salvar o áudio "${videoId}":`, error);
          reject(error);
        });
      });
    });

    const downloadedFiles = await Promise.all(downloadPromises);
    const existingFiles = downloadedFiles.filter(filePath => filePath);
    const links = existingFiles.map(filePath => {
      const fileName = filePath.split('/').pop();
      return `${req.protocol}://${req.get('host')}/download/channel/${sanitizedChannelName}/${fileName}`;
    });

    res.status(200).json({
      message: `Áudios do canal "${sanitizedChannelName}" baixados com sucesso!`,
      channelDir,
      links,
      timers,
      totalTimer: totalTimer || 0 // Se totalTimer for falso ou indefinido, define como 0
    });
  } catch (error) {
    console.error('Ocorreu um erro ao processar o canal:', error);
    res.status(500).json({
      error: 'Ocorreu um erro ao processar o canal.'
    });
  }
});

module.exports = channel_audio;
