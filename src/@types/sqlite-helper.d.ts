declare class SQLiteHelper {
    constructor(database: string);

    setup(): void;
    insert(tableName: string, data: object, callback?: (result: boolean) => void): void;
    update(tableName: string, data: object, condition: object, callback?: (result: boolean) => void): void;
    delete(tableName: string, condition: object): void;
    consultar(table: string, conditions: string[], callback: (err: Error | null, rows: object[] | null) => void, orderby?: string | null, limit?: string | null): void;
    usuario(chatID: number, callback: (err: Error | null, usuario: object | null) => void): void;
    ControlaFloodMiddleware(ctx: object, next: () => void): void;
}

export = SQLiteHelper;
