CREATE TABLE migration (
    id              uuid            PRIMARY KEY,
    name            varchar(255)    UNIQUE NOT NULL,
    order           int             ,
    on_failure      failure_action  NOT NULL DEFAULT 'FAIL'
);

CREATE TABLE change (
    migration_id    uuid                ,
    hash            varchar(255)        ,
    status          migration_status    NOT NULL DEFAULT 'QUEUED',
    script          text                NOT NULL,
    created_at      timestamp without time zone    NOT NULL DEFAULT now(), 
    executed_at     timestamp without time zone    NOT NULL DEFAULT now()
);

CREATE TABLE rollback (
    migration_id    uuid                ,
    hash            varchar(255)        ,
    status          migration_status    NOT NULL DEFAULT 'IGNORED',
    script          text                NOT NULL,
    created_at      timestamp without time zone    NOT NULL DEFAULT now(), 
    executed_at     timestamp without time zone    NOT NULL DEFAULT now()
);

CREATE TABLE history (
    action_id       uuid                            ,
    action_type     action_type                     NOT NULL, 
    date_time       timestamp without time zone      NOT NULL DEFAULT now()
);