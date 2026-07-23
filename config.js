require('dotenv').config();

const REQUIRED_ENV_VARS = ['OPENROUTER_API_KEY'];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
}

module.exports = {
  validateEnv,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
};
