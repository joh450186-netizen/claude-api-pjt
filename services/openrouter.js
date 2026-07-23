const { openRouterApiKey } = require('../config');

const RERANK_URL = 'https://openrouter.ai/api/v1/rerank';
const RERANK_MODEL = 'nvidia/llama-nemotron-rerank-vl-1b-v2:free';
const EMBEDDINGS_URL = 'https://openrouter.ai/api/v1/embeddings';
const EMBEDDING_MODEL = 'nvidia/nemotron-3-embed-1b:free';

async function embedText(text) {
  const response = await fetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message || `OpenRouter embeddings failed (${response.status})`);
  }

  return body.data[0].embedding;
}

async function scoreIngredientAgainstImage(ingredientName, imageUrl) {
  const response = await fetch(RERANK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: RERANK_MODEL,
      query: ingredientName,
      documents: [{ image: imageUrl }],
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message || `OpenRouter rerank failed (${response.status})`);
  }

  return body.results[0].relevance_score;
}

async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

module.exports = { scoreIngredientAgainstImage, embedText, mapWithConcurrency };
