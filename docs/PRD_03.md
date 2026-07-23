# PRD_03: 사용자 프로필 및 레시피 저장

## 1. 개요
사용자 프로필을 생성하고, [[PRD_02]]에서 추천받은 레시피를 사용자가 저장(즐겨찾기)하고 이후 다시 조회할 수 있도록 하는 기능.

## 2. 범위
### In Scope
- 사용자 프로필 생성/조회/수정
- 추천된 레시피를 프로필에 저장
- 저장된 레시피 목록 조회(히스토리/즐겨찾기)
- 저장된 레시피 삭제

### Out of Scope (이번 단계 제외)
- 소셜 로그인/OAuth 등 정식 인증 체계 (초기에는 간단한 이메일 기반 식별로 시작, 정식 인증 방식은 별도 결정 필요)
- 다른 사용자와의 레시피 공유/팔로우 기능

## 3. 데이터 모델 (Supabase / Postgres)
- 테이블 `users`:
  - `id`, `email`, `display_name`, `preferences` (jsonb: 알레르기/기피 재료/선호 카테고리 등), `created_at`
- 테이블 `saved_recipes`:
  - `id`, `user_id` (FK → users.id), `recipe_id` (FK → recipes.id, [[PRD_02]] 참고), `saved_at`, `memo` (선택)

## 4. API 설계 (초안)
```
POST   /api/users                  # 프로필 생성
GET    /api/users/:id              # 프로필 조회
PATCH  /api/users/:id              # 프로필 수정 (preferences 포함)

POST   /api/users/:id/recipes      # 레시피 저장 { recipeId }
GET    /api/users/:id/recipes      # 저장된 레시피 목록 조회
DELETE /api/users/:id/recipes/:recipeId  # 저장된 레시피 삭제
```

## 5. Acceptance Criteria
- [ ] 사용자가 프로필을 생성하고 조회할 수 있다
- [ ] 추천받은 레시피를 저장하고, 저장 목록에서 다시 확인할 수 있다
- [ ] 저장된 레시피를 삭제할 수 있다
- [ ] preferences(알레르기/기피 재료)가 저장되고 조회된다

## 6. Open Questions
- 정식 인증 방식(이메일/비밀번호, OAuth 등)을 언제 도입할 것인가?
- preferences(알레르기/기피 재료)를 [[PRD_01]] 인식 단계나 [[PRD_02]] 추천 단계의 필터링에 실제로 반영할 것인가, 아니면 이번 단계에서는 저장만 하고 활용은 이후 단계로 미룰 것인가?
- 사용자별 저장 레시피 개수 제한이 필요한가?
