# PRD_02: 임베딩 기반 레시피 추천

## 1. 개요
[[PRD_01]]에서 인식된 재료 목록을 바탕으로, 미리 구축된 레시피 데이터베이스에서 가장 관련성 높은 레시피를 검색하여 사용자에게 추천하는 기능.

## 2. 사용 모델 및 확인된 제약사항
- 모델: `nvidia/nemotron-3-embed-1b:free` (OpenRouter, NVIDIA)
- 엔드포인트: `POST https://openrouter.ai/api/v1/embeddings` (실제 호출 테스트로 확인됨. `/chat/completions`에서는 "임베딩 모델이라 사용 불가" 에러 발생)
- 응답: 2048차원 임베딩 벡터 (`data[0].embedding`) — 실제 구현 후 재확인한 정확한 차원수(이전 기록의 1024는 오기)
- **중요한 제약**: 이 모델은 텍스트를 벡터로 변환하는 것만 수행하며, 새로운 레시피 텍스트를 생성하지 못한다. 즉 "레시피 생성"이 아니라 **기존에 저장된 레시피 중 재료 목록과 벡터 유사도가 가장 높은 것을 검색/추천**하는 용도로만 사용한다. 데이터베이스에 존재하지 않는 레시피는 추천될 수 없다.

## 3. 범위
### In Scope
- 레시피 데이터베이스 구축(레시피 텍스트 + 사전 계산된 임베딩 저장)
- 인식된 재료 목록을 하나의 쿼리 텍스트로 결합 후 임베딩 생성
- 벡터 유사도(코사인 유사도) 기반 상위 N개 레시피 검색
- 검색 결과 반환 및 사용자에게 표시

### Out of Scope (이번 단계 제외)
- LLM을 이용한 완전히 새로운 레시피 문장 생성
- 레시피 DB 자동 크롤링/수집 파이프라인 (초기에는 수동/큐레이션 데이터로 시드)

## 4. 레시피 데이터베이스 설계
- **실제 구현(1차 버전)**: Supabase 대신 [[PRD_01]]과 동일하게 `data/recipes.js` 정적 배열로 시작 (id, title, ingredients, instructions). 별도 DB 연동은 이후 단계로 미룸.
- 임베딩은 `scripts/embedRecipes.js`로 **한 번만** 계산해 `data/recipeEmbeddings.json`에 저장(서버 요청마다 재계산하지 않음 — 무료 티어 하루 50회 한도 보호를 위해 중요).
- 초기 시드 데이터: 15개 레시피, [[PRD_01]]의 재료 사전 12개 조합으로 구성
- 향후 DB 이관 시: Supabase Postgres + `pgvector` 확장, `embedding vector(2048)` 컬럼으로 전환 가능

## 5. API 설계 (구현 및 실제 호출로 검증됨)
```
POST /api/recipes/recommend
Body: { ingredients: string[] }  // PRD_01 결과 그대로 전달 가능
Flow:
  1. ingredients를 하나의 쿼리 문자열로 결합 (예: "우유, 계란")
  2. POST https://openrouter.ai/api/v1/embeddings
     { model: "nvidia/nemotron-3-embed-1b:free", input: <쿼리 문자열> }
     → 요청 1회당 임베딩 호출 1회만 발생 (레시피 쪽은 사전 계산되어 있으므로 재호출 없음)
  3. 반환된 벡터와 recipeEmbeddings.json의 각 벡터 간 코사인 유사도를 직접 계산(현재는 JS로 계산, DB 이관 시 pgvector `<=>` 연산자로 대체 가능)
  4. 유사도 상위 3개 레시피 반환
  5. 응답: { recommendations: [{ recipeId, title, instructions, similarity }] }
```

**실제 테스트 결과** (`http://localhost:3000/api/recipes/recommend`):
- `["두부","김치"]` → 두부김치찌개(0.886) > 두부조림(0.658) > 김치볶음밥(0.555) — 관련 없는 레시피는 0.2 이하로 뚜렷하게 구분됨
- `["우유","계란"]` → 우유 계란 푸딩(0.765) > 계란찜(0.597) > 토마토 계란볶음(0.541)

**⚠️ 테스트 시 주의(실제로 겪은 문제)**: Windows Git Bash에서 `curl -d '{"ingredients":["두부","김치"]}'`처럼 한글을 셸 인용부호 안에 직접 넣으면 curl 호출 전에 인코딩이 깨져서 완전히 엉뚱한(사실상 무작위에 가까운) 추천 결과가 나온다. 실제 기능 결함이 아니라 셸 인코딩 문제이며, Node `fetch`로 직접 호출하거나 프론트엔드(브라우저)에서 호출하면 정상 동작한다.

## 6. 에러 처리 및 폴백
- 유사도 상위 결과가 모두 임계값 미만일 경우 "일치하는 레시피 없음" 메시지 + 재료 추가 입력 유도
- 레시피 DB가 비어있는 초기 상태에 대한 안내 처리

## 7. Acceptance Criteria
- [x] `POST /api/recipes/recommend`가 실제로 동작하며, 입력 재료와 의미적으로 관련 있는 레시피가 top-3로 반환됨(위 실제 테스트 결과 참고)
- [x] free tier 한도 내에서 비용 없이 동작함이 확인된다 (요청당 임베딩 호출 1회, `cost: 0`)
- [x] 재료 목록 입력 시 3초 이내 추천 결과가 반환된다 (레시피 임베딩이 사전 계산되어 있어 실제 응답은 1~2초 내외)

## 8. Open Questions
- 유통기한이 임박한 재료에 가중치를 주어 우선순위를 조정할 것인가?
- 레시피 DB를 15개에서 어느 규모까지 늘릴 것인가, 그리고 언제 Supabase/pgvector로 이관할 것인가?
- 사용자 알레르기·선호도([[PRD_03]] 참고)를 검색 단계에서 필터링할 것인가, 결과 단계에서 필터링할 것인가?

## 9. 구현 현황
- `data/recipes.js`, `scripts/embedRecipes.js`, `data/recipeEmbeddings.json`, `routes/recipes.js`로 구현 완료 및 실제 API 호출로 검증됨.
- 레시피 추가/수정 시 `node scripts/embedRecipes.js`를 다시 실행해 `recipeEmbeddings.json`을 갱신해야 함.
- 실행: 서버 기동 후 `POST http://localhost:3000/api/recipes/recommend` (`{ "ingredients": ["우유", "계란"] }`)
