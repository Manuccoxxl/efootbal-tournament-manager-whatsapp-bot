const express = require("express");
const config = require("../config");
const routes = require("./routes");

function startDashboard() {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use("/", routes);

  const { PORT, HOST } = config.DASHBOARD;
  app.listen(PORT, HOST, () => {
    console.log(`🖥️  Dashboard running at http://${HOST}:${PORT}`);
    if (HOST !== "127.0.0.1" && HOST !== "localhost") {
      console.warn(
        "⚠️  Dashboard has no login and is bound beyond localhost — anyone who can reach this " +
          "address can view and edit bot data. Put it behind your own auth/reverse proxy."
      );
    }
  });

  return app;
}

module.exports = { startDashboard };
