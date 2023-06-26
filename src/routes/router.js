//routing for local development server (devServer.js)

const routes = require("express").Router();
const path = require('path');
const fs = require('fs');

const audio_upload_gallery = require("./audio_upload_gallery");
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

routes.use("/", audio_upload_gallery);
routes.use("/", delete_folder);
routes.use("/", list_folders);

module.exports = routes;