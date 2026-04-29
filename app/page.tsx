import BettingWidget from "../components/BettingWidget.js";

const mockMarket = {
  marketId: "11111111-1111-4111-8111-111111111111",
  marketQuestion: "Will the Federal Reserve cut rates in November?",
  outcomes: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Yes",
      impliedProbability: 0.45,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "No",
      impliedProbability: 0.55,
    },
  ],
};

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <BettingWidget {...mockMarket} />
    </main>
  );
}
