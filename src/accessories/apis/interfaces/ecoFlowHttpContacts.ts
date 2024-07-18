export enum HttpMethod {
  Get = 'GET',
  Post = 'POST',
}

export interface CmdResponseBase {
  code: string;
  message: string;
}

export interface CmdResponseData {}

export interface CmdResponse<TData extends CmdResponseData> extends CmdResponseBase {
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

export interface AcquireCertificateResponseData extends CmdResponseData {
  certificateAccount: string;
  certificatePassword: string;
  url: string;
  port: string;
  protocol: string;
}

export interface GetQuotaAllCmdResponseData extends CmdResponseData {
  'bms_bmsStatus.f32ShowSoc': number;
  'inv.inputWatts': number;
  'inv.cfgAcEnabled': boolean;
  'inv.outputWatts': number;
  'pd.carState': boolean;
  'pd.carWatts': number;
  'pd.dcOutState': boolean;
  'pd.usb1Watts': number;
  'pd.usb2Watts': number;
  'pd.qcUsb1Watts': number;
  'pd.qcUsb2Watts': number;
  'pd.typec1Watts': number;
  'pd.typec2Watts': number;
}
