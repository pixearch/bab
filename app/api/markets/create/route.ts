import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "../../../../lib/logger.js";

const prisma = new PrismaClient();
const DEFAULT_TENANT_ID = "550e8400-e29b-41d4-a716-446655440000";

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, { status });
}

function parseCloseTime(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("closeTime must be an ISO-8601 datetime");
  }

  const closeTime = new Date(value);

  if (Number.isNaN(closeTime.getTime())) {
    throw new Error("closeTime must be an ISO-8601 datetime");
  }

  return closeTime;
}

function parseOutcomes(value: unknown) {
  if (!Array.isArray(value) || value.length < 2) {
    throw new Error("outcomes must contain at least two items");
  }

  return value.map((outcome) => {
    if (
      typeof outcome !== "object" ||
      outcome === null ||
      typeof outcome.name !== "string" ||
      typeof outcome.currentOdds !== "number" ||
      !Number.isFinite(outcome.currentOdds)
    ) {
      throw new Error("outcomes must include name and currentOdds");
    }

    return {
      name: outcome.name,
      currentOdds: new Prisma.Decimal(outcome.currentOdds),
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const closeTime = parseCloseTime(body.closeTime);
    const outcomes = parseOutcomes(body.outcomes);

    if (typeof body.question !== "string") {
      throw new Error("question must be a string");
    }

    const market = await prisma.market.create({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        question: body.question,
        closeTime,
        outcomes: {
          create: outcomes,
        },
      },
      include: { outcomes: true },
    });

    logger.info({
      marketId: market.id,
      tenantId: DEFAULT_TENANT_ID,
    });

    return jsonResponse(market, 200);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create market";
    logger.error({
      errorMessage: message,
      tenantId: DEFAULT_TENANT_ID,
    });

    return jsonResponse({ error: "Unable to create market" }, 500);
  }
}
