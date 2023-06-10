//functionality of a route
const authenticate = require("../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const path = require('path');

const app = express();
app.use('/download', express.static('downloads'));
const video = require("express").Router();

video.get('/download/video', authenticate, async (req, res) => {
    const youtubeUrl = req.query.url;
    const resolution = req.query.resolution || '720p';
    const info = await ytdl.getInfo(youtubeUrl);
    const format = ytdl.filterFormats(info.formats, 'videoandaudio').find(format => format.qualityLabel.includes(resolution));
  
    if (!format) {
      return res.status(400).json({
        error: `Não foi possível encontrar um formato de vídeo com a resolução ${resolution}.`
      });
    }
  
    const fileName = `${info.videoDetails.videoId}.mp4`;
    const channelName = info.videoDetails.author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const filePath = path.join(__dirname, `../downloads/video/${sanitizedChannelName}/${fileName}`);
    const directoryPath = path.dirname(filePath);
  
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  
    if (fs.existsSync(filePath)) {
      return res.status(200).json({
        message: 'O vídeo já foi baixado.',
        downloadUrl: `${req.protocol}://${req.get('host')}/download/video/${sanitizedChannelName}/${fileName}`
      });
    }
  
    const writeStream = fs.createWriteStream(filePath);
    const videoStream = ytdl(youtubeUrl, { format });
  
    videoStream.on('error', (error) => {
      console.error(error);
      res.status(500).json({
        error: 'Ocorreu um erro ao baixar o vídeo.'
      });
    });
  
    videoStream.pipe(writeStream);
  
    writeStream.on('finish', () => {
      res.status(200).json({
        message: 'Vídeo baixado com sucesso!',
        downloadUrl: `${req.protocol}://${req.get('host')}/download/video/${fileName}`
      });
    });
  });

module.exports = video;