"""Authenticated, explicit pin lookup; optional failure never blocks reporting."""
from typing import Annotated
from fastapi import APIRouter, Depends, Response
from app.core.security import get_current_user
from app.schemas.geocoding import ReverseGeocodeRequest, ReverseGeocodeResult
from app.services.geocoding import ReverseGeocoder, get_geocoder

router = APIRouter(prefix="/api/v1/location", tags=["location"])


@router.post("/reverse", response_model=ReverseGeocodeResult)
def reverse_location(payload: ReverseGeocodeRequest, response: Response,
                     provider: Annotated[ReverseGeocoder, Depends(get_geocoder)],
                     user=Depends(get_current_user)):
    # The server cache is bounded and process-local; personalized locations
    # should not be cached by a shared browser/proxy cache.
    response.headers["Cache-Control"] = "no-store"
    return provider.reverse(payload)
