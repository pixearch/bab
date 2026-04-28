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
    throw new Error("amountWagered must be a positive decimal");
  }

  const amount = new Prisma.Decimal(value);

  if (
    !amount.isFinite() ||
    amount.lte(0) ||
    amount.decimalPlaces() > 4 ||
    amount.gte("100000000")
  ) {
    throw new Error("amountWagered must be a positive decimal");
  }

  return amount;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = parseUuid(body.userId, "userId");
    const marketId = parseUuid(body.marketId, "marketId");
    const outcomeId = parseUuid(body.outcomeId, "outcomeId");
    const amountWagered = parsePositiveAmount(body.amountWagered);

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, balance: true },
        });

        if (!user) {
          throw new Error("User not found");
        }

        if (user.balance.lt(amountWagered)) {
          throw new Error("Insufficient funds");
        }

        const outcome = await tx.outcome.findFirst({
          where: { id: outcomeId, marketId },
          select: { id: true, currentOdds: true },
        });

        if (!outcome) {
          throw new Error("Outcome not found for market");
        }

        const payoutPotential = amountWagered.mul(outcome.currentOdds);

        const order = await tx.order.create({
          data: {
            userId,
            marketId,
            outcomeId,
            amountWagered,
            payoutPotential,
            status: "PENDING",
          },
        });

        const ledgerEntry = await tx.ledgerEntry.create({
          data: {
            userId,
            amount: amountWagered.neg(),
            transactionType: "WAGER",
            referenceId: order.id,
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { balance: { decrement: amountWagered } },
          select: { id: true, balance: true },
        });

        return { order, ledgerEntry, user: updatedUser };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return jsonResponse(result, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place bet";
    const status =
      message === "Insufficient funds"
        ? 409
        : message.includes("not found")
          ? 404
          : 400;

    return jsonResponse({ error: message }, status);
  }
}
