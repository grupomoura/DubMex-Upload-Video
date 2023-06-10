const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const app = express();


const path = require('path');
const apiKey = require('./config');

const API_KEY = apiKey;

// Middleware de autenticação
const authenticate = (req, res, next) => {
  const apiKey = req.headers['api-key'];

  if (apiKey && apiKey === API_KEY) {
    // A autenticação é bem-sucedida, continua para a próxima rota
    next();
  } else {
    // A chave de API está ausente ou é inválida
    res.status(401).json({ error: 'Acesso não autorizado.' });
  }
};

// Função para criar diretórios recursivamente
function createDirectory(path) {
  const directories = path.split('/');
  let currentDirectory = '';
  for (let i = 0; i < directories.length; i++) {
    currentDirectory += directories[i] + '/';
    if (!fs.existsSync(currentDirectory)) {
      fs.mkdirSync(currentDirectory);
    }
  }
}

// Função para obter o diretório de saída para o canal
function getOutputDirectory(channelName) {
  const downloadsDirectory = path.join(__dirname, 'downloads');
  const channelDirectory = path.join(downloadsDirectory, channelName);

  return channelDirectory;
}

// Função para obter o formato com a resolução mais próxima
function getBestFormat(formats, targetResolution) {
  const resolutions = formats
    .filter(format => format.hasVideo && format.qualityLabel)
    .map(format => format.qualityLabel);

  const closestResolution = findClosestResolution(resolutions, targetResolution);

  if (closestResolution) {
    return formats.find(format => format.qualityLabel === closestResolution);
  }

  return null;
}

// Função para encontrar a resolução mais próxima
function findClosestResolution(resolutions, targetResolution) {
  const resolutionsMap = {
    '144p': 144,
    '240p': 240,
    '360p': 360,
    '480p': 480,
    '720p': 720,
    '1080p': 1080,
    '1440p': 1440,
    '2160p': 2160
  };

  const targetResolutionValue = resolutionsMap[targetResolution];

  let closestResolution = null;
  let closestDistance = Infinity;

  for (const resolution of resolutions) {
    const resolutionValue = resolutionsMap[resolution];
    const distance = Math.abs(targetResolutionValue - resolutionValue);

    if (distance < closestDistance) {
      closestResolution = resolution;
      closestDistance = distance;
    }
  }

  return closestResolution;
}

// Define o diretório onde o arquivo index.html está localizado
const publicDirectoryPath = path.join(__dirname, 'public');

// Define a rota para a página de boas-vindas
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'index.html'));
});

// Requisições de áudio
app.get('/download/audio', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;
  const info = await ytdl.getInfo(youtubeUrl);
  const format = ytdl.filterFormats(info.formats, 'audioonly').find(format => format.audioBitrate === 128);

  if (!format) {
    return res.status(400).json({
      error: 'Não foi possível encontrar um formato de áudio com 128kbps.'
    });
  }

  const fileName = `${info.videoDetails.videoId}.mp3`;
  
  const filePath = path.join(__dirname, `./downloads/audio/${fileName}`);
  const directoryPath = path.dirname(filePath);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    return res.status(200).json({
      message: 'O áudio já foi baixado.',
      downloadUrl: `${req.protocol}://${req.get('host')}/download/audio/${fileName}`
    });
  }

  const writeStream = fs.createWriteStream(filePath);
  const videoStream = ytdl(youtubeUrl, { format });

  videoStream.on('error', (error) => {
    console.error(error);
    res.status(500).json({
      error: 'Ocorreu um erro ao baixar o áudio.'
    });
  });

  videoStream.pipe(writeStream);

  writeStream.on('finish', () => {
    res.status(200).json({
      message: 'Áudio baixado com sucesso!',
      downloadUrl: `${req.protocol}://${req.get('host')}/download/audio/${fileName}`
    });
  });
});

