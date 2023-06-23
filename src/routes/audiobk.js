//functionality of a route
const authenticate = require("../../auth");
const express = require('express');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const fs = require('fs');
const path = require('path');

const app = express();
app.use('/download', express.static('downloads'));
const audio = require("express").Router();

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

    writeStream.on('finish', () => {
        let endTime = Date.now(); // Fim do timer
        let totalTime = (endTime - startTime) / 1000; // Tempo total em segundos

        res.status(200).json({
            message: 'Áudio baixado com sucesso!',
            downloadUrl: `${req.protocol}://${req.get('host')}/download/audio/${sanitizedChannelName}/${fileName}`,
            timer: totalTime // Tempo de download em segundos
        });
    });
});

module.exports = audio;
