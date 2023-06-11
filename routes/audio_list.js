// functionality of a route
const authenticate = require("../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const app = express();

const path = require('path');
const audio_list = require("express").Router();

audio_list.get('/download/audio-list', authenticate, async (req, res) => {
  const youtubeUrls = req.query.urls.split(',');

  if (!youtubeUrls || youtubeUrls.length === 0) {
    return res.status(400).json({
      error: 'Nenhum link de vídeo fornecido.'
    });
  }

  const downloadUrls = [];
  const timers = [];
  let totalTimer = 0;

  for (const youtubeUrl of youtubeUrls) {
    const info = await ytdl.getInfo(youtubeUrl);
    const format = ytdl.filterFormats(info.formats, 'audioonly').find(format => format.audioBitrate === 128);

    if (!format) {
      return res.status(400).json({
        error: `Não foi possível encontrar um formato de áudio com 128kbps para o vídeo: ${youtubeUrl}`
      });
    }

    const fileName = `${info.videoDetails.videoId}.mp3`;
    const channelName = info.videoDetails.author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const filePath = path.join(__dirname, `../downloads/audio-list/${sanitizedChannelName}/${fileName}`);
    const directoryPath = path.dirname(filePath);

    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      downloadUrls.push(`${req.protocol}://${req.get('host')}/download/audio-list/${sanitizedChannelName}/${fileName}`);
      continue;
    }

    const writeStream = fs.createWriteStream(filePath);
    const videoStream = ytdl(youtubeUrl, { format });

    videoStream.on('error', (error) => {
      console.error(error);
      res.status(500).json({
        error: `Ocorreu um erro ao baixar o áudio para o vídeo: ${youtubeUrl}`
      });
    });

    const startTime = Date.now(); // Captura o tempo de início do download

    videoStream.pipe(writeStream);

    writeStream.on('finish', () => {
      const endTime = Date.now(); // Captura o tempo de término do download
      const timer = (endTime - startTime) / 1000; // Calcula o tempo do download em segundos

      timers.push({
        videoId: info.videoDetails.videoId,
        timer: timer
      });

      totalTimer += timer;

      downloadUrls.push(`${req.protocol}://${req.get('host')}/download/audio-list/${fileName}`);
      if (downloadUrls.length === youtubeUrls.length) {
        res.status(200).json({
          message: 'Áudios baixados com sucesso!',
          downloadUrls,
          timers,
          totalTimer
        });
      }
    });
  }
});

module.exports = audio_list;
