import {
  AcOutFrequencyType,
  PdSetStatus,
  PdStatus,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraHttpApiContracts';
import {
  DeltaProUltraMqttMessageAddrType,
  DeltaProUltraMqttQuotaMessageWithParams,
  DeltaProUltraMqttSetMessage,
  DeltaProUltraMqttSetMessageParams,
  DeltaProUltraMqttSetMessageWithParams,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraMqttApiContracts';
import { MqttSetReplyMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';

export class DeltaProUltraSimulator extends SimulatorTyped<
  DeltaProUltraMqttSetMessageWithParams<DeltaProUltraMqttSetMessageParams>
> {
  public override generateQuota(): object {
    const quotaType = this.getRandomNumber(0, 100);
    if (quotaType >= 0 && quotaType < 50) {
      const quotaPdStatus: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
        addr: DeltaProUltraMqttMessageAddrType.PD,
        param: {
          soc: this.getRandomNumber(0, 100),
          //acEnabled: this.getRandomBoolean() ? EnableType.On : EnableType.Off,
          wattsInSum: this.getRandomNumber(0, 1000),
          wattsOutSum: this.getRandomNumber(0, 1000),
          // dcOutState: this.getRandomBoolean() ? EnableType.On : EnableType.Off,
          outAcL11Pwr: this.getRandomNumber(0, 1000),
          outAcTtPwr: this.getRandomNumber(0, 1000),
          outUsb1Pwr: this.getRandomNumber(0, 100),
          outTypec1Pwr: this.getRandomNumber(0, 100),
        },
      };
      return quotaPdStatus;
    } else {
      const quotaPdSetStatus: DeltaProUltraMqttQuotaMessageWithParams<PdSetStatus> = {
        addr: DeltaProUltraMqttMessageAddrType.PD_SET,
        param: {
          acOutFreq: AcOutFrequencyType['50 Hz'],
          // acXboost: this.getRandomBoolean() ? AcXBoostType.On : AcXBoostType.Off,
        },
      };
      return quotaPdSetStatus;
    }
  }

  public override generateSetReplyTyped(message: DeltaProUltraMqttSetMessage): object {
    const reply: MqttSetReplyMessage = {
      id: message.id,
      version: message.version,
      data: {
        result: false,
      },
    };
    return reply;
  }
}
