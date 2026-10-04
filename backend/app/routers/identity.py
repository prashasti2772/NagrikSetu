from fastapi import APIRouter, Depends, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from sqlalchemy.orm import Session

from app.core.security import require_citizen
from app.db.database import get_db
from app.schemas.identity import DemoIdentityRequest, IdentityRead
from app.services.identity import mark_demo_verified, verification_state


class IdentityRoute(APIRoute):
    def get_route_handler(self):
        original = super().get_route_handler()

        async def handler(request):
            try:
                return await original(request)
            except RequestValidationError:
                # Do not echo accidentally submitted identity documents or numbers.
                raise HTTPException(422, "Identity demo requests accept an empty JSON object only") from None

        return handler


router = APIRouter(prefix="/api/v1/users/me/verification", tags=["identity"], route_class=IdentityRoute)


@router.get("", response_model=IdentityRead)
def verification(user=Depends(require_citizen)):
    return verification_state(user)


@router.post("/demo", response_model=IdentityRead)
def demo_verification(payload: DemoIdentityRequest, db: Session = Depends(get_db), user=Depends(require_citizen)):
    mark_demo_verified(user)
    db.commit()
    db.refresh(user)
    return verification_state(user)
