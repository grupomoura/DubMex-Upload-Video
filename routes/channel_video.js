//functionality of a route
const authenticate = require("../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const app = express();
const channel_video = require("express").Router();

channel_video.get('/download/channel-video', authenticate, async (req, res) => {
    const youtubeUrl = req.query.url;
  
    try {
      const channel = await ytpl(youtubeUrl);
  
      const channelName = channel.author.name;
      const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
      const channelDir = `./downloads/channel-video/${sanitizedChannelName}`;
  
      if (!fs.existsSync(channelDir)) {
        fs.mkdirSync(channelDir, { recursive: true });
      }
  
      const videoUrls = channel.items.map(item => item.shortUrl);
  
      const downloadPromises = videoUrls.map(async (videoUrl) => {
        const videoId = ytdl.getVideoID(videoUrl);
        const fileName = `${videoId}.mp4`;
        const filePath = `${channelDir}/${fileName}`;
  
        if (fs.existsSync(filePath)) {
          console.log(`O vídeo "${videoId}" já foi baixado.`);
          return filePath;
        }
  
        const info = await ytdl.getInfo(videoUrl);
        const resolution = req.query.resolution || '720p';
        const format = ytdl.filterFormats(info.formats, 'videoandaudio').find(format => format.qualityLabel.includes(resolution));
  
        if (!format) {
          throw new Error(`Não foi possível encontrar um formato de vídeo com a resolução ${resolution} para o vídeo "${info.videoDetails.title}".`);
        }
  
        const writeStream = fs.createWriteStream(filePath);
        const videoStream = ytdl(videoUrl, { format });
  
        videoStream.on('error', (error) => {
          console.error(`Ocorreu um erro ao baixar o vídeo "${videoId}":`, error);
        });
  
        videoStream.pipe(writeStream);
  
        return new Promise((resolve, reject) => {
          writeStream.on('finish', () => {
            console.log(`Vídeo "${videoId}" baixado com sucesso!`);
            resolve(filePath);
          });
  
          writeStream.on('error', (error) => {
            console.error(`Ocorreu um erro ao salvar o vídeo "${videoId}":`, error);
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
        message: `Vídeos do canal "${sanitizedChannelName}" baixados com sucesso!`,
        channelDir: channelDir,
        links: links
      });
    } catch (error) {
      console.error('Ocorreu um erro ao processar o canal:', error);
      res.status(500).json({
        error: 'Ocorreu um erro ao processar o canal.'
      });
    }
  });

module.exports = channel_video;