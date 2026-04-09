-- Enable Realtime on agent tables
ALTER PUBLICATION supabase_realtime ADD TABLE agent_health_events;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_edges;
