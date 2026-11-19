#!/usr/bin/env bash
# Runs Tend's tests against a real local Postgres with the real schema.
# Needs: Postgres reachable as $PGUSER/$PGPASSWORD on $PGHOST (defaults postgres/pg on 127.0.0.1),
# Node 18+, and Playwright with Chromium.  Usage: tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
export PGHOST=${PGHOST:-127.0.0.1} PGUSER=${PGUSER:-postgres} PGPASSWORD=${PGPASSWORD:-pg} PGDATABASE=tendtest
psql -q -d postgres -c 'drop database if exists tendtest' -c 'create database tendtest' >/dev/null
psql -q -v ON_ERROR_STOP=1 -f db-setup.sql >/dev/null 2>&1
psql -q -v ON_ERROR_STOP=1 -f ../supabase/schema.sql 2>&1 | grep -v -e NOTICE -e 'wal_level' -e HINT || true
psql -q -v ON_ERROR_STOP=1 -f ../supabase/schema.sql >/dev/null 2>&1   # must be safe to run twice
psql -q -v ON_ERROR_STOP=1 -f db-rules.test.sql
node mock-server.js > mock-server.log 2>&1 & MOCK=$!
(cd .. && python3 -m http.server 8766 --bind 127.0.0.1 >/dev/null 2>&1) & WEB=$!
trap 'kill $MOCK $WEB 2>/dev/null || true' EXIT
sleep 1.5
fail=0
for t in *.test.js; do echo "== $t"; node "$t" || fail=1; done
exit $fail
