#!/usr/bin/env python3
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import service_configuration
from db.db_reflection import AuthBase


class DBSessionHandler:

    def __init__(self,
                 connection_string=service_configuration['database']['DSA_CONNECTION_STRING'],
                 session_on_init=True):
        self.connection_string = connection_string
        self.engine = create_engine(
            connection_string,
            connect_args={'options': '-csearch_path={}'.format('authentication')}
        )
        self.Session = sessionmaker(bind=self.engine)
        if session_on_init:
            self.session = self.Session()
        else:
            self.session = None

    def open_session(self):
        self.session = self.Session()

    def close_session(self):
        self.session = self.session.close()


class PushSchema:

    def __init__(self, engine, dec_base=AuthBase, check_if_tables_exist=True):
        dec_base.metadata.create_all(engine, checkfirst=check_if_tables_exist)


if __name__ == '__main__':
    session_handler = DBSessionHandler(connection_string=service_configuration['database']['DSA_CONNECTION_STRING'],
                                       session_on_init=False)

    PushSchema(engine=session_handler.engine,
               dec_base=AuthBase)