app.get('/download/audio-list', authenticate, async (req, res) => {
  const youtubeUrls = req.query.urls.split(',');

  if (!youtubeUrls || youtubeUrls.length === 0) {
    return res.status(400).json({
      error: 'Nenhum link de vídeo fornecido.'
    });
  }

  const downloadUrls = [];

  for (const youtubeUrl of youtubeUrls) {
    const info = await ytdl.getInfo(youtubeUrl);
    const format = ytdl.filterFormats(info.formats, 'audioonly').find(format => format.audioBitrate === 128);

    if (!format) {
      return res.status(400).json({
        error: `Não foi possível encontrar um formato de áudio com 128kbps para o vídeo: ${youtubeUrl}`
      });
    }

    const fileName = `${info.videoDetails.videoId}.mp3`;
    const filePath = path.join(__dirname, `./downloads/audio-list/${fileName}`);
    const directoryPath = path.dirname(filePath);

    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      downloadUrls.push(`${req.protocol}://${req.get('host')}/download/audio-list/${fileName}`);
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

    videoStream.pipe(writeStream);

    writeStream.on('finish', () => {
      downloadUrls.push(`${req.protocol}://${req.get('host')}/download/audio-list/${fileName}`);
      if (downloadUrls.length === youtubeUrls.length) {
        res.status(200).json({
          message: 'Áudios baixados com sucesso!',
          downloadUrls
        });
      }
    });
  }
});

