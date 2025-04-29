import { PowerOceanAllQuotaData } from '@ecoflow/accessories/powerocean/interfaces/powerOceanHttpApiContracts';
import { PowerOceanMqttQuotaMessageWithParams } from '@ecoflow/accessories/powerocean/interfaces/powerOceanMqttApiContracts';
import { Simulator } from '@ecoflow/apis/simulations/simulator';

export class PowerOceanSimulator extends Simulator {
  public override generateQuota(): object {
    const quota: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
      params: {
        evPwr: this.getRandomNumber(1, 10000),
        bpPwr: this.getRandomNumber(-10000, 10000),
        bpSoc: this.getRandomNumber(0, 100),
        sysGridPwr: this.getRandomNumber(1, 10000),
        sysLoadPwr: this.getRandomNumber(1, 10000),
      },
    };
    return quota;
  }

  public override generateSetReply(message: string): object {
    throw new Error(`SetReply command "${message}" is not supported for PowerOcean`);
  }
}
