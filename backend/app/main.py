from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import engine
from app.routers import (complaints, health, auth, workflow, admin, analytics, notifications,
                         intelligence, evidence, chatbot, incidents, language)
from app.db.initialize import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database(engine)
    yield
    engine.dispose()


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)
app.include_router(health.router)
app.include_router(complaints.router)
app.include_router(auth.router)
app.include_router(workflow.router)
for router_module in (admin, analytics, notifications, intelligence, evidence, chatbot, incidents, language):
    app.include_router(router_module.router)


@app.get("/", tags=["root"])
def root():
    return {"message": settings.app_name, "docs": "/docs", "health": "/health"}
