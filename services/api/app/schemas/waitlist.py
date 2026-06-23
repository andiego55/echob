from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


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


class DirectoryWaitlistRequest(BaseModel):
    """Eintrag fürs Fachpersonen-Verzeichnis (öffentliches Lead-Formular)."""
    name: str = Field(..., min_length=1, max_length=160)
    email: EmailStr
    consent: bool
    organization: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=60)
    website: str | None = Field(None, max_length=300)
    profession: str | None = Field(None, max_length=80)
    specialization: str | None = Field(None, max_length=300)
    location: str | None = Field(None, max_length=120)
    note: str | None = Field(None, max_length=1000)

    @field_validator("consent")
    @classmethod
    def _consent_required(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Einwilligung zur Listung ist erforderlich.")
        return v
