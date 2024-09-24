import { DeltaProAllQuotaData } from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProHttpApiContracts';
import {
  DeltaProMqttQuotaMessageWithParams,
  DeltaProMqttSetMessageParams,
  DeltaProMqttSetMessageWithParams,
  DeltaProMqttSetReplyMessage,
} from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProMqttApiContracts';
import {
  AcEnableType,
  AcOutFrequencyType,
  AcXBoostType,
  EnableType,
} from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';

export class DeltaProSimulator extends SimulatorTyped<DeltaProMqttSetMessageWithParams<DeltaProMqttSetMessageParams>> {
  public override generateQuota(): object {
    const quota: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
      data: {
        bmsMaster: {
          f32ShowSoc: this.getRandomNumber(0, 100),
        },
        inv: {
          cfgAcEnabled: this.getRandomBoolean() ? AcEnableType.On : AcEnableType.Off,
          cfgAcOutFreq: AcOutFrequencyType['50 Hz'],
          cfgAcOutVoltage: 220000,
          cfgAcXboost: this.getRandomBoolean() ? AcXBoostType.On : AcXBoostType.Off,
          inputWatts: this.getRandomNumber(0, 1000),
          outputWatts: this.getRandomNumber(0, 1000),
        },
        pd: {
          carState: this.getRandomBoolean() ? EnableType.On : EnableType.Off,
          carWatts: this.getRandomNumber(0, 1000),
          dcOutState: this.getRandomBoolean() ? EnableType.On : EnableType.Off,
          typec1Watts: this.getRandomNumber(0, 100),
          typec2Watts: this.getRandomNumber(0, 100),
        },
      },
    };
    return quota;
  }

  public override generateSetReplyTyped(
    message: DeltaProMqttSetMessageWithParams<DeltaProMqttSetMessageParams>
  ): object {
    const reply: DeltaProMqttSetReplyMessage = {
      id: message.id,
      version: message.version,
      operateType: message.operateType,
      data: {
        cmdSet: message.params.cmdSet,
        id: message.params.id,
        ack: false,
      },
    };

    return reply;
  }
}
