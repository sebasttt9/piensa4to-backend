export declare enum ShareChannel {
    EMAIL = "email",
    SMS = "sms"
}
export declare class ShareDashboardDto {
    channel: ShareChannel;
    contact: string;
    message?: string;
    makePublic?: boolean;
}
