import { auth } from "@lingo-dev/auth";
import prisma from "@lingo-dev/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  repositoryId: z.string().min(1),
  content: z.string().min(1),
  locale: z.string().min(1).default("en"),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = bodySchema.parse(await req.json());

    const repository = await prisma.repository.findFirst({
      where: { id: body.repositoryId, userId: session.user.id },
    });

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    const doc = await prisma.onboardingDoc.create({
      data: {
        content: body.content,
        locale: body.locale,
        repositoryId: repository.id,
      },
    });

    return NextResponse.json({ id: doc.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request. Provide repositoryId, content, and locale." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to save doc";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
