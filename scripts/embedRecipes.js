const fs = require('fs');
const path = require('path');
const recipes = require('../data/recipes');
const { embedText, mapWithConcurrency } = require('../services/openrouter');

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'recipeEmbeddings.json');

async function main() {
  const embedded = await mapWithConcurrency(recipes, 5, async (recipe) => {
    const text = `${recipe.title}: ${recipe.ingredients.join(', ')}`;
    const embedding = await embedText(text);
    return { id: recipe.id, embedding };
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(embedded, null, 2));
  console.log(`Saved ${embedded.length} recipe embeddings to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
