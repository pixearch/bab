import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, { status });
}

function parseUuid(value: unknown, field: string) {
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new Error(`${field} must be a valid UUID`);
  }

  return value;
}

function parsePositiveAmount(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("amount must be a positive decimal");
  }

  const amount = new Prisma.Decimal(value);

  if (
    !amount.isFinite() ||
    amount.lte(0) ||
    amount.decimalPlaces() > 4 ||
    amount.gte("100000000")
  ) {
    throw new Error("amount must be a positive decimal");
  }

  return amount;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = parseUuid(body.userId, "userId");
    const tenantId = parseUuid(body.tenantId, "tenantId");
    const amount = parsePositiveAmount(body.amount);

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findFirst({
          where: { id: userId, tenantId },
          select: { id: true, balance: true },
        });

        if (!user) {
          throw new Error("User not found for tenant");
        }

        const ledgerEntry = await tx.ledgerEntry.create({
          data: {
            userId,
            amount,
            transactionType: "DEPOSIT",
            referenceId: crypto.randomUUID(),
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: amount } },
          select: { id: true, balance: true },
        });

        return { ledgerEntry, user: updatedUser };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return jsonResponse(result, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to mint balance";
    const status = message.includes("not found") ? 404 : 400;

    return jsonResponse({ error: message }, status);
  }
}
