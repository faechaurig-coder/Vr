#!/bin/bash
# Sincroniza los cambios del repo de trabajo al repo desnudo que se sirve por HTTP.
# Ejecutar después de cada commit.
set -u
cd "$(dirname "$0")"

git push -q VR.git master:master --force
cd VR.git && git update-server-info
echo "Repositorio sincronizado y publicado."
git log --oneline -1