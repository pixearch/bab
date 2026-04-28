import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "../../../../lib/logger.js";
const prisma = new PrismaClient();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function jsonResponse(body, status) {
    return Response.json(body, { status });
}
function parseUuid(value, field) {
    if (typeof value !== "string" || !uuidPattern.test(value)) {
        throw new Error(`${field} must be a valid UUID`);
    }
    return value;
}
function parsePositiveAmount(value) {
    if (typeof value !== "string" && typeof value !== "number") {
        throw new Error("amountWagered must be a positive decimal");
    }
    const amount = new Prisma.Decimal(value);
    if (!amount.isFinite() ||
        amount.lte(0) ||
        amount.decimalPlaces() > 4 ||
        amount.gte("100000000")) {
        throw new Error("amountWagered must be a positive decimal");
    }
    return amount;
}
export async function POST(request) {
    let userId;
    let marketId;
    let outcomeId;
    let amountWagered;
    try {
        const body = await request.json();
        const parsedUserId = parseUuid(body.userId, "userId");
        const parsedMarketId = parseUuid(body.marketId, "marketId");
        const parsedOutcomeId = parseUuid(body.outcomeId, "outcomeId");
        const parsedAmountWagered = parsePositiveAmount(body.amountWagered);
        userId = parsedUserId;
        marketId = parsedMarketId;
        outcomeId = parsedOutcomeId;
        amountWagered = parsedAmountWagered;
        let dynamicOddsResponse;
        try {
            dynamicOddsResponse = await fetch("http://localhost:8000/api/math/dynamic-odds", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentProbability: 0.5,
                    amountWagered: parsedAmountWagered.toNumber(),
                    totalPool: 1000,
                }),
            });
        }
        catch (error) {
            logger.error({
                errorMessage: error instanceof Error ? error.message : "Unable to fetch dynamic odds",
                userId: parsedUserId,
                marketId: parsedMarketId,
                outcomeId: parsedOutcomeId,
                amountWagered: parsedAmountWagered.toString(),
            });
            return jsonResponse({ error: "Unable to fetch dynamic odds" }, 500);
        }
        if (!dynamicOddsResponse.ok) {
            logger.error({
                errorMessage: "Unable to fetch dynamic odds",
                status: dynamicOddsResponse.status,
                userId: parsedUserId,
                marketId: parsedMarketId,
                outcomeId: parsedOutcomeId,
                amountWagered: parsedAmountWagered.toString(),
            });
            return jsonResponse({ error: "Unable to fetch dynamic odds" }, 500);
        }
        let dynamicOdds;
        try {
            dynamicOdds = await dynamicOddsResponse.json();
        }
        catch (error) {
            logger.error({
                errorMessage: error instanceof Error ? error.message : "Unable to parse dynamic odds",
                userId: parsedUserId,
                marketId: parsedMarketId,
                outcomeId: parsedOutcomeId,
                amountWagered: parsedAmountWagered.toString(),
            });
            return jsonResponse({ error: "Unable to fetch dynamic odds" }, 500);
        }
        const newProbability = typeof dynamicOdds === "object" && dynamicOdds !== null
            ? dynamicOdds.newProbability
            : undefined;
        if (typeof newProbability !== "number" || !Number.isFinite(newProbability) || newProbability <= 0) {
            logger.error({
                errorMessage: "Unable to fetch dynamic odds",
                userId: parsedUserId,
                marketId: parsedMarketId,
                outcomeId: parsedOutcomeId,
                amountWagered: parsedAmountWagered.toString(),
            });
            return jsonResponse({ error: "Unable to fetch dynamic odds" }, 500);
        }
        const payoutPotential = parsedAmountWagered.div(newProbability);
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: parsedUserId },
                select: { id: true, balance: true },
            });
            if (!user) {
                throw new Error("User not found");
            }
            if (user.balance.lt(parsedAmountWagered)) {
                throw new Error("Insufficient funds");
            }
            const outcome = await tx.outcome.findFirst({
                where: { id: parsedOutcomeId, marketId: parsedMarketId },
                select: { id: true, currentOdds: true },
            });
            if (!outcome) {
                throw new Error("Outcome not found for market");
            }
            const order = await tx.order.create({
                data: {
                    userId: parsedUserId,
                    marketId: parsedMarketId,
                    outcomeId: parsedOutcomeId,
                    amountWagered: parsedAmountWagered,
                    payoutPotential,
                    status: "PENDING",
                },
            });
            const ledgerEntry = await tx.ledgerEntry.create({
                data: {
                    userId: parsedUserId,
                    amount: parsedAmountWagered.neg(),
                    transactionType: "WAGER",
                    referenceId: order.id,
                },
            });
            const updatedUser = await tx.user.update({
                where: { id: parsedUserId },
                data: { balance: { decrement: parsedAmountWagered } },
                select: { id: true, balance: true },
            });
            return { order, ledgerEntry, user: updatedUser };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        logger.info({
            userId: parsedUserId,
            marketId: parsedMarketId,
            amountWagered: parsedAmountWagered.toString(),
            transactionType: result.ledgerEntry.transactionType,
        });
        return jsonResponse(result, 201);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unable to place bet";
        logger.error({
            errorMessage: message,
            userId,
            marketId,
            outcomeId,
            amountWagered: amountWagered?.toString(),
        });
        const status = message === "Insufficient funds"
            ? 409
            : message.includes("not found")
                ? 404
                : 400;
        return jsonResponse({ error: message }, status);
    }
}
