//routing for local development server (devServer.js)

const routes = require("express").Router();
const path = require('path');
const fs = require('fs');

const audio = require("./audio");
const audio_gallery = require("./audio_gallery");
const audio_list = require("./audio_list");
const channel_audio = require("./channel_audio");
const playlist_audio = require("./playlist_audio");
const video = require("./video");
const video_list = require("./video_list");
const channel_video = require("./channel_video");
const playlist_video = require("./playlist_video");
const searsh_videos = require("./searsh_videos");
const delete_folder = require("./delete_folder");
const list_folders = require("./list_folders");

routes.get('/', (req, res) => {
  const filePath = path.join(__dirname, '../../', 'public', 'index.html');

  fs.readFile(filePath, 'utf-8', (err, content) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erro ao carregar a página.');
    }

    res.send(content);
  });
});

routes.get('/painel', (req, res) => {
  const filePath = path.join(__dirname, '../../', 'public', 'painel.html');

  fs.readFile(filePath, 'utf-8', (err, content) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Erro ao carregar a página.');
    }

    res.send(content);
  });
});

routes.use("/", audio);
routes.use("/", audio_gallery);
routes.use("/", audio_list);
routes.use("/", playlist_audio);
routes.use("/", channel_audio);
routes.use("/", video);
routes.use("/", video_list);
routes.use("/", playlist_video);
routes.use("/", channel_video);
routes.use("/", searsh_videos);
routes.use("/", delete_folder);
routes.use("/", list_folders);

module.exports = routes;