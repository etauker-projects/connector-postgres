CREATE OR REPLACE PROCEDURE create_type_if_not_exists(schema varchar, name name, type_string text)
LANGUAGE plpgsql
AS \$\$

BEGIN
    IF NOT EXISTS (
        SELECT n.nspname as schema, t.typname as type
        FROM pg_type t
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = name
        AND n.nspname = schema
    ) THEN 
        EXECUTE FORMAT('CREATE TYPE '|| schema ||'.%I AS %s', name, type_string);
    ELSE
        RAISE NOTICE 'type "%" already exists, skipping', name;
    END IF;
END;
\$\$;