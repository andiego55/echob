#!/usr/bin/env python3

from db.database import DBSessionHandler
import os

session_handler = DBSessionHandler()

# Session Handling
def get_db():
    db = session_handler
    try:
        db.open_session()
        yield db
    finally:
        db.close_session()

