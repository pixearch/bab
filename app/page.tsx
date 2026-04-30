import { PrismaClient } from "@prisma/client";
import BettingWidget from "../components/BettingWidget.js";

const prisma = new PrismaClient();

export default async function Home() {
  const markets = await prisma.market.findMany({
    include: { outcomes: true },
  });

  const bettingMarkets = markets.map((market) => ({
    marketId: market.id,
    marketQuestion: market.question,
    outcomes: market.outcomes.map((outcome) => ({
      id: outcome.id,
      name: outcome.name,
      impliedProbability: outcome.currentOdds.toNumber(),
    })),
  }));

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      {bettingMarkets.length === 0 ? (
        <p className="text-center text-slate-600">
          No active markets found. Create one at /admin
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bettingMarkets.map((market) => (
            <BettingWidget key={market.marketId} {...market} />
          ))}
        </div>
      )}
    </main>
  );
}
