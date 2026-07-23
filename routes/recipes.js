const express = require('express');
const { generateRecipes } = require('../services/openrouter');

const router = express.Router();

router.post('/recommend', async (req, res) => {
  const { ingredients } = req.body;
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'ingredients (string[])가 필요합니다' });
  }

  try {
    const recommendations = await generateRecipes(ingredients);
    res.json({ recommendations });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
