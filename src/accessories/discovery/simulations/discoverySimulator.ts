import { DiscoveryAllQuotaData } from '@ecoflow/accessories/discovery/interfaces/discoveryHttpApiContracts';
import { Simulator } from '@ecoflow/apis/simulations/simulator';

export class DiscoverySimulator extends Simulator {
  public override generateQuota(): object {
    return {
      discover: true,
      simulated: true,
    } as DiscoveryAllQuotaData;
  }

  public override generateSetReply(message: string): object {
    throw new Error(`SetReply command "${message}" is not supported for Discovery`);
  }
}
