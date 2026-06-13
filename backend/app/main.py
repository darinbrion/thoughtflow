from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import Base, engine, get_db
from .models import Thought
from .organizer import organize
from .schemas import (
    OrganizeRequest,
    OrganizeResponse,
    ThoughtCreate,
    ThoughtRead,
    ThoughtUpdate,
)

settings = get_settings()
app = FastAPI(title="ThoughtFlow API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/thoughts", response_model=list[ThoughtRead])
def list_thoughts(db: Session = Depends(get_db)) -> list[Thought]:
    return list(db.scalars(select(Thought).order_by(Thought.created_at.desc())))


@app.post("/api/thoughts", response_model=ThoughtRead, status_code=status.HTTP_201_CREATED)
def create_thought(payload: ThoughtCreate, db: Session = Depends(get_db)) -> Thought:
    values = payload.model_dump(exclude_none=True)
    thought = Thought(**values)
    db.add(thought)
    db.commit()
    db.refresh(thought)
    return thought


@app.post("/api/organize", response_model=OrganizeResponse, status_code=status.HTTP_201_CREATED)
def organize_thoughts(payload: OrganizeRequest, db: Session = Depends(get_db)) -> OrganizeResponse:
    organized, provider = organize(payload.text, payload.mode, payload.categories)
    records = [Thought(**item.model_dump()) for item in organized]
    db.add_all(records)
    db.commit()
    for record in records:
        db.refresh(record)
    return OrganizeResponse(thoughts=records, provider=provider)


def get_thought_or_404(thought_id: str, db: Session) -> Thought:
    thought = db.get(Thought, thought_id)
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")
    return thought


@app.patch("/api/thoughts/{thought_id}", response_model=ThoughtRead)
def update_thought(
    thought_id: str,
    payload: ThoughtUpdate,
    db: Session = Depends(get_db),
) -> Thought:
    thought = get_thought_or_404(thought_id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(thought, field, value)
    db.commit()
    db.refresh(thought)
    return thought


@app.delete("/api/thoughts/{thought_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_thought(thought_id: str, db: Session = Depends(get_db)) -> Response:
    thought = get_thought_or_404(thought_id, db)
    db.delete(thought)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
