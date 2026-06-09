#!/usr/bin/env python3

from fastapi import APIRouter
from db.db_reflection import User
from db.database import DBSessionHandler
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()


@router.get('/users')
def get_users():
    try:
        session_handler = DBSessionHandler(session_on_init=True)

        out = []
        for user in session_handler.session.query(User):
            out.append(user)
    except SQLAlchemyError as error:
        print(str(error))
        session_handler.session.rollback()

    return out
