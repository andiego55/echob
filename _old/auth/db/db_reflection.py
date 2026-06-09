#!/usr/bin/env python3

from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Integer, Boolean, Enum

AuthBase = declarative_base()


class User(AuthBase):
    __tablename__ = "user"
    __table_args__ = {"schema": "authentication"}
    user_id = Column(Integer, primary_key=True, autoincrement=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    email = Column(String, nullable=False)
    private_key = Column(String, nullable=False)
    public_key = Column(String, nullable=False)
    auth_2f = Column(Boolean, nullable=False)
    digit_code_2fa = Column(Integer)
    digit_code_expiration = Column(String)
    auth_2f_completed = Column(Boolean)
    role = Column(Enum('admin', 'supervisor', 'user', 'visitor', name='role_type'), nullable=False)
    created_at = Column(String, nullable=False)

    def __repr__(self):
        return "User(user_id={self.user_id}," \
                    "username='{self.username}'," \
                    "password='{self.password}'," \
                    "email='{self.email}'," \
                    "private_key='{self.private_key}'," \
                    "public_key='{self.public_key}'," \
                    "auth_2f='{self.auth_2f}'," \
                    "digit_code_2fa='{self.digit_code_2fa}'," \
                    "digit_code_expiration='{self.digit_code_expiration}'," \
                    "auth_2f_completed='{self.auth_2f_completed}'," \
                    "role='{self.role}'," \
                    "created_at='{self.created_at}')".format(self=self)


if __name__ == '__main__':
    from db.database import DBSessionHandler

    from sqlalchemy.exc import SQLAlchemyError

    new_user = User(username='Susi',
                   password='123',
                   email='susi@suess.de',
                   created_at='abc')

    # Add the user to the session
    try:
        session_handler = DBSessionHandler(session_on_init=True)
        session_handler.session.add(new_user)
        session_handler.session.commit()
    except SQLAlchemyError as e:
        print(str(e))
        session_handler.session.rollback()

