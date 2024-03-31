const express = require("express");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");

const app = express();

// Load environment variables
dotenv.config();

//Use helmet for content security policy
app.use(helmet());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "build")));
// Set up Content Security Policy
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", process.env.BACKEND_URL],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", process.env.BACKEND_URL],
    },
  })
);
console.log(process.env.BACKEND_URL);
//Forward requests to react app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
