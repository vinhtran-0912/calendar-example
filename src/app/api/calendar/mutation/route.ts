import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    // For now, we just acknowledge the mutation. Hook persistence here later.
    return NextResponse.json({ ok: true, received: body });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}


