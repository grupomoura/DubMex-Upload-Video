
const authenticate = require("../auth");
const list_folders = require("express").Router();
const path = require('path');
const fs = require('fs');

// Função para listar pastas e subpastas dentro de um diretório
function listarPastasRecursivo(directory) {
    const folders = [];
  
    const files = fs.readdirSync(directory);
    files.forEach((file) => {
      const filePath = path.join(directory, file);
      const isDirectory = fs.statSync(filePath).isDirectory();
      if (isDirectory) {
        folders.push(file);
        const subFolders = listarPastasRecursivo(filePath);
        folders.push(...subFolders.map((subFolder) => path.join(file, subFolder)));
      }
    });
  
    return folders;
  }

// Rota para listar pastas e subpastas dentro da pasta "downloads"
list_folders.get('/list-folders', authenticate, (req, res) => {
    const downloadsDirectory = path.join(__dirname, '../downloads');
    const folders = listarPastasRecursivo(downloadsDirectory);
    res.json({ folders });
  });

  module.exports = list_folders