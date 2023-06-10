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
const video_list = require("express").Router();

video_list.get('/download/video-list', authenticate, async (req, res) => {
    const youtubeUrls = req.query.urls.split(',');
  
    if (!youtubeUrls || youtubeUrls.length === 0) {
      return res.status(400).json({
        error: 'Nenhum link de vídeo fornecido.'
      });
    }
  
    const downloadUrls = [];
  
    for (const youtubeUrl of youtubeUrls) {
      const info = await ytdl.getInfo(youtubeUrl);
      const resolution = req.query.resolution || '720p';
      const format = ytdl.filterFormats(info.formats, 'videoonly').find(format => format.qualityLabel.includes(resolution));
  
      if (!format) {
        return res.status(400).json({
          error: `Não foi possível encontrar um formato de vídeo com a resolução ${resolution} para o vídeo: ${youtubeUrl}`
        });
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
  
      videoStream.pipe(writeStream);
  
      writeStream.on('finish', () => {
        downloadUrls.push(`${req.protocol}://${req.get('host')}/download/video-list/${fileName}`);
        if (downloadUrls.length === youtubeUrls.length) {
          res.status(200).json({
            message: 'Vídeos baixados com sucesso!',
            downloadUrls
          });
        }
      });
    }
  });

module.exports = video_list;