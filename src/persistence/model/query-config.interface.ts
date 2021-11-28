export interface IQueryConfig {
    commit: boolean;

    // multiple statements in single method call not currently supported
    maxStatements: 1;
}
