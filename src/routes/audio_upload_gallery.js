const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');

const app = express();
app.use('/download', express.static('downloads'));
const video_gallery = require("express").Router();

video_gallery.get('/download/video-gallery', async (req, res) => {
  const videoUrl = req.query.url;

  // Verificar se o URL do vídeo foi fornecido
  if (!videoUrl) {
    return res.status(400).json({
      error: 'O URL do vídeo é obrigatório.'
    });
  }

  // Definir o nome do arquivo de vídeo
  const videoFileName = 'video.mp4';
  const videoFilePath = path.join(__dirname, '../downloads', videoFileName);

  // Fazer o download do vídeo para o servidor
  try {
    const response = await axios({
      url: videoUrl,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(fs.createWriteStream(videoFilePath));

    response.data.on('end', () => {
      extractAudio(videoFilePath);
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Ocorreu um erro ao fazer o download do vídeo.'
    });
  }

  // Função para extrair o áudio do vídeo
  const extractAudio = (videoPath) => {
    // Definir o caminho e nome do arquivo de áudio
    const audioFileName = path.basename(videoPath, path.extname(videoPath)) + '.mp3';
    const audioFilePath = path.join(__dirname, '../downloads/video_gallery', audioFileName);

    // Verificar se o arquivo de áudio já foi baixado
    if (fs.existsSync(audioFilePath)) {
      // Remover o arquivo de vídeo original
      fs.unlinkSync(videoPath);

      return res.status(200).json({
        message: 'O áudio já foi baixado.',
        downloadUrl: `${req.protocol}://${req.get('host')}/download/video_gallery/${audioFileName}`
      });
    }

    // Comando para extrair o áudio usando FFmpeg
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -b:a 64k -vn "${audioFilePath}"`;

    // Executar o comando FFmpeg para extrair o áudio
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          error: 'Ocorreu um erro ao extrair o áudio do vídeo.'
        });
      }

      // Remover o arquivo de vídeo original
      fs.unlinkSync(videoPath);

      res.status(200).json({
        message: 'Áudio extraído com sucesso!',
        downloadUrl: `${req.protocol}://${req.get('host')}/download/video_gallery/${audioFileName}`
      });
    });
  };
});

module.exports = video_gallery;
