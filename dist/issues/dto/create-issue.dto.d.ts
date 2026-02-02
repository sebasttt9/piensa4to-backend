export declare enum IssueType {
    COMPRA = "compra",
    DEVOLUCION = "devolucion",
    ERROR_LOGISTICO = "error_logistico",
    OTRO = "otro"
}
export declare enum IssueStatus {
    PENDIENTE = "pendiente",
    RESUELTO = "resuelto",
    CANCELADO = "cancelado"
}
export declare class CreateIssueDto {
    type: IssueType;
    description: string;
    amount?: number;
    inventoryItemId?: string;
}
export declare class UpdateIssueDto {
    type?: IssueType;
    description?: string;
    amount?: number;
    status?: IssueStatus;
}
