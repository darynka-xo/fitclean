from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .routes import (
    health, users, orders, clubs, subscriptions, 
    statuses, ratings, photos, notifications,
    whatsapp, laundry, courier, admin, tablet
)

# Create FastAPI application
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description="Unified backend API for FitClean laundry management system",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(orders.router, prefix=settings.API_PREFIX)
app.include_router(clubs.router, prefix=settings.API_PREFIX)
app.include_router(subscriptions.router, prefix=settings.API_PREFIX)
app.include_router(statuses.router, prefix=settings.API_PREFIX)
app.include_router(ratings.router, prefix=settings.API_PREFIX)
app.include_router(photos.router, prefix=settings.API_PREFIX)
app.include_router(notifications.router, prefix=settings.API_PREFIX)
app.include_router(whatsapp.router, prefix=settings.API_PREFIX)
app.include_router(laundry.router, prefix=settings.API_PREFIX)
app.include_router(courier.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)
app.include_router(tablet.router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
