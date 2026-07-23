const express = require('express');
const { recognizeIngredients } = require('../services/openrouter');

const router = express.Router();

router.post('/recognize', async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  try {
    const recognizedIngredients = await recognizeIngredients(imageUrl);
    res.json({ recognizedIngredients });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
