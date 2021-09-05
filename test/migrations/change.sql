CREATE TABLE IF NOT EXISTS integration_test (
    test_uuid       uuid            PRIMARY KEY,
    test_text       varchar(255)    ,
    test_number     int             ,
    test_unique     varchar(255)    UNIQUE,
    test_notnull    varchar(255)    NOT NULL,
    test_serial     serial          ,
    test_default    varchar(255)    NOT NULL DEFAULT 'DEFAULT_VALUE_SET'
);