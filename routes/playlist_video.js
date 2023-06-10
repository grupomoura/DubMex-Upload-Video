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
const playlist_video = require("express").Router();

playlist_video.get('/download/playlist-video', authenticate, async (req, res) => {
    const youtubeUrl = req.query.url;
  
    try {
      const playlist = await ytpl(youtubeUrl);
  
      const channelName = playlist.items[0].author.name;
      const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
      const channelDir = `./downloads/playlist-video/${sanitizedChannelName}`;
  
      if (!fs.existsSync(channelDir)) {
        fs.mkdirSync(channelDir, { recursive: true });
      }
  
      const downloadPromises = playlist.items.map(async (item) => {
        const videoId = ytdl.getVideoID(item.url);
        const fileName = `${videoId}.mp4`;
        const filePath = `${channelDir}/${fileName}`;
  
        if (fs.existsSync(filePath)) {
          console.log(`O vídeo "${videoId}" já foi baixado.`);
          return filePath;
        }
  
        const info = await ytdl.getInfo(item.url);
        const resolution = req.query.resolution || '720p';
        const format = ytdl.filterFormats(info.formats, 'videoonly').find(format => format.qualityLabel.includes(resolution));
  
        if (!format) {
          throw new Error(`Não foi possível encontrar um formato de vídeo com a resolução ${resolution} para o vídeo "${info.videoDetails.title}".`);
        }
  
        const writeStream = fs.createWriteStream(filePath);
        const videoStream = ytdl(item.url, { format });
  
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
        return `${req.protocol}://${req.get('host')}/download/playlist-video/${sanitizedChannelName}/${fileName}`;
      });
  
      res.status(200).json({
        message: `Vídeos da playlist "${playlist.title}" baixados com sucesso!`,
        channelDir: channelDir,
        links: links
      });
    } catch (error) {
      console.error('Ocorreu um erro ao processar a playlist:', error);
      res.status(500).json({
        error: 'Ocorreu um erro ao processar a playlist.'
      });
    }
  });

module.exports = playlist_video;