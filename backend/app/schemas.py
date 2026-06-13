from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Priority = Literal["high", "medium", "low"]


class OrganizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)
    mode: Literal["quick", "dump"] = "quick"
    categories: list[str] = Field(
        default_factory=lambda: [
            "Career", "Projects", "Personal", "Health",
            "Finance", "Education", "Relationships", "Travel",
        ],
        min_length=1,
    )


class OrganizedItem(BaseModel):
    content: str
    original: str
    category: str = Field(min_length=1, max_length=25)
    priority: Priority
    action: bool
    project: str


class OrganizedResult(BaseModel):
    thoughts: list[OrganizedItem]


class ThoughtCreate(OrganizedItem):
    id: str | None = None
    completed: bool = False
    created_at: datetime | None = None


class ThoughtUpdate(BaseModel):
    content: str | None = None
    category: str | None = Field(default=None, min_length=1, max_length=25)
    priority: Priority | None = None
    project: str | None = None
    completed: bool | None = None


class ThoughtRead(OrganizedItem):
    model_config = ConfigDict(from_attributes=True)

    id: str
    completed: bool
    created_at: datetime


class OrganizeResponse(BaseModel):
    thoughts: list[ThoughtRead]
    provider: Literal["openai", "local"]
