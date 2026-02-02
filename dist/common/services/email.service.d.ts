import { ConfigService } from '@nestjs/config';
export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
}
export declare class EmailService {
    private configService;
    private logger;
    private transporter;
    private enabled;
    constructor(configService: ConfigService);
    private initialize;
    send(options: EmailOptions): Promise<boolean>;
    sendVerificationEmail(email: string, verificationToken: string): Promise<boolean>;
    sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean>;
    sendAnalysisCompleted(email: string, datasetName: string, dashboardUrl: string): Promise<boolean>;
    private stripHtml;
}
