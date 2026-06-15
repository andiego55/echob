from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator


class WaitlistCreateRequest(BaseModel):
    email: EmailStr
    interest: Literal["app", "coaching", "fachperson", "alle"] | None = None
    note: str | None = None

    @field_validator("note")
    @classmethod
    def sanitize_note(cls, v: str | None) -> str | None:
        """Kürzt sehr lange Freitexte."""
        if v is not None and len(v) > 1000:
            return v[:1000]
        return v


class WaitlistCreateResponse(BaseModel):
    message: str
    email: str
