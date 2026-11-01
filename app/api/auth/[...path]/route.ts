import { getAuth } from "@/lib/auth/server";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  return getAuth().handler().GET(request, context);
}

export async function POST(request: Request, context: Context) {
  const { path } = await context.params;
  if (path[0] === "sign-up") {
    return Response.json({ error: "Værtskonti oprettes af administratoren" }, { status: 403 });
  }
  return getAuth().handler().POST(request, context);
}

export async function PUT(request: Request, context: Context) {
  return getAuth().handler().PUT(request, context);
}

export async function DELETE(request: Request, context: Context) {
  return getAuth().handler().DELETE(request, context);
}

export async function PATCH(request: Request, context: Context) {
  return getAuth().handler().PATCH(request, context);
}
