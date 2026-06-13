import re

from openai import OpenAI

from .config import get_settings
from .schemas import OrganizedItem, OrganizedResult

CATEGORIES = {
    "Career": ["job", "recruiter", "application", "interview", "resume", "career", "work", "manager", "client"],
    "Projects": ["project", "build", "app", "website", "design", "roadmap", "launch", "stylematch", "thoughtflow", "feature", "code"],
    "Personal": ["personal", "home", "apartment", "buy", "remember", "weekend", "idea", "journal"],
    "Health": ["health", "gym", "workout", "doctor", "sleep", "run", "walk", "meditation", "therapy", "meal"],
    "Finance": ["money", "budget", "bill", "invoice", "tax", "finance", "bank", "invest", "pay"],
    "Education": ["learn", "study", "course", "book", "read", "class", "school", "research"],
    "Relationships": ["friend", "family", "call", "birthday", "partner", "mom", "dad", "dinner"],
    "Travel": ["travel", "trip", "flight", "hotel", "vacation", "passport", "visit"],
}
ACTION_WORDS = {
    "email", "call", "finish", "complete", "submit", "follow up", "schedule",
    "send", "review", "write", "build", "update", "book", "buy", "research",
    "prepare", "apply", "create", "fix", "plan", "organize", "start",
}


def _split(text: str, mode: str) -> list[str]:
    if mode == "quick":
        return [text.strip()]
    normalized = re.sub(r"(?:^|\n)\s*(?:[-*•]|\d+[.)])\s+", "\n", text.replace("\r", ""))
    comma_parts = [part.strip() for part in re.split(r"\s*,\s*", normalized) if part.strip()]
    looks_like_list = len(comma_parts) >= 3 or (
        len(comma_parts) >= 2 and all(len(part.split()) <= 10 for part in comma_parts)
    )
    source = comma_parts if looks_like_list else re.split(
        r"\n+|;+\s*|(?<=[.!?])\s+|\s+(?:and|but)\s+(?=(?:i|we|need|should|also)\b)",
        normalized,
        flags=re.I,
    )
    parts = []
    for source_part in source:
        for part in re.split(r"\n+|;+\s*|(?<=[.!?])\s+", source_part):
            cleaned = re.sub(r"^(?:[-*•]|\d+[.)])\s+", "", part).strip(" .!?")
            if len(cleaned) > 2:
                parts.append(cleaned)
    return parts


def _category(text: str, allowed_categories: list[str]) -> str:
    normalized = text.lower()
    named = next((category for category in allowed_categories if category.lower() in normalized), None)
    if named:
        return named
    scores = {
        category: sum(1 for word in words if word in normalized)
        for category, words in CATEGORIES.items()
        if category in allowed_categories
    }
    return max(scores, key=scores.get) if max(scores.values(), default=0) else (
        "Personal" if "Personal" in allowed_categories else allowed_categories[0]
    )


def _project(text: str, category: str) -> str:
    normalized = text.lower()
    if "thoughtflow" in normalized:
        return "ThoughtFlow"
    if "stylematch" in normalized:
        return "StyleMatch"
    if any(word in normalized for word in ("job", "recruiter", "application")):
        return "Job search"
    return {"Health": "Wellbeing", "Finance": "Personal admin", "Education": "Learning"}.get(category, category)


def organize_locally(text: str, mode: str, allowed_categories: list[str]) -> list[OrganizedItem]:
    items = []
    for part in _split(text, mode):
        normalized = part.lower()
        category = _category(part, allowed_categories)
        priority = "high" if re.search(r"\b(urgent|today|tomorrow|asap|deadline|important|must|need to)\b", normalized) else (
            "medium" if re.search(r"\b(this week|soon|should|follow up|finish|complete|submit|schedule)\b", normalized) else "low"
        )
        action = any(word in normalized for word in ACTION_WORDS) or bool(
            re.match(r"^(i need to|need to|remember to|should|must|todo|to-do)", normalized)
        )
        content = re.sub(
            r"^(i have been thinking about whether|i have been thinking about|i think that|i need to|need to|remember to)\s+",
            "",
            part,
            flags=re.I,
        ).strip()
        items.append(OrganizedItem(
            content=content[:1].upper() + content[1:],
            original=part,
            category=category,
            priority=priority,
            action=action,
            project=_project(part, category),
        ))
    return items


def organize(text: str, mode: str, allowed_categories: list[str]) -> tuple[list[OrganizedItem], str]:
    allowed_categories = [category.strip()[:25] for category in allowed_categories if category.strip()] or ["Personal"]
    settings = get_settings()
    if not settings.openai_api_key:
        return organize_locally(text, mode, allowed_categories), "local"

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.responses.parse(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You organize private thoughts into concise, faithful records. "
                        "Split a brain dump only when it contains distinct ideas. Do not invent facts. "
                        "Choose exactly one allowed category and one priority. Mark action true only "
                        "when the thought expresses a concrete next step. Use a short project name. "
                        f"Allowed categories: {', '.join(allowed_categories)}."
                    ),
                },
                {"role": "user", "content": f"Mode: {mode}\n\n{text}"},
            ],
            text_format=OrganizedResult,
        )
        parsed = response.output_parsed
        if parsed and parsed.thoughts and all(item.category in allowed_categories for item in parsed.thoughts):
            return parsed.thoughts, "openai"
    except Exception:
        pass
    return organize_locally(text, mode, allowed_categories), "local"
