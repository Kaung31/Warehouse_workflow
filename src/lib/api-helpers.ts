import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

export { requireAuth } from '@/lib/auth'

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data, error: null }
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { data: null, error: apiError(`Validation failed: ${messages}`, 400) }
    }
    return { data: null, error: apiError('Invalid request body', 400) }
  }
}

export function withErrorHandler(
  handler: (req: NextRequest, ctx?: unknown) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx?: unknown) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'UNAUTHENTICATED') return apiError('Not authenticated', 401)
        if (err.message === 'FORBIDDEN') return apiError('You do not have permission to do this', 403)
      }
      console.error('API error:', err)
      return apiError('Internal server error', 500)
    }
  }
}
