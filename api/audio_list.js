const app = require("../app");
const route = require("../routes/audio_list");

app.use("/", route);

module.exports = app;