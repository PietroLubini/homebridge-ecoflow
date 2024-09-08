import {
  AcOutFrequencyType,
  DeltaProUltraAllQuotaData,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraHttpApiContracts';
import {
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
    const quota: DeltaProUltraMqttQuotaMessageWithParams<DeltaProUltraAllQuotaData> = {
      data: {
        hs_yj751_pd_appshow_addr: {
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
        hs_yj751_pd_app_set_info_addr: {
          acOutFreq: AcOutFrequencyType['50 Hz'],
          // acXboost: this.getRandomBoolean() ? AcXBoostType.On : AcXBoostType.Off,
        },
      },
    };
    return quota;
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
