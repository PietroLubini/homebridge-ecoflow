import {
  BmsStatus,
  InvStatus,
  MpptStatus,
  PdStatus,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2HttpApiContracts';
import {
  Delta2MqttMessageType,
  Delta2MqttQuotaMessageWithParams,
  Delta2MqttSetMessage,
  Delta2MqttSetReplyMessage,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import {
  AcEnableType,
  AcOutFrequencyType,
  AcXBoostType,
  EnableType,
} from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';

export class Delta2Simulator extends SimulatorTyped<Delta2MqttSetMessage> {
  public override generateQuota(): object {
    const quotaType = this.getRandomNumber(0, 100);
    if (quotaType >= 0 && quotaType < 25) {
      const quotaBmsStatus: Delta2MqttQuotaMessageWithParams<BmsStatus> = {
        typeCode: Delta2MqttMessageType.BMS,
        params: {
          f32ShowSoc: this.getRandomNumber(0, 100),
        },
      };
      return quotaBmsStatus;
    } else if (quotaType >= 25 && quotaType < 50) {
      const quotaInvStatus: Delta2MqttQuotaMessageWithParams<InvStatus> = {
        typeCode: Delta2MqttMessageType.INV,
        params: {
          cfgAcEnabled: this.getRandomBoolean() ? AcEnableType.On : AcEnableType.Off,
          cfgAcOutFreq: AcOutFrequencyType['50 Hz'],
          cfgAcOutVol: 220000,
          cfgAcXboost: this.getRandomBoolean() ? AcXBoostType.On : AcXBoostType.Off,
          inputWatts: this.getRandomNumber(0, 1000),
          outputWatts: this.getRandomNumber(0, 1000),
        },
      };
      return quotaInvStatus;
    } else if (quotaType >= 50 && quotaType < 75) {
      const quotaPdStatus: Delta2MqttQuotaMessageWithParams<PdStatus> = {
        typeCode: Delta2MqttMessageType.PD,
        params: {
          carState: this.getRandomBoolean() ? EnableType.On : EnableType.Off,
          carWatts: this.getRandomNumber(0, 1000),
          dcOutState: this.getRandomBoolean() ? EnableType.On : EnableType.Off,
          typec1Watts: this.getRandomNumber(0, 100),
          typec2Watts: this.getRandomNumber(0, 100),
        },
      };
      return quotaPdStatus;
    } else {
      const quotaMpptStatus: Delta2MqttQuotaMessageWithParams<MpptStatus> = {
        typeCode: Delta2MqttMessageType.MPPT,
        params: {
          cfgAcEnabled: this.getRandomBoolean() ? AcEnableType.On : AcEnableType.Off,
          cfgAcOutVol: 220000,
          cfgAcXboost: this.getRandomBoolean() ? AcXBoostType.On : AcXBoostType.Off,
        },
      };
      return quotaMpptStatus;
    }
  }

  public override generateSetReplyTyped(message: Delta2MqttSetMessage): object {
    const reply: Delta2MqttSetReplyMessage = {
      id: message.id,
      version: message.version,
      moduleType: message.moduleType,
      operateType: message.operateType,
      data: {
        ack: false,
      },
    };

    return reply;
  }
}
