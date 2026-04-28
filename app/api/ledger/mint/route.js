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
        throw new Error("amount must be a positive decimal");
    }
    const amount = new Prisma.Decimal(value);
    if (!amount.isFinite() ||
        amount.lte(0) ||
        amount.decimalPlaces() > 4 ||
        amount.gte("100000000")) {
        throw new Error("amount must be a positive decimal");
    }
    return amount;
}
export async function POST(request) {
    let userId;
    let tenantId;
    let amount;
    try {
        const body = await request.json();
        const parsedUserId = parseUuid(body.userId, "userId");
        const parsedTenantId = parseUuid(body.tenantId, "tenantId");
        const parsedAmount = parsePositiveAmount(body.amount);
        userId = parsedUserId;
        tenantId = parsedTenantId;
        amount = parsedAmount;
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.findFirst({
                where: { id: parsedUserId, tenantId: parsedTenantId },
                select: { id: true, balance: true },
            });
            if (!user) {
                throw new Error("User not found for tenant");
            }
            const ledgerEntry = await tx.ledgerEntry.create({
                data: {
                    userId: parsedUserId,
                    amount: parsedAmount,
                    transactionType: "DEPOSIT",
                    referenceId: crypto.randomUUID(),
                },
            });
            const updatedUser = await tx.user.update({
                where: { id: parsedUserId },
                data: { balance: { increment: parsedAmount } },
                select: { id: true, balance: true },
            });
            return { ledgerEntry, user: updatedUser };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        logger.info({
            userId: parsedUserId,
            tenantId: parsedTenantId,
            transactionType: result.ledgerEntry.transactionType,
            amount: parsedAmount.toString(),
        });
        return jsonResponse(result, 201);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unable to mint balance";
        logger.error({
            errorMessage: message,
            userId,
            tenantId,
            amount: amount?.toString(),
        });
        const status = message.includes("not found") ? 404 : 400;
        return jsonResponse({ error: message }, status);
    }
}
