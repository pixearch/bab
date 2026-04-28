"use client";

import { useState } from "react";

type OddsFormat = "probability" | "american" | "multiplier";

type Outcome = {
  id: string;
  name: string;
  impliedProbability: number;
};

type BettingWidgetProps = {
  marketId: string;
  marketQuestion: string;
  outcomes: Outcome[];
};

const oddsFormats: Array<{ value: OddsFormat; label: string }> = [
  { value: "probability", label: "Probability" },
  { value: "american", label: "American" },
  { value: "multiplier", label: "Multiplier" },
];

function toProbability(p: number) {
  return `${Math.round(p * 100)}%`;
}

function toMultiplier(p: number) {
  return `${(1 / p).toFixed(2)}x`;
}

function toAmerican(p: number) {
  if (p >= 0.5) {
    return `-${Math.round((p / (1 - p)) * 100)}`;
  }

  return `+${Math.round(((1 - p) / p) * 100)}`;
}

function formatOdds(p: number, format: OddsFormat) {
  if (format === "american") {
    return toAmerican(p);
  }

  if (format === "multiplier") {
    return toMultiplier(p);
  }

  return toProbability(p);
}

export default function BettingWidget({
  marketId,
  marketQuestion,
  outcomes,
}: BettingWidgetProps) {
  const [selectedFormat, setSelectedFormat] =
    useState<OddsFormat>("probability");
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(
    null,
  );
  const [wagerAmount, setWagerAmount] = useState("");

  function handleSubmit() {
    console.log({ wagerAmount, selectedOutcomeId, marketId });
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
      <h2 className="text-lg font-bold text-slate-950">{marketQuestion}</h2>

      <div className="mt-5 rounded-full bg-slate-100 p-1">
        <div className="grid grid-cols-3 gap-1">
          {oddsFormats.map((format) => {
            const isSelected = selectedFormat === format.value;

            return (
              <button
                key={format.value}
                type="button"
                onClick={() => setSelectedFormat(format.value)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                }`}
              >
                {format.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {outcomes.map((outcome) => {
          const isSelected = selectedOutcomeId === outcome.id;

          return (
            <button
              key={outcome.id}
              type="button"
              onClick={() => setSelectedOutcomeId(outcome.id)}
              className={`rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-200"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-semibold text-slate-950">
                {outcome.name}
              </span>
              <span className="mt-1 block text-2xl font-bold text-slate-900">
                {formatOdds(outcome.impliedProbability, selectedFormat)}
              </span>
            </button>
          );
        })}
      </div>

      <label className="mt-5 block text-sm font-semibold text-slate-700">
        Wager Amount
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={wagerAmount}
          onChange={(event) => setWagerAmount(event.target.value)}
          placeholder="0.00"
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
        />
      </label>

      <button
        type="button"
        onClick={handleSubmit}
        className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm transition hover:bg-blue-700"
      >
        Place Bet
      </button>
    </section>
  );
}
