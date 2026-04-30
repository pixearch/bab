"use client";

import { FormEvent, useState } from "react";

type OutcomeInput = {
  name: string;
  currentOdds: string;
};

const dummyTenantId = "550e8400-e29b-41d4-a716-446655440000";

export default function AdminPage() {
  const [question, setQuestion] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [outcomes, setOutcomes] = useState<OutcomeInput[]>([
    { name: "Yes", currentOdds: "0.50" },
    { name: "No", currentOdds: "0.50" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function addOutcome() {
    setOutcomes([...outcomes, { name: "", currentOdds: "" }]);
  }

  function removeOutcome(index: number) {
    if (outcomes.length <= 2) {
      return;
    }

    setOutcomes(outcomes.filter((_, outcomeIndex) => outcomeIndex !== index));
  }

  function updateOutcome(
    index: number,
    field: keyof OutcomeInput,
    value: string,
  ) {
    setOutcomes(
      outcomes.map((outcome, outcomeIndex) =>
        outcomeIndex === index ? { ...outcome, [field]: value } : outcome,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/markets/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: dummyTenantId,
          question,
          closeTime: new Date(closeTime).toISOString(),
          outcomes: outcomes.map((outcome) => ({
            name: outcome.name,
            currentOdds: parseFloat(outcome.currentOdds),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create market");
      }

      setSuccessMessage("Market created successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create market",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow"
      >
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Create Market
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Build a prediction market and submit it to the existing market
            creation API.
          </p>
        </div>

        {successMessage ? (
          <div className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Question</span>
            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Close Time
            </span>
            <input
              type="datetime-local"
              value={closeTime}
              onChange={(event) => setCloseTime(event.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </label>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Outcomes</h2>
              <button
                type="button"
                onClick={addOutcome}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Add Outcome
              </button>
            </div>

            <div className="space-y-3">
              {outcomes.map((outcome, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-[1fr_8rem_auto]"
                >
                  <label>
                    <span className="text-sm font-medium text-gray-700">
                      Name
                    </span>
                    <input
                      type="text"
                      value={outcome.name}
                      onChange={(event) =>
                        updateOutcome(index, "name", event.target.value)
                      }
                      className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </label>

                  <label>
                    <span className="text-sm font-medium text-gray-700">
                      Odds
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={outcome.currentOdds}
                      onChange={(event) =>
                        updateOutcome(index, "currentOdds", event.target.value)
                      }
                      className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </label>

                  {outcomes.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => removeOutcome(index)}
                      className="self-end rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? "Processing..." : "Create Market"}
          </button>
        </div>
      </form>
    </main>
  );
}
