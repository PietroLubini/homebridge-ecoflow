import { Logging } from 'homebridge';
import { machineId } from 'node-machine-id';
import { v4 as uuidV4 } from 'uuid';

export class MachineIdProvider {
  public async getMachineId(log: Logging): Promise<string> {
    try {
      const id = await machineId();
      return id;
    } catch (error) {
      log.warn('Can not get Machine ID. Using UUID instead', error);
      return uuidV4();
    }
  }
}
