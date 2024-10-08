import { EmsStatus, InvStatus, PdStatus } from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
import {
  MqttBatteryMessageType,
  MqttBatteryQuotaMessageWithParams,
  MqttBatterySetMessage,
  MqttBatterySetReplyMessage,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';

export class BatterySimulator extends SimulatorTyped<MqttBatterySetMessage> {
  public override generateQuota(): object {
    const quotaType = this.getRandomNumber(0, 100);
    if (quotaType >= 0 && quotaType < 33) {
      const quotaBmsStatus: MqttBatteryQuotaMessageWithParams<EmsStatus> = {
        typeCode: MqttBatteryMessageType.EMS,
        params: {
          f32LcdShowSoc: this.getRandomNumber(0, 100),
        },
      };
      return quotaBmsStatus;
    } else if (quotaType >= 33 && quotaType < 66) {
      const quotaInvStatus: MqttBatteryQuotaMessageWithParams<InvStatus> = {
        typeCode: MqttBatteryMessageType.INV,
        params: {
          cfgAcEnabled: this.getRandomBoolean(),
          cfgAcOutFreq: 50,
          cfgAcOutVol: 220000,
          cfgAcXboost: this.getRandomBoolean(),
          inputWatts: this.getRandomNumber(0, 1000),
          outputWatts: this.getRandomNumber(0, 1000),
        },
      };
      return quotaInvStatus;
    } else {
      const quotaPdStatus: MqttBatteryQuotaMessageWithParams<PdStatus> = {
        typeCode: MqttBatteryMessageType.PD,
        params: {
          carState: this.getRandomBoolean(),
          carWatts: this.getRandomNumber(0, 1000),
          dcOutState: this.getRandomBoolean(),
          typec1Watts: this.getRandomNumber(0, 100),
          typec2Watts: this.getRandomNumber(0, 100),
        },
      };
      return quotaPdStatus;
    }
  }

  public override generateSetReplyTyped(message: MqttBatterySetMessage): object {
    const reply: MqttBatterySetReplyMessage = {
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
