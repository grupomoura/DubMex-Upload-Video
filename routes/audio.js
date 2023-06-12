// functionality of a route
const authenticate = require("../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
app.use('/download', express.static('downloads'));
const audio = require("express").Router();

// Configurar as credenciais do Google Drive
const credentials = 'polyvoices-n8n-project-384902-0f8caa90260f.json';
const token = 'ya29.c.b0Aaekm1Iv_FT_o0egT8evkdONm4Xoc2aaYUk4B1ETdn4mdfpxhtQRkHD5dBa5BLUu7Kkgca5sKcNpxY1UQ7UkmpFj5MFNpXHiGOUlknOEb1SLK2tnRj3NVTc1ha98PGiKa9pFyT1OkH1-T3mZpKEQh01NxvqHmqv9vgPjuPB19KJLNA8QBvk8_f-W8TKLnun9vOb3JZXeJTe5DhG97VWAxHm-1Kywk8ZWJRln9B2r6tSLmrznmCYlL-BtwL0a0KH3O3qoY0gT9HRFdWbJofKXrarJUFJ80pruI8v09_5Y87KtNKf4duug4ApunotMESTtkTHEgiteE337C-Fbu3BtghsagkMtRO8xmgxSU2ZUQj8zYhFhcmbx9jb9QQJkpwcRUr1Ud2zBnioxy6Sd5c9ulFrfaQrhnY67ve2gvwqFaI675V3Xddm0fIrsJOkW0dj4ko31rqXeQgxhXZ8XhkmuY7uWsFBbZw2v2rf73c2h7R9WkbOOlrSOV9sdFlRj0mIOed32wpbcwU6ZFz8o-Us7-manjpMV8h0feek-_yerF54UF8vjMZtijxQ4xhfVI50jpvZSWZ243k_V-k9ckz9VW7Zu25cg7WnOViWvltOxh67qf9bR-kmVdsnMSgoYfku7wIIf-26VzshbY1ZO1hIsVj1kVgvmsXk8JJFhud61eouBjfqygO0lsfa5w51MO1-wrIfxarjWobZe7Ql8oFOwr22kh0d-uIfJSoy00v-UlIg0-z8v341UQs_a_BV8-xuVc9Q9Jionb0JyvOZX7XVtmiZe1li-B1lofwrs0c57Vrr7pSbpIpxg974JzS2gnJv-jg243hmSJezYtlqoeto49-QdprtwIXyeSne4Of-57lBzU-w_cxYY5dnb3ef5kOb8O_zRZ5dFStrrhpSOgtz_YsvfZxU1QciOv8ZV7rMb9_ymXivriXj7wawj0Bhmmqj-z_x7fvqtWMv2p0jJrqnMiMXUrXYqdQJ5hdXWJgpVlldU5z2oyJ3pj91';

// Crie um novo cliente OAuth2 com as credenciais do Google Drive
const oAuth2Client = new google.auth.OAuth2();
oAuth2Client.setCredentials(token);

// Configurar a instância do Google Drive
const drive = google.drive({ version: 'v3', auth: oAuth2Client });

// Função para fazer o upload do arquivo para o Google Drive
const uploadFileToDrive = async (filePath, fileName) => {
  const fileMetadata = {
    name: fileName,
    parents: ['1uYZw762ZML0WmSz6IiLtm6m793_7bYaB'] // ID da pasta de destino no Google Drive
  };

  const media = {
    mimeType: 'audio/mp3',
    body: fs.createReadStream(filePath)
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  });

  return response.data.id;
};

// Requisições de áudio
audio.get('/download/audio', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;
  const info = await ytdl.getInfo(youtubeUrl);
  const format = ytdl.filterFormats(info.formats, 'audioonly').find(format => format.audioBitrate === 128);

  if (!format) {
    return res.status(400).json({
      error: 'Não foi possível encontrar um formato de áudio com 128kbps.'
    });
  }
  const fileName = `${info.videoDetails.videoId}.mp3`;
  const channelName = info.videoDetails.author.name;
  const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
  const filePath = path.join(__dirname, `../downloads/audio/${sanitizedChannelName}/${fileName}`);
  const directoryPath = path.dirname(filePath);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    return res.status(200).json({
      message: 'O áudio já foi baixado.',
      downloadUrl: `${req.protocol}://${req.get('host')}/download/audio/${sanitizedChannelName}/${fileName}`
    });
  }

  const writeStream = fs.createWriteStream(filePath);
  const videoStream = ytdl(youtubeUrl, { format });
  let startTime = Date.now(); // Início do timer

  videoStream.on('error', (error) => {
    console.error(error);
    res.status(500).json({
      error: 'Ocorreu um erro ao baixar o áudio.'
    });
  });

  videoStream.pipe(writeStream);

  writeStream.on('finish', async () => {
    let endTime = Date.now(); // Fim do timer
    let totalTime = (endTime - startTime) / 1000; // Tempo total em segundos

    // Fazer o upload do arquivo para o Google Drive
    const fileId = await uploadFileToDrive(filePath, fileName);

    res.status(200).json({
      message: 'Áudio baixado e enviado para o Google Drive com sucesso!',
      downloadUrl: `${req.protocol}://${req.get('host')}/download/audio/${sanitizedChannelName}/${fileName}`,
      timer: totalTime, // Tempo de download em segundos
      fileId: fileId // ID do arquivo no Google Drive
    });
  });
});

module.exports = audio;
