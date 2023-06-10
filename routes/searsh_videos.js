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
const searsh_videos = require("express").Router();

searsh_videos.get('/searsh-videos', authenticate, async (req, res) => {
    const query = req.query.q;
  
    try {
      const searchResults = await ytsr(query);
      res.status(200).json(searchResults);
    } catch (error) {
      console.error('Ocorreu um erro na pesquisa de vídeos:', error);
      res.status(500).json({ error: 'Erro na pesquisa de vídeos.' });
    }
  });

module.exports = searsh_videos;