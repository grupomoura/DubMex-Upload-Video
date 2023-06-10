const app = require("../app");
const route = require("../routes/playlist_audio");

app.use("/", route);

module.exports = app;