CALL public.create_type_if_not_exists('public', 'action_type', 'ENUM (''CHANGE'',''ROLLBACK'')');
CALL public.create_type_if_not_exists('public', 'migration_status', 'ENUM (''QUEUED'',''SUCCESS'',''FAILURE'',''IGNORED'')');
CALL public.create_type_if_not_exists('public', 'failure_action', 'ENUM (''SKIP'',''ROLLBACK'',''STOP'')');