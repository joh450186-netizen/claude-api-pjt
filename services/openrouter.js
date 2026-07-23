const { openRouterApiKey } = require('../config');

const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free';
const RECIPE_MODEL = 'openai/gpt-oss-20b:free';

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  const closeChar = candidate[start] === '[' ? ']' : '}';
  const end = candidate.lastIndexOf(closeChar);

  if (start === -1 || end === -1) {
    throw new Error(`모델 응답에서 JSON을 찾을 수 없습니다: ${text.slice(0, 200)}`);
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

async function chatCompletion(model, messages, maxTokens) {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error?.message || `OpenRouter 요청 실패 (${response.status})`);
  }

  return body.choices[0].message.content;
}

async function recognizeIngredients(imageUrl) {
  const content = await chatCompletion(
    VISION_MODEL,
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text:
              '이 사진 속에서 실제로 보이는 식재료만 한국어로 나열해줘. 사전에 없는 재료라도 보이는 대로 자유롭게 적어도 된다. ' +
              '반드시 아래 JSON 배열 형식으로만 답하고 다른 설명은 붙이지 마: ' +
              '[{"name": "재료명", "category": "카테고리"}]',
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
    500
  );

  return extractJson(content);
}

async function generateRecipes(ingredients) {
  const content = await chatCompletion(
    RECIPE_MODEL,
    [
      {
        role: 'user',
        content:
          `다음 재료로 만들 수 있는 요리를 3가지 새로 만들어서 추천해줘: ${ingredients.join(', ')}. ` +
          '기존에 존재하는 레시피를 검색하는 게 아니라 직접 창작해도 된다. ' +
          '반드시 아래 JSON 배열 형식으로만 답하고 다른 설명은 붙이지 마: ' +
          '[{"title": "요리명", "ingredients": ["재료1", "재료2"], "instructions": "조리법"}]',
      },
    ],
    800
  );

  return extractJson(content);
}

module.exports = { recognizeIngredients, generateRecipes };
