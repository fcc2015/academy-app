from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import auth, players, finances, coaches, events, stats, settings as settings_router, evaluations, squads, attendance, notifications, public_api, coupons, plans, admins, chat, inventory, matches, injuries, training, kits, medical, expenses, storage, exports, saas_admin
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Football Academy SaaS using Supabase"
)

# CORS configuration — supports local dev + production + multi-tenant subdomains
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "https://dainty-speculoos-433706.netlify.app",
    "https://jolly-kangaroo-3c3d92.netlify.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(players.router)
app.include_router(finances.router)
app.include_router(coaches.router)
app.include_router(events.router)
app.include_router(stats.router)
app.include_router(settings_router.router)
app.include_router(evaluations.router)
app.include_router(squads.router)
app.include_router(attendance.router)
app.include_router(notifications.router)
app.include_router(public_api.router)
app.include_router(coupons.router)
app.include_router(plans.router)
app.include_router(admins.router)
app.include_router(chat.router)
app.include_router(inventory.router)
app.include_router(matches.router)
app.include_router(injuries.router)
app.include_router(training.router)
app.include_router(kits.router)
app.include_router(medical.router)
app.include_router(expenses.router)
app.include_router(storage.router)
app.include_router(exports.router)
app.include_router(saas_admin.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Football Academy API! Status: Online"}

