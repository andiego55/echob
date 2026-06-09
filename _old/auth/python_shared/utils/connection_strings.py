def create_postgres_connection_string(HOST: str, PORT: str, DRIVER: str, DATABASE_NAME: str, USERNAME: str, PASSWORD: str) -> str:
    conn_str = f'postgresql+{DRIVER}://{USERNAME}:{PASSWORD}@{HOST}:{PORT}/{DATABASE_NAME}'
    return conn_str
