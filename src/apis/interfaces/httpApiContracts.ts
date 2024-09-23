export enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
}

export interface CmdResponse {
  code: string;
  message: string;
  failed: boolean;
}

export interface CmdResponseWithData<TData> extends CmdResponse {
  code: string;
  message: string;
  data: TData;
}

export interface GetCmdRequest {
  sn: string;
}

export interface GetQuotasCmdRequest extends GetCmdRequest {
  params: GetQuotasCmdRequestParams;
}

export interface GetQuotasCmdRequestParams {
  quotas: string[];
}

export interface AcquireCertificateData {
  certificateAccount: string;
  certificatePassword: string;
  url: string;
  port: string;
  protocol: string;
}
