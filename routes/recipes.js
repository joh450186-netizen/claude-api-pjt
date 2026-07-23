const express = require('express');
const fs = require('fs');
const path = require('path');
const recipes = require('../data/recipes');
const { embedText } = require('../services/openrouter');

const router = express.Router();
const EMBEDDINGS_PATH = path.join(__dirname, '..', 'data', 'recipeEmbeddings.json');
const TOP_N = 3;

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function loadRecipeEmbeddings() {
  if (!fs.existsSync(EMBEDDINGS_PATH)) {
    throw new Error(
      'recipeEmbeddings.json이 없습니다. "node scripts/embedRecipes.js"를 먼저 실행해 레시피 임베딩을 생성하세요.'
    );
  }
  return JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8'));
}

router.post('/recommend', async (req, res) => {
  const { ingredients } = req.body;
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'ingredients (string[])가 필요합니다' });
  }

  try {
    const recipeEmbeddings = loadRecipeEmbeddings();
    const queryText = ingredients.join(', ');
    const queryEmbedding = await embedText(queryText);

    const scored = recipeEmbeddings.map(({ id, embedding }) => {
      const recipe = recipes.find((r) => r.id === id);
      return {
        recipeId: id,
        title: recipe.title,
        instructions: recipe.instructions,
        similarity: cosineSimilarity(queryEmbedding, embedding),
      };
    });

    const recommendations = scored.sort((a, b) => b.similarity - a.similarity).slice(0, TOP_N);

    res.json({ recommendations });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
