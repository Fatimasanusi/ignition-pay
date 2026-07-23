# Endpoint Name

## Request

`METHOD /api/v1/resource`

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <token>` | Yes |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `param` | `string` | No | Description |

### Request Body

```json
{
  "field": "value"
}
```

## Response

### Success (200)

```json
{
  "data": {}
}
```

### Error (4xx/5xx)

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

## Errors

| Status Code | Description |
|-------------|-------------|
| 400 | Invalid input |
| 401 | Unauthorized |
| 404 | Resource not found |
| 500 | Internal server error |
