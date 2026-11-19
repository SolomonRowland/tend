-- Tend Home: run the tend-notify function at the top of every hour.
-- Run this once in Supabase's SQL Editor, AFTER deploying the tend-notify function.
-- Safe to run again.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'tend-notify-hourly';
select cron.schedule(
  'tend-notify-hourly',
  '0 * * * *',
  $$ select net.http_post(
       url := 'https://mbzabezkhptjjbyzkxbw.supabase.co/functions/v1/tend-notify',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
