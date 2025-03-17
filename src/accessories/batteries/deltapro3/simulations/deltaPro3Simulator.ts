import {
  DeltaPro3AcEnableType,
  DeltaPro3AllQuotaData,
} from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3HttpApiContracts';
import {
  DeltaPro3MqttQuotaMessageWithParams,
  DeltaPro3MqttSetAcHvMessageParams,
  DeltaPro3MqttSetAcHvReplyMessageData,
  DeltaPro3MqttSetAcLvMessageParams,
  DeltaPro3MqttSetAcLvReplyMessageData,
  DeltaPro3MqttSetDc12vMessageParams,
  DeltaPro3MqttSetDc12vReplyMessageData,
  DeltaPro3MqttSetMessageParams,
  DeltaPro3MqttSetMessageWithParams,
  DeltaPro3MqttSetReplyMessage,
  DeltaPro3MqttSetReplyMessageData,
  DeltaPro3MqttSetXBoostMessageParams,
  DeltaPro3MqttSetXBoostReplyMessageData,
} from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3MqttApiContracts';
import { AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';

export class DeltaPro3Simulator extends SimulatorTyped<
  DeltaPro3MqttSetMessageWithParams<DeltaPro3MqttSetMessageParams>
> {
  public override generateQuota(): object {
    const quota: DeltaPro3MqttQuotaMessageWithParams<DeltaPro3AllQuotaData> = {
      data: {
        cmsBattSoc: this.getRandomNumber(0, 100),
        cmsMinDsgSoc: this.getRandomNumber(0, 20),
        flowInfo12v: this.getRandomBoolean() ? DeltaPro3AcEnableType.On : DeltaPro3AcEnableType.Off,
        flowInfoAcHvOut: this.getRandomBoolean() ? DeltaPro3AcEnableType.On : DeltaPro3AcEnableType.Off,
        flowInfoAcLvOut: this.getRandomBoolean() ? DeltaPro3AcEnableType.On : DeltaPro3AcEnableType.Off,
        powGet12v: this.getRandomNumber(0, 100),
        powGetAc: this.getRandomNumber(0, 1000),
        powGetAcHvOut: this.getRandomNumber(0, 1000),
        powGetAcLvOut: this.getRandomNumber(0, 1000),
        powGetQcusb1: this.getRandomNumber(0, 100),
        powGetQcusb2: this.getRandomNumber(0, 100),
        powGetTypec1: this.getRandomNumber(0, 100),
        powGetTypec2: this.getRandomNumber(0, 100),
        powInSumW: this.getRandomNumber(0, 1000),
        powOutSumW: this.getRandomNumber(0, 1000),
        xboostEn: this.getRandomBoolean() ? AcXBoostType.On : AcXBoostType.Off,
      },
    };
    return quota;
  }

  public override generateSetReplyTyped(
    message: DeltaPro3MqttSetMessageWithParams<DeltaPro3MqttSetMessageParams>
  ): object {
    const reply: DeltaPro3MqttSetReplyMessage<DeltaPro3MqttSetReplyMessageData> = {
      id: message.id,
      version: message.version,
      code: '0',
      message: 'Success',
      eagleEyeTraceId: '',
      tid: '',
      data: {
        configOk: true,
        actionId: Math.round(this.getRandomNumber(0, 100)),
      },
    };
    if (this.castParams<DeltaPro3MqttSetAcHvMessageParams>(message.params).cfgHvAcOutOpen !== undefined) {
      this.castData<DeltaPro3MqttSetAcHvReplyMessageData>(reply.data).flowInfoAcHvOut =
        this.castParams<DeltaPro3MqttSetAcHvMessageParams>(message.params).cfgHvAcOutOpen
          ? DeltaPro3AcEnableType.On
          : DeltaPro3AcEnableType.Off;
    } else if (this.castParams<DeltaPro3MqttSetAcLvMessageParams>(message.params).cfgLvAcOutOpen !== undefined) {
      this.castData<DeltaPro3MqttSetAcLvReplyMessageData>(reply.data).flowInfoAcLvOut =
        this.castParams<DeltaPro3MqttSetAcLvMessageParams>(message.params).cfgLvAcOutOpen
          ? DeltaPro3AcEnableType.On
          : DeltaPro3AcEnableType.Off;
    } else if (this.castParams<DeltaPro3MqttSetDc12vMessageParams>(message.params).cfgDc12vOutOpen !== undefined) {
      this.castData<DeltaPro3MqttSetDc12vReplyMessageData>(reply.data).flowInfo12v =
        this.castParams<DeltaPro3MqttSetDc12vMessageParams>(message.params).cfgDc12vOutOpen
          ? DeltaPro3AcEnableType.On
          : DeltaPro3AcEnableType.Off;
    } else if (this.castParams<DeltaPro3MqttSetXBoostMessageParams>(message.params).cfgXboostEn !== undefined) {
      this.castData<DeltaPro3MqttSetXBoostReplyMessageData>(reply.data).xboostEn =
        this.castParams<DeltaPro3MqttSetXBoostMessageParams>(message.params).cfgXboostEn;
    }

    return reply;
  }

  private castData<TData extends DeltaPro3MqttSetReplyMessageData>(data: DeltaPro3MqttSetReplyMessageData): TData {
    return data as TData;
  }

  private castParams<TParams extends DeltaPro3MqttSetMessageParams>(params: DeltaPro3MqttSetMessageParams): TParams {
    return params as TParams;
  }
}
