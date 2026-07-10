import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import init_db
from config import DEFAULT_PROVIDER_CONFIGS
from services.providers.registry import ProviderRegistry
from routes import (
    chats,
    messages,
    documents,
    agents,
    collections,
    prompts,
    images,
    models,
    settings,
    admin,
    research,
    vision,
    workspaces,
    workspace_chats,
    workspace_memory,
    workspace_documents,
    workspace_agents,
    workspace_assets,
    workspace_tasks,
    browser,
)
from config import UPLOAD_DIR


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_default_workspace()
    configs = load_provider_configs()
    await ProviderRegistry.initialize(configs)
    yield
    await ProviderRegistry.shutdown()


app = FastAPI(title="LocalGPT Studio", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.include_router(workspaces.router)
app.include_router(workspace_chats.router)
app.include_router(workspace_memory.router)
app.include_router(workspace_documents.router)
app.include_router(workspace_agents.router)
app.include_router(workspace_assets.router)
app.include_router(workspace_tasks.router)

app.include_router(models.router)
app.include_router(chats.router)
app.include_router(messages.router)
app.include_router(collections.router)
app.include_router(documents.router)
app.include_router(agents.router)
app.include_router(prompts.router)
app.include_router(images.router)
app.include_router(settings.router)
app.include_router(admin.router)
app.include_router(research.router)
app.include_router(vision.router)
app.include_router(browser.router)


def load_provider_configs() -> dict:
    from routes.settings import _load_provider_configs as _load
    return _load()


def seed_default_workspace():
    from database import SessionLocal
    from models.workspace import Workspace
    from models.agent import Agent

    db = SessionLocal()
    try:
        if db.query(Workspace).count() > 0:
            return

        workspaces_data = [
            Workspace(name="Personal", description="Personal workspace for general use", category="Personal", icon="User", default_model=""),
            Workspace(name="Business", description="Business operations and strategy", category="Business", icon="Briefcase", default_model=""),
            Workspace(name="Marketing", description="Marketing campaigns and content", category="Marketing", icon="Megaphone", default_model=""),
            Workspace(name="Development", description="Software development projects", category="Development", icon="Code", default_model=""),
        ]
        db.add_all(workspaces_data)
        db.commit()

        personal = db.query(Workspace).filter(Workspace.name == "Personal").first()
        business = db.query(Workspace).filter(Workspace.name == "Business").first()
        marketing = db.query(Workspace).filter(Workspace.name == "Marketing").first()
        development = db.query(Workspace).filter(Workspace.name == "Development").first()

        agents_data = [
            Agent(workspace_id=business.id, name="Research Analyst", description="Market research and competitive analysis", model="", system_prompt="You are a research analyst. Gather insights, analyze markets, and provide data-driven recommendations.", temperature=0.5),
            Agent(workspace_id=business.id, name="Content Writer", description="Professional content creation", model="", system_prompt="You are a professional content writer. Create engaging, well-researched content for various formats.", temperature=0.7),
            Agent(workspace_id=marketing.id, name="Marketing Expert", description="Digital marketing strategy", model="", system_prompt="You are a seasoned marketing expert. Analyze campaigns, suggest improvements, and create marketing strategies.", temperature=0.7),
            Agent(workspace_id=marketing.id, name="SEO Expert", description="Search engine optimization", model="", system_prompt="You are an SEO specialist. Provide keyword research, on-page optimization, and link-building strategies.", temperature=0.5),
            Agent(workspace_id=marketing.id, name="Design Analyst", description="Creative analysis and design suggestions", model="", system_prompt="You are a design expert. Analyze visuals, suggest improvements, and guide creative direction.", temperature=0.8),
            Agent(workspace_id=development.id, name="Code Assistant", description="Software development help", model="", system_prompt="You are an expert software engineer. Write clean, efficient code and explain technical concepts clearly.", temperature=0.3),
            Agent(workspace_id=development.id, name="Data Analyst", description="Data analysis and reporting", model="", system_prompt="You are a data analyst. Process data, generate insights, and create comprehensive reports.", temperature=0.4),
            Agent(workspace_id=personal.id, name="Personal Assistant", description="General purpose assistant", model="", system_prompt="You are a helpful personal assistant. Help with planning, research, and daily tasks.", temperature=0.7),
        ]
        db.add_all(agents_data)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
