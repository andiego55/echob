
from sqlalchemy import inspect


def get_table_names(engine, schema='geodata'):
    inspector = inspect(engine)
    return inspector.get_table_names(schema=schema)