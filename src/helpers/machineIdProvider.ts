import { Logging } from 'homebridge';
import { machineId } from 'node-machine-id';
import { v4 as uuidV4 } from 'uuid';

export class MachineIdProvider {
  constructor(private readonly log: Logging) {}

  public async getMachineId(): Promise<string> {
    try {
      const id = await machineId();
      return id;
    } catch (error) {
      this.log.warn('Can not get Machine ID. Using UUID instead', error);
      return uuidV4();
    }
  }
}
