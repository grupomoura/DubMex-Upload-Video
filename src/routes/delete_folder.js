//functionality of a route
const authenticate = require("../../auth");
const delete_folder = require("express").Router();
const fs = require('fs');
const path = require('path');

// Função para deletar uma pasta e suas subpastas
function deletarPastaRecursivo(directory) {
    if (fs.existsSync(directory)) {
      fs.readdirSync(directory).forEach((file) => {
        const filePath = path.join(directory, file);
        if (fs.lstatSync(filePath).isDirectory()) {
          deletarPastaRecursivo(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      });
      fs.rmdirSync(directory);
    }
  }
  
  // Rota para deletar uma pasta
  delete_folder.delete('/delete-folder', authenticate, (req, res) => { 
    const pastaPath = req.body.path; // O caminho da pasta a ser deletada é fornecido no corpo da requisição
    console.log(pastaPath)
    if (!pastaPath) {
      return res.status(400).json({
        error: 'O campo "path" é obrigatório.'
      });
    }
    deletarPastaRecursivo(pastaPath);
  
    res.status(200).json({
      message: 'Pasta deletada com sucesso!'
    });
  });

  

module.exports = delete_folder;