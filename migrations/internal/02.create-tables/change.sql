CREATE TABLE IF NOT EXISTS public.migration (
    id              uuid                    PRIMARY KEY,
    name            varchar(255)            UNIQUE NOT NULL,
    execution_index serial                  ,
    on_failure      public.failure_action   NOT NULL DEFAULT 'STOP'
);

CREATE TABLE IF NOT EXISTS public.change (
    migration_id    uuid                            ,
    hash            varchar(255)                    UNIQUE,
    status          public.migration_status         NOT NULL DEFAULT 'QUEUED',
    -- script          text                         NOT NULL,
    created_at      timestamp without time zone     NOT NULL DEFAULT now(), 
    executed_at     timestamp without time zone     NOT NULL DEFAULT now(),
    CONSTRAINT migration_change_FK
    FOREIGN KEY(migration_id) 
    REFERENCES public.migration(id)
);

CREATE TABLE IF NOT EXISTS public.rollback (
    migration_id    uuid                            ,
    hash            varchar(255)                    UNIQUE,
    status          public.migration_status         NOT NULL DEFAULT 'IGNORED',
    -- script          text                         NOT NULL,
    created_at      timestamp without time zone     NOT NULL DEFAULT now(), 
    executed_at     timestamp without time zone     NOT NULL DEFAULT now(),
    CONSTRAINT migration_change_FK
    FOREIGN KEY(migration_id) 
    REFERENCES public.migration(id)
);

CREATE TABLE IF NOT EXISTS public.history (
    action_id       uuid                            ,
    action_type     public.action_type                     NOT NULL, 
    date_time       timestamp without time zone     NOT NULL DEFAULT now()
);