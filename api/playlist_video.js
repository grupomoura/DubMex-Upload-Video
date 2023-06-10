const app = require("../app");
const route = require("../routes/playlist_video");

app.use("/", route);

module.exports = app;