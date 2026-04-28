from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field


app = FastAPI()


class DynamicOddsRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    currentProbability: float = Field(ge=0, le=1)
    wagerAmount: float
    totalPool: float


class DynamicOddsResponse(BaseModel):
    newProbability: float


class ParlayLeg(BaseModel):
    model_config = ConfigDict(strict=True)

    impliedProbability: float = Field(ge=0, le=1)


class ParlayRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    legs: list[ParlayLeg]


class ParlayResponse(BaseModel):
    rawProbability: float
    houseAdjustedProbability: float


@app.post("/api/math/dynamic-odds", response_model=DynamicOddsResponse)
def calculate_dynamic_odds(request: DynamicOddsRequest) -> DynamicOddsResponse:
    current_side_pool = request.currentProbability * request.totalPool
    shifted_side_pool = current_side_pool + request.wagerAmount
    shifted_total_pool = request.totalPool + request.wagerAmount

    return DynamicOddsResponse(newProbability=shifted_side_pool / shifted_total_pool)


@app.post("/api/math/parlay", response_model=ParlayResponse)
def calculate_parlay(request: ParlayRequest) -> ParlayResponse:
    raw_probability = 1.0
    for leg in request.legs:
        raw_probability *= leg.impliedProbability

    house_adjusted_probability = raw_probability * 0.95

    return ParlayResponse(
        rawProbability=raw_probability,
        houseAdjustedProbability=house_adjusted_probability,
    )
