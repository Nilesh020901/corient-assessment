require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

// Start server on designated port after environment configurations are loaded
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
