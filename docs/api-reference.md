# API Reference

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/revoke`
- `GET /api/auth/me`

## Assessments

- `POST /api/assessments/generate`
- `GET /api/assessments`
- `GET /api/assessments/:id`
- `GET /api/assessments/:id/status`
- `PUT /api/assessments/:id`
- `DELETE /api/assessments/:id`
- `POST /api/assessments/:id/questions`
- `PUT /api/assessments/:id/questions/:qid`
- `DELETE /api/assessments/:id/questions/:qid`
- `POST /api/assessments/:id/questions/reorder`
- `POST /api/assessments/:id/questions/from-bank`

## Export

- `POST /api/export/docx`
- `POST /api/export/pdf`
- `POST /api/export/excel`
- `GET /api/export/download/:token`

Contoh body:

```json
{
  "assessmentId": "uuid",
  "format": "pdf",
  "types": ["question_paper", "answer_key"]
}
```

## Admin

- `GET /api/admin/summary`
- `GET /api/admin/metrics/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `GET /api/metrics`
