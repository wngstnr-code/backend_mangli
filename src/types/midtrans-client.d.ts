declare module 'midtrans-client' {
  interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  export interface SnapParameter {
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    item_details?: Array<{
      id?: string;
      price: number;
      quantity: number;
      name: string;
    }>;
    callbacks?: {
      finish?: string;
      error?: string;
      pending?: string;
    };
    [key: string]: unknown;
  }

  export interface SnapResponse {
    token: string;
    redirect_url: string;
  }

  class Snap {
    constructor(config: MidtransConfig);
    createTransaction(parameter: SnapParameter): Promise<SnapResponse>;
    createTransactionToken(parameter: SnapParameter): Promise<string>;
    createTransactionRedirectUrl(parameter: SnapParameter): Promise<string>;
  }

  class CoreApi {
    constructor(config: MidtransConfig);
    charge(parameter: Record<string, unknown>): Promise<Record<string, unknown>>;
    capture(parameter: Record<string, unknown>): Promise<Record<string, unknown>>;
    cardRegister(parameter: Record<string, unknown>): Promise<Record<string, unknown>>;
    cardToken(parameter: Record<string, unknown>): Promise<Record<string, unknown>>;
    cardPointInquiry(tokenId: string): Promise<Record<string, unknown>>;
    transaction: {
      status(transactionId: string): Promise<Record<string, unknown>>;
      statusb2b(transactionId: string): Promise<Record<string, unknown>>;
      approve(transactionId: string): Promise<Record<string, unknown>>;
      deny(transactionId: string): Promise<Record<string, unknown>>;
      cancel(transactionId: string): Promise<Record<string, unknown>>;
      expire(transactionId: string): Promise<Record<string, unknown>>;
      refund(transactionId: string, parameter?: Record<string, unknown>): Promise<Record<string, unknown>>;
      refundDirect(transactionId: string, parameter?: Record<string, unknown>): Promise<Record<string, unknown>>;
      notification(notificationObj: Record<string, unknown>): Promise<Record<string, unknown>>;
    };
  }

  const midtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export default midtransClient;
}
