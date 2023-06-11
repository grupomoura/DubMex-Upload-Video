// functionality of a route
const authenticate = require("../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const path = require('path');

const app = express();
app.use('/download', express.static('downloads'));
const video_list = require("express").Router();

video_list.get('/download/video-list', authenticate, async (req, res) => {
  const youtubeUrls = req.query.urls.split(',');

  if (!youtubeUrls || youtubeUrls.length === 0) {
    return res.status(400).json({
      error: 'Nenhum link de vídeo fornecido.'
    });
  }

  const downloadUrls = [];
  const timers = [];
  let totalTimer = 0;
  const exceptions = [];

  for (const youtubeUrl of youtubeUrls) {
    const info = await ytdl.getInfo(youtubeUrl);
    const resolution = req.query.resolution || '720p';
    let format = ytdl.filterFormats(info.formats, 'videoandaudio').find(format => format.qualityLabel.includes(resolution));

    if (!format) {
      // Tentar encontrar a resolução disponível mais próxima maior que a selecionada
      const availableFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
      let closestFormat = null;

      for (let i = availableFormats.length - 1; i >= 0; i--) {
        const currentFormat = availableFormats[i];
        const currentResolution = parseInt(currentFormat.qualityLabel.replace('p', ''));

        if (currentResolution > parseInt(resolution.replace('p', ''))) {
          closestFormat = currentFormat;
          break;
        }
      }

      if (closestFormat) {
        format = closestFormat;
        exceptions.push({
          videoId: info.videoDetails.videoId,
          resolutionSelected: closestFormat.qualityLabel
        });
      } else {
        return res.status(400).json({
          error: `Não foi possível encontrar um formato de vídeo com a resolução ${resolution} para o vídeo: ${youtubeUrl}`
        });
      }
    }

    const fileName = `${info.videoDetails.videoId}.mp4`;
    const channelName = info.videoDetails.author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const filePath = path.join(__dirname, `../downloads/video-list/${sanitizedChannelName}/${fileName}`);
    const directoryPath = path.dirname(filePath);

    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      downloadUrls.push(`${req.protocol}://${req.get('host')}/download/video-list/${sanitizedChannelName}/${fileName}`);
      continue;
    }

    const writeStream = fs.createWriteStream(filePath);
    const videoStream = ytdl(youtubeUrl, { format });

    videoStream.on('error', (error) => {
      console.error(error);
      res.status(500).json({
        error: `Ocorreu um erro ao baixar o vídeo: ${youtubeUrl}`
      });
    });

    const startTime = Date.now(); // Captura o tempo de início do download

    videoStream.pipe(writeStream);

    const videoDownloadPromise = new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        const endTime = Date.now(); // Captura o tempo de conclusão do download
        const timer = (endTime - startTime) / 1000; // Calcula o tempo de download em segundos

        downloadUrls.push(`${req.protocol}://${req.get('host')}/download/video-list/${sanitizedChannelName}/${fileName}`);
        timers.push({
          videoId: info.videoDetails.videoId,
          timer: timer
        });
        totalTimer += timer;

        resolve();
      });

      writeStream.on('error', (error) => {
        console.error(`Ocorreu um erro ao salvar o vídeo "${info.videoDetails.videoId}":`, error);
        reject(error);
      });
    });

    await videoDownloadPromise;
  }

  res.status(200).json({
    message: 'Vídeos baixados com sucesso!',
    downloadUrls,
    timers,
    totalTimer,
    exceptions
  });
});

module.exports = video_list;
