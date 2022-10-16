-- Install extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- Create procedures
CREATE OR REPLACE PROCEDURE create_user_if_not_exists(username name, password text)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (SELECT * FROM pg_catalog.pg_user WHERE usename = username) THEN 
        EXECUTE FORMAT('CREATE USER "%I" WITH PASSWORD ''%I''', username, password);
    ELSE
        RAISE NOTICE 'user "%" already exists, skipping', username;
    END IF;
END
$$;


CREATE OR REPLACE PROCEDURE create_type_if_not_exists(name name, type_string text)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT n.nspname as schema, t.typname as type
        FROM pg_type t
        LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = name
        AND n.nspname = current_schema()
    ) THEN 
        EXECUTE FORMAT('CREATE TYPE %I AS %s', name, type_string);
    ELSE
        RAISE NOTICE 'type "%" already exists, skipping', name;
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE create_type_if_not_exists(schema varchar, name name, type_string text)
LANGUAGE plpgsql
AS $$
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
$$;


CREATE OR REPLACE PROCEDURE create_foreign_key_if_not_exists(schema varchar, name name, from_table name, from_column name, to_table name, to_column name)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT table_schema, table_name, column_name, constraint_name
        FROM information_schema.constraint_column_usage
        WHERE table_schema = schema
        AND table_name = to_table
        AND column_name = to_column
        AND constraint_name = name
    ) THEN 
        EXECUTE FORMAT('
                ALTER TABLE '|| schema ||'.%I
                ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES '|| schema ||'.%I(%I) ON UPDATE CASCADE ON DELETE CASCADE
            ',
            from_table,
            name,
            from_column,
            to_table,
            to_column
        );
    ELSE
        RAISE NOTICE 'constraint "%" already exists, skipping', name;
    END IF;
END;
$$;
