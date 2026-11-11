#!/usr/bin/env sh
# Abre el playbook de Mi Ciudad: ./playbook/playbook.sh [comando]
command -v node >/dev/null 2>&1 || { echo "Falta Node 24: https://nodejs.org"; exit 1; }
exec node --disable-warning=ExperimentalWarning "$(dirname "$0")/playbook.ts" "$@"
