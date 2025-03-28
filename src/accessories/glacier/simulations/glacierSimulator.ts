import {
  BmsStatus,
  ContactSensorType,
  CoolingZoneType,
  CoolModeType,
  DetachIceStatusType,
  EmsStatus,
  MakeIceStatusType,
  PdStatus,
  TemperatureType,
} from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttMessageType,
  GlacierMqttQuotaMessageWithParams,
  GlacierMqttSetMessage,
  GlacierMqttSetReplyMessage,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';

export class GlacierSimulator extends SimulatorTyped<GlacierMqttSetMessage> {
  public override generateQuota(): object {
    const quotaType = this.getRandomNumber(0, 100);
    if (quotaType >= 0 && quotaType < 25) {
      const quotaEmsStatus: GlacierMqttQuotaMessageWithParams<EmsStatus> = {
        typeCode: GlacierMqttMessageType.EMS,
        params: {
          lcdSoc: this.getRandomNumber(0, 100),
          minDsgSoc: this.getRandomNumber(0, 20),
        },
      };
      return quotaEmsStatus;
    } else if (quotaType >= 25 && quotaType < 50) {
      const quotaBmsStatus: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
        typeCode: GlacierMqttMessageType.BMS,
        params: {
          amp: this.getRandomNumber(0, 1000),
          inWatts: this.getRandomNumber(0, 1000),
          outWatts: this.getRandomNumber(0, 1000),
          vol: this.getRandomNumber(1800, 2400),
        },
      };
      return quotaBmsStatus;
    } else {
      const quotaPdStatus: GlacierMqttQuotaMessageWithParams<PdStatus> = {
        typeCode: GlacierMqttMessageType.PD,
        params: {
          coolMode: this.getRandomBoolean() ? CoolModeType.Normal : CoolModeType.Eco,
          doorStat: this.getRandomBoolean() ? ContactSensorType.Closed : ContactSensorType.Opened,
          flagTwoZone: this.getRandomBoolean() ? CoolingZoneType.Single : CoolingZoneType.Dual,
          pwrState: this.getRandomBoolean() ? EnableType.Off : EnableType.On,
          tmpAver: this.getRandomNumber(-25, 10),
          tmpL: this.getRandomNumber(-25, 10),
          tmpR: this.getRandomNumber(-25, 10),
          tmpLSet: this.getRandomNumber(-25, 10),
          tmpRSet: this.getRandomNumber(-25, 10),
          tmpMSet: this.getRandomNumber(-25, 10),
          tmpUnit: this.getRandomBoolean() ? TemperatureType.Celsius : TemperatureType.Fahrenheit,
        },
      };
      if (this.getRandomBoolean()) {
        quotaPdStatus.params.icePercent = this.getRandomNumber(0, 100);
        quotaPdStatus.params.iceMkMode = this.getRandomBoolean()
          ? MakeIceStatusType.SmallInProgress
          : MakeIceStatusType.LargeInProgress;
      } else {
        quotaPdStatus.params.fsmState = this.getRandomInt(2, 5) as DetachIceStatusType;
      }
      return quotaPdStatus;
    }
  }

  public override generateSetReplyTyped(message: GlacierMqttSetMessage): object {
    const reply: GlacierMqttSetReplyMessage = {
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
