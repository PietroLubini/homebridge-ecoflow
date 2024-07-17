import { Logging } from 'homebridge';
import { createRequire } from 'module';
import { v4 as uuidV4 } from 'uuid';
const require = createRequire(import.meta.url);
const { machineId } = require('./machineIdHelper.cjs');

export async function getMachineId(log: Logging): Promise<string> {
  try {
    const id = await machineId();
    return id;
  } catch (error) {
    log.warn('Can not get Machine ID. Using UUID instead', error);
    return uuidV4();
  }
}
