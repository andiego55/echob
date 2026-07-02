from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


class ContactRequest(BaseModel):
    """Niedrigschwellige Kontakt-/Lead-Anfrage (öffentlich, kein Login).

    E-Mail ODER Telefon genügt – mindestens eines muss angegeben sein.
    """
    kind: Literal["coaching", "demo", "general"] = "coaching"
    name: str | None = Field(None, max_length=160)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=60)
    message: str | None = Field(None, max_length=2000)
    source: str | None = Field(None, max_length=80)
    consent: bool = False
    # Honeypot gegen Bots – muss leer bleiben (serverseitig geprüft, nicht validiert).
    company: str | None = Field(None, max_length=200)

    @model_validator(mode="after")
    def _require_consent_and_contact(self) -> "ContactRequest":
        if not self.consent:
            raise ValueError("Einwilligung erforderlich.")
        if not self.email and not (self.phone and self.phone.strip()):
            raise ValueError("Bitte E-Mail oder Telefonnummer angeben.")
        return self


class ContactResponse(BaseModel):
    message: str
