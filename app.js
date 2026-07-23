const express = require('express');
const { validateEnv } = require('./config');
const inventoryRouter = require('./routes/inventory');
const recipesRouter = require('./routes/recipes');

validateEnv();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use('/api/inventory', inventoryRouter);
app.use('/api/recipes', recipesRouter);

module.exports = app;
