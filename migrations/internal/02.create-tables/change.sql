CREATE TABLE IF NOT EXISTS migration (
    id              uuid            PRIMARY KEY,
    name            varchar(255)    UNIQUE NOT NULL,
    execution_index serial          ,
    on_failure      failure_action  NOT NULL DEFAULT 'STOP'
);

CREATE TABLE IF NOT EXISTS change (
    migration_id    uuid                ,
    hash            varchar(255)        UNIQUE,
    status          migration_status    NOT NULL DEFAULT 'QUEUED',
    -- script          text                NOT NULL,
    created_at      timestamp without time zone    NOT NULL DEFAULT now(), 
    executed_at     timestamp without time zone    NOT NULL DEFAULT now(),
    CONSTRAINT migration_change_FK
    FOREIGN KEY(migration_id) 
    REFERENCES migration(id)
);

CREATE TABLE IF NOT EXISTS rollback (
    migration_id    uuid                ,
    hash            varchar(255)        UNIQUE,
    status          migration_status    NOT NULL DEFAULT 'IGNORED',
    -- script          text                NOT NULL,
    created_at      timestamp without time zone    NOT NULL DEFAULT now(), 
    executed_at     timestamp without time zone    NOT NULL DEFAULT now(),
    CONSTRAINT migration_change_FK
    FOREIGN KEY(migration_id) 
    REFERENCES migration(id)
);

CREATE TABLE IF NOT EXISTS history (
    action_id       uuid                            ,
    action_type     action_type                     NOT NULL, 
    date_time       timestamp without time zone     NOT NULL DEFAULT now()
);