app.get('/download/playlist-audio', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;

  try {
    const playlist = await ytpl(youtubeUrl);

    const channelName = playlist.items[0].author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const channelDir = `./downloads/playlist-audio/${sanitizedChannelName}`;

    if (!fs.existsSync(channelDir)) {
      fs.mkdirSync(channelDir, { recursive: true });
    }

    const downloadPromises = playlist.items.map(async (item) => {
      const videoId = ytdl.getVideoID(item.url);
      const fileName = `${videoId}.mp3`;
      const filePath = `${channelDir}/${fileName}`;

      if (fs.existsSync(filePath)) {
        console.log(`O áudio "${videoId}" já foi baixado.`);
        return filePath;
      }

      const info = await ytdl.getInfo(item.url);
      const format = ytdl.filterFormats(info.formats, 'audioonly').find(format => format.audioBitrate === 128);

      if (!format) {
        throw new Error(`Não foi possível encontrar um formato de áudio com 128kbps para a música "${info.videoDetails.title}".`);
      }

      const writeStream = fs.createWriteStream(filePath);
      const videoStream = ytdl(item.url, { format });

      videoStream.on('error', (error) => {
        console.error(`Ocorreu um erro ao baixar o áudio "${videoId}":`, error);
      });

      videoStream.pipe(writeStream);

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          console.log(`Áudio "${videoId}" baixado com sucesso!`);
          resolve(filePath);
        });

        writeStream.on('error', (error) => {
          console.error(`Ocorreu um erro ao salvar o áudio "${videoId}":`, error);
          reject(error);
        });
      });
    });

    const downloadedFiles = await Promise.all(downloadPromises);
    const existingFiles = downloadedFiles.filter(filePath => filePath);
    const links = existingFiles.map(filePath => {
      const fileName = filePath.split('/').pop();
      return `${req.protocol}://${req.get('host')}/download/playlist/${sanitizedChannelName}/${fileName}`;
    });

    res.status(200).json({
      message: `Áudios da playlist "${playlist.title}" baixados com sucesso!`,
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

app.get('/download/channel-audio', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;

  try {
    const channel = await ytpl(youtubeUrl);

    const channelName = channel.author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const channelDir = `./downloads/channel-audio/${sanitizedChannelName}`;

    if (!fs.existsSync(channelDir)) {
      fs.mkdirSync(channelDir, { recursive: true });
    }

    const videoUrls = channel.items.map(item => item.shortUrl);

    const downloadPromises = videoUrls.map(async (videoUrl) => {
      const videoId = ytdl.getVideoID(videoUrl);
      const fileName = `${videoId}.mp3`;
      const filePath = `${channelDir}/${fileName}`;

      if (fs.existsSync(filePath)) {
        console.log(`O áudio "${videoId}" já foi baixado.`);
        return filePath;
      }

      const info = await ytdl.getInfo(videoUrl);
      const format = ytdl.filterFormats(info.formats, 'audioonly').find(format => format.audioBitrate === 128);

      if (!format) {
        throw new Error(`Não foi possível encontrar um formato de áudio com 128kbps para o vídeo "${info.videoDetails.title}".`);
      }

      const writeStream = fs.createWriteStream(filePath);
      const videoStream = ytdl(videoUrl, { format });

      videoStream.on('error', (error) => {
        console.error(`Ocorreu um erro ao baixar o áudio "${videoId}":`, error);
      });

      videoStream.pipe(writeStream);

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          console.log(`Áudio "${videoId}" baixado com sucesso!`);
          resolve(filePath);
        });

        writeStream.on('error', (error) => {
          console.error(`Ocorreu um erro ao salvar o áudio "${videoId}":`, error);
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
      message: `Áudios do canal "${sanitizedChannelName}" baixados com sucesso!`,
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

//Listar áudios gerados
app.get('/downloaded/playlist/:channel', authenticate, (req, res) => {
  const channel = req.params.channel;
  const directoryPath = `./downloads/playlist/${channel}`;

  fs.readdir(directoryPath, (error, files) => {
    if (error) {
      console.error(error);
      res.status(500).json({
        error: 'Ocorreu um erro ao obter a lista de arquivos.'
      });
    } else {
      const fileLinks = files.map(file => ({
        fileName: file,
        downloadUrl: `${req.protocol}://${req.get('host')}/downloaded/playlist/${channel}/${file}`
      }));

      res.status(200).json(fileLinks);
    }
  });
});

app.get('/downloaded/channel/:channel', authenticate, (req, res) => {
  const channel = req.params.channel;
  const directoryPath = `./downloads/channel/${channel}`;

  fs.readdir(directoryPath, (error, files) => {
    if (error) {
      console.error(error);
      res.status(500).json({
        error: 'Ocorreu um erro ao obter a lista de arquivos.'
      });
    } else {
      const fileLinks = files.map(file => ({
        fileName: file,
        downloadUrl: `${req.protocol}://${req.get('host')}/downloaded/channel/${channel}/${file}`
      }));

      res.status(200).json(fileLinks);
    }
  });
});

app.get('/searsh-videos', authenticate, async (req, res) => {
  const query = req.query.q;

  try {
    const searchResults = await ytsr(query);
    res.status(200).json(searchResults);
  } catch (error) {
    console.error('Ocorreu um erro na pesquisa de vídeos:', error);
    res.status(500).json({ error: 'Erro na pesquisa de vídeos.' });
  }
});

// Requisições de vídeo
app.get('/video/resolutions', authenticate, async (req, res) => {
  const videoUrl = req.query.url;

  try {
    const videoInfo = await ytdl.getInfo(videoUrl);
    const resolutions = videoInfo.formats
      .filter(format => format.hasVideo && format.hasAudio)
      .map(format => {
        return {
          itag: format.itag,
          resolution: format.height,
          extension: format.container,
        };
      });
    
    res.status(200).json(resolutions);
  } catch (error) {
    console.error('Ocorreu um erro ao obter as opções de resolução:', error);
    res.status(500).json({ error: 'Erro ao obter as opções de resolução.' });
  }
});

app.get('/download/video', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;
  const resolution = req.query.resolution || '720p';
  const info = await ytdl.getInfo(youtubeUrl);
  const format = ytdl.filterFormats(info.formats, 'videoonly').find(format => format.qualityLabel.includes(resolution));

  if (!format) {
    return res.status(400).json({
      error: `Não foi possível encontrar um formato de vídeo com a resolução ${resolution}.`
    });
  }

  const fileName = `${info.videoDetails.videoId}.mp4`;
  const filePath = path.join(__dirname, `./downloads/video/${fileName}`);
  const directoryPath = path.dirname(filePath);

  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  if (fs.existsSync(filePath)) {
    return res.status(200).json({
      message: 'O vídeo já foi baixado.',
      downloadUrl: `${req.protocol}://${req.get('host')}/download/video/${fileName}`
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

app.get('/download/video-list', authenticate, async (req, res) => {
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
    const filePath = path.join(__dirname, `./downloads/video-list/${fileName}`);
    const directoryPath = path.dirname(filePath);

    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      downloadUrls.push(`${req.protocol}://${req.get('host')}/download/video-list/${fileName}`);
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

app.get('/download/playlist-video', authenticate, async (req, res) => {
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
      return `${req.protocol}://${req.get('host')}/download/playlist/${sanitizedChannelName}/${fileName}`;
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

app.get('/download/channel-video', authenticate, async (req, res) => {
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
      const format = ytdl.filterFormats(info.formats, 'videoonly').find(format => format.qualityLabel.includes(resolution));

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

app.use('/download', express.static('downloads'));

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
