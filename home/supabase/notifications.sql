-- Tend Home: run the tend-notify function at the top of every hour.
-- Run this once in Supabase's SQL Editor, AFTER running schema.sql and deploying the
-- tend-notify function (with "Verify JWT" turned off; the function checks callers itself).
-- Safe to run again.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'tend-notify-hourly';
-- The job shows the function a secret only the database knows (push_config.cron_secret),
-- so nobody on the internet can make it send notifications.
select cron.schedule(
  'tend-notify-hourly',
  '0 * * * *',
  $$ select net.http_post(
       url := 'https://mbzabezkhptjjbyzkxbw.supabase.co/functions/v1/tend-notify',
       headers := jsonb_build_object('Content-Type', 'application/json',
                                     'x-tend-cron', (select cron_secret from public.push_config where id = 1)),
       body := '{"action":"hourly"}'::jsonb
     ) $$
);
