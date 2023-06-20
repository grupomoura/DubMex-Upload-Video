const authenticate = require("../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { resolveTxt } = require("dns/promises");

const app = express();
app.use('/download', express.static('downloads'));
const channel_video = require("express").Router();

const privateKey = fs.readFileSync('google-private-key.pem', 'utf8'); // Substitua pelo caminho para o arquivo da chave privada
const clientEmail = 'polyvoices@my-n8n-project-384902.iam.gserviceaccount.com'; // Substitua pelo seu e-mail de cliente

const jwtClient = new google.auth.JWT(clientEmail, null, privateKey, ['https://www.googleapis.com/auth/drive']);

const createFolder = async (folderName, parentFolderId) => {
  const drive = google.drive({ version: 'v3', auth: jwtClient });

  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId]
  };

  const response = await drive.files.create({
    resource: folderMetadata,
    fields: 'id'
  });

  return response.data.id;
};

const uploadFileToDrive = async (filePath, fileName, parentFolderId) => {
  const drive = google.drive({ version: 'v3', auth: jwtClient });

  const fileMetadata = {
    name: fileName,
    parents: [parentFolderId]
  };

  const media = {
    mimeType: 'video/mp4',
    body: fs.createReadStream(filePath)
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  });

  return response.data.id;
};

const getFolderLink = async (folderId) => {
  const drive = google.drive({ version: 'v3', auth: jwtClient });

  const response = await drive.files.get({
    fileId: folderId,
    fields: 'webViewLink'
  });

  return response.data.webViewLink;
};

const authorize = async () => {
  await jwtClient.authorize();
};

const doesFileExistInDrive = async (parentFolderId, fileName) => {
  const drive = google.drive({ version: 'v3', auth: jwtClient });
  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${fileName}' and trashed = false`,
    fields: 'files(id)'
  });

  return response.data.files.length > 0;
};

const doesFolderExistInDrive = async (parentFolderId, folderName) => {
  const drive = google.drive({ version: 'v3', auth: jwtClient });
  const response = await drive.files.list({
    q: `name = 'channel_video' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)'
  });

  return response.data.files.length > 0;
};

const doesChannelFolderExistInDrive = async (parentFolderId, channelName) => {
  const drive = google.drive({ version: 'v3', auth: jwtClient });

  const response = await drive.files.list({
    q: `name = '${channelName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)'
  });

  return response.data.files.length > 0;
};

channel_video.get('/download/channel-video', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;

  const channelUrls = await ytpl(youtubeUrl);
  const videos = channelUrls.items;

  const basePath = path.join(__dirname, '../downloads/channel-video');
  const endpointFolderName = req.baseUrl.substring(1);
  const endpointFolderPath = path.join(basePath, endpointFolderName);

  if (!fs.existsSync(endpointFolderPath)) {
    fs.mkdirSync(endpointFolderPath, { recursive: true });
  }

  let totalTime = 0;

  for (const video of videos) {
    const videoUrl = video.shortUrl;

    if (!ytdl.validateURL(videoUrl)) {
      console.error(`Link inválido: ${videoUrl}`);
      continue;
    }

    const info = await ytdl.getInfo(videoUrl);
    let format = ytdl.filterFormats(info.formats, 'videoandaudio').find(format => format.qualityLabel === 720);

    if (!format) {
      format = ytdl.filterFormats(info.formats, 'videoandaudio').find(format => format.height);
      if (!format) {
        console.error(`Não foi possível encontrar um formato de áudio com 64kbps ou 128kbps para o vídeo: ${videoUrl}`);
        continue;
      }
    }
    console.log(formats)
    // const selectedFormat = selectVideoFormat(formats);

    if (!selectedFormat) {
      console.error(`Não foi possível encontrar um formato de vídeo adequado para o vídeo: ${videoUrl}`);
      continue;
    }

    const videoTitle = info.videoDetails.title.substring(0, 20).replace(/[^\w\s]/gi, '');
    const fileName = `${videoTitle}_${info.videoDetails.videoId}.mp4`;
    const channelName = info.videoDetails.author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const channelPath = path.join(endpointFolderPath, sanitizedChannelName);
    const filePath = path.join(channelPath, fileName);

    if (!fs.existsSync(channelPath)) {
      fs.mkdirSync(channelPath, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      console.log(`O vídeo já foi baixado: ${videoUrl}`);
      continue;
    }

    const writeStream = fs.createWriteStream(filePath);
    const videoStream = ytdl(videoUrl, { format: selectedFormat });
    let startTime = Date.now();

    videoStream.on('error', (error) => {
      console.error(`Ocorreu um erro ao baixar o vídeo: ${videoUrl}`);
      console.error(error);
    });

    videoStream.pipe(writeStream);

    await new Promise((resolve, reject) => {
      videoStream.on('end', resolve);
      videoStream.on('error', reject);
    });

    let endTime = Date.now();
    let videoTime = (endTime - startTime) / 1000;
    totalTime += videoTime;

    await authorize();

    const endpointFolderId = '1uYZw762ZML0WmSz6IiLtm6m793_7bYaB';

    let channelFolderId;
    if (!(await doesFolderExistInDrive(endpointFolderId, 'channel-video'))) {
      channelFolderId = await createFolder('channel-video', endpointFolderId);
    } else {
      const drive = google.drive({ version: 'v3', auth: jwtClient });
      const response = await drive.files.list({
        q: `name = 'channel-video' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${endpointFolderId}' in parents`,
        fields: 'files(id)'
      });
      channelFolderId = response.data.files[0].id;
    }

    let channelSubFolderId;
    if (!(await doesChannelFolderExistInDrive(channelFolderId, sanitizedChannelName))) {
      channelSubFolderId = await createFolder(sanitizedChannelName, channelFolderId);
    } else {
      const drive = google.drive({ version: 'v3', auth: jwtClient });
      const response = await drive.files.list({
        q: `name = '${sanitizedChannelName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${channelFolderId}' in parents`,
        fields: 'files(id)'
      });
      channelSubFolderId = response.data.files[0].id;
    }

    if (await doesFileExistInDrive(channelSubFolderId, fileName)) {
      console.log(`O vídeo já existe no Google Drive: ${videoUrl}`);
      continue;
    }

    const fileId = await uploadFileToDrive(filePath, fileName, channelSubFolderId);

    const fileLink = await getFolderLink(channelSubFolderId);

    console.log(`Vídeo baixado e enviado para o Google Drive: ${videoUrl}`);
    console.log(`Link do arquivo: ${fileLink}`);
  }

  console.log(`Tempo total de download: ${totalTime.toFixed(2)} segundos`);

  const endpointFolderId = '1uYZw762ZML0WmSz6IiLtm6m793_7bYaB';
  const folderLink = await getFolderLink(endpointFolderId);

  res.status(200).json({
    message: 'Todos os vídeos foram baixados e enviados para o Google Drive com sucesso!',
    downloadUrl: folderLink,
    totalTime: totalTime.toFixed(2)
  });
});

module.exports = channel_video;
