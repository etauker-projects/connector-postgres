CALL create_type_if_not_exists('action_type', 'ENUM (''CHANGE'',''ROLLBACK'')');
CALL create_type_if_not_exists('migration_status', 'ENUM (''QUEUED'',''SUCCESS'',''FAILURE'',''IGNORED'')');
CALL create_type_if_not_exists('failure_action', 'ENUM (''SKIP'',''ROLLBACK'',''STOP'')');