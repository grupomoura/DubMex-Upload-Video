const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { exec } = require("child_process");
const { google } = require("googleapis");

const app = express();
app.use("/download", express.static("downloads"));
const video_gallery = require("express").Router();
const parentFolderId = ["1yys0zzt9DnRthFpecEy66Sk1wjwsZ5hI"];

const privateKey = fs.readFileSync("google-private-key.pem", "utf8");
const clientEmail = "polyvoices@my-n8n-project-384902.iam.gserviceaccount.com";

video_gallery.get("/download/video-gallery", async (req, res) => {
  const videoBase64 = req.query.video;

  // Autenticar com as credenciais do Google Drive
  const jwtClient = new google.auth.JWT(clientEmail, null, privateKey, [
    "https://www.googleapis.com/auth/drive",
  ]);
  await jwtClient.authorize();
  const drive = google.drive({ version: "v3", auth: jwtClient });

  // Verificar se o vídeo em base64 foi fornecido
  if (!videoBase64) {
    return res.status(400).json({
      error: "O vídeo em base64 é obrigatório.",
    });
  }

  // Converter o vídeo em base64 para um arquivo de vídeo temporário
  const videoData = Buffer.from(videoBase64, "base64");
  const videoFileName = "video.mp4";
  const videoFilePath = path.join(__dirname, "../temp", videoFileName);

  fs.writeFileSync(videoFilePath, videoData);

  const driveUploadVerify = async () => {
    // Definir o caminho e nome do arquivo de áudio com base no nome do vídeo
    const audioFileName = videoFileName.replace(/\.[^/.]+$/, "") + ".mp3";

    // Verificar se o arquivo já existe no Google Drive
    const fileList = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${audioFileName}' and trashed = false`,
      spaces: "drive",
      fields: "files(id, name)",
      pageSize: 1,
    });

    if (fileList.data.files.length > 0) {
      // O arquivo já existe no Google Drive
      const fileId = fileList.data.files[0].id;
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

      return res.status(200).json({
        message: "O áudio já existe no Google Drive.",
        downloadUrl: downloadUrl,
      });
    }
  };

  // Função para extrair o áudio do vídeo
  const extractAudio = async (videoPath, videoFileName) => {
    try {
      const audioFileName = videoFileName.replace(/\.[^/.]+$/, "") + ".mp3";
      const audioFilePath = path.join(__dirname, "../temp", audioFileName);

      // Verificar se o arquivo de áudio já foi baixado
      if (fs.existsSync(audioFilePath)) {
        // Remover o arquivo de vídeo original
        fs.unlinkSync(videoPath);

        return res.status(200).json({
          message: "O áudio já foi baixado.",
          downloadUrl: `${req.protocol}://${req.get(
            "host"
          )}/download/video_gallery/${audioFileName}`,
        });
      }

      // Comando para extrair o áudio usando FFmpeg
      const ffmpegCommand = `ffmpeg -i "${videoPath}" -b:a 64k -vn "${audioFilePath}"`;

      // Executar o comando FFmpeg para extrair o áudio
      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(error);
          return res.status(500).json({
            error: "Ocorreu um erro ao extrair o áudio do vídeo.",
          });
        }

        // Remover o arquivo de vídeo original
        fs.unlinkSync(videoPath);

        // Enviar o áudio para o Google Drive
        uploadAudioToDrive(audioFilePath, audioFileName)
          .then((driveFileId) => {
            res.status(200).json({
              message: "Áudio extraído com sucesso!",
              driveFileId: driveFileId,
              downloadUrl: `https://drive.google.com/uc?export=download&id=${driveFileId}`,
            });
          })
          .catch((error) => {
            console.error(error);
            return res.status(500).json({
              error: "Ocorreu um erro ao enviar o áudio para o Google Drive.",
            });
          });
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Ocorreu um erro ao processar o vídeo.",
      });
    }
  };

  if (await driveUploadVerify()) {
    return;
  } else {
    // Fazer o download do vídeo para o servidor
    try {
      extractAudio(videoFilePath, videoFileName);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Ocorreu um erro ao extrair o áudio do vídeo.",
      });
    }
  }
});

// Função para autenticar e enviar o áudio para o Google Drive
const uploadAudioToDrive = async (audioFilePath, audioFileName) => {
  try {
    // Verificar se o arquivo já existe no Google Drive
    const fileList = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${audioFileName}' and trashed = false`,
      spaces: "drive",
      fields: "files(id, name)",
      pageSize: 1,
    });

    if (fileList.data.files.length > 0) {
      // O arquivo já existe no Google Drive
      return Promise.reject(new Error("O arquivo já existe no Google Drive."));
    }

    // Autenticar com as credenciais do Google Drive
    const jwtClient = new google.auth.JWT(clientEmail, null, privateKey, [
      "https://www.googleapis.com/auth/drive",
    ]);
    await jwtClient.authorize();
    const drive = google.drive({ version: "v3", auth: jwtClient });

    // Enviar o áudio para o Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: audioFileName,
        parents: parentFolderId,
      },
      media: {
        mimeType: "audio/mp3",
        body: fs.createReadStream(audioFilePath),
      },
    });

    // Excluir o arquivo .mp3 local
    fs.unlinkSync(audioFilePath);

    return response.data.id;
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = video_gallery;