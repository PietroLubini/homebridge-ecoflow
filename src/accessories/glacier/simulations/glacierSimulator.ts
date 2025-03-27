import { EnableType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import {
  BmsStatus,
  ContactSensorType,
  CoolingZoneType,
  CoolModeType,
  EmsStatus,
  IceCubeStatusType,
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

export class GlacierSimulator extends SimulatorTyped<GlacierMqttSetMessage> {
  public override generateQuota(): object {
    const quotaType = this.getRandomNumber(0, 100);
    if (quotaType >= 0 && quotaType < 33) {
      const quotaEmsStatus: GlacierMqttQuotaMessageWithParams<EmsStatus> = {
        typeCode: GlacierMqttMessageType.EMS,
        params: {
          lcdSoc: this.getRandomNumber(0, 100),
          minDsgSoc: this.getRandomNumber(0, 20),
        },
      };
      return quotaEmsStatus;
    } else if (quotaType >= 33 && quotaType < 66) {
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
          coolZoneDoubleCount: this.getRandomBoolean() ? CoolingZoneType.Single : CoolingZoneType.Dual,
          doorStat: this.getRandomBoolean() ? ContactSensorType.Closed : ContactSensorType.Opened,
          iceMkMode: this.getRandomBoolean() ? IceCubeStatusType.SmallInProgress : IceCubeStatusType.LargeInProgress,
          icePercent: this.getRandomNumber(0, 100),
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
