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

app.get('/download/audio-list/', authenticate, async (req, res) => {
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

app.get('/download/playlist', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;

  try {
    const playlist = await ytpl(youtubeUrl);

    const channelName = playlist.items[0].author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const channelDir = `./downloads/playlist/${sanitizedChannelName}`;

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

app.get('/download/channel', authenticate, async (req, res) => {
  const youtubeUrl = req.query.url;

  try {
    const channel = await ytpl(youtubeUrl);

    const channelName = channel.author.name;
    const sanitizedChannelName = channelName.replace(/[^\w\s]/gi, '');
    const channelDir = `./downloads/channel/${sanitizedChannelName}`;

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

// Rota para baixar um vídeo
app.get('/video/download', async (req, res) => {
  const videoUrl = req.query.url;
  const resolution = req.query.resolution || '720p';
  try {
    const info = await ytdl.getInfo(videoUrl);
    const formats = ytdl.filterFormats(info.formats, { quality: resolution });

    if (formats.length === 0) {
      const closestFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });
      if (closestFormat) {
        console.log(`A resolução especificada não está disponível para este vídeo. Baixando na resolução mais próxima (${closestFormat.quality})...`);
        const videoId = info.videoDetails.videoId;
        const outputPath = `downloads/${info.videoDetails.ownerChannelName}/${videoId}.mp4`;
        createDirectory(outputPath); // Criar diretórios recursivamente
        await ytdl(videoUrl, { format: closestFormat })
          .pipe(fs.createWriteStream(outputPath));
        res.json({ downloadLink: `${req.protocol}://${req.get('host')}/api/video/file/${info.videoDetails.ownerChannelName}/${videoId}` });
      } else {
        res.status(400).json({ error: 'Não foi possível encontrar um formato de vídeo disponível para download.' });
      }
    } else {
      console.log(`Baixando vídeo na resolução ${resolution}...`);
      const videoId = info.videoDetails.videoId;
      const outputPath = `downloads/${info.videoDetails.ownerChannelName}/${videoId}.mp4`;
      createDirectory(outputPath); // Criar diretórios recursivamente
      await ytdl(videoUrl, { format: formats[0] })
        .pipe(fs.createWriteStream(outputPath));
      res.json({ downloadLink: `${req.protocol}://${req.get('host')}/video/${info.videoDetails.ownerChannelName}/${videoId}` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Ocorreu um erro ao baixar o vídeo.' });
  }
});

// Função para obter o caminho de saída do arquivo
function getOutputPath(channelName, videoId) {
  const outputPath = `downloads/video/${channelName}/${videoId}.mp4`;
  return outputPath;
}

// Rota para baixar um vídeo
app.get('/video/download', async (req, res) => {
  const videoUrl = req.query.url;
  const resolution = req.query.resolution || '720p';
  try {
    const info = await ytdl.getInfo(videoUrl);
    const formats = ytdl.filterFormats(info.formats, { quality: resolution });

    if (formats.length === 0) {
      const closestFormat = ytdl.chooseFormat(info.formats, { quality: 'highest' });
      if (closestFormat) {
        console.log(`A resolução especificada não está disponível para este vídeo. Baixando na resolução mais próxima (${closestFormat.quality})...`);
        const videoId = info.videoDetails.videoId;
        const outputPath = getOutputPath(info.videoDetails.ownerChannelName, videoId);
        createDirectory(outputPath); // Criar diretórios recursivamente
        await ytdl(videoUrl, { format: closestFormat })
          .pipe(fs.createWriteStream(outputPath));
        res.json({ downloadLink: `${req.protocol}://${req.get('host')}/video/${info.videoDetails.ownerChannelName}/${videoId}` });
      } else {
        res.status(400).json({ error: 'Não foi possível encontrar um formato de vídeo disponível para download.' });
      }
    } else {
      console.log(`Baixando vídeo na resolução ${resolution}...`);
      const videoId = info.videoDetails.videoId;
      const outputPath = getOutputPath(info.videoDetails.ownerChannelName, videoId);
      createDirectory(outputPath); // Criar diretórios recursivamente
      await ytdl(videoUrl, { format: formats[0] })
        .pipe(fs.createWriteStream(outputPath));
      res.json({ downloadLink: `${req.protocol}://${req.get('host')}/video/${info.videoDetails.ownerChannelName}/${videoId}` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Ocorreu um erro ao baixar o vídeo.' });
  }
});

app.use('/download', express.static('downloads'));

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
