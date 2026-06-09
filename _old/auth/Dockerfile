FROM rocker/r-ver:4.0.3

RUN apt-get update && apt-get install -y --no-install-recommends \
    unixodbc-dev \
    unixodbc \
    libpq-dev \
    libjq-dev \
    libglpk40

COPY ./services/auth /services/auth
COPY ./core/python_shared /services/auth/python_shared
COPY ./config.yml /config.yml

RUN apt-get update && apt-get install -y --no-install-recommends \
	build-essential \
	curl \
  python3.8 \
	python3-pip \
	python3-setuptools \ 
	python3-dev 

RUN pip3 install --upgrade pip 

RUN pip install pyodbc
RUN pip install -r /services/auth/requirements.txt

EXPOSE 9000
CMD ["python3", "/services/auth/run.py"]




