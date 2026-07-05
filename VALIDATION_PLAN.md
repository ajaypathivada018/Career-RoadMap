# Validation Plan — Backend Endpoints

Goal: Add input validation to prevent malformed requests, reduce runtime errors, and improve security.

Priority order (high -> low)

1. Auth endpoints (`apps/api/routes/auth.js`)
   - `POST /register` — validate: `email` (email), `password` (min 8), `name` (optional string), `phone` (optional, phone format)
   - `POST /login` — validate: `email` (email), `password` (present)
   - `POST /request-otp` — validate: `email` (email)
   - `POST /login-otp` — validate: `email` (email), `otp` (6-digit)
   - `POST /reset-password` — validate: `email`, `otp`, `newPassword` (min 8)

2. Course generation (`apps/api/routes/course-generation-v2.js`)
   - `POST /generate-course-v2` — validate: `topic` (string, max length), `options` (object), `userId` (optional)

3. Roadmaps (`apps/api/routes/roadmaps.js`)
   - `POST /` and `/create` — validate roadmap `title` (required), `items` (array), `ownerId`
   - `POST /generate` & `/ai-generate` — validate `jobTitle`/`topic` strings
   - `PUT /:id/progress` — validate `progress` numeric range 0-100

4. Skill evaluation (`apps/api/routes/skillEval.js`)
   - `POST /evaluate` — validate payload contains `answers` array and required ids
   - `POST /submit` — validate submission fields

5. Profile endpoints
   - `POST /update-profile` — validate `name`, `phone`, `metadata` shapes

6. Misc endpoints
   - Jobs search and AI endpoints: validate input strings and optional filters

Implementation notes
- Use `express-validator` or `Joi` for declarative schemas. For this repo I added `express-validator` and applied it to auth register/login as examples.
- Return consistent error shape: `{ errors: [{ field, msg }] }` for validation errors.
- Add middleware to convert validation errors into 400 responses early.
- For complex request bodies (course generation, roadmap items), create shared schema helpers in `apps/api/validation/` and reuse across routes.

Next steps (automation)
1. Apply schema validation to high-priority endpoints: auth (done), course generation, roadmaps, skillEval.
2. Add unit tests for validation to ensure malformed requests return 400.
3. Add API docs (OpenAPI) reflecting input schemas.


