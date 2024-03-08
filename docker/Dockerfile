FROM ubuntu:latest

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    curl wget git vim python3-pip lsb-release less \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    nodejs npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @google/clasp

COPY ./.clasprc/.clasprc.json /root
