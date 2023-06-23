const authenticate = require("../../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const app = express();
app.use('/download', express.static('downloads'));
const video_list = require("express").Router();

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
    q: `name = 'video-list' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${parentFolderId}' in parents`,
    fields: 'files(id)'
  });

  return response.data.files.length > 0;
};

const doesChannelFolderExistInDrive = async (parentFolderId, channelName) => {
  const drive = google.drive({ version: 'v3', auth: jwtClient });

  const response = await drive.files.list({
    q: `name = '${channelName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and '${parentFolderId}' in parents`,
    fields: 'files(id)'
  });

  return response.data.files.length > 0;
};

video_list.get('/download/video-list', authenticate, async (req, res) => {
  const youtubeUrls = req.query.urls;

  const videoUrls = youtubeUrls.split(',');

  const folderPromises = [];
  const fileIdPromises = [];

  for (const youtubeUrl of videoUrls) {
    if (!ytdl.validateURL(youtubeUrl)) {
      return res.status(400).json({
        error: 'Link incompatível, por favor verifique e tente novamente.'
      });
    }

    const info = await ytdl.getInfo(youtubeUrl);
    let format = ytdl.filterFormats(info.formats, 'videoandaudio').find(format => format.height === 720);

    if (!format) {
      format = ytdl.filterFormats(info.formats, 'videoandaudio')[0];
      if (!format) {
        return res.status(400).json({
          error: 'Não foi possível encontrar uma resolução de vídeo disponível.'
        });
      }
    }

    const videoTitle = info.videoDetails.title.substring(0, 20).replace(/[^\w\s]/gi, '');
    const fileName = `${videoTitle}_${info.videoDetails.videoId}.mp4`;
    const channelName = info.videoDetails.author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const endpointFolderName = req.baseUrl.substring(1);
    const folderName = `${endpointFolderName}_${info.videoDetails.videoId}`;
    const basePath = path.join(__dirname, '../downloads/video-list');
    const channelPath = path.join(basePath, endpointFolderName, sanitizedChannelName);
    const filePath = path.join(channelPath, fileName);

    if (!fs.existsSync(channelPath)) {
      fs.mkdirSync(channelPath, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      console.log(`O vídeo já foi baixado: ${youtubeUrl}`);
      continue;
    }

    const writeStream = fs.createWriteStream(filePath);
    const videoStream = ytdl(youtubeUrl, { format });
    let startTime = Date.now();

    videoStream.on('error', (error) => {
      console.error(error);
      res.status(500).json({
        error: 'Ocorreu um erro ao baixar o vídeo.'
      });
    });

    videoStream.pipe(writeStream);

    let endTime = Date.now();
    let totalTime = (endTime - startTime) / 1000;

    await authorize();

    const endpointFolderId = '1uYZw762ZML0WmSz6IiLtm6m793_7bYaB';

    let channelFolderId;
    if (!(await doesFolderExistInDrive(endpointFolderId, 'video-list'))) {
      channelFolderId = await createFolder('video-list', endpointFolderId);
    } else {
      const drive = google.drive({ version: 'v3', auth: jwtClient });
      const response = await drive.files.list({
        q: `name = 'video-list' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
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
      // Exclui o arquivo local
      fs.unlinkSync(filePath);

      console.log(`O vídeo já foi baixado e enviado para o Google Drive: ${youtubeUrl}`);
      continue;
    }

    const fileIdPromise = uploadFileToDrive(filePath, fileName, channelSubFolderId);
    fileIdPromises.push(fileIdPromise);

    const folderPromise = getFolderLink(endpointFolderId);
    folderPromises.push(folderPromise);

    // Exclui o arquivo local
    fs.unlinkSync(filePath);

    console.log(`Vídeo baixado e enviado para o Google Drive com sucesso: ${youtubeUrl}`);
  }

  const fileIds = await Promise.all(fileIdPromises);
  const folderLinks = await Promise.all(folderPromises);

  res.status(200).json({
    message: 'Todos os vídeos foram baixados e enviados para o Google Drive com sucesso!',
    downloadUrls: folderLinks,
    fileIds: fileIds,
    totalTime: totalTime
  });
});

module.exports = video_list;
