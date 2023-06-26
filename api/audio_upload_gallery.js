const app = require("../app");
const route = require("../routes/audio_upload_gallery");

app.use("/", route);

module.exports = app;