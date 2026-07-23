const express = require('express');
const vocabulary = require('../data/ingredientVocabulary');
const { scoreIngredientAgainstImage, mapWithConcurrency } = require('../services/openrouter');

const router = express.Router();

const TOP_N = 5;
const CONCURRENCY = 8;

router.post('/recognize', async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  try {
    const scored = await mapWithConcurrency(vocabulary, CONCURRENCY, async (ingredient) => ({
      name: ingredient.name,
      category: ingredient.category,
      score: await scoreIngredientAgainstImage(ingredient.name, imageUrl),
    }));

    const recognizedIngredients = scored.sort((a, b) => b.score - a.score).slice(0, TOP_N);

    res.json({ recognizedIngredients });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